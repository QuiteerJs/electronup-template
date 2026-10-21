import { defineConfig } from 'electronup'
import solid from 'vite-plugin-solid'

export default defineConfig({
  viteConfig: {
    plugins: [solid()],
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
