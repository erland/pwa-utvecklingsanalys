import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({base: './',plugins:[react(),VitePWA({registerType:'autoUpdate',includeAssets:['icon.svg'],manifest:{name:'Utvecklingsanalys',short_name:'UO Analys',description:'Verksamhetsutveckling – lokal analys',theme_color:'#123247',background_color:'#f6f8fb',display:'standalone',scope:'./',start_url:'./',icons:[{src:'icon.svg',sizes:'any',type:'image/svg+xml',purpose:'any maskable'}]},workbox:{globPatterns:['**/*.{js,css,html,svg,ico,png}']}})]});
