import { defineConfig } from 'vite';
import reactRefresh from '@vitejs/plugin-react-refresh';
import glsl from 'vite-plugin-glsl';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    reactRefresh(),
    glsl(),
    VitePWA({
      includeAssets: [
        'apple-touch-icon.png',
        'favicon-16x16.png',
        'favicon-32x32.png',
        'favicon.ico',
        'robots.txt',
        'safari-pinned-tab.svg',
        'sitemap.xml',
      ],
      manifest: {
        name: 'Qingqi Shi',
        short_name: 'Qingqi',
        description:
          "Qingqi is a software engineer based in London, UK. He is currently working at Citadel and specializes in front-end technologies. Qingqi value craftsman's spirit. Like craftsmen, he tries to live his life with perfection, precision and patience.",
        theme_color: '#f3eded',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      registerType: 'autoUpdate',
    }),
  ],
  esbuild: {
    jsxInject: `import React from 'react';`,
  },
  css: {
    modules: { localsConvention: 'camelCaseOnly' },
  },
});
