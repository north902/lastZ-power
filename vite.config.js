import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/lastZ-power/', // 用於 GitHub Pages 部署
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
