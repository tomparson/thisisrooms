/*
 * Site-wide script, loaded once per visit.
 *
 * 1. Floating audio player. Pages opt in with one tag per track, in order:
 *      <meta name="rooms:track" content="path/to/track.mp3" data-title="track name">
 *    plus, for multi-track releases, <meta name="rooms:release" content="name">.
 *    A gapless release is one continuous file, named on the release tag, with
 *    each track's start time (in seconds) instead of its own file:
 *      <meta name="rooms:release" content="name" data-src="path/to/album.mp3">
 *      <meta name="rooms:track" data-title="track name" data-start="163.29">
 *    The player then treats each stretch of the file as a track: titles, the
 *    track list, the time, the scrub bar and the lock screen all follow it.
 *    Any track can also have data-end="seconds" to cut off trailing silence:
 *    the player treats that point as the end of the track.
 *    A button with a data-rooms-play attribute plays (or pauses) the page's
 *    release from the top; its icon (an <i>) and [data-rooms-play-label] text
 *    follow the play state, and a small animated EQ shows on its right while
 *    it's playing (also on the playing track list row). A [data-tracklist] element is filled with a row per
 *    track. When a track ends the release's next track plays, then the first
 *    track of the next post down the homepage's release cards (a.release-card,
 *    newest first), skipping posts with no audio and wrapping round after the
 *    last. In a track's last minute the player shows what's up next.
 *
 * 2. Artwork lightbox. On desktop, clicking an <img data-lightbox> shows it
 *    filling the window; clicking anywhere (or Escape) closes it.
 *
 * 3. Dot grids. Each .dot-grid element is filled with evenly spaced dots.
 *    Post pages' [data-next-post] links are pointed at the next post in homepage
 *    order (looping round) and revealed.
 *
 * 4. In-place navigation. Clicks on internal links fetch the next page and swap
 *    the <body> contents instead of doing a full page load, so the player (and
 *    whatever it is playing) survives navigation. Page scripts are re-run after
 *    each swap; a page script that adds window/document listeners should remove
 *    them when the 'rooms:navigate' event fires on document. 'rooms:pageshow'
 *    fires once the new page has had a frame to lay out (the in-place stand-in
 *    for window 'load'). Pages load this file and css/site.css with the same
 *    ?v=N; bump N on every page when either changes, so open tabs do a full load
 *    (once) when they reach a page referencing a newer N.
 *
 * 5. Newsletter sign-up. A <form data-newsletter> (the Brevo subscription form's
 *    action and fields) is sent in the background instead of leaving the page,
 *    then replaced by its [data-newsletter-message]. Brevo's form endpoint
 *    doesn't let other sites read its reply, so the request is sent no-cors and
 *    the thanks shown once it has gone; the browser checks the address first.
 *
 * 6. Analytics. Page views, time on page, plays, clicks on links to other sites
 *    and newsletter sign-ups are sent to ANALYTICS_URL, a Google Apps Script
 *    (analytics/apps-script.gs) that adds a row per event to a private Google
 *    Sheet. The URL can only add rows. Nothing is stored in the browser: the
 *    visit ID lives in memory, so it lasts as long as in-place navigation does.
 *    Only sent from thisisrooms.com, or from any page loaded with
 *    ?analytics-test.
 */
