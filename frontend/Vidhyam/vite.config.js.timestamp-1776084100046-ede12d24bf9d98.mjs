// vite.config.js
import { defineConfig } from "file:///C:/Users/ok/modernisum/Ai-school/frontend/Vidhyam/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/ok/modernisum/Ai-school/frontend/Vidhyam/node_modules/@vitejs/plugin-react/dist/index.js";
import { visualizer } from "file:///C:/Users/ok/modernisum/Ai-school/frontend/Vidhyam/node_modules/rollup-plugin-visualizer/dist/plugin/index.js";
import terser from "file:///C:/Users/ok/modernisum/Ai-school/frontend/Vidhyam/node_modules/@rollup/plugin-terser/dist/es/index.js";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: "dist/stats.html",
      open: false,
      gzipSize: true,
      brotliSize: true
    })
  ],
  server: {
    port: 5174,
    host: "0.0.0.0",
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true
      },
      "/uploads": {
        target: "http://localhost:8080",
        changeOrigin: true
      }
    }
  },
  resolve: {
    alias: {
      // Add any necessary aliases here to match existing CRA structure if needed
      "src": "/src"
    }
  },
  build: {
    outDir: "build",
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          ui: ["lucide-react", "framer-motion"],
          charts: ["recharts"],
          utils: ["xlsx", "jspdf", "jspdf-autotable"],
          state: ["@reduxjs/toolkit", "react-redux"]
        }
      },
      plugins: [terser()]
    },
    chunkSizeWarningLimit: 1e3,
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    reportCompressedSize: true,
    sourcemap: false
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom"]
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxva1xcXFxtb2Rlcm5pc3VtXFxcXEFpLXNjaG9vbFxcXFxmcm9udGVuZFxcXFxWaWRoeWFtXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxva1xcXFxtb2Rlcm5pc3VtXFxcXEFpLXNjaG9vbFxcXFxmcm9udGVuZFxcXFxWaWRoeWFtXFxcXHZpdGUuY29uZmlnLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9vay9tb2Rlcm5pc3VtL0FpLXNjaG9vbC9mcm9udGVuZC9WaWRoeWFtL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xuaW1wb3J0IHsgdmlzdWFsaXplciB9IGZyb20gJ3JvbGx1cC1wbHVnaW4tdmlzdWFsaXplcic7XG5pbXBvcnQgdGVyc2VyIGZyb20gJ0Byb2xsdXAvcGx1Z2luLXRlcnNlcic7XG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICAgIHBsdWdpbnM6IFtcbiAgICAgICAgcmVhY3QoKSxcbiAgICAgICAgdmlzdWFsaXplcih7XG4gICAgICAgICAgICBmaWxlbmFtZTogJ2Rpc3Qvc3RhdHMuaHRtbCcsXG4gICAgICAgICAgICBvcGVuOiBmYWxzZSxcbiAgICAgICAgICAgIGd6aXBTaXplOiB0cnVlLFxuICAgICAgICAgICAgYnJvdGxpU2l6ZTogdHJ1ZVxuICAgICAgICB9KVxuICAgIF0sXG4gICAgc2VydmVyOiB7XG4gICAgICAgIHBvcnQ6IDUxNzQsXG4gICAgICAgIGhvc3Q6ICcwLjAuMC4wJyxcbiAgICAgICAgcHJveHk6IHtcbiAgICAgICAgICAgICcvYXBpJzoge1xuICAgICAgICAgICAgICAgIHRhcmdldDogJ2h0dHA6Ly9sb2NhbGhvc3Q6ODA4MCcsXG4gICAgICAgICAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICcvdXBsb2Fkcyc6IHtcbiAgICAgICAgICAgICAgICB0YXJnZXQ6ICdodHRwOi8vbG9jYWxob3N0OjgwODAnLFxuICAgICAgICAgICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgcmVzb2x2ZToge1xuICAgICAgICBhbGlhczoge1xuICAgICAgICAgICAgLy8gQWRkIGFueSBuZWNlc3NhcnkgYWxpYXNlcyBoZXJlIHRvIG1hdGNoIGV4aXN0aW5nIENSQSBzdHJ1Y3R1cmUgaWYgbmVlZGVkXG4gICAgICAgICAgICAnc3JjJzogJy9zcmMnXG4gICAgICAgIH1cbiAgICB9LFxuICAgIGJ1aWxkOiB7XG4gICAgICAgIG91dERpcjogJ2J1aWxkJyxcbiAgICAgICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgICAgICAgb3V0cHV0OiB7XG4gICAgICAgICAgICAgICAgbWFudWFsQ2h1bmtzOiB7XG4gICAgICAgICAgICAgICAgICAgIHZlbmRvcjogWydyZWFjdCcsICdyZWFjdC1kb20nLCAncmVhY3Qtcm91dGVyLWRvbSddLFxuICAgICAgICAgICAgICAgICAgICB1aTogWydsdWNpZGUtcmVhY3QnLCAnZnJhbWVyLW1vdGlvbiddLFxuICAgICAgICAgICAgICAgICAgICBjaGFydHM6IFsncmVjaGFydHMnXSxcbiAgICAgICAgICAgICAgICAgICAgdXRpbHM6IFsneGxzeCcsICdqc3BkZicsICdqc3BkZi1hdXRvdGFibGUnXSxcbiAgICAgICAgICAgICAgICAgICAgc3RhdGU6IFsnQHJlZHV4anMvdG9vbGtpdCcsICdyZWFjdC1yZWR1eCddXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHBsdWdpbnM6IFt0ZXJzZXIoKV1cbiAgICAgICAgfSxcbiAgICAgICAgY2h1bmtTaXplV2FybmluZ0xpbWl0OiAxMDAwLFxuICAgICAgICBtaW5pZnk6ICd0ZXJzZXInLFxuICAgICAgICB0ZXJzZXJPcHRpb25zOiB7XG4gICAgICAgICAgICBjb21wcmVzczoge1xuICAgICAgICAgICAgICAgIGRyb3BfY29uc29sZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkcm9wX2RlYnVnZ2VyOiB0cnVlXG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHJlcG9ydENvbXByZXNzZWRTaXplOiB0cnVlLFxuICAgICAgICBzb3VyY2VtYXA6IGZhbHNlXG4gICAgfSxcbiAgICBvcHRpbWl6ZURlcHM6IHtcbiAgICAgICAgaW5jbHVkZTogWydyZWFjdCcsICdyZWFjdC1kb20nLCAncmVhY3Qtcm91dGVyLWRvbSddXG4gICAgfVxufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQW1WLFNBQVMsb0JBQW9CO0FBQ2hYLE9BQU8sV0FBVztBQUNsQixTQUFTLGtCQUFrQjtBQUMzQixPQUFPLFlBQVk7QUFHbkIsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDeEIsU0FBUztBQUFBLElBQ0wsTUFBTTtBQUFBLElBQ04sV0FBVztBQUFBLE1BQ1AsVUFBVTtBQUFBLE1BQ1YsTUFBTTtBQUFBLE1BQ04sVUFBVTtBQUFBLE1BQ1YsWUFBWTtBQUFBLElBQ2hCLENBQUM7QUFBQSxFQUNMO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDSixNQUFNO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixPQUFPO0FBQUEsTUFDSCxRQUFRO0FBQUEsUUFDSixRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsTUFDbEI7QUFBQSxNQUNBLFlBQVk7QUFBQSxRQUNSLFFBQVE7QUFBQSxRQUNSLGNBQWM7QUFBQSxNQUNsQjtBQUFBLElBQ0o7QUFBQSxFQUNKO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDTCxPQUFPO0FBQUE7QUFBQSxNQUVILE9BQU87QUFBQSxJQUNYO0FBQUEsRUFDSjtBQUFBLEVBQ0EsT0FBTztBQUFBLElBQ0gsUUFBUTtBQUFBLElBQ1IsZUFBZTtBQUFBLE1BQ1gsUUFBUTtBQUFBLFFBQ0osY0FBYztBQUFBLFVBQ1YsUUFBUSxDQUFDLFNBQVMsYUFBYSxrQkFBa0I7QUFBQSxVQUNqRCxJQUFJLENBQUMsZ0JBQWdCLGVBQWU7QUFBQSxVQUNwQyxRQUFRLENBQUMsVUFBVTtBQUFBLFVBQ25CLE9BQU8sQ0FBQyxRQUFRLFNBQVMsaUJBQWlCO0FBQUEsVUFDMUMsT0FBTyxDQUFDLG9CQUFvQixhQUFhO0FBQUEsUUFDN0M7QUFBQSxNQUNKO0FBQUEsTUFDQSxTQUFTLENBQUMsT0FBTyxDQUFDO0FBQUEsSUFDdEI7QUFBQSxJQUNBLHVCQUF1QjtBQUFBLElBQ3ZCLFFBQVE7QUFBQSxJQUNSLGVBQWU7QUFBQSxNQUNYLFVBQVU7QUFBQSxRQUNOLGNBQWM7QUFBQSxRQUNkLGVBQWU7QUFBQSxNQUNuQjtBQUFBLElBQ0o7QUFBQSxJQUNBLHNCQUFzQjtBQUFBLElBQ3RCLFdBQVc7QUFBQSxFQUNmO0FBQUEsRUFDQSxjQUFjO0FBQUEsSUFDVixTQUFTLENBQUMsU0FBUyxhQUFhLGtCQUFrQjtBQUFBLEVBQ3REO0FBQ0osQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
