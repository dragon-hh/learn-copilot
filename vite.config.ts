import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/nvidia-proxy': {
            target: 'https://integrate.api.nvidia.com',
            changeOrigin: true,
            // 【新增调试代码】每次转发请求，你的终端会打印出最终转发的完整 URL
            configure: (proxy, options) => {
              proxy.on('proxyReq', (proxyReq, req, res) => {
                console.log('Vite 代理正在转发:', options.target + proxyReq.path);
              });
            },
            // 将 /nvidia-proxy 替换为 /v1
            // 确保结果是 https://integrate.api.nvidia.com/v1/chat/completions
            rewrite: (path) => path.replace(/^\/nvidia-proxy/, '/v1'),
          },
       },
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});

