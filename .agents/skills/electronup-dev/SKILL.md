---
name: electronup-dev
description: 在 electronup 驱动的 Electron + TypeScript 桌面项目里做实际开发改动。适用于：新增渲染层页面或组件、新增主进程能力与 IPC 通道、新增环境变量或切换 mode、修改 electronup.config.ts 的路径与打包目标、排查 dev 热更新或打包后白屏等异常。凡涉及 main/、render/、electronup.config.ts、.env* 的编码任务都先读本技能。
---

# electronup 项目开发

## 心智模型

electronup 是「编排器」而非新框架。三件事各归各管：

| 关注点                          | 实际工具         | 产物                                  |
| ------------------------------- | ---------------- | ------------------------------------- |
| 渲染进程（窗口里的页面）        | Vite             | `dist/resource/index.html` + 静态资源 |
| 主进程（窗口、系统能力）        | tsdown           | `dist/resource/electron.js`（CJS）    |
| 安装包（dmg / nsis / AppImage） | electron-builder | `out/`                                |

推论（决定了几乎所有改动方式）：

1. **渲染层写的就是普通 Vite 项目**：HMR、`import.meta.env`、`public/` 规则全部照旧。
2. **主进程写的就是普通 Node + Electron**，但是 CJS 产物，`__dirname` 可用、`import.meta` 不可用。
3. **唯一的配置面是 `electronup.config.ts`**：`viteConfig` / `tsdownConfig` / `builderConfig` 分别透传给三个工具；路径类字段只认顶层（`mainDir` / `renderDir` / `publicDir` / `libDir` / `resourceDir` / `outDir`）。
4. **环境变量是统一的**：同一批 `.env` 变量同时进渲染层（仅 `VITE_` 前缀）和主进程（`process.env`）。

## 工作流 A：新增渲染层功能

1. 结构改 `render/index.html` + `render/App.vue`；新组件放 `render/components/*.vue`，纯逻辑拆到独立 `.ts` 模块。
2. 读环境变量：`const text = import.meta.env.VITE_MODE_TEXT`（非 `VITE_` 前缀拿不到，这是 Vite 规则）。
3. 静态资源：放 `public/` 用 `'/logo.png'` 引用；需要被打包器处理（哈希、小文件内联）的用 `import logo from './logo.svg'`。
4. 需要路径别名时，在 `viteConfig.resolve.alias` 配好，同时把对应 `paths` 写进 `tsconfig.json`，否则类型解析失败：

```ts
import { resolve } from 'node:path'
import { defineConfig } from 'electronup'

export default defineConfig({
  viteConfig: {
    resolve: { alias: { '@': resolve(import.meta.dirname, 'render') } },
  },
})
```

5. 验证：`pnpm dev`，确认 HMR 生效；改主进程文件应触发应用重启而非 HMR。

## 工作流 B：新增主进程能力 / IPC 通道

按需要的能力分三种情况，不要一上来就手写 `ipcMain.handle`。

### B1. 只需要内置能力（窗口控制、路径计算）

先用 `@quiteer/electron-ipc`，它已经预置好通道，且只操作发起调用的那个窗口（靠 `event.sender` 定位，不会越权）。

主进程初始化一次（模板已在 `main/index.ts` 调过 `Ipc.init()`）：

```ts
import { Ipc } from '@quiteer/electron-ipc'

app.whenReady().then(() => Ipc.init())
```

渲染层使用（需先接好 preload，见 B3）：

```ts
import { EventKeys, IpcWindowOptions } from '@quiteer/electron-ipc/web'

window.$ipc.send(EventKeys.WindowOptionsKey, IpcWindowOptions.MAXIMIZE)
window.$ipc.send(EventKeys.WindowOptionsKey, IpcWindowOptions.SET_TITLE, '新标题')
const joined = await window.$ipc.invoke(EventKeys.FileOptionsKey, 'join', '/user', 'local')
window.$ipc.send(EventKeys.WindowOptionsKey, IpcWindowOptions.SET_TITLE, joined)
```

### B2. 需要自定义业务通道

主进程注册 handler，渲染层用通用的 `invoke` / `send` 调用（不要为每个通道写 `contextBridge`）：

```ts
// main/ipc/store.ts
import { ipcMain } from 'electron'

ipcMain.handle('store:read', async (_event, key: string) => readFromDisk(key))
```

```ts
// render/xxx.ts
const theme = await window.$ipc.invoke('store:read', 'theme')
window.$ipc.on('store:changed', payload => applyTheme(payload, theme))
```

约定：单向通知用 `send`，要返回值用 `invoke`；`sendSync` 阻塞渲染进程，非必要不用。

### B3. 接 preload（`window.$ipc` 的来源）

模板目前**没有**启用 preload，`window.$ipc` 尚不存在。需要时：

```ts
// main/index.ts
import preloadPath from '@quiteer/electron-preload' // 默认导出脚本绝对路径

const win = new BrowserWindow({
  webPreferences: { sandbox: true, preload: preloadPath },
})
```

渲染层类型补全（新建 `render/global.d.ts`）：

```ts
interface Window {
  $ipc: import('@quiteer/electron-preload').PreloadIpc & import('@quiteer/electron-ipc/web').ExpandPreloadIpc
}
```

加了 preload 后，`window.$ipc` 的通道名与参数会在编译期被校验，写错直接报类型错误。

## 工作流 C：新增环境变量 / 切换 mode

1. 在对应 `.env.<mode>` 里加 `VITE_` 前缀变量（`VITE_API_BASE=https://...`）。
2. 同步在 `render/env.d.ts` 的 `ImportMetaEnv` 补一行类型，否则 `import.meta.env.VITE_API_BASE` 报类型错误。
3. 渲染层 `import.meta.env.VITE_API_BASE`，主进程 `process.env.VITE_API_BASE`。
4. 运行：`pnpm dev -m staging`（读 `.env` + `.env.staging`）；打包：`pnpm build -m staging`。
5. 不要试图在 `electronup.config.ts` 里读环境变量做分支——目前不支持。只能靠 `defineConfig(({ command }) => ...)` 区分 `serve` / `build`。
6. 新增 mode 时文件名后缀与 `-m` 参数严格一致（`.env.pre` ↔ `-m pre`），否则静默不加载。

## 工作流 D：改构建与打包

- 改目录：只改 config 顶层字段，例如 `renderDir: 'src/renderer'`（记得同步移动目录和 `index.html` 内的相对脚本路径）。
- 加平台目标：优先写进 `builderConfig`（如 `mac.target: ['dmg', 'zip']`、`win.target: [{ target: 'nsis', arch: ['x64'] }]`），命令行 flag 权重高于配置，适合临时覆盖。
- 加需要随包分发的动态库：放 `lib/`，并在 `builderConfig.extraFiles` 里包含。
- 打包前自检顺序：`pnpm typecheck` → `pnpm lint` → `pnpm dev` 跑通关键路径 → `pnpm build:dir` 打开产物验证 → `pnpm build` 出安装包。

## 排错对照表

| 现象                                | 优先排查                                                                                      |
| ----------------------------------- | --------------------------------------------------------------------------------------------- |
| dev 白屏                            | `main/index.ts` 打印的 `loadUrl` 是否带正确 `RENDER_PORT`；渲染层是否抛错（DevTools Console） |
| 改主进程没反应                      | tsdown watch 是否启动；是否改到了 `dist/` 里的产物而不是 `main/` 源码                         |
| 渲染层报找不到 `/vite.svg`          | `publicDir` 是否被改到了 `render/` 下；`public/` 只有配在 config 顶层才生效                   |
| 环境变量读不到                      | 是否 `VITE_` 前缀；`-m` 与文件名后缀是否一致；是否在 config 文件里读（不支持）                |
| 打包后白屏                          | `viteConfig.base` 必须保持 `./`；`render/index.html` 里资源路径不能是绝对路径 `/xxx`          |
| 原生模块报 ABI 不匹配               | 重跑 `pnpm exec electron-builder install-app-deps`；确认模块在 `lib/` 或 `files` 白名单内     |
| 主进程启动即崩、报 `require of ESM` | 该依赖是 ESM-only，加进 `tsdownConfig.noExternal` 内联，或降级到 CJS 版本                     |
| 打包体积异常大                      | `builderConfig.files` 是否把 `node_modules` 整包带入；`asar` 是否为 `false`                   |
| 端口冲突                            | CLI 会自动切换，别在代码里写死端口                                                            |
| 类型检查报找不到模块                | 是否漏了 `render/env.d.ts` 的 `vite/client` 引用；`.vue` 是否用 `vue-tsc` 而非 `tsc`          |

## 完成前自检

- [ ] `pnpm typecheck` 通过
- [ ] `pnpm lint` 通过（不是 `lint:fix` 后再看，先确认没有新增 error）
- [ ] `pnpm dev` 手动验证改动路径可用
- [ ] 涉及打包配置时跑过 `pnpm build:dir`
- [ ] 没有改 `viteConfig.root` / `build.outDir` / `publicDir` 这类会被覆盖的字段
- [ ] 没有新增未在白名单内的运行期文件
- [ ] 没有手改 `pnpm-lock.yaml`，没有引入 prettier
