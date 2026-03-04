import { defineConfig } from 'electronup'

export default defineConfig((env) => {
  console.log('defineConfig env: ', env)
  return {
    viteConfig: {
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
  }
})
