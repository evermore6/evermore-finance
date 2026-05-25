import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor':   ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor':      ['framer-motion', 'lucide-react', 'react-hot-toast'],
          'charts-vendor':  ['recharts'],
          'forms-vendor':   ['react-hook-form', 'date-fns'],
          'supabase':       ['@supabase/supabase-js'],
          'export-vendor':  ['exceljs', 'jspdf', 'jspdf-autotable'],
        },
      },
    },
  },
})