(function () {
    if (window.roomsSite) return;
    window.roomsSite = true;

    // This file lives in /js/, so the site root is one level up.
    const scriptSrc = document.currentScript.src;
    const siteRoot = new URL('../', scriptSrc).href;

    function scriptVersion(url) {
        return Number(url.searchParams.get('v')) || 0;
    }

    // ---------------------------------------------------------------------
    // Player
    // ---------------------------------------------------------------------

    const player = document.createElement('div');
    player.id = 'rooms-player';
    player.hidden = true;
    player.setAttribute('role', 'region');
    player.setAttribute('aria-label', 'audio player');
    player.innerHTML = `
        <div class="rp-inner">
            <button type="button" class="rp-play" aria-label="play"><i class="fa-solid fa-play"></i></button>
            <div class="rp-middle">
                <div class="rp-meta">
                    <div class="rp-meta-left">
                        <a class="rp-title"></a>
                        <span class="rp-next" hidden>up next: <a></a></span>
                    </div>
                    <span class="rp-time"><span class="rp-current">0:00</span> / <span class="rp-duration">--:--</span></span>
                </div>
                <input type="range" class="rp-seek" min="0" max="1000" step="1" value="0" aria-label="seek">
            </div>
            <div class="rp-right">
                <button type="button" class="rp-mute" aria-label="mute"><i class="fa-solid fa-volume-high"></i></button>
                <input type="range" class="rp-volume" min="0" max="1" step="0.01" value="1" aria-label="volume">
            </div>
        </div>
    `;

    const audio = new Audio();
    audio.preload = 'metadata';

    const playButton = player.querySelector('.rp-play');
    const playIcon = playButton.querySelector('i');
    const muteButton = player.querySelector('.rp-mute');
    const muteIcon = muteButton.querySelector('i');
    const seek = player.querySelector('.rp-seek');
    const volume = player.querySelector('.rp-volume');
    const titleLink = player.querySelector('.rp-title');
    const upNext = player.querySelector('.rp-next');
    const upNextLink = upNext.querySelector('a');
    const currentLabel = player.querySelector('.rp-current');
    const durationLabel = player.querySelector('.rp-duration');

    // What the player has loaded: a release and which of its tracks is current.
    // A release is { page, title, artwork, gapless, tracks: [{ src, title, start }] },
    // read from a post's <meta name="rooms:track"> tags; single tracks are
    // releases of one. Tracks of a gapless release share one src and are told
    // apart by their start times; other tracks start at 0 of their own file.
    let current = null; // { release, index }
    let seeking = false;

    function currentTrack() {
        return current && current.release.tracks[current.index];
    }

    // The current track's span within the loaded file, and the playhead within it.
    function trackStart() {
        return current ? currentTrack().start : 0;
    }

    function trackEnd() {
        if (current && currentTrack().end) return currentTrack().end;
        const next = current && current.release.gapless && current.release.tracks[current.index + 1];
        return next ? next.start : audio.duration;
    }

    function trackDuration() {
        return trackEnd() - trackStart();
    }

    function trackTime() {
        return Math.max(0, audio.currentTime - trackStart());
    }

    // Which track of a gapless release the playhead is in. MP3 seeking can land
    // a hair early, so a seek to a track's start still counts as that track.
    function gaplessIndexAt(time) {
        const tracks = current.release.tracks;
        let index = 0;
        while (index + 1 < tracks.length && time + 0.1 >= tracks[index + 1].start) index++;
        return index;
    }

    function formatTime(seconds) {
        if (!isFinite(seconds)) return '--:--';
        const s = Math.floor(seconds);
        return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    }

    function setFill(range) {
        const min = Number(range.min), max = Number(range.max);
        range.style.setProperty('--fill', ((range.value - min) / (max - min)) * 100 + '%');
    }

    function renderTime() {
        // In a gapless release, follow the playhead into the next (or previous) track.
        if (current && current.release.gapless && isFinite(audio.duration) && !audio.seeking) {
            const index = gaplessIndexAt(audio.currentTime);
            if (index !== current.index) {
                current = { release: current.release, index: index };
                renderTrackInfo();
                renderPlayState();
            }
        }
        // Reaching a track's trimmed end counts as it ending.
        if (current && currentTrack().end && audio.currentTime >= currentTrack().end && !audio.paused && !seeking) {
            audio.pause();
            playAdjacent(1, true);
        }
        const duration = trackDuration();
        durationLabel.textContent = formatTime(duration);
        seek.disabled = !isFinite(duration);
        renderPosition();
        if (seeking) return;
        currentLabel.textContent = formatTime(trackTime());
        seek.value = isFinite(duration) && duration > 0 ? Math.min(1, trackTime() / duration) * 1000 : 0;
        setFill(seek);
        renderUpNext();
    }

    // The lock screen's progress bar, per track.
    function renderPosition() {
        if (!('mediaSession' in navigator) || !navigator.mediaSession.setPositionState) return;
        const duration = trackDuration();
        if (!current || !isFinite(duration) || duration <= 0) return;
        try {
            navigator.mediaSession.setPositionState({
                duration: duration,
                position: Math.min(trackTime(), duration),
                playbackRate: audio.playbackRate || 1,
            });
        } catch (e) {}
    }

    function inLastMinute() {
        const duration = trackDuration();
        return current && isFinite(duration) && duration - trackTime() <= 60;
    }

    function renderUpNext() {
        if (!inLastMinute()) {
            showUpNext(false);
            return;
        }
        const from = current;
        getAdjacent(from, 1).then(function (next) {
            if (!next || current !== from || !inLastMinute()) return;
            upNextLink.textContent = next.release.tracks[next.index].title;
            upNextLink.href = next.release.page;
            showUpNext(true);
        });
    }

    // On mobile the label takes its own line, which changes the player's height.
    function showUpNext(visible) {
        if (upNext.hidden === !visible) return;
        upNext.hidden = !visible;
        syncHeight();
    }

    // Whether the loaded release is the one on the page being viewed.
    function currentIsOnPage() {
        const pageRelease = findPageRelease();
        return !!(current && pageRelease && current.release.page === pageRelease.page);
    }

    function renderPlayState() {
        const playing = !audio.paused;
        playIcon.className = playing ? 'fa-solid fa-pause' : 'fa-solid fa-play';
        playButton.setAttribute('aria-label', playing ? 'pause' : 'play');

        // In-page controls only show 'pause' while it's their page's release playing.
        const onPage = currentIsOnPage();
        const pagePlaying = playing && onPage;
        document.querySelectorAll('[data-rooms-play]').forEach(function (button) {
            if (!button.querySelector('.eq')) button.insertAdjacentHTML('beforeend', EQ_HTML);
            button.classList.toggle('is-playing', pagePlaying);
            const icon = button.querySelector('i');
            const label = button.querySelector('[data-rooms-play-label]');
            if (icon) {
                icon.classList.toggle('fa-play', !pagePlaying);
                icon.classList.toggle('fa-pause', pagePlaying);
            }
            if (label) {
                if (!label.dataset.playText) label.dataset.playText = label.textContent;
                label.textContent = pagePlaying ? 'Pause' : label.dataset.playText;
            }
        });
        document.querySelectorAll('[data-track-index]').forEach(function (row) {
            // Highlighted once it has started, not merely queued up by Play.
            const isCurrent = onPage && current.index === Number(row.dataset.trackIndex)
                && (playing || audio.currentTime > 0);
            row.classList.toggle('is-current', isCurrent);
            row.classList.toggle('is-playing', isCurrent && playing);
            row.querySelector('.tracklist-icon i').className = isCurrent && playing ? 'fa-solid fa-pause' : 'fa-solid fa-play';
            row.setAttribute('aria-label', (isCurrent && playing ? 'pause ' : 'play ') + row.dataset.title);
        });
    }

    // Decorative 'now playing' bars (animated in css/site.css; not driven by the audio).
    const EQ_HTML = '<span class="eq" aria-hidden="true">' + '<i></i>'.repeat(5) + '</span>';

    function renderVolume() {
        const silent = audio.muted || audio.volume === 0;
        muteIcon.className = silent ? 'fa-solid fa-volume-xmark'
            : audio.volume < 0.5 ? 'fa-solid fa-volume-low' : 'fa-solid fa-volume-high';
        muteButton.setAttribute('aria-label', audio.muted ? 'unmute' : 'mute');
        volume.value = audio.muted ? 0 : audio.volume;
        setFill(volume);
    }

    // Publishes the player's height as --player-h so the page can keep content
    // (and other fixed bars) clear of it.
    function syncHeight() {
        const height = player.hidden ? 0 : player.offsetHeight;
        document.documentElement.style.setProperty('--player-h', height + 'px');
        document.dispatchEvent(new CustomEvent('rooms:player-resize'));
    }

    function show(visible) {
        if (player.hidden === !visible) return;
        player.hidden = !visible;
        syncHeight();
    }

    function load(release, index) {
        const track = release.tracks[index];
        const sameFile = current && audio.currentSrc && current.release.tracks[current.index].src === track.src;
        current = { release: release, index: index };
        if (sameFile) {
            // Another track of the gapless release already loaded: just move the playhead.
            audio.currentTime = track.start;
        } else {
            audio.src = track.src;
            audio.load();
            if (track.start) audio.currentTime = track.start;
        }
        renderTrackInfo();
        renderTime();
        renderPlayState();
    }

    // Seeks made before a new file's metadata arrives may not stick everywhere;
    // reapply the current track's start if the playhead is still before it.
    audio.addEventListener('loadedmetadata', function () {
        if (current && audio.currentTime < trackStart()) audio.currentTime = trackStart();
    });

    function renderTrackInfo() {
        const release = current.release;
        const track = currentTrack();
        // Multi-track releases show "release / track" with the " / track" in
        // grey; the whole label links to the release's post. The link itself is
        // grey (so a cut-off "..." is too) with the leading name in white.
        const multi = release.tracks.length > 1;
        const name = document.createElement('span');
        name.className = 'rp-name';
        name.textContent = multi ? release.title : track.title;
        titleLink.replaceChildren(name);
        if (multi) titleLink.append(' / ' + track.title);
        titleLink.href = release.page;
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: track.title,
                artist: 'rooms',
                album: release.tracks.length > 1 ? release.title : '',
                artwork: release.artwork ? [{ src: release.artwork }] : [],
            });
        }
    }

    function playFrom(release, index) {
        load(release, index);
        show(true);
        audio.play().catch(function () {});
    }

    function togglePlayback() {
        if (audio.paused) {
            audio.play().catch(function () {});
        } else {
            audio.pause();
        }
    }

    function unload() {
        current = null;
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
    }

    function pageKey(url) {
        return new URL(url).href.split('#')[0].replace(/index\.html$/, '');
    }

    // The post's cover art (square, unlike some link-preview images), for the
    // lock screen / media controls.
    function artworkFromDocument(doc, pageUrl) {
        const cover = doc.querySelector('img[data-lightbox]');
        if (cover) return new URL(cover.getAttribute('src'), pageUrl).href;
        return (doc.querySelector('meta[property="og:image"]') || {}).content;
    }

    function releaseFromDocument(doc, pageUrl) {
        const metas = doc.querySelectorAll('meta[name="rooms:track"]');
        if (!metas.length) return null;
        const name = doc.querySelector('meta[name="rooms:release"]');
        const albumSrc = name && name.dataset.src ? new URL(name.dataset.src, pageUrl).href : null;
        const tracks = Array.from(metas).map(function (meta) {
            return {
                src: albumSrc || new URL(meta.getAttribute('content'), pageUrl).href,
                title: meta.dataset.title || '',
                start: albumSrc ? Number(meta.dataset.start) || 0 : 0,
                end: Number(meta.dataset.end) || null,
            };
        });
        return {
            page: pageKey(pageUrl),
            title: name ? name.getAttribute('content') : tracks[0].title,
            artwork: artworkFromDocument(doc, pageUrl),
            gapless: !!albumSrc,
            tracks: tracks,
        };
    }

    function findPageRelease() {
        return releaseFromDocument(document, location.href);
    }

    async function fetchDocument(url) {
        // 'no-cache' revalidates with the server rather than reusing a stale copy.
        const response = await fetch(url, { headers: { Accept: 'text/html' }, cache: 'no-cache' });
        const type = response.headers.get('content-type') || '';
        if (!response.ok || type.indexOf('text/html') === -1) throw new Error('not a page');
        return new DOMParser().parseFromString(await response.text(), 'text/html');
    }

    // Post pages in homepage order, fetched once per visit.
    let releaseOrder;
    function getReleaseOrder() {
        if (!releaseOrder) {
            releaseOrder = fetchDocument(siteRoot).then(function (home) {
                return Array.from(home.querySelectorAll('a.release-card')).map(function (card) {
                    return pageKey(new URL(card.getAttribute('href'), siteRoot));
                });
            }).catch(function (error) {
                releaseOrder = null;
                throw error;
            });
        }
        return releaseOrder;
    }

    // Each post's release (or null), fetched at most once per visit.
    const pageReleases = new Map();
    function getReleaseForPage(page) {
        if (!pageReleases.has(page)) {
            pageReleases.set(page, fetchDocument(page).then(function (doc) {
                return releaseFromDocument(doc, page);
            }).catch(function () {
                pageReleases.delete(page);
                return null;
            }));
        }
        return pageReleases.get(page);
    }

    // The nearest post after (step 1) or before (step -1) `page` in homepage
    // order that has audio, wrapping round; null when no other post has any.
    const adjacentReleases = new Map();
    function getAdjacentRelease(page, step) {
        const key = step + ' ' + page;
        if (!adjacentReleases.has(key)) {
            adjacentReleases.set(key, (async function () {
                const order = await getReleaseOrder();
                const n = order.length;
                const start = order.indexOf(page);
                for (let k = 1; k <= n; k++) {
                    const candidate = start < 0 && step < 0
                        ? order[n - k]
                        : order[(((start + step * k) % n) + n) % n];
                    if (candidate === page) continue;
                    const found = await getReleaseForPage(candidate);
                    if (found) return found;
                }
                return null;
            })().catch(function () {
                adjacentReleases.delete(key);
                return null;
            }));
        }
        return adjacentReleases.get(key);
    }

    // The track after (step 1) or before (step -1) `pos`: within its release
    // first, then the first (or last) track of the neighbouring release.
    async function getAdjacent(pos, step) {
        const tracks = pos.release.tracks;
        const index = pos.index + step;
        if (index >= 0 && index < tracks.length) return { release: pos.release, index: index };
        const release = await getAdjacentRelease(pos.release.page, step);
        if (release) return { release: release, index: step > 0 ? 0 : release.tracks.length - 1 };
        // The only release with audio: wrap round within it.
        return tracks.length > 1 ? { release: pos.release, index: (index + tracks.length) % tracks.length } : null;
    }

    let advancing = false;
    let playStartedBy = '';
    // auto: the player is moving on by itself as a track ends (for analytics).
    async function playAdjacent(step, auto) {
        if (!current || advancing) return;
        advancing = true;
        try {
            const from = current;
            const next = await getAdjacent(from, step);
            // Give up if something else started playing meanwhile.
            if (!next || current !== from || !audio.paused) return;
            load(next.release, next.index);
            playStartedBy = auto ? 'continued' : '';
            audio.play().catch(function () {});
        } finally {
            advancing = false;
        }
    }

    // Track lists: a [data-tracklist] element on a multi-track post is filled
    // with a collapsed 'Tracks' toggle and a row per track (number, title,
    // duration); rows play that track. Long lists get a second toggle at the
    // bottom so they can be closed without scrolling back up.
    const durations = new Map();
    function tracklistToggle() {
        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'tracklist-toggle';
        toggle.setAttribute('aria-expanded', 'false');
        toggle.innerHTML = '<span class="tracklist-toggle-icon"><i class="fa-solid fa-plus"></i></span><span>Tracks</span>';
        return toggle;
    }

    function setTracklistOpen(list, open) {
        list.classList.toggle('is-open', open);
        list.querySelector('.tracklist-panel').inert = !open;
        list.querySelectorAll('.tracklist-toggle').forEach(function (toggle) {
            toggle.setAttribute('aria-expanded', String(open));
            toggle.querySelector('i').className = open ? 'fa-solid fa-minus' : 'fa-solid fa-plus';
        });
    }

    function renderTracklist() {
        const list = document.querySelector('[data-tracklist]');
        const release = findPageRelease();
        if (!list || !release) return;
        list.innerHTML = '';
        list.appendChild(tracklistToggle());
        const panel = document.createElement('div');
        panel.className = 'tracklist-panel';
        const rows = document.createElement('div');
        rows.className = 'tracklist-rows';
        panel.appendChild(rows);
        list.appendChild(panel);
        release.tracks.forEach(function (track, index) {
            const row = document.createElement('button');
            row.type = 'button';
            row.className = 'tracklist-row';
            row.dataset.trackIndex = index;
            row.dataset.title = track.title;
            row.innerHTML = '<span class="tracklist-num"></span><span class="tracklist-icon"><i class="fa-solid fa-play"></i></span>'
                + '<span class="tracklist-title"></span>' + EQ_HTML + '<span class="tracklist-time"></span>';
            row.querySelector('.tracklist-num').textContent = index + 1;
            row.querySelector('.tracklist-title').textContent = track.title;
            const time = row.querySelector('.tracklist-time');
            const next = release.gapless && release.tracks[index + 1];
            // A track runs to its trimmed end, else (gapless) the next start,
            // else the end of its file.
            const stop = track.end || (next && next.start);
            const span = function (fileDuration) { return (stop || fileDuration) - track.start; };
            time.textContent = formatTime(span(durations.get(track.src)));
            if (!stop && !durations.has(track.src)) {
                durations.set(track.src, NaN);
                const probe = new Audio();
                probe.preload = 'metadata';
                probe.addEventListener('loadedmetadata', function () {
                    durations.set(track.src, probe.duration);
                    time.textContent = formatTime(span(probe.duration));
                });
                probe.src = track.src;
            }
            rows.appendChild(row);
        });
        if (release.tracks.length > 10) rows.appendChild(tracklistToggle());
        setTracklistOpen(list, false);
    }

    document.addEventListener('click', function (event) {
        const toggle = event.target.closest('.tracklist-toggle');
        if (!toggle) return;
        const list = toggle.closest('[data-tracklist]');
        const top = list.querySelector('.tracklist-toggle');
        // Closing from the bottom: bring the top toggle back on screen first.
        if (toggle !== top && top.getBoundingClientRect().top < 0) top.scrollIntoView({ block: 'center' });
        setTracklistOpen(list, !list.classList.contains('is-open'));
    });

    // Fills each .dot-grid with as many 4px dots as fit at least 4px apart,
    // spread evenly so the outer dots sit on all four edges. The dots live in
    // an absolutely positioned layer so they never affect the grid's size, and
    // are redrawn whenever the grid resizes (e.g. once the artwork loads).
    const dotGridObserver = 'ResizeObserver' in window ? new ResizeObserver(function (entries) {
        entries.forEach(function (entry) { layoutDotGrid(entry.target); });
    }) : null;

    function layoutDotGrid(grid) {
        const fit = function (size) { return Math.floor((size + 4) / 8); };
        const cols = fit(grid.clientWidth), rows = fit(grid.clientHeight);
        const key = cols + 'x' + rows;
        if (grid.dataset.dots === key) return;
        grid.dataset.dots = key;
        const layer = grid.firstElementChild;
        layer.style.gridTemplateColumns = 'repeat(' + cols + ', 4px)';
        layer.style.gridTemplateRows = 'repeat(' + rows + ', 4px)';
        layer.innerHTML = '<i></i>'.repeat(cols * rows);
    }

    function fillDotGrids() {
        if (dotGridObserver) dotGridObserver.disconnect();
        document.querySelectorAll('.dot-grid').forEach(function (grid) {
            if (!grid.firstElementChild) grid.innerHTML = '<div class="dot-grid-dots"></div>';
            layoutDotGrid(grid);
            if (dotGridObserver) dotGridObserver.observe(grid);
        });
    }

    // Points the post's 'next' links at the following post in homepage order,
    // looping from the last back to the first. Pages not on the homepage keep
    // them hidden.
    function linkNextPost() {
        const links = document.querySelectorAll('[data-next-post]');
        if (!links.length) return;
        const page = pageKey(location.href);
        getReleaseOrder().then(function (order) {
            const index = order.indexOf(page);
            if (index < 0 || order.length < 2 || pageKey(location.href) !== page) return;
            links.forEach(function (link) {
                link.href = order[(index + 1) % order.length];
                link.hidden = false;
            });
        }).catch(function () {});
    }

    // Called on first load and after every navigation with the page now showing.
    function syncWithPage() {
        fillDotGrids();
        linkNextPost();
        renderTracklist();
        const pageRelease = findPageRelease();
        const started = current && (!audio.paused || audio.currentTime > 0);

        if (pageRelease) {
            // Keep whatever is already playing; otherwise offer this page's release.
            if (!current || (current.release.page !== pageRelease.page && audio.paused)) load(pageRelease, 0);
            show(true);
        } else if (started) {
            show(true);
        } else {
            if (current) unload();
            show(false);
        }

        // The newsletter's Play links end in #play: start the page's release straight
        // away. Browsers often block sound until the visitor has tapped something; then
        // the release just waits in the player for the Play button, as usual.
        if (pageRelease && location.hash === '#play') {
            history.replaceState(history.state, '', location.pathname + location.search);
            if (!currentIsOnPage() || audio.paused) playFrom(pageRelease, 0);
        }
        renderPlayState();
    }

    playButton.addEventListener('click', togglePlayback);

    // The page's Play button plays its release from the top (or toggles it if
    // it's already loaded); a track list row plays that track (or toggles it).
    document.addEventListener('click', function (event) {
        const row = event.target.closest('[data-track-index]');
        if (!row && !event.target.closest('[data-rooms-play]')) return;
        const pageRelease = findPageRelease();
        if (!pageRelease) return;
        const onPage = currentIsOnPage();
        if (row) {
            const index = Number(row.dataset.trackIndex);
            if (!onPage || current.index !== index) return playFrom(pageRelease, index);
        } else if (!onPage) {
            return playFrom(pageRelease, 0);
        }
        show(true);
        togglePlayback();
    });

    muteButton.addEventListener('click', function () {
        if (audio.volume === 0) {
            audio.volume = 1;
            audio.muted = false;
        } else {
            audio.muted = !audio.muted;
        }
    });

    volume.addEventListener('input', function () {
        audio.volume = Number(volume.value);
        audio.muted = audio.volume === 0;
    });

    // While dragging, only the time label follows the thumb; the audio jumps on release.
    seek.addEventListener('input', function () {
        seeking = true;
        setFill(seek);
        currentLabel.textContent = formatTime((seek.value / 1000) * trackDuration());
    });
    seek.addEventListener('change', function () {
        seeking = false;
        const duration = trackDuration();
        // Stop just short of the end so a gapless track doesn't tip into the next.
        if (isFinite(duration)) audio.currentTime = trackStart() + Math.min((seek.value / 1000) * duration, duration - 0.25);
        renderTime();
    });

    ['timeupdate', 'durationchange', 'loadedmetadata', 'emptied'].forEach(function (type) {
        audio.addEventListener(type, renderTime);
    });
    ['play', 'pause', 'ended'].forEach(function (type) {
        audio.addEventListener(type, renderPlayState);
    });
    ['play', 'pause', 'seeked', 'ratechange'].forEach(function (type) {
        audio.addEventListener(type, renderPosition);
    });
    audio.addEventListener('volumechange', renderVolume);
    audio.addEventListener('ended', function () {
        // A gapless release's file ends on its last track, whatever the last
        // timeupdate said.
        if (current && current.release.gapless) current = { release: current.release, index: current.release.tracks.length - 1 };
        playAdjacent(1, true);
    });

    // Lock-screen / media-key controls. iOS drops handlers set before the page
    // becomes "now playing" (and again when its session restarts), falling back
    // to skip-10s buttons, so they're re-registered whenever that may happen.
    function setMediaAction(action, handler) {
        try {
            navigator.mediaSession.setActionHandler(action, handler);
        } catch (e) {}
    }

    // Next/previous track. Within a gapless release that's just a seek, done
    // without pausing (pausing first made iOS stutter and skip the new track's
    // first second); otherwise stop and load the adjacent track.
    function skipTrack(step) {
        const index = current ? current.index + step : -1;
        if (current && current.release.gapless && index >= 0 && index < current.release.tracks.length) {
            load(current.release, index);
            return;
        }
        audio.pause();
        playAdjacent(step);
    }

    function registerMediaActions() {
        if (!('mediaSession' in navigator)) return;
        setMediaAction('play', function () { audio.play().catch(function () {}); });
        setMediaAction('pause', function () { audio.pause(); });
        setMediaAction('nexttrack', function () { skipTrack(1); });
        // Like most players: restart the track unless it has only just begun.
        setMediaAction('previoustrack', function () {
            if (trackTime() > 3) {
                audio.currentTime = trackStart();
                return;
            }
            skipTrack(-1);
        });
        // iOS shows skip-10s buttons instead of previous/next while these are handled.
        setMediaAction('seekbackward', null);
        setMediaAction('seekforward', null);
        setMediaAction('seekto', function (details) { audio.currentTime = trackStart() + details.seekTime; });
    }

    registerMediaActions();
    ['play', 'playing', 'loadedmetadata'].forEach(function (type) {
        audio.addEventListener(type, registerMediaActions);
    });
    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') registerMediaActions();
    });
    window.addEventListener('pageshow', registerMediaActions);
    // When a new file starts while the phone is locked, iOS can reset the
    // controls after all of the above have fired, so register once more about a
    // second into each new file.
    let actionsSrc = null;
    audio.addEventListener('timeupdate', function () {
        if (audio.currentTime < 1 || actionsSrc === audio.currentSrc) return;
        actionsSrc = audio.currentSrc;
        registerMediaActions();
    });

    // Re-measure whenever the player's size changes for any reason (a late
    // font or stylesheet, 'up next' wrapping, the window resizing), so things
    // pinned above it never sit at a stale height.
    if ('ResizeObserver' in window) new ResizeObserver(syncHeight).observe(player);
    window.addEventListener('resize', syncHeight);
    renderVolume();

    // ---------------------------------------------------------------------
    // Artwork lightbox
    // ---------------------------------------------------------------------

    const lightbox = document.createElement('div');
    lightbox.id = 'rooms-lightbox';
    lightbox.hidden = true;
    const lightboxImage = document.createElement('img');
    lightboxImage.alt = '';
    lightbox.appendChild(lightboxImage);

    function closeLightbox() {
        lightbox.hidden = true;
        lightboxImage.removeAttribute('src');
    }

    document.addEventListener('click', function (event) {
        const image = event.target.closest('img[data-lightbox]');
        if (!image || !window.matchMedia('(min-width: 768px)').matches) return;
        lightboxImage.src = image.currentSrc || image.src;
        lightboxImage.alt = image.alt;
        lightbox.hidden = false;
    });
    lightbox.addEventListener('click', closeLightbox);
    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && !lightbox.hidden) closeLightbox();
    });
    document.addEventListener('rooms:navigate', closeLightbox);

    // ---------------------------------------------------------------------
    // Newsletter sign-up
    // ---------------------------------------------------------------------

    document.addEventListener('submit', function (event) {
        const form = event.target.closest('form[data-newsletter]');
        if (!form) return;
        event.preventDefault();
        const button = form.querySelector('button[type="submit"]');
        const message = form.querySelector('[data-newsletter-message]');
        const data = new FormData(form);
        data.append('isAjax', '1');
        button.disabled = true;
        fetch(form.action, { method: 'POST', body: data, mode: 'no-cors' }).then(function () {
            form.querySelector('div.flex').hidden = true;
            message.textContent = 'Thanks for subscribing!';
            track('signup');
        }, function () {
            button.disabled = false;
            message.textContent = 'That didn\'t go through. Please check your connection and try again.';
        }).then(function () {
            message.hidden = false;
        });
    });

    // ---------------------------------------------------------------------
    // Analytics
    // ---------------------------------------------------------------------

    const ANALYTICS_URL = 'https://script.google.com/macros/s/AKfycbx1fBPclcrrBbemfSBmTDhkN5GO6Nqo5bFYI6uqrQoPG0iODJ50gn4M6Cs1O_o_Hnhr/exec';
    const analyticsOn = Boolean(ANALYTICS_URL) && navigator.sendBeacon
        && (/(^|\.)thisisrooms\.com$/.test(location.hostname) || new URLSearchParams(location.search).has('analytics-test'));
    const visitId = Math.random().toString(36).slice(2, 10);
    // The page being timed. Its title is kept since the next page's head is
    // swapped in before 'rooms:navigate' fires.
    let analyticsPage = location.pathname;
    let analyticsTitle = document.title;

    // Rows: visit, event, page, detail, value, source (the Sheet adds the time).
    function track(event, detail, value, source, page) {
        if (!analyticsOn) return;
        navigator.sendBeacon(ANALYTICS_URL, JSON.stringify({
            visit: visitId,
            event: event,
            page: page || analyticsPage,
            detail: detail || '',
            value: value == null ? '' : String(value),
            source: source || '',
        }));
    }

    // Where the visit came from: a utm_source, the referring site, or the
    // newsletter (its Play links end in #play and email apps send no referrer).
    function visitSource() {
        const utm = new URLSearchParams(location.search).get('utm_source');
        if (utm) return utm;
        if (document.referrer) {
            const host = new URL(document.referrer).hostname.replace(/^www\./, '');
            if (!/(^|\.)thisisrooms\.com$/.test(host)) return host;
        }
        return location.hash === '#play' ? 'email' : '';
    }

    // Time on page counts only while the tab is visible. It's sent whenever the
    // page is hidden or left, so a page can have several 'time' rows to add up.
    let visibleSince = document.visibilityState === 'visible' ? Date.now() : null;

    function flushTime() {
        if (visibleSince === null) return;
        const seconds = Math.round((Date.now() - visibleSince) / 1000);
        visibleSince = null;
        if (seconds > 0) track('time', analyticsTitle, seconds);
    }

    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') {
            visibleSince = Date.now();
        } else {
            flushTime();
        }
    });

    document.addEventListener('rooms:navigate', function () {
        flushTime();
    });

    document.addEventListener('rooms:pageshow', function () {
        analyticsPage = location.pathname;
        analyticsTitle = document.title;
        if (document.visibilityState === 'visible') visibleSince = Date.now();
        track('view', document.title);
    });

    // A play is counted once per track per visit, against the release's post
    // (whichever page is open). value is 'continued' when the player moved on to
    // it by itself after the previous track ended. Tracks of a gapless release
    // after the first one played aren't counted, as playback flows straight on.
    const playedTracks = new Set();
    audio.addEventListener('play', function () {
        const by = playStartedBy;
        playStartedBy = '';
        const track_ = currentTrack();
        if (!track_) return;
        const key = track_.src + '#' + track_.start;
        if (playedTracks.has(key)) return;
        playedTracks.add(key);
        const release = current.release;
        const name = release.tracks.length > 1 ? release.title + ' / ' + track_.title : track_.title;
        track('play', name, by, '', new URL(release.page, location.href).pathname);
    });

    // Links to other sites, named by service.
    const SERVICES = [
        ['bandcamp.com', 'bandcamp'],
        ['music.apple.com', 'apple music'],
        ['youtube.com', 'youtube'],
        ['youtu.be', 'youtube'],
        ['subvert.fm', 'subvert'],
        ['deezer.com', 'deezer'],
        ['soundcloud.com', 'soundcloud'],
        ['spotify.com', 'spotify'],
        ['instagram.com', 'instagram'],
        ['twitch.tv', 'twitch'],
        ['gumroad.com', 'gumroad'],
        ['substack.com', 'substack'],
    ];

    function trackLinkClick(event) {
        if (event.type === 'auxclick' && event.button !== 1) return;
        const link = event.target.closest && event.target.closest('a[href]');
        if (!link) return;
        const url = new URL(link.href, location.href);
        if (!/^https?:$/.test(url.protocol) || url.origin === location.origin) return;
        const host = url.hostname.replace(/^www\./, '');
        const service = SERVICES.find(function (entry) {
            return host === entry[0] || host.endsWith('.' + entry[0]);
        });
        track('click', service ? service[1] : host, url.href);
    }

    document.addEventListener('click', trackLinkClick, true);
    document.addEventListener('auxclick', trackLinkClick, true);

    // ---------------------------------------------------------------------
    // In-place navigation
    // ---------------------------------------------------------------------

    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

    function rememberScroll() {
        history.replaceState(Object.assign({}, history.state, { scrollY: window.scrollY }), '');
    }

    function scrollToTarget(url, scrollY) {
        const hashTarget = url.hash && document.getElementById(decodeURIComponent(url.hash.slice(1)));
        if (scrollY != null) {
            window.scrollTo({ top: scrollY, behavior: 'instant' });
        } else if (hashTarget) {
            hashTarget.scrollIntoView({ behavior: 'instant' });
        } else {
            window.scrollTo({ top: 0, behavior: 'instant' });
        }
    }

    // Scripts inserted via DOM methods don't run, so each one is swapped for a fresh copy.
    function runScript(old) {
        if (old.type && old.type !== 'text/javascript' && old.type !== 'module') return;
        const script = document.createElement('script');
        for (const attr of old.attributes) script.setAttribute(attr.name, attr.value);
        script.textContent = old.textContent;
        old.replaceWith(script);
    }

    function swapHead(next) {
        document.title = next.title;
        document.head.querySelectorAll('meta[name], meta[property], link[rel="canonical"]').forEach(function (el) {
            el.remove();
        });
        next.head.querySelectorAll('meta[name], meta[property], link[rel="canonical"]').forEach(function (el) {
            document.head.appendChild(document.importNode(el, true));
        });
    }

    function swapBody(next) {
        document.dispatchEvent(new CustomEvent('rooms:navigate'));
        Array.from(document.body.childNodes).forEach(function (node) {
            if (node !== player && node !== lightbox) node.remove();
        });
        for (const attr of Array.from(document.body.attributes)) document.body.removeAttribute(attr.name);
        for (const attr of next.body.attributes) document.body.setAttribute(attr.name, attr.value);

        const nodes = Array.from(next.body.childNodes).map(function (node) {
            return document.importNode(node, true);
        });
        nodes.forEach(function (node) { document.body.insertBefore(node, player); });
        // Run scripts only once the whole page is in place, in document order.
        nodes.forEach(function (node) {
            if (node.nodeType !== 1) return;
            if (node.tagName === 'SCRIPT') runScript(node);
            else node.querySelectorAll('script').forEach(runScript);
        });
    }

    let navigationId = 0;
    let currentPage = location.pathname + location.search;

    async function navigate(url, options) {
        const id = ++navigationId;
        let next;
        try {
            next = await fetchDocument(url.href);
        } catch (e) {
            location.href = url.href;
            return;
        }
        if (id !== navigationId) return;

        // A newer deploy of this script needs a real page load to take effect.
        // Pages referencing an older version (e.g. a stale copy) are swapped in as normal.
        const nextScript = next.querySelector('script[src*="js/site.js"]');
        if (nextScript && scriptVersion(new URL(nextScript.getAttribute('src'), url)) > scriptVersion(new URL(scriptSrc))) {
            location.href = url.href;
            return;
        }

        if (options.push) {
            rememberScroll();
            history.pushState({}, '', url.href);
        }
        // History is updated first so relative URLs in the new page resolve correctly.
        currentPage = url.pathname + url.search;
        swapHead(next);
        swapBody(next);
        syncWithPage();
        scrollToTarget(url, options.scrollY);
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                document.dispatchEvent(new CustomEvent('rooms:pageshow'));
            });
        });
    }

    function isInternalPage(url) {
        if (url.origin !== location.origin) return false;
        const last = url.pathname.split('/').pop();
        return last === '' || last.indexOf('.') === -1 || /\.html?$/.test(last);
    }

    document.addEventListener('click', function (event) {
        if (event.defaultPrevented || event.button !== 0) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const link = event.target.closest('a[href]');
        if (!link || (link.target && link.target !== '_self') || link.hasAttribute('download')) return;

        const url = new URL(link.href, location.href);
        if (!isInternalPage(url)) return;
        // Same-page anchors keep their default behaviour.
        if (url.pathname === location.pathname && url.search === location.search && url.hash) return;

        event.preventDefault();
        navigate(url, { push: true });
    });

    window.addEventListener('popstate', function (event) {
        const url = new URL(location.href);
        const scrollY = event.state && event.state.scrollY;
        // Back/forward between anchors on the same page needs no fetch.
        if (url.pathname + url.search === currentPage) return scrollToTarget(url, scrollY);
        navigate(url, { push: false, scrollY: scrollY });
    });

    // Back/forward should return to where the reader was.
    window.addEventListener('pagehide', rememberScroll);

    function init() {
        document.body.appendChild(player);
        document.body.appendChild(lightbox);
        syncWithPage();
        track('view', document.title, '', visitSource());
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
