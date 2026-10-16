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
 *   - rooms:date, rooms:buttons, rooms:body: the date as the site shows it,
 *     the Play and link buttons, and the post copy, as styled email HTML for
 *     the Brevo newsletter (email/newsletter.html places them)
 *   - rooms:socials: the homepage's social links (scripts/socials.mjs), the
 *     same in every item, for the list at the end of the newsletter
 *
 * The output only changes when a post does, so the GitHub Action that runs
 * this on every push to main commits nothing on unrelated pushes.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'node-html-parser';
import { readSocials } from './socials.mjs';

const SITE = 'https://thisisrooms.com/';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FEED_URL = new URL('feed.xml', SITE).href;
const NS = 'https://thisisrooms.com/ns/feed';

const IMAGE_TYPES = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' };
const KEEP_ATTRIBUTES = { a: ['href'], img: ['src', 'alt'], time: ['datetime'] };

// Newsletter styling, inlined because most email apps ignore stylesheets. Colours
// are the site's, flipped onto a light background; email/newsletter.html matches.
const INK = '#0E100D';
const MUTED = '#6b6c69';
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
const EMAIL_STYLES = {
    p: `margin:0 0 16px;font-family:${FONT};font-size:16px;line-height:1.65;color:#2b2c2a;`,
    h2: `margin:32px 0 12px;font-family:${FONT};font-size:22px;line-height:1.3;font-weight:bold;color:${INK};`,
    h3: `margin:28px 0 10px;font-family:${FONT};font-size:19px;line-height:1.3;font-weight:bold;color:${INK};`,
    ul: `margin:0 0 16px;padding-left:24px;`,
    ol: `margin:0 0 16px;padding-left:24px;`,
    li: `margin:0 0 6px;font-family:${FONT};font-size:16px;line-height:1.65;color:#2b2c2a;`,
    a: `color:${INK};text-decoration:underline;`,
    img: 'display:block;width:100%;max-width:100%;height:auto;border:0;border-radius:8px;',
    cta: `display:inline-block;padding:10px 20px;border-radius:8px;background-color:${INK};color:#ffffff;font-weight:bold;text-decoration:none;`,
    // Equal space between the lyrics and each line (the last verse's 16px margin
    // + 6px matches the 24px top padding once line spacing is counted).
    lyrics: 'margin:24px 0 0;padding:24px 0 6px;border-top:1px solid #e3e3e0;border-bottom:1px solid #e3e3e0;',
    // Closes copy that doesn't end with lyrics, above the 'view on' link.
    endRule: 'margin:24px 0 0;height:0;line-height:0;font-size:0;border-top:1px solid #e3e3e0;',
    lyricsP: "margin:0 0 16px;font-family:'Courier New', Courier, monospace;font-size:14px;line-height:1.7;color:#2b2c2a;",
};

// Icons for the link buttons, rendered into images/email/ by
// scripts/build-email-images.mjs (add a service there too). Buttons for any
// other service just have no icon.
const SERVICE_ICONS = {
    Bandcamp: 'bandcamp',
    'Apple Music': 'apple-music',
    YouTube: 'youtube',
    'Subvert.fm': 'subvert-fm',
    Deezer: 'deezer',
    SoundCloud: 'soundcloud',
};
const EMAIL_IMAGES = new URL('images/email/', SITE).href;

// The post's Play button and link buttons as an email-safe stack of tables,
// each with its icon as an image (email apps restyle text symbols like ▶):
// Play goes to the post with #play (tagged utm_source=newsletter for the
// site's analytics), the rest to each service with its pill.
function emailButtons(url, links, hasAudio) {
    const gap = '<div style="height:8px;line-height:8px;font-size:8px;">&nbsp;</div>';
    const buttons = [];
    if (hasAudio) {
        buttons.push(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;"><tr>`
            + `<td height="44" style="height:44px;padding:0 8px 0 16px;background-color:${INK};border:1px solid ${INK};border-radius:8px;">`
            + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>'
            + `<td width="32" style="width:32px;line-height:0;font-size:0;"><a href="${url}?utm_source=newsletter#play"><img src="${EMAIL_IMAGES}play-icon.png" width="20" height="20" alt="" style="display:block;width:20px;height:20px;border:0;" /></a></td>`
            + `<td style="font-family:${FONT};font-size:15px;line-height:44px;font-weight:bold;"><a href="${url}?utm_source=newsletter#play" style="display:block;color:#ffffff;text-decoration:none;">Play</a></td>`
            + '</tr></table></td></tr></table>');
    }
    links.forEach((link) => {
        const href = escapeXml(link.href);
        const icon = SERVICE_ICONS[link.name];
        buttons.push(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;"><tr>`
            + `<td height="40" style="height:40px;padding:0 8px 0 16px;background-color:#f4f4f2;border:1px solid #e3e3e0;border-radius:8px;">`
            + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>'
            + (icon
                ? `<td width="32" style="width:32px;line-height:0;font-size:0;"><a href="${href}"><img src="${EMAIL_IMAGES}${icon}.png" width="20" height="20" alt="" style="display:block;width:20px;height:20px;border:0;" /></a></td>`
                : '')
            + `<td style="font-family:${FONT};font-size:15px;line-height:40px;"><a href="${href}" style="display:block;color:${INK};text-decoration:none;">${escapeXml(link.name)}</a></td>`
            + (link.action
                ? `<td width="64" align="center" style="width:64px;"><a href="${href}" style="display:block;font-family:${FONT};font-size:13px;line-height:22px;color:${INK};text-decoration:none;border:1px solid #c9c9c5;border-radius:999px;text-align:center;">${escapeXml(link.action)}</a></td>`
                : '')
            + '</tr></table></td></tr></table>');
    });
    return buttons.join(gap);
}

