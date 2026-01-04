@extends('layout')

@section('content')

<main class="min-h-dvh w-full">
    <div class="py-[30px] md:py-[100px] px-4">
        <div class="max-w-[650px] mx-auto">
            <h1 class="mb-8 font-bold">follow rooms</h1>
            <div class="flex flex-col gap-4 items-start">
                <a href="https://www.instagram.com/thisisrooms__/" target="_blank" class="opacity-80 hover:opacity-100 transition flex items-center justify-center">
                    <div class="flex gap-3 mb-2 items-center justify-start">
                        <span class="w-[50px] flex justify-center items-center opacity-80 hover:opacity-100 transition flex items-center justify-center">
                            <i class="fa-brands fa-instagram text-white text-3xl flex justify-center"></i>
                        </span>
                        <div>follow on instagram</div>
                    </div>
                </a>
                <a href="https://www.tiktok.com/@thisisrooms__" target="_blank" class="opacity-80 hover:opacity-100 transition flex items-center justify-center">
                    <div class="flex gap-3 mb-2 items-center justify-start">
                        <span class="w-[50px] flex justify-center items-center opacity-80 hover:opacity-100 transition flex items-center justify-center">
                            <i class="fa-brands fa-tiktok text-white text-3xl flex justify-center"></i>
                        </span>
                        <div>follow on tiktok</div>
                    </div>
                </a>
                <a href="https://this-is-rooms.bandcamp.com" target="_blank" class="opacity-80 hover:opacity-100 transition">
                    <div class="flex gap-3 mb-2 items-center justify-start">
                        <span class="w-[50px] flex justify-center items-center opacity-80 hover:opacity-100 transition flex items-center justify-center">
                            <i class="fa-brands fa-bandcamp text-white text-3xl"></i>
                        </span>
                        <div>follow on bandcamp</div>
                    </div>
                </a>
                <a href="https://soundcloud.com/thisisrooms/popular-tracks" target="_blank" class="opacity-80 hover:opacity-100 transition">
                    <div class="flex gap-3 mb-1 items-center justify-start">
                        <span class="w-[50px] flex justify-center items-center opacity-80 hover:opacity-100 transition flex items-center justify-center">
                            <i class="fa-brands fa-soundcloud text-white text-4xl flex"></i>
                        </span>
                        <div>follow on soundcloud</div>
                    </div>
                </a>
                <a href="https://www.youtube.com/@this_is_rooms" target="_blank" class="opacity-80 hover:opacity-100 transition">
                    <div class="flex gap-3 mb-2 items-center justify-start">
                        <span class="w-[50px] flex justify-center items-center opacity-80 hover:opacity-100 transition flex items-center justify-center">
                            <i class="fa-brands fa-youtube text-white text-3xl"></i>
                        </span>
                        <div>subscribe on youtube</div>
                    </div>
                </a>
                <a href="https://substack.com/@metomparson" target="_blank" class="opacity-80 hover:opacity-100 transition">
                    <div class="flex gap-3 mb-2 items-center justify-start">
                        <span class="w-[50px] flex justify-center items-center opacity-80 hover:opacity-100 transition flex items-center justify-center">
                            <svg width="30" height="30" viewBox="0 0 448 511.471"><path fill="#ffffff" d="M0 0h448v62.804H0V0zm0 229.083h448v282.388L223.954 385.808 0 511.471V229.083zm0-114.542h448v62.804H0v-62.804z"/></svg>
                        </span>
                        <div>subscribe on substack</div>
                    </div>
                </a>
            </div>
            <div class="mt-8">
                @include('components.newsletter')
                <a href="/" class="opacity-50 hover:opacity-100 hover:translate-x-[-5px] transition flex items-center gap-2">
                    <i class="fa-solid fa-arrow-left"></i>
                    <span>back to releases + about rooms</span>
                </a>
            </div>
        </div>
    </div>
</main>

@endsection