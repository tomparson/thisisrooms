/*
 * Site-wide script, loaded once per visit.
 *
 * 1. Floating audio player. Pages opt in with
 *      <meta name="rooms:audio" content="path/to/track.mp3">
 *      <meta name="rooms:audio-title" content="track name">
 *    and can add a button with a data-rooms-play attribute that plays (or pauses)
 *    the page's track. Its icon (an <i>) and [data-rooms-play-label] text follow
 *    the play state.
 *
 * 2. In-place navigation. Clicks on internal links fetch the next page and swap
 *    the <body> contents instead of doing a full page load, so the player (and
 *    whatever it is playing) survives navigation. Page scripts are re-run after
 *    each swap; a page script that adds window/document listeners should remove
 *    them when the 'rooms:navigate' event fires on document. 'rooms:pageshow'
 *    fires once the new page has had a frame to lay out (the in-place stand-in
 *    for window 'load').
 */
(function () {
    if (window.roomsSite) return;
    window.roomsSite = true;

    // ---------------------------------------------------------------------
    // Player
    // ---------------------------------------------------------------------

    const style = document.createElement('style');
    style.textContent = `
        body { padding-bottom: var(--player-h, 0px); }
        #rooms-player {
            position: fixed; left: 0; right: 0; bottom: 0; z-index: 60;
            background: rgba(23, 23, 23, 0.96);
            -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);
            border-top: 1px solid rgba(255, 255, 255, 0.08);
            color: #fff;
            padding: 10px 16px calc(10px + env(safe-area-inset-bottom));
        }
        #rooms-player[hidden] { display: none; }
        #rooms-player .rp-inner {
            max-width: 900px; margin: 0 auto;
            display: flex; align-items: center; gap: 14px;
        }
        #rooms-player button {
            flex: none; width: 40px; height: 40px; border-radius: 9999px;
            display: flex; align-items: center; justify-content: center;
            padding: 0; border: 0; cursor: pointer; color: inherit; background: transparent;
            transition: background-color .15s, opacity .15s;
        }
        #rooms-player .rp-play { background: #fff; color: #0E100D; }
        #rooms-player .rp-play:hover { opacity: .85; }
        #rooms-player .rp-play i { font-size: 15px; }
        #rooms-player .rp-play .fa-play { margin-left: 2px; }
        #rooms-player .rp-mute { opacity: .7; }
        #rooms-player .rp-mute:hover { opacity: 1; background: rgba(255, 255, 255, .08); }
        #rooms-player .rp-middle { flex: 1; min-width: 0; }
        #rooms-player .rp-meta {
            display: flex; justify-content: space-between; gap: 12px;
            font-size: 13px; line-height: 1.2; margin-bottom: 6px;
        }
        #rooms-player .rp-title {
            overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
            color: inherit; text-decoration: none;
        }
        #rooms-player a.rp-title:hover { text-decoration: underline; }
        #rooms-player .rp-time { flex: none; opacity: .5; font-variant-numeric: tabular-nums; }
        #rooms-player .rp-right { flex: none; display: flex; align-items: center; gap: 6px; }
        #rooms-player .rp-seek { display: block; }
        #rooms-player .rp-volume { display: none; width: 80px; }
        @media (min-width: 640px) {
            #rooms-player .rp-volume { display: block; }
        }

        #rooms-player input[type=range] {
            -webkit-appearance: none; appearance: none;
            width: 100%; height: 16px; margin: 0; background: transparent; cursor: pointer;
            --fill: 0%;
        }
        #rooms-player input[type=range]:disabled { cursor: default; }
        #rooms-player input[type=range]::-webkit-slider-runnable-track {
            height: 4px; border-radius: 9999px;
            background: linear-gradient(to right, #fff var(--fill), rgba(255, 255, 255, .2) var(--fill));
        }
        #rooms-player input[type=range]::-moz-range-track {
            height: 4px; border-radius: 9999px;
            background: linear-gradient(to right, #fff var(--fill), rgba(255, 255, 255, .2) var(--fill));
        }
        #rooms-player input[type=range]::-webkit-slider-thumb {
            -webkit-appearance: none; appearance: none;
            width: 12px; height: 12px; margin-top: -4px; border: 0; border-radius: 9999px;
            background: #fff;
        }
        #rooms-player input[type=range]::-moz-range-thumb {
            width: 12px; height: 12px; border: 0; border-radius: 9999px; background: #fff;
        }
        #rooms-player input[type=range]:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
    `;
    document.head.appendChild(style);

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
                    <a class="rp-title"></a>
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
    const currentLabel = player.querySelector('.rp-current');
    const durationLabel = player.querySelector('.rp-duration');

    let track = null; // { src, title, page, artwork }
    let seeking = false;

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
    }

    function renderPlayState() {
        const playing = !audio.paused;
        playIcon.className = playing ? 'fa-solid fa-pause' : 'fa-solid fa-play';
        playButton.setAttribute('aria-label', playing ? 'pause' : 'play');

        // In-page play buttons only show 'pause' while it's their page's track playing.
        const pageTrack = findPageTrack();
        const pagePlaying = playing && pageTrack && track && track.src === pageTrack.src;
        document.querySelectorAll('[data-rooms-play]').forEach(function (button) {
            const icon = button.querySelector('i');
            const label = button.querySelector('[data-rooms-play-label]');
            if (icon) {
                icon.classList.toggle('fa-play', !pagePlaying);
                icon.classList.toggle('fa-pause', !!pagePlaying);
            }
            if (label) {
                if (!label.dataset.playText) label.dataset.playText = label.textContent;
                label.textContent = pagePlaying ? 'Pause' : label.dataset.playText;
            }
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

    function load(next) {
        track = next;
        audio.src = next.src;
        audio.load();
        titleLink.textContent = next.title || '';
        titleLink.href = next.page;
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: next.title || '',
                artist: 'rooms',
                artwork: next.artwork ? [{ src: next.artwork }] : [],
            });
        }
        renderTime();
        renderPlayState();
    }

    function unload() {
        track = null;
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
    }

    function findPageTrack() {
        const meta = document.querySelector('meta[name="rooms:audio"]');
        return meta && {
            src: new URL(meta.content, location.href).href,
            title: (document.querySelector('meta[name="rooms:audio-title"]') || {}).content,
            page: location.href.split('#')[0],
            artwork: (document.querySelector('meta[property="og:image"]') || {}).content,
        };
    }

    // Called on first load and after every navigation with the page now showing.
    function syncWithPage() {
        const pageTrack = findPageTrack();
        const started = track && (!audio.paused || audio.currentTime > 0);

        if (pageTrack) {
            // Keep whatever is already playing; otherwise offer this page's track.
            if (!track || (track.src !== pageTrack.src && audio.paused)) load(pageTrack);
            show(true);
        } else if (started) {
            show(true);
        } else {
            if (track) unload();
            show(false);
        }
        renderPlayState();
    }

    playButton.addEventListener('click', function () {
        if (audio.paused) {
            audio.play().catch(function () {});
        } else {
            audio.pause();
        }
    });

    document.addEventListener('click', function (event) {
        if (!event.target.closest('[data-rooms-play]')) return;
        const pageTrack = findPageTrack();
        if (!pageTrack) return;
        if (!track || track.src !== pageTrack.src) load(pageTrack);
        show(true);
        if (audio.paused) {
            audio.play().catch(function () {});
        } else {
            audio.pause();
        }
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

    if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', function () { audio.play().catch(function () {}); });
        navigator.mediaSession.setActionHandler('pause', function () { audio.pause(); });
        try {
            navigator.mediaSession.setActionHandler('seekto', function (details) { audio.currentTime = details.seekTime; });
        } catch (e) {}
    }

    window.addEventListener('resize', syncHeight);
    renderVolume();

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
            if (node !== player) node.remove();
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
            const response = await fetch(url.href, { headers: { Accept: 'text/html' } });
            const type = response.headers.get('content-type') || '';
            if (!response.ok || type.indexOf('text/html') === -1) throw new Error('not a page');
            next = new DOMParser().parseFromString(await response.text(), 'text/html');
        } catch (e) {
            location.href = url.href;
            return;
        }
        if (id !== navigationId) return;

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
        syncWithPage();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
