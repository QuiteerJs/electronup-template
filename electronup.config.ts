import process from 'node:process'
import { defineConfig } from 'electronup'

const updateUrl = process.env.ELECTRONUP_UPDATE_URL

export default defineConfig({
  viteConfig: {},
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
