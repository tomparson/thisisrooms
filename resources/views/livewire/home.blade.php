<div x-data="{
    scrolledPastReleases: false,
    checkScroll() {
        const cardsEl = document.getElementById('releases');
        if (!cardsEl) return;
        const cardsBottom = cardsEl.offsetTop + cardsEl.offsetHeight;
        this.scrolledPastReleases = window.scrollY > (cardsBottom - 200);
    },
    scrollToSection() {
        if (this.scrolledPastReleases) {
            document.getElementById('releases')?.scrollIntoView({ behavior: 'smooth' });
        } else {
            document.getElementById('button')?.scrollIntoView({ behavior: 'smooth' });
        }
    }
}" 
x-init="
    checkScroll();
    window.addEventListener('scroll', () => checkScroll());
">
    {{--<div id="releases" class="min-h-[calc(100dvh-40px)] w-full flex flex-col items-center justify-center">
        <div class="flex-1 bg-red-800 w-full flex items-center justify-center">
            Releases
        </div>
    </div>
    <button id="button" @click="scrollToSection()" class="h-[40px] w-full bg-blue flex items-center justify-center cursor-pointer gap-2">
        <span x-text="scrolledPastReleases ? 'releases' : 'about + links'"></span>
        <i :class="'fa-solid ' + (scrolledPastReleases ? 'fa-arrow-up' : 'fa-arrow-down')"></i>
    </button>--}}
    <div id="about-and-links" class="min-h-dvh w-full flex items-center justify-center">
        <div class="py-[50px] px-10">
            <div class="mb-12 flex flex-col justify-center gap-4">
                <div>
                    <img src="/images/avatar.jpg" alt="artist photo for rooms" class="rounded-full h-[80px] w-[80px]" />
                </div>
                <div class="flex-1">
                    <p class="mb-2"><span class="opacity-90">hi i'm </span><strong class="font-bold">rooms</strong><span class="opacity-90"> (formerly apropos), a UK based electronic music artist</span></p>
                    <p><span class="opacity-90">thanks for checking out my website :)</span></p>
                </div>
            </div>
            <div class="grid xs:grid-cols-2 sm:grid-cols-3 gap-10 max-w-[650px]">
                <!-- bandcamp -->
                <a href="https://this-is-rooms.bandcamp.com" target="_blank" class="opacity-80 hover:opacity-100 transition">
                    <div class="flex gap-3 mb-2">
                        <span class="opacity-80 hover:opacity-100 transition flex items-center justify-center">
                            <i class="fa-brands fa-bandcamp text-white text-3xl"></i>
                        </span>
                    </div>
                    <div>buy full releases and bonus content</div>
                </a>
                <!--apple music-->
                <div class="opacity-80 hover:opacity-100 transition">
                    <div class="flex gap-3 mb-2">
                        <a href="https://music.apple.com/us/artist/apropos/1728293658" target="_blank" class="opacity-80 hover:opacity-100 transition flex items-center justify-center">
                            <i class="fa-brands fa-itunes-note text-white text-3xl"></i>
                        </a>
                    </div>
                    <div><a href="https://music.apple.com/us/artist/apropos/1728293658" target="_blank">stream EPs, singles and collabs</a></div>
                </div>
                <!-- instagram / tiktok -->
                <div class="opacity-80 hover:opacity-100 transition">
                    <div class="flex gap-3 mb-2">
                        <a href="https://www.instagram.com/thisisrooms__/" target="_blank" class="opacity-80 hover:opacity-100 transition flex items-center justify-center">
                            <i class="fa-brands fa-instagram text-white text-3xl flex justify-center"></i>
                        </a>
                        <a href="https://www.tiktok.com/@thisisrooms__" target="_blank" class="opacity-80 hover:opacity-100 transition flex items-center justify-center">
                            <i class="fa-brands fa-tiktok text-white text-2xl flex justify-center"></i>
                        </a>
                    </div>
                    <div><a href="https://www.instagram.com/thisisrooms__/" target="_blank">snippets, previews and promos</a></div>
                </div>
                <!-- soundcloud -->
                <a href="https://soundcloud.com/thisisrooms/popular-tracks" target="_blank" class="opacity-80 hover:opacity-100 transition">
                    <div class="flex gap-3 mb-1">
                        <span class="opacity-80 hover:opacity-100 transition flex items-center justify-center">
                            <i class="fa-brands fa-soundcloud text-white text-4xl flex"></i>
                        </span>
                    </div>
                    <div>ideas, demos and unreleased tracks</div>
                </a>
                <!-- youtube -->
                <a href="https://www.youtube.com/@this_is_rooms" target="_blank" class="opacity-80 hover:opacity-100 transition">
                    <div class="flex gap-3 mb-2">
                        <span class="opacity-80 hover:opacity-100 transition flex items-center justify-center">
                            <i class="fa-brands fa-youtube text-white text-3xl"></i>
                        </span>
                    </div>
                    <div>music videos and past show recordings</div>
                </a>
                <!-- twitch -->
                <a href="https://www.twitch.tv/thisisrooms" target="_blank" class="opacity-80 hover:opacity-100 transition">
                    <div class="flex gap-3 mb-2">
                        <span class="opacity-80 hover:opacity-100 transition flex items-center justify-center">
                            <i class="fa-brands fa-twitch text-white text-3xl"></i>
                        </span>
                    </div>
                    <div>live shows, improv jams and other streams</div>
                </a>
                <!-- gumroad -->
                <a href="https://thisisrooms.gumroad.com" target="_blank" class="opacity-80 hover:opacity-100 transition">
                    <div class="flex gap-3 mb-2">
                        <span class="opacity-80 hover:opacity-100 transition flex items-center justify-center">
                            <div>
                                <svg width="30" height="36" viewBox="0 0 38 37" class="fill-white" xmlns="http://www.w3.org/2000/svg">
                                    <path fill-rule="evenodd" clip-rule="evenodd" d="M37.2227 18.8093C37.2227 28.7828 28.8573 36.8093 18.6113 36.8093C8.36552 36.8093 0 28.7828 0 18.8093C0 8.83586 8.36552 0.809265 18.6113 0.809265C28.8573 0.809265 37.2227 8.83586 37.2227 18.8093ZM8.93886 18.4469C8.93886 23.6819 12.0028 27.8904 17.2115 27.8904C22.42 27.8904 23.7476 23.6819 24.0541 21.5262V27.4798H28.2848V18.0363H18.6412V19.884H23.2371C22.7264 22.1421 21.5009 24.4003 18.6412 24.4003C15.4753 24.4003 13.4326 21.629 13.4326 18.2416C13.4326 14.8542 15.4753 12.0827 18.6412 12.0827C21.6029 12.0827 22.8286 14.2383 22.9306 15.6753H27.7307C27.6286 13.1092 25.3818 8.59268 18.7432 8.59268C12.3091 8.59268 8.93886 13.0065 8.93886 18.4469Z"/>
                                </svg>
                            </div>
                        </span>
                    </div>
                    <div>ableton racks, m4l devices and samples</div>
                </a>
                <!-- mailing list -->
                <a href="https://d899755c77f311efa25d7de4d9011016.eo.page/8ggkh" target="_blank" class="opacity-80 hover:opacity-100 transition">
                    <div class="flex gap-3 mb-2">
                        <span class="opacity-80 hover:opacity-100 transition flex items-center justify-center">
                            <i class="fa-solid fa-inbox text-white text-3xl flex justify-center"></i>
                        </span>
                    </div>
                    <div>new releases and upcoming live shows</div>
                </a>
            </div>
        </div>
    </div>
</div>