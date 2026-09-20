import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      // Ignore the public data folder so chokidar doesn't lock large .tif or .geojson files
      ignored: ['**/public/data/**']
    }
  }
});