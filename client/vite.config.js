import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  esbuild: {
    loader: 'jsx', // This ensures JSX syntax is enabled for .js files
    include: /\.jsx?$/, // This ensures both .js and .jsx files are treated as JSX
  },
});