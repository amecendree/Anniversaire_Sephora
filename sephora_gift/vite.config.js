import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  // Relative base: every emitted asset URL is `./assets/...`, so the build works
  // at the domain root, under a GitHub Pages project path (/happy-birthday-tree/),
  // and on a custom domain — no rebuild needed when the URL changes.
  base: './',

  build: {
    rollupOptions: {
      // Multi-page: Vite only builds index.html unless every HTML entry is
      // listed here. Without `poeme`, the film's title would link to a page
      // that exists in the source but never ships in dist/.
      input: {
        main:  fileURLToPath(new URL('./index.html', import.meta.url)),
        poeme: fileURLToPath(new URL('./poeme.html', import.meta.url)),
      },
    },
  },
})
