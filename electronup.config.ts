import process from 'node:process'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'electronup'

const updateUrl = process.env.ELECTRONUP_UPDATE_URL

export default defineConfig({
  viteConfig: {
    plugins: [vue()],
  },
  packConfig: {
    noExternal: ['electronup', '@quiteer/electron-ipc'],
  },
  builderConfig: {
    asar: false,
    publish: updateUrl ? [{ provider: 'generic', url: updateUrl }] : null,
    mac: {
      target: ['dmg', 'zip'],
    },
  },
})
