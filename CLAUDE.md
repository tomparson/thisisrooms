# thisisrooms

Personal website for rooms, a UK-based electronic music artist.

## Deployed domain

https://thisisrooms.com

Use absolute URLs based on this domain for any meta tags (og:image, canonical, etc.).

## How the site works

- Static HTML on GitHub Pages (publishes `main`). Tailwind comes from the Play CDN; every page repeats the same `tailwind.config` script and inline `<style type="text/tailwindcss">` block.
- `css/site.css` and `js/site.js` are shared by every page and loaded as `?v=N`. **Whenever either file changes, bump N on every page** (both tags, same N) so open tabs reload once.
- `js/site.js` runs the floating audio player, track lists, the 'now playing' EQ, the artwork lightbox, dot grids, the posts' 'next' links and in-place navigation. Its header comment documents the markup it reads.
- **The homepage card order is the release order.** It sets the 'next' links and the order the player continues in (newest first, wrapping round). Posts with no `rooms:track` tags are skipped by the player.

## Adding a new release

Tom will usually send: MP3(s), the post title, a date, link URLs (Bandcamp, Apple Music, YouTube, etc.), cover art, a description, post copy and sometimes lyrics. Ask for anything missing that the steps below need.

### 1. Audio

- Put files in `audio/<slug>/`: `audio/<slug>/<slug>.mp3` for a single, or `audio/<slug>/<track-slug>.mp3` per track. Use lowercase, hyphenated names.
- Check the bitrate with `ffprobe`. The site uses **160 kbps MP3**. Re-encode anything higher before committing (`ffmpeg -i in.mp3 -codec:a libmp3lame -b:a 160k out.mp3`). Every committed MP3 stays in git history forever, so get the encoding right before the first commit.
- Track titles are lowercase, as in the tags but without any '#3xx 1.'-style prefix.
- **Trailing silence:** find where the last track's audio ends (`ffmpeg -i f.mp3 -af silencedetect=noise=-70dB:d=0.3 -f null -`, falling back to -60dB) and set `data-end` (in seconds) to about 0.3s after that on the release's last track, or on the single. Skip it if the silence is under about 0.5s.
- Chat uploads are limited to about 10 MB. For bigger files, ask Tom to run `split -b 9m file.mp3 part-` on his Mac and send the parts; rejoin them with `cat part-aa part-ab … > file.mp3`.

### 2. Post page: `posts/<slug>-release/index.html` (collabs use `posts/<slug>/`)

Copy the closest existing post and edit it. The `<head>`, header row, newsletter and footer must stay identical to other posts.

| Kind of release | Copy from |
|---|---|
| Single | `posts/incantations-release/` |
| Multi-track | `posts/fledgling-release/` or `posts/constructs-release/` |
| Gapless album | `posts/3xx-release/` |
| Collab | `posts/funk-fatale/` |

- **`<head>`**
  - `<title>` and `og:title`: `<title> out now · rooms` (collabs just `<title> · rooms`).
  - `description` and `og:description`: a sentence on the release.
  - `og:image`: absolute URL of the cover.
  - `article:published_time`: YYYY-MM-DD.
  - Same `?v=N` as other pages.
- **Audio tags**, after `article:published_time`:
  - Single:
    `<meta name="rooms:track" content="../../audio/<slug>/<slug>.mp3" data-title="<title>" data-end="…">`
  - Multi-track: `<meta name="rooms:release" content="<release name>">`, then one `rooms:track` tag per track in order. `data-end` goes on the last track only.
  - Gapless album, where tracks flow into each other: one continuous file. Use `<meta name="rooms:release" content="<name>" data-src="../../audio/<slug>/<slug>.mp3">`, then per track `<meta name="rooms:track" data-title="…" data-start="<seconds>">`, with `data-end` on the last. Get start times from Tom's markers, or by matching each individual track file against the album file (cross-correlate a few seconds near each expected position).
