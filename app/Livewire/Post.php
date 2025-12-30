<?php

namespace App\Livewire;

use Illuminate\Support\Str;
use Livewire\Component;

class Post extends Component
{
    protected $slug;

    public function mount($slug) 
    {
        $this->slug = $slug;
    }
    
    public function render()
    {
        // find file with filename $slug.md in resources/views/posts
        $path = resource_path('views/posts/' . $this->slug . '.md');
        if (!file_exists($path)) {
            return response('Not Found', 404);
        }
        $content = file_get_contents($path);
        $html = Str::markdown($content);
        preg_match('/<h1>(.*?)<\/h1>/s', $html, $matches);
        $title = $matches[1] . ' · rooms';
        return view('livewire.post', [
            'content' => $html,
        ])->title($title);
    }
}

