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
        'favicon-32x32.png',
        'favicon-16x16.png',
        'favicon.ico',
        'robots.tsx',
        'apple-touch-icon.png',
      ],
      manifest: {
        name: 'Qingqi Shi',
        short_name: 'Qingqi',
        description:
          "I'm a software engineer, currently at Citadel. I value craftsman's spirit. Craftsmen make things with perfection, precision and patience. I apply these principles to software engineering and life in general.",
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
