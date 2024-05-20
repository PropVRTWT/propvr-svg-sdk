import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag.includes('svg-overlay')
        }
      }
    })
  ],
  build: {
    lib: {
      entry: './src/main.ce.js',
      name: 'svg-overlay',
      // the proper extensions will be added
      fileName: 'svg-overlay'
    }
  },
  define: {
    'process.env': process.env
  }
})