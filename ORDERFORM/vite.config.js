import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'GMS App',
        short_name: 'GMS',
        description: 'Your MERN Order Form App',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10 MB limit
      }
    })
  ],
  base: '/',
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    chunkSizeWarningLimit: 1000, // Optional: increase warning threshold for chunks
  }
})
VitePWA({
  registerType: 'autoUpdate',
  manifest: {
    name: 'GMS App',
    short_name: 'GMS',
    description: 'Your MERN Order Form App',
    theme_color: '#ffffff',
    background_color: '#ffffff',
    display: 'standalone',
    start_url: '/',
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png'
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png'
      }
    ]
  },
  workbox: {
    maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10MB
  }
})
