import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  root: 'dev',
  server: {
    proxy: {
      // assets.xrift.net は app.xrift.net 以外のオリジンに CORS を許可していないため、
      // dev 環境では同一オリジンのプロキシ経由で画像を取得する
      '/xrift-assets': {
        target: 'https://assets.xrift.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/xrift-assets/, ''),
      },
    },
  },
  test: {
    root: '.',
  },
})
