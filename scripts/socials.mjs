/*
 * Reads the social links from the homepage's links grid (#about-and-links), for
 * the newsletter: scripts/build-feed.mjs lays them out and
 * scripts/build-email-images.mjs renders their icons.
 *
 * Each grid entry becomes { text, href, icons: [{ id, href, fa | svg }] }:
 * its description, where that links, and each icon with its own link. An icon
 * is a Font Awesome <i> (fa: [set, name]) or an inline <svg> (svg: markup, id
 * from the link's site name). Entries with data-email-hide (the mailing list
 * sign-up) are left out.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'node-html-parser';

const FA_SETS = { 'fa-brands': 'brands', 'fa-solid': 'solid', 'fa-regular': 'regular' };

function faIcon(i) {
    const classes = i.classList.value;
    const set = classes.map((c) => FA_SETS[c]).find(Boolean);
    const name = classes.find((c) => c.startsWith('fa-') && !FA_SETS[c] && !/^fa-(\d|xs|sm|lg|xl|fw)/.test(c));
    return set && name ? [set, name.slice(3)] : null;
}

function siteName(href) {
    const host = new URL(href).hostname.replace(/^www\./, '').split('.');
    return host.length > 2 ? host[host.length - 2] : host[0];
}

export function readSocials(root) {
    const home = parse(readFileSync(join(root, 'index.html'), 'utf8'), { comment: false });
    const grid = home.querySelector('#about-and-links .grid');
    return grid.childNodes
        .filter((entry) => entry.nodeType === 1 && !entry.hasAttribute('data-email-hide'))
        .map((entry) => {
            const [iconRow, textRow] = entry.childNodes.filter((n) => n.nodeType === 1);
            const textLink = textRow.querySelector('a');
            const href = (textLink || entry).getAttribute('href');
            const icons = iconRow.querySelectorAll('i, svg').map((el) => {
                const iconHref = el.closest('a[href]')?.getAttribute('href') || href;
                if (el.rawTagName === 'svg') return { id: siteName(iconHref), href: iconHref, svg: el.outerHTML };
                const fa = faIcon(el);
                return fa && { id: fa[1], href: iconHref, fa };
            }).filter(Boolean);
            return { text: textRow.text.replace(/\s+/g, ' ').trim(), href, icons };
        });
}
