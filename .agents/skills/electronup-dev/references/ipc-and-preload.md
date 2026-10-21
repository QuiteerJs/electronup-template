# IPC 与 preload 参考

两个配套包分工：`@quiteer/electron-preload` 负责**在渲染层安全地暴露能力**，`@quiteer/electron-ipc` 负责**在主进程提供内置通道**。

## 接入顺序

1. 主进程 `Ipc.init()`（模板 `main/index.ts` 已调用）。
2. `BrowserWindow` 的 `webPreferences.preload` 指向 `@quiteer/electron-preload` 的默认导出。
3. 渲染层声明 `window` 类型，然后使用 `window.$ipc` / `$clipboard` / `$webFrame`。

```ts
import preloadPath from '@quiteer/electron-preload'

new BrowserWindow({
  webPreferences: { sandbox: true, preload: preloadPath },
})
```

未接 preload 时渲染层**没有** `window.$ipc`，别假设它存在。

## `window.$ipc`（通用通道）

| 方法 | 说明 |
| --- | --- |
| `send(channel, ...args)` | 单向发送 |
| `invoke(channel, ...args)` | 双向调用，返回 `Promise` |
| `on(channel, listener)` / `once(...)` | 监听主进程推送 |
| `sendSync(...)` | 同步发送，阻塞渲染进程，非必要不用 |
| `removeAllListeners(channel?)` | 移除监听，不传则清空 |

内置通道（来自 `@quiteer/electron-ipc`）：

### `__window_options__` — 窗口控制

`send` 单向，作用于**发起调用的窗口自身**（靠 `event.sender` 定位，不持有全局状态）。

不传参：`DESTROY`、`CLOSE`、`SHOW`、`HIDE`、`FOCUS`、`BLUR`、`MAXIMIZE`、`UNMAXIMIZE`、`MINIMIZE`、`RESTORE`、`RELOAD`。

互切类：`SWITCH_FOCUS`、`SWITCH_MAX`、`SWITCH_MIN`、`SWITCH_FULL`、`SWITCH_RESIZABLE`、`SWITCH_MOVABLE`、`SWITCH_MINIMIZABLE`、`SWITCH_MAXIMIZABLE`、`SWITCH_ALWAYS_ON_TOP`。

带参：`SET_FULL_SCREEN(flag: boolean)`、`SET_TITLE(title: string)`、`FLASH_FRAME(flag: boolean)`。

Linux 上 `MOVABLE` / `MINIMIZABLE` / `MAXIMIZABLE` 无效。

```ts
import { EventKeys, IpcWindowOptions } from '@quiteer/electron-ipc/web'

window.$ipc.send(EventKeys.WindowOptionsKey, IpcWindowOptions.SET_TITLE, '新标题')
```

### `__file_options__` — 路径计算

`invoke` 双向，等价于主进程里的 `node:path` 同名方法：`BASENAME`、`DIRNAME`、`EXTNAME`、`JOIN`、`PARSE`、`RELATIVE`、`RESOLVE`。

```ts
const info = await window.$ipc.invoke(EventKeys.FileOptionsKey, 'parse', '/a/b/c.txt')
```

## `window.$clipboard`

全部异步（返回 `Promise`），与新版 Electron 对齐：`clear(type?)`、`has(mimetype)`、`read()`、`readText()`、`write(data)`、`writeText(text)`。

```ts
await window.$clipboard.writeText('hello')
const text = await window.$clipboard.readText()
```

## `window.$webFrame`

`setZoomFactor` / `getZoomFactor`、`setZoomLevel` / `getZoomLevel`、`insertText`、`executeJavaScript(code, userGesture?)`、`executeJavaScriptInIsolatedWorld`、`setIsolatedWorldInfo`、`getResourceUsage`、`clearCache`、`getFrameForSelector`，以及 `firstChild` / `nextSibling` / `opener` / `parent` / `routingId`（原生属性在这里做成了方法，因为 `WebFrame` 实例无法跨 `contextBridge`）。

## 类型增强

```ts
// render/global.d.ts
interface Window {
  $ipc: import('@quiteer/electron-preload').PreloadIpc & import('@quiteer/electron-ipc/web').ExpandPreloadIpc
  $clipboard: import('@quiteer/electron-preload').PreloadClipboard
  $webFrame: import('@quiteer/electron-preload').PreloadWebFrame
}
```

叠上 `ExpandPreloadIpc` 后，通道名与参数会在编译期校验。

## 硬约束

- preload 固定输出 **CJS**，开 `sandbox` 时不能用 ESM 引用方式引入。
- 走 `contextBridge`：参数与返回值必须可序列化，函数 / `Symbol` / 类实例传不过去。
- 暴露面是刻意收敛的：要多能力就加 `ipcMain` 通道，**不要**关掉 `sandbox` 或开 `nodeIntegration`。
- 自定义业务通道的命名建议 `<域>:<动作>`（如 `store:read`），避免与 `__window_options__` / `__file_options__` 撞名。
