<main class="min-h-dvh w-full">
    <div class="py-[30px] md:py-[100px] px-4">
        <div class="max-w-[650px] mx-auto">
            <a href="/" class="opacity-50 hover:opacity-100 hover:translate-x-[-5px] transition flex items-center gap-2 mb-[30px]">
                <i class="fa-solid fa-arrow-left"></i>
                <span>back to releases + about</span>
            </a>
            <div class="prose prose-invert max-w-none">
                {!! $content !!}
            </div>
            <div class="mt-[100px]">
                @include('components.newsletter')
                <a href="/" class="opacity-50 hover:opacity-100 hover:translate-x-[-5px] transition flex items-center gap-2">
                    <i class="fa-solid fa-arrow-left"></i>
                    <span>back to releases + about</span>
                </a>
            </div>
        </div>
    </div>
</main>