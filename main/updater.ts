import { existsSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { app } from 'electron'
import { autoUpdater, initAutoUpdater } from 'electronup'

export function initTemplateUpdater() {
  // 仅为已配置更新源的安装包启用，开发及普通目录构建直接跳过
  if (!app.isPackaged || !existsSync(join(process.resourcesPath, 'app-update.yml'))) {
    return
  }

  autoUpdater.on('error', error => console.error('[updater]', error))
  initAutoUpdater({ logger: console, checkOnStart: true })
}
