<!doctype html>
<html lang="en" class="bg-[#0E100D]">
    <head>
        <title>rooms</title>
        
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="description" content="Official website for UK-based electronic music artist, apropos. Buy or stream releases, hear unreleased demos and follow social profiles.">
        <link rel="canonical" href="https://thisisrooms.com" />
        <link rel="manifest" href="/site.webmanifest">
        
        <link rel="icon" type="image/png" href="/images/favicon-48x48.png" sizes="48x48" />
        <link rel="icon" type="image/svg+xml" href="/images/favicon.svg" />
        <link rel="shortcut icon" href="/images/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/images/apple-touch-icon.png" />
        <meta property="og:image" content="https://thisisrooms.com/images/avatar.jpg"> 
        
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="https://unpkg.com/flickity@2/dist/flickity.pkgd.min.js"></script>
        
        <script src="https://cdn.jsdelivr.net/npm/vidage@1.0.1/dist/vidage.min.js"></script>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/vidage@1.0.1/dist/vidage.min.css">
        
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css" rel="stylesheet" integrity="sha512-z3gLpd7yknf1YoNbCzqRKc4qyor8gaKU1qmn+CShxbuBusANI9QpRohGBreCFkKxLhei6S9CQXFEbbKuqLg0DA==" crossorigin="anonymous" referrerpolicy="no-referrer" />
        <link href="https://fonts.googleapis.com/css2?family=Caveat&family=Fredoka:wght@300..700&family=JetBrains+Mono:wght@400&family=JetBrains+Mono:wght@600&display=swap&family=Bebas+Neue&family=Lato:wght@300" rel="stylesheet" />
        <link rel="stylesheet" href="https://unpkg.com/flickity@2/dist/flickity.min.css">
        <style type="text/css">
            html {
                  scroll-behavior: smooth;
            }
        </style>
    </head>
    <body>
        <div class="min-h-dvh w-full flex text-white items-center justify-center" id="menu">
            <div class="py-[100px] px-10">
                <div class="mb-12 flex flex-col justify-center gap-4">
                    <div>
                        <img src="/images/avatar.jpg" alt="artist photo for apropos" class="rounded-full h-[80px] w-[80px]" />
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
        <script type="text/javascript">
        
            document.getElementById('container').style.height = window.innerHeight + "px";
            
            document.getElementById('menu-button').addEventListener('click',function(e) {
                e.preventDefault();
                top: document.getElementById('menu').scrollIntoView();
            });
            
            let rand = Math.ceil(Math.random(0, 1) * 5);
            document.querySelector('#slide-2-bg-image').style.backgroundImage = "url('slide-2/Cover " + rand + "B.jpg')";
            
            var flkty = new Flickity( '#slider', {
              cellAlign: 'left',
              contain: true,
              pageDots: true,
              prevNextButtons: false,
              arrowShape: "M62.0008 84L65.7036 80.2972L35.2522 49.8457L65.6453 19.4526L61.9425 15.7498L28 49.6923L28.2118 49.904L28.0583 50.0575L62.0008 84Z"
            });
            if(document.cookie.indexOf('nudged=yes') >= 0) {
                document.getElementById('slider').classList.remove('nudge');
            }
            flkty.on( 'dragStart', function( event, pointer ) {
                document.getElementById('slider').classList.remove('nudge');
                document.cookie = 'nudged=yes;';
            });
            
            new Vidage('#vidage')
        </script>
    </body>
</html>