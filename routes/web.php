<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;

Route::get('/', \App\Livewire\Home::class);

Route::get('/3xx', \App\Livewire\Threexx::class)->name('3xx');

Route::get('/posts/{slug}', \App\Livewire\Post::class)->name('post');