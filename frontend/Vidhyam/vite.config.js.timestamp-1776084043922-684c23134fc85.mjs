// vite.config.js
import { defineConfig } from "file:///c:/Users/ok/modernisum/Ai-school/frontend/Vidhyam/node_modules/vite/dist/node/index.js";
import react from "file:///c:/Users/ok/modernisum/Ai-school/frontend/Vidhyam/node_modules/@vitejs/plugin-react/dist/index.js";
import { visualizer } from "file:///c:/Users/ok/modernisum/Ai-school/frontend/Vidhyam/node_modules/rollup-plugin-visualizer/dist/plugin/index.js";
import terser from "file:///c:/Users/ok/modernisum/Ai-school/frontend/Vidhyam/node_modules/@rollup/plugin-terser/dist/es/index.js";
var vite_config_default = defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          ["babel-plugin-direct-import", {
            modules: ["lucide-react", "framer-motion"]
          }]
        ]
      }
    }),
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
    include: ["react", "react-dom", "react-router-dom"],
    exclude: ["lucide-react", "framer-motion", "recharts"]
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJjOlxcXFxVc2Vyc1xcXFxva1xcXFxtb2Rlcm5pc3VtXFxcXEFpLXNjaG9vbFxcXFxmcm9udGVuZFxcXFxWaWRoeWFtXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJjOlxcXFxVc2Vyc1xcXFxva1xcXFxtb2Rlcm5pc3VtXFxcXEFpLXNjaG9vbFxcXFxmcm9udGVuZFxcXFxWaWRoeWFtXFxcXHZpdGUuY29uZmlnLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9jOi9Vc2Vycy9vay9tb2Rlcm5pc3VtL0FpLXNjaG9vbC9mcm9udGVuZC9WaWRoeWFtL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xuaW1wb3J0IHsgdmlzdWFsaXplciB9IGZyb20gJ3JvbGx1cC1wbHVnaW4tdmlzdWFsaXplcic7XG5pbXBvcnQgdGVyc2VyIGZyb20gJ0Byb2xsdXAvcGx1Z2luLXRlcnNlcic7XG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICAgIHBsdWdpbnM6IFtcbiAgICAgICAgcmVhY3Qoe1xuICAgICAgICAgICAgYmFiZWw6IHtcbiAgICAgICAgICAgICAgICBwbHVnaW5zOiBbXG4gICAgICAgICAgICAgICAgICAgIFsnYmFiZWwtcGx1Z2luLWRpcmVjdC1pbXBvcnQnLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtb2R1bGVzOiBbJ2x1Y2lkZS1yZWFjdCcsICdmcmFtZXItbW90aW9uJ11cbiAgICAgICAgICAgICAgICAgICAgfV1cbiAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pLFxuICAgICAgICB2aXN1YWxpemVyKHtcbiAgICAgICAgICAgIGZpbGVuYW1lOiAnZGlzdC9zdGF0cy5odG1sJyxcbiAgICAgICAgICAgIG9wZW46IGZhbHNlLFxuICAgICAgICAgICAgZ3ppcFNpemU6IHRydWUsXG4gICAgICAgICAgICBicm90bGlTaXplOiB0cnVlXG4gICAgICAgIH0pXG4gICAgXSxcbiAgICBzZXJ2ZXI6IHtcbiAgICAgICAgcG9ydDogNTE3NCxcbiAgICAgICAgaG9zdDogJzAuMC4wLjAnLFxuICAgICAgICBwcm94eToge1xuICAgICAgICAgICAgJy9hcGknOiB7XG4gICAgICAgICAgICAgICAgdGFyZ2V0OiAnaHR0cDovL2xvY2FsaG9zdDo4MDgwJyxcbiAgICAgICAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgJy91cGxvYWRzJzoge1xuICAgICAgICAgICAgICAgIHRhcmdldDogJ2h0dHA6Ly9sb2NhbGhvc3Q6ODA4MCcsXG4gICAgICAgICAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICByZXNvbHZlOiB7XG4gICAgICAgIGFsaWFzOiB7XG4gICAgICAgICAgICAvLyBBZGQgYW55IG5lY2Vzc2FyeSBhbGlhc2VzIGhlcmUgdG8gbWF0Y2ggZXhpc3RpbmcgQ1JBIHN0cnVjdHVyZSBpZiBuZWVkZWRcbiAgICAgICAgICAgICdzcmMnOiAnL3NyYydcbiAgICAgICAgfVxuICAgIH0sXG4gICAgYnVpbGQ6IHtcbiAgICAgICAgb3V0RGlyOiAnYnVpbGQnLFxuICAgICAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICAgICAgICBvdXRwdXQ6IHtcbiAgICAgICAgICAgICAgICBtYW51YWxDaHVua3M6IHtcbiAgICAgICAgICAgICAgICAgICAgdmVuZG9yOiBbJ3JlYWN0JywgJ3JlYWN0LWRvbScsICdyZWFjdC1yb3V0ZXItZG9tJ10sXG4gICAgICAgICAgICAgICAgICAgIHVpOiBbJ2x1Y2lkZS1yZWFjdCcsICdmcmFtZXItbW90aW9uJ10sXG4gICAgICAgICAgICAgICAgICAgIGNoYXJ0czogWydyZWNoYXJ0cyddLFxuICAgICAgICAgICAgICAgICAgICB1dGlsczogWyd4bHN4JywgJ2pzcGRmJywgJ2pzcGRmLWF1dG90YWJsZSddLFxuICAgICAgICAgICAgICAgICAgICBzdGF0ZTogWydAcmVkdXhqcy90b29sa2l0JywgJ3JlYWN0LXJlZHV4J11cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcGx1Z2luczogW3RlcnNlcigpXVxuICAgICAgICB9LFxuICAgICAgICBjaHVua1NpemVXYXJuaW5nTGltaXQ6IDEwMDAsXG4gICAgICAgIG1pbmlmeTogJ3RlcnNlcicsXG4gICAgICAgIHRlcnNlck9wdGlvbnM6IHtcbiAgICAgICAgICAgIGNvbXByZXNzOiB7XG4gICAgICAgICAgICAgICAgZHJvcF9jb25zb2xlOiB0cnVlLFxuICAgICAgICAgICAgICAgIGRyb3BfZGVidWdnZXI6IHRydWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgcmVwb3J0Q29tcHJlc3NlZFNpemU6IHRydWUsXG4gICAgICAgIHNvdXJjZW1hcDogZmFsc2VcbiAgICB9LFxuICAgIG9wdGltaXplRGVwczoge1xuICAgICAgICBpbmNsdWRlOiBbJ3JlYWN0JywgJ3JlYWN0LWRvbScsICdyZWFjdC1yb3V0ZXItZG9tJ10sXG4gICAgICAgIGV4Y2x1ZGU6IFsnbHVjaWRlLXJlYWN0JywgJ2ZyYW1lci1tb3Rpb24nLCAncmVjaGFydHMnXVxuICAgIH1cbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFtVixTQUFTLG9CQUFvQjtBQUNoWCxPQUFPLFdBQVc7QUFDbEIsU0FBUyxrQkFBa0I7QUFDM0IsT0FBTyxZQUFZO0FBR25CLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQ3hCLFNBQVM7QUFBQSxJQUNMLE1BQU07QUFBQSxNQUNGLE9BQU87QUFBQSxRQUNILFNBQVM7QUFBQSxVQUNMLENBQUMsOEJBQThCO0FBQUEsWUFDM0IsU0FBUyxDQUFDLGdCQUFnQixlQUFlO0FBQUEsVUFDN0MsQ0FBQztBQUFBLFFBQ0w7QUFBQSxNQUNKO0FBQUEsSUFDSixDQUFDO0FBQUEsSUFDRCxXQUFXO0FBQUEsTUFDUCxVQUFVO0FBQUEsTUFDVixNQUFNO0FBQUEsTUFDTixVQUFVO0FBQUEsTUFDVixZQUFZO0FBQUEsSUFDaEIsQ0FBQztBQUFBLEVBQ0w7QUFBQSxFQUNBLFFBQVE7QUFBQSxJQUNKLE1BQU07QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLE9BQU87QUFBQSxNQUNILFFBQVE7QUFBQSxRQUNKLFFBQVE7QUFBQSxRQUNSLGNBQWM7QUFBQSxNQUNsQjtBQUFBLE1BQ0EsWUFBWTtBQUFBLFFBQ1IsUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLE1BQ2xCO0FBQUEsSUFDSjtBQUFBLEVBQ0o7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNMLE9BQU87QUFBQTtBQUFBLE1BRUgsT0FBTztBQUFBLElBQ1g7QUFBQSxFQUNKO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDSCxRQUFRO0FBQUEsSUFDUixlQUFlO0FBQUEsTUFDWCxRQUFRO0FBQUEsUUFDSixjQUFjO0FBQUEsVUFDVixRQUFRLENBQUMsU0FBUyxhQUFhLGtCQUFrQjtBQUFBLFVBQ2pELElBQUksQ0FBQyxnQkFBZ0IsZUFBZTtBQUFBLFVBQ3BDLFFBQVEsQ0FBQyxVQUFVO0FBQUEsVUFDbkIsT0FBTyxDQUFDLFFBQVEsU0FBUyxpQkFBaUI7QUFBQSxVQUMxQyxPQUFPLENBQUMsb0JBQW9CLGFBQWE7QUFBQSxRQUM3QztBQUFBLE1BQ0o7QUFBQSxNQUNBLFNBQVMsQ0FBQyxPQUFPLENBQUM7QUFBQSxJQUN0QjtBQUFBLElBQ0EsdUJBQXVCO0FBQUEsSUFDdkIsUUFBUTtBQUFBLElBQ1IsZUFBZTtBQUFBLE1BQ1gsVUFBVTtBQUFBLFFBQ04sY0FBYztBQUFBLFFBQ2QsZUFBZTtBQUFBLE1BQ25CO0FBQUEsSUFDSjtBQUFBLElBQ0Esc0JBQXNCO0FBQUEsSUFDdEIsV0FBVztBQUFBLEVBQ2Y7QUFBQSxFQUNBLGNBQWM7QUFBQSxJQUNWLFNBQVMsQ0FBQyxTQUFTLGFBQWEsa0JBQWtCO0FBQUEsSUFDbEQsU0FBUyxDQUFDLGdCQUFnQixpQkFBaUIsVUFBVTtBQUFBLEVBQ3pEO0FBQ0osQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
