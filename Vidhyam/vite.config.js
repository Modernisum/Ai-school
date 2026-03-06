import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        port: 5174,
        host: '0.0.0.0'
    },
    resolve: {
        alias: {
            // Add any necessary aliases here to match existing CRA structure if needed
            'src': '/src'
        }
    },
    build: {
        outDir: 'build',
    }
});
