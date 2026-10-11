/*
 * Site-wide script, loaded once per visit.
 *
 * 1. Floating audio player. Pages opt in with one tag per track, in order:
 *      <meta name="rooms:track" content="path/to/track.mp3" data-title="track name">
 *    plus, for multi-track releases, <meta name="rooms:release" content="name">.
 *    A button with a data-rooms-play attribute plays (or pauses) the page's
 *    release from the top; its icon (an <i>) and [data-rooms-play-label] text
 *    follow the play state. A [data-tracklist] element is filled with a row per
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
    // A release is { page, title, artwork, tracks: [{ src, title }] }, read from
    // a post's <meta name="rooms:track"> tags; single tracks are releases of one.
    let current = null; // { release, index }
    let seeking = false;

    function currentTrack() {
        return current && current.release.tracks[current.index];
    }

    // 'track' on its own, or 'track · release' for multi-track releases.
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
        const duration = audio.duration;
        durationLabel.textContent = formatTime(duration);
        seek.disabled = !isFinite(duration);
        if (seeking) return;
        currentLabel.textContent = formatTime(audio.currentTime);
        seek.value = isFinite(duration) && duration > 0 ? (audio.currentTime / duration) * 1000 : 0;
        setFill(seek);
        renderUpNext();
    }

    function inLastMinute() {
        return current && isFinite(audio.duration) && audio.duration - audio.currentTime <= 60;
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
            row.querySelector('.tracklist-icon i').className = isCurrent && playing ? 'fa-solid fa-pause' : 'fa-solid fa-play';
            row.setAttribute('aria-label', (isCurrent && playing ? 'pause ' : 'play ') + row.dataset.title);
        });
    }

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
        current = { release: release, index: index };
        const track = release.tracks[index];
        audio.src = track.src;
        audio.load();
        // Multi-track releases show "track / release", the release name in grey.
        titleLink.textContent = track.title;
        if (release.tracks.length > 1) {
            const album = document.createElement('span');
            album.className = 'rp-album';
            album.textContent = ' / ' + release.title;
            titleLink.appendChild(album);
        }
        titleLink.href = release.page;
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: track.title,
                artist: 'rooms',
                album: release.tracks.length > 1 ? release.title : '',
                artwork: release.artwork ? [{ src: release.artwork }] : [],
            });
        }
        renderTime();
        renderPlayState();
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
        const tracks = Array.from(metas).map(function (meta) {
            return { src: new URL(meta.getAttribute('content'), pageUrl).href, title: meta.dataset.title || '' };
        });
        const name = doc.querySelector('meta[name="rooms:release"]');
        return {
            page: pageKey(pageUrl),
            title: name ? name.getAttribute('content') : tracks[0].title,
            artwork: artworkFromDocument(doc, pageUrl),
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
    async function playAdjacent(step) {
        if (!current || advancing) return;
        advancing = true;
        try {
            const from = current;
            const next = await getAdjacent(from, step);
            // Give up if something else started playing meanwhile.
            if (!next || current !== from || !audio.paused) return;
            load(next.release, next.index);
            audio.play().catch(function () {});
        } finally {
            advancing = false;
        }
    }

    // Track lists: a [data-tracklist] element on a multi-track post is filled
    // with a collapsed 'track list' toggle and a row per track (number, title,
    // duration); rows play that track. Long lists get a second toggle at the
    // bottom so they can be closed without scrolling back up.
    const durations = new Map();
    function tracklistToggle() {
        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'tracklist-toggle';
        toggle.setAttribute('aria-expanded', 'false');
        toggle.innerHTML = '<span class="tracklist-toggle-icon"><i class="fa-solid fa-plus"></i></span><span>track list</span>';
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
                + '<span class="tracklist-title"></span><span class="tracklist-time"></span>';
            row.querySelector('.tracklist-num').textContent = index + 1;
            row.querySelector('.tracklist-title').textContent = track.title;
            const time = row.querySelector('.tracklist-time');
            time.textContent = formatTime(durations.get(track.src));
            if (!durations.has(track.src)) {
                const probe = new Audio();
                probe.preload = 'metadata';
                probe.addEventListener('loadedmetadata', function () {
                    durations.set(track.src, probe.duration);
                    time.textContent = formatTime(probe.duration);
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
        currentLabel.textContent = formatTime((seek.value / 1000) * audio.duration);
    });
    seek.addEventListener('change', function () {
        seeking = false;
        if (isFinite(audio.duration)) audio.currentTime = (seek.value / 1000) * audio.duration;
        renderTime();
    });

    ['timeupdate', 'durationchange', 'loadedmetadata', 'emptied'].forEach(function (type) {
        audio.addEventListener(type, renderTime);
    });
    ['play', 'pause', 'ended'].forEach(function (type) {
        audio.addEventListener(type, renderPlayState);
    });
    audio.addEventListener('volumechange', renderVolume);
    audio.addEventListener('ended', function () { playAdjacent(1); });

    // Lock-screen / media-key controls. iOS drops handlers set before the page
    // becomes "now playing" (and again when its session restarts), falling back
    // to skip-10s buttons, so they're re-registered whenever that may happen.
    function setMediaAction(action, handler) {
        try {
            navigator.mediaSession.setActionHandler(action, handler);
        } catch (e) {}
    }

    function registerMediaActions() {
        if (!('mediaSession' in navigator)) return;
        setMediaAction('play', function () { audio.play().catch(function () {}); });
        setMediaAction('pause', function () { audio.pause(); });
        setMediaAction('nexttrack', function () {
            audio.pause();
            playAdjacent(1);
        });
        // Like most players: restart the track unless it has only just begun.
        setMediaAction('previoustrack', function () {
            if (audio.currentTime > 3) {
                audio.currentTime = 0;
                return;
            }
            audio.pause();
            playAdjacent(-1);
        });
        // iOS shows skip-10s buttons instead of previous/next while these are handled.
        setMediaAction('seekbackward', null);
        setMediaAction('seekforward', null);
        setMediaAction('seekto', function (details) { audio.currentTime = details.seekTime; });
    }

    registerMediaActions();
    ['play', 'playing', 'loadedmetadata'].forEach(function (type) {
        audio.addEventListener(type, registerMediaActions);
    });
    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') registerMediaActions();
    });
    window.addEventListener('pageshow', registerMediaActions);

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
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
