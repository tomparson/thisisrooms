/*
 * Builds feed.xml (RSS 2.0) from the post pages, newest first.
 *
 *   npm run build:feed
 *
 * A post is included once it has an article:published_time meta tag; posts
 * without one (unlisted drafts) are left out. Each item has:
 *   - title: the page <title> without ' · rooms'
 *   - description: the meta description, or the first paragraph of the post
 *     when the meta description is the generic homepage one
 *   - content:encoded: the cover, listen/buy links and the post copy as plain
 *     email-friendly HTML (no classes, scripts or embeds; absolute URLs)
 *   - enclosure and rooms:cover: the cover art
 *   - rooms:<service> (rooms:bandcamp, rooms:apple_music, ...): each link
 *     button's URL, for email templates that lay the links out themselves
 *
 * The output only changes when a post does, so the GitHub Action that runs
 * this on every push to main commits nothing on unrelated pushes.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'node-html-parser';

const SITE = 'https://thisisrooms.com/';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FEED_URL = new URL('feed.xml', SITE).href;
const NS = 'https://thisisrooms.com/ns/feed';

const IMAGE_TYPES = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' };
const KEEP_ATTRIBUTES = { a: ['href'], img: ['src', 'alt'], time: ['datetime'] };

function readPage(path) {
    return parse(readFileSync(join(ROOT, path), 'utf8'), { comment: false });
}

function meta(doc, attribute, name) {
    return doc.querySelector(`meta[${attribute}="${name}"]`)?.getAttribute('content')?.trim() || '';
}

function escapeXml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function cdata(html) {
    return `<![CDATA[${html.replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;
}

// Local files are served from the repo, so their size comes from disk.
function localFile(url) {
    if (!url.startsWith(SITE)) return null;
    const path = join(ROOT, decodeURIComponent(new URL(url).pathname));
    return existsSync(path) ? path : null;
}

function serviceKey(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function firstParagraph(content) {
    const text = content.querySelector('p')?.text.replace(/\s+/g, ' ').trim() || '';
    if (text.length <= 200) return text;
    return text.slice(0, text.lastIndexOf(' ', 200)) + '…';
}

// Turns the post's prose into plain HTML that reads well in an email or feed reader.
function cleanContent(prose, pageUrl) {
    const content = parse(prose.innerHTML, { comment: false });

    content.querySelector('h1')?.remove();
    content.querySelector('p > time')?.parentNode.remove();
    content.querySelectorAll('.not-prose.grid, [data-tracklist], .dot-grid, [aria-hidden="true"]').forEach((el) => el.remove());

    // Embeds don't play in email, so each becomes a link to where it does.
    content.querySelectorAll('iframe').forEach((frame) => {
        const src = frame.getAttribute('src') || '';
        const youtube = src.match(/youtube\.com\/embed\/([\w-]+)/);
        const credit = frame.nextElementSibling;
        if (youtube) {
            frame.replaceWith(`<p><a href="https://www.youtube.com/watch?v=${youtube[1]}">Watch on YouTube</a></p>`);
        } else if (src.includes('soundcloud.com') && credit?.rawTagName === 'div') {
            // SoundCloud's embed code is followed by a credit line linking to the track.
            const track = credit.querySelectorAll('a').pop()?.getAttribute('href');
            credit.remove();
            frame.replaceWith(track ? `<p><a href="${escapeXml(track)}">Listen on SoundCloud</a></p>` : '');
        } else {
            frame.remove();
        }
    });

    // Unwrap layout divs (e.g. the lyrics block), keeping what's inside.
    content.querySelectorAll('div').reverse().forEach((div) => div.replaceWith(...div.childNodes));

    content.querySelectorAll('*').forEach((el) => {
        const keep = KEEP_ATTRIBUTES[el.rawTagName?.toLowerCase()] || [];
        Object.keys(el.attributes).forEach((name) => {
            if (!keep.includes(name)) el.removeAttribute(name);
        });
        ['href', 'src'].forEach((name) => {
            const value = el.getAttribute(name);
            if (value) el.setAttribute(name, new URL(value, pageUrl).href);
        });
    });

    return content;
}

function readPost(slug, genericDescription) {
    const doc = readPage(`posts/${slug}/index.html`);
    const published = meta(doc, 'property', 'article:published_time');
    if (!published) return null;

    const url = new URL(`posts/${slug}/`, SITE).href;
    const prose = doc.querySelector('.prose');
    const title = doc.querySelector('title').text.replace(/\s*·\s*rooms\s*$/, '').trim();

    const coverImg = prose.querySelector('img[data-lightbox]');
    const cover = coverImg
        ? { url: new URL(coverImg.getAttribute('src'), url).href, alt: coverImg.getAttribute('alt') || title }
        : { url: meta(doc, 'property', 'og:image'), alt: title };

    const links = prose.querySelectorAll('.not-prose.grid a[href]').map((a) => {
        const [name, action] = a.querySelectorAll('span').slice(1).map((span) => span.text.trim());
        return { name, action, href: new URL(a.getAttribute('href'), url).href };
    });
    const hasAudio = doc.querySelector('meta[name="rooms:track"]') !== null;

    const content = cleanContent(prose, url);
    const description = meta(doc, 'name', 'description');

    const header = [`<p><img src="${escapeXml(cover.url)}" alt="${escapeXml(cover.alt)}" /></p>`];
    const linkLines = [];
    if (hasAudio) linkLines.push(`<a href="${url}">Play on thisisrooms.com</a>`);
    links.forEach((link) => {
        const verb = link.action ? link.action[0].toUpperCase() + link.action.slice(1) : 'Open';
        linkLines.push(`<a href="${escapeXml(link.href)}">${verb} on ${escapeXml(link.name)}</a>`);
    });
    if (linkLines.length) header.push(`<p>${linkLines.join('<br />\n')}</p>`);

    return {
        slug,
        title,
        url,
        date: new Date(`${published}T00:00:00Z`),
        description: description && description !== genericDescription ? description : firstParagraph(content),
        html: `${header.join('\n')}\n${content.toString().trim()}`,
        cover,
        links,
    };
}

function itemXml(post) {
    const lines = [
        '    <item>',
        `      <title>${escapeXml(post.title)}</title>`,
        `      <link>${post.url}</link>`,
        `      <guid isPermaLink="true">${post.url}</guid>`,
        `      <pubDate>${post.date.toUTCString()}</pubDate>`,
        `      <description>${escapeXml(post.description)}</description>`,
        `      <content:encoded>${cdata(post.html)}</content:encoded>`,
    ];
    if (post.cover.url) {
        const file = localFile(post.cover.url);
        const type = IMAGE_TYPES[extname(new URL(post.cover.url).pathname).toLowerCase()];
        if (file && type) lines.push(`      <enclosure url="${escapeXml(post.cover.url)}" length="${statSync(file).size}" type="${type}" />`);
        lines.push(`      <rooms:cover>${escapeXml(post.cover.url)}</rooms:cover>`);
    }
    post.links.forEach((link) => {
        lines.push(`      <rooms:${serviceKey(link.name)}>${escapeXml(link.href)}</rooms:${serviceKey(link.name)}>`);
    });
    lines.push('    </item>');
    return lines.join('\n');
}

const home = readPage('index.html');
const siteDescription = meta(home, 'name', 'description');

const posts = readdirSync(join(ROOT, 'posts'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(ROOT, 'posts', entry.name, 'index.html')))
    .map((entry) => readPost(entry.name, siteDescription))
    .filter(Boolean)
    .sort((a, b) => b.date - a.date || a.slug.localeCompare(b.slug));

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:rooms="${NS}">
  <channel>
    <title>rooms</title>
    <link>${SITE}</link>
    <atom:link href="${FEED_URL}" rel="self" type="application/rss+xml" />
    <description>${escapeXml(siteDescription)}</description>
    <language>en-gb</language>
    <lastBuildDate>${posts[0].date.toUTCString()}</lastBuildDate>
    <image>
      <url>${SITE}images/avatar.jpg</url>
      <title>rooms</title>
      <link>${SITE}</link>
    </image>
${posts.map(itemXml).join('\n')}
  </channel>
</rss>
`;

writeFileSync(join(ROOT, 'feed.xml'), xml);
console.log(`feed.xml: ${posts.length} posts`);
