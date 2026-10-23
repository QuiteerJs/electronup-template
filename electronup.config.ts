import process from 'node:process'
import react from '@vitejs/plugin-react-swc'
import { defineConfig } from 'electronup'

const updateUrl = process.env.ELECTRONUP_UPDATE_URL

export default defineConfig({
  viteConfig: {
    plugins: [react()],
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
