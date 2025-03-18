import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false
    },
    // Optimize build performance
    watch: {
      usePolling: false,
    },
  },
  optimizeDeps: {
    // Force include problematic dependencies
    include: ['react', 'react-dom', 'react-router-dom'],
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Improve build performance
  build: {
    target: 'esnext',
    minify: mode === 'production',
    sourcemap: mode === 'development',
  },
}));
