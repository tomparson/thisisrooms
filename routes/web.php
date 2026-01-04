<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;

Route::get('/', \App\Livewire\Home::class);

Route::get('/follow-me', function () {
    return view('follow-me');
})->name('follow-me');

Route::get('/3xx', \App\Livewire\Threexx::class)->name('3xx');

Route::get('/posts/{slug}', \App\Livewire\Post::class)->name('post');