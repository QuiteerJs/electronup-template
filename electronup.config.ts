import react from '@vitejs/plugin-react'
import { defineConfig } from 'electronup'

export default defineConfig({
  viteConfig: {
    plugins: [react()],
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
