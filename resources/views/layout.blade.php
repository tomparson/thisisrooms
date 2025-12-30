<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" class="bg-[#0E100D] text-white">
    <head>
        <title>{{ $title ?? 'rooms' }}</title>
        
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="description" content="Official website for UK-based electronic music artist, rooms. Buy or stream releases, hear unreleased demos and follow social profiles.">
        <link rel="canonical" href="https://thisisrooms.com" />
        
        <link rel="icon" type="image/png" href="/images/favicon-48x48.png" sizes="48x48" />
        <link rel="icon" type="image/svg+xml" href="/images/favicon.svg" />
        <link rel="shortcut icon" href="/images/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/images/apple-touch-icon.png" />
        <meta property="og:image" content="https://thisisrooms.com/images/avatar.jpg">

        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css" rel="stylesheet" integrity="sha512-z3gLpd7yknf1YoNbCzqRKc4qyor8gaKU1qmn+CShxbuBusANI9QpRohGBreCFkKxLhei6S9CQXFEbbKuqLg0DA==" crossorigin="anonymous" referrerpolicy="no-referrer" />
        
        <!-- Styles / Scripts -->
        @if (file_exists(public_path('build/manifest.json')) || file_exists(public_path('hot')))
            @vite(['resources/css/app.css', 'resources/js/app.js'])
        @endif

        @livewireStyles()
    </head>
    <body>

        {{ $slot }}

        @livewireScripts()

    </body>
</html>