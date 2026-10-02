import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Global Marketing Solutions',
        short_name: 'GMS App',
        description: 'Global Marketing Solutions CRM & Order Form',
        theme_color: '#0b5b8a',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: '/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/logo512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/maskable-icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10 MB limit
      },
      devOptions: {
        enabled: true,
        type: 'module'
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
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // split heavy vendor libs so they cache separately and load in parallel
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('face-api') || id.includes('tfjs')) return 'vendor-face';
          if (id.includes('@mui') || id.includes('@emotion')) return 'vendor-mui';
          if (id.includes('antd') || id.includes('@ant-design') || id.includes('rc-')) return 'vendor-antd';
          if (id.includes('chart.js') || id.includes('react-chartjs')) return 'vendor-charts';
          if (id.includes('docx') || id.includes('exceljs') || id.includes('xlsx') || id.includes('file-saver')) return 'vendor-docs';
          if (id.includes('react') || id.includes('scheduler')) return 'vendor-react';
        },
      },
    },
  }
})
