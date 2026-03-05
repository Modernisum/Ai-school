import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    define: {
        'process.env.REACT_APP_API_BASE_URL': JSON.stringify('http://localhost:8080/api')
    },
    server: {
        port: 5174,
        host: '127.0.0.1'
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
