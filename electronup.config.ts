import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'electronup'

export default defineConfig({
  viteConfig: {
    plugins: [vue()],
  },
  builderConfig: {
    asar: false,
    mac: {
      target: [
        {
          target: 'dmg',
        },
      ],
    },
  },
})
