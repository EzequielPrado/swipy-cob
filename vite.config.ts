import { defineConfig } from "vite";
import dyadComponentTagger from "@dyad-sh/react-vite-component-tagger";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => ({
  base: "/", 
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    dyadComponentTagger(), 
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'logo-swipy.png'],
      manifest: {
        name: 'Swipy ERP',
        short_name: 'Swipy',
        description: 'Gestão Empresarial e Fintech',
        theme_color: '#FF8C42',
        background_color: '#000000',
        display: 'standalone',
        icons: [
          {
            src: '/logo-swipy.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/logo-swipy.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        // Aumenta o limite para 10MB para não quebrar a build no Coolify/Vercel
        maximumFileSizeToCacheInBytes: 10000000, 
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));