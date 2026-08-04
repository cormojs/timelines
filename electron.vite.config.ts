import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          main: resolve('electron/main.ts'),
          gitSync: resolve('electron/gitSync.ts'),
          timelinePackage: resolve('electron/timelinePackage.ts'),
        },
        output: {
          format: 'cjs',
        },
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          preload: resolve('electron/preload.ts'),
        },
        output: {
          format: 'cjs',
          entryFileNames: '[name].js',
        },
      },
    },
  },
  renderer: {
    root: resolve('.'),
    base: './',
    plugins: [react()],
    server: {
      port: 5183,
      strictPort: true,
    },
    build: {
      rollupOptions: {
        input: resolve('index.html'),
      },
    },
  },
})
