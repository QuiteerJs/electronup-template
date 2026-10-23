import process from 'node:process'
import { defineConfig } from 'electronup'
import solid from 'vite-plugin-solid'

const updateUrl = process.env.ELECTRONUP_UPDATE_URL

export default defineConfig({
  viteConfig: {
    plugins: [solid()],
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
