import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import mkcert from 'vite-plugin-mkcert';
import { VitePWA } from 'vite-plugin-pwa';

const isProd = process.env.NODE_ENV === 'production';
// mkcert needs sudo to install the local CA; skip unless VITE_USE_MKCERT=1
const useMkcert = !isProd && process.env.VITE_USE_MKCERT === '1';

export default defineConfig({
  plugins: [
    react(),
    // mkcert only in dev when explicitly enabled (requires `mkcert -install` / sudo once)
    ...(useMkcert ? [mkcert({ hosts: ['localhost', '127.0.0.1', '192.168.100.7'] })] : []),
    VitePWA({
      registerType: 'autoUpdate',
      manifestFilename: 'manifest.webmanifest',
      manifest: {
        name: 'St. Dominic Care',
        short_name: 'St. Dominic',
        description: 'Role-based St. Dominic Care (PWA)',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#1976d2',
        scope: '/',
        // Chrome install prompt requires 192px and 512px icons (web.dev/install-criteria)
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      allowedHosts: ['localhost', '127.0.0.1', '192.168.100.7', 'jennette-aware-mark.ngrok-free.dev'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
    }),
  ],
  server: isProd
    ? undefined
    : {
        port: 5173,
        host: true,
        https: useMkcert,
        allowedHosts: ['localhost', '127.0.0.1', '192.168.100.7', 'jennette-aware-mark.ngrok-free.dev'],
      },
});
