import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import terser from '@rollup/plugin-terser';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        visualizer({
            filename: 'dist/stats.html',
            open: false,
            gzipSize: true,
            brotliSize: true
        })
    ],
    server: {
        port: 5174,
        host: '0.0.0.0',
        proxy: {
            '/api': {
                target: 'http://localhost:8080',
                changeOrigin: true,
            },
            '/uploads': {
                target: 'http://localhost:8080',
                changeOrigin: true,
            }
        }
    },
    resolve: {
        alias: {
            // Add any necessary aliases here to match existing CRA structure if needed
            'src': '/src'
        }
    },
    build: {
        outDir: 'build',
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['react', 'react-dom', 'react-router-dom'],
                    ui: ['lucide-react', 'framer-motion'],
                    charts: ['recharts'],
                    utils: ['xlsx', 'jspdf', 'jspdf-autotable'],
                    state: ['@reduxjs/toolkit', 'react-redux']
                }
            },
            plugins: [terser()]
        },
        chunkSizeWarningLimit: 1000,
        minify: 'terser',
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
        include: ['react', 'react-dom', 'react-router-dom']
    }
});