// The homepage's social links as an email-safe list, one row per links-grid
// entry: its icons (each linking to its own profile) and description. Icons
// not yet rendered by scripts/build-email-images.mjs are left out.
function emailSocials() {
    const rows = readSocials(ROOT).map((social) => {
        const icons = social.icons
            .filter((i) => existsSync(join(ROOT, 'images/email/social', `${i.id}.png`)))
            .map((i) => `<a href="${escapeXml(i.href)}" style="display:inline-block;margin-right:6px;"><img src="${EMAIL_IMAGES}social/${i.id}.png" width="20" height="20" alt="${escapeXml(i.id)}" style="display:block;width:20px;height:20px;border:0;" /></a>`)
            .join('');
        return '<tr>'
            + `<td width="32" valign="middle" style="width:32px;padding:6px 0;line-height:0;font-size:0;white-space:nowrap;">${icons}</td>`
            + `<td valign="middle" style="padding:6px 0;font-family:${FONT};font-size:14px;line-height:1.4;"><a href="${escapeXml(social.href)}" style="color:${MUTED};text-decoration:none;">${escapeXml(social.text)}</a></td>`
            + '</tr>';
    });
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows.join('')}</table>`;
}

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

// Turns the post's prose into plain HTML that reads well in a feed reader or,
// with email set, into the copy for the newsletter with its styles inlined.
function cleanContent(prose, pageUrl, email = false) {
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

    // In email, call-to-action links become buttons and the lyrics keep their own block.
    const styled = [];
    if (email) {
        content.querySelectorAll('a.cta').forEach((a) => styled.push([a, EMAIL_STYLES.cta]));
        content.querySelectorAll('.lyrics').forEach((div) => {
            styled.push([div, EMAIL_STYLES.lyrics]);
            div.querySelectorAll('p').forEach((p) => styled.push([p, EMAIL_STYLES.lyricsP]));
        });
    }

    // Unwrap layout divs, keeping what's inside.
    content.querySelectorAll('div').reverse().forEach((div) => {
        if (!(email && div.classList.contains('lyrics'))) div.replaceWith(...div.childNodes);
    });

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

    if (email) {
        content.querySelectorAll('*').forEach((el) => {
            const style = EMAIL_STYLES[el.rawTagName?.toLowerCase()];
            if (style) el.setAttribute('style', style);
        });
        styled.forEach(([el, style]) => el.setAttribute('style', style));
        content.querySelectorAll('img').forEach((img) => img.setAttribute('width', '552'));
        // The copy ends with a rule above the 'view on' link: the lyrics block's own
        // bottom border when it comes last, so its spacing matches the top.
        const last = content.childNodes.filter((n) => n.nodeType === 1).pop();
        if (!last || last.getAttribute('style') !== EMAIL_STYLES.lyrics) {
            content.insertAdjacentHTML('beforeend', `<div style="${EMAIL_STYLES.endRule}">&nbsp;</div>`);
        }
    }

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
    const emailContent = cleanContent(prose, url, true);
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
        emailBody: emailContent.toString().trim(),
        emailButtons: emailButtons(url, links, hasAudio),
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
    lines.push(`      <rooms:date>${post.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}</rooms:date>`);
    lines.push(`      <rooms:buttons>${cdata(post.emailButtons)}</rooms:buttons>`);
    lines.push(`      <rooms:body>${cdata(post.emailBody)}</rooms:body>`);
    lines.push(`      <rooms:socials>${cdata(SOCIALS)}</rooms:socials>`);
    post.links.forEach((link) => {
        lines.push(`      <rooms:${serviceKey(link.name)}>${escapeXml(link.href)}</rooms:${serviceKey(link.name)}>`);
    });
    lines.push('    </item>');
    return lines.join('\n');
}

const home = readPage('index.html');
const SOCIALS = emailSocials();
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