- **Body**
  - `<h1>` is the title. Below it, the date as `<time datetime="YYYY-MM-DD">D Month YYYY</time>`.
- **Buttons grid** (`not-prose grid … md:grid-cols-[1fr_auto]`)
  - Artwork goes in the dot-grid wrapper first. Its `<img>` class ends `md:h-[198px]` when there's a Play button, `md:h-[192px]` when not, and it has `data-lightbox`.
  - The white `data-rooms-play` Play button comes first if the post has audio, then link buttons:
    - Bandcamp → "buy"
    - Apple Music → "play"
    - YouTube → "play"
    - Subvert.fm → "buy"
    - Deezer → "play"
    - SoundCloud → "play"
  - Keep the Play button 62px tall (`h-[62px]`) and every other button 56px (`h-14`).
  - The buy/play pills are all the same width (`w-[4.5rem] … text-center`), so they line up with each other and with the Play button's EQ.
  - If there are more than 3 buttons (counting Play), add a desktop filler after the last button: `<div class="dot-grid hidden md:block md:col-start-2 md:row-start-4 md:row-span-<buttons − 3>" aria-hidden="true"></div>`.
  - The grid gets `mb-section`, or `mb-3` when a track list follows.
- **Track list** (multi-track only): `<div data-tracklist class="tracklist not-prose mb-section"></div>` straight after the grid. `js/site.js` fills it.
- **Post copy:** plain `<p>` paragraphs. Credit lines are inline links ("X with <a>Name</a>"). A link only becomes a button if it has `class="cta"`. Every link to another site (including button links) gets `target="_blank"` so it opens in a new tab; links within the site don't.
- Don't add Bandcamp, SoundCloud or YouTube embed players for tracks that have a Play button. YouTube music-video embeds are fine when Tom wants them.
- **Lyrics** (optional) go after the copy, inside the prose div:
  ```html
  <div class="lyrics typewriter not-prose mt-section">
  <div class="dot-grid dot-strip mb-section" aria-hidden="true"></div>
  <p>LYRICS</p>
  <p>line<br />
  line</p>
  <div class="dot-grid dot-strip mt-section" aria-hidden="true"></div>
  </div>
  ```
  Posts *without* lyrics instead have `<div class="dot-grid dot-strip mb-section" aria-hidden="true"></div>` as the first thing in the bottom `mt-section` block, above the newsletter. Posts with lyrics don't.

### 3. Cover art

`images/releases/<slug>-cover.jpg`, square. Use it on the post, the homepage card and in `og:image`.

### 4. Homepage card (`index.html`)

- Add the new card at the **top** of the cards list, since it's the newest. Copy an existing card and its following `dot-grid dot-strip-short` divider.
- Card text:
  - Label: "latest single", "single", "EP", "debut EP", "debut album", "recent commission"; collabs have no label.
  - Title: "<title> out now"; collabs just "<title>".
  - Pill: "view release", "view collab" or "read story".
- When a new single goes in, change the previous "latest single" card to "single".

### 5. Check, then publish

- Test locally (see below):
  - The page renders on mobile (390px) and desktop (1280px).
  - Play works and the track list shows lengths.
  - The previous release plays into the new one, and the new one plays into the next.
  - No console errors.
- Commit to the session's branch. Push to `main` when Tom asks; he often asks for content updates to go straight to main.
- Bump `?v=N` only if `css/site.css` or `js/site.js` changed.

## Testing locally

- Serve with a server that supports HTTP Range requests (seeking breaks without it), e.g. `npx http-server -p 8124 -c-1 -s .`. Python's `http.server` doesn't support them.
- The sandbox usually can't reach the Tailwind, Font Awesome or Google Fonts CDNs. For screenshots, build Tailwind locally (`tailwindcss` CLI with the same config and typography plugin) and route the CDN requests to local copies in Playwright. Chromium is preinstalled for Playwright.
