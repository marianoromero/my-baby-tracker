// svelte.config.js
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
    preprocess: vitePreprocess(),
    kit: {
        adapter: adapter({
            pages: 'build',
            assets: 'build',
            fallback: '404.html', // Recomendado para SPA
            precompress: false,
            strict: false // Cambiar a false para permitir rutas dinámicas
        }),

        // ¡¡¡CRÍTICO PARA GITHUB PAGES!!!
        // Aquí le indicamos el nombre de tu repositorio.
        paths: {
            base: process.env.NODE_ENV === 'production' ? '/my-baby-tracker' : '',
        }
    }
};

export default config;