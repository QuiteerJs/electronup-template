# electronup.config.ts 字段参考（0.3.x）

配置从 `electronup` 导入 `defineConfig`，支持对象、`async` 函数、以及 `({ command, root }) => config` 函数三种导出形式。`command` 为 `'serve'`（dev）或 `'build'`。

## 顶层字段

| 字段            | 类型                         | 默认值   | 作用                                                  |
| --------------- | ---------------------------- | -------- | ----------------------------------------------------- |
| `renderDir`     | `string`                     | `render` | 渲染进程目录，等价 Vite `root`（`index.html` 所在处） |
| `mainDir`       | `string`                     | `main`   | 主进程源码目录                                        |
| `publicDir`     | `string`                     | `public` | 全局静态资源目录，等价 Vite `publicDir`               |
| `libDir`        | `string`                     | `lib`    | 动态库目录，整目录随包额外拷贝（`extraFiles`）        |
| `resourceDir`   | `string`                     | `dist`   | 渲染层 + 主进程的构建输出目录（`dist/resource`）      |
| `outDir`        | `string`                     | `out`    | electron-builder 安装包输出目录                       |
| `viteConfig`    | `ViteConfig`                 | `{}`     | 透传 Vite 用户配置                                    |
| `packConfig`    | `PackConfig`                 | `{}`     | 主进程 / preload 的打包配置（vite-plus pack）         |
| `preload`       | `UserConfig \| UserConfig[]` | –        | 预加载脚本构建配置，可传单个或数组                    |
| `builderConfig` | `Configuration`              | 见下     | electron-builder 配置，**可选**                       |

`PackConfig` 只有两个字段：

| 字段         | 说明                                             |
| ------------ | ------------------------------------------------ |
| `external`   | 不参与打包的模块（运行时由 `node_modules` 提供） |
| `noExternal` | 强制内联进产物的模块，用来吞掉 ESM-only 依赖     |

## 路径优先级

路径都以项目根目录为基准拼接。这三处**改不动**，必须用顶层字段覆盖：

| 想在 vite 里改 | 实际必须改          |
| -------------- | ------------------- |
| `root`         | `renderDir`         |
| `publicDir`    | `publicDir`（顶层） |
| `build.outDir` | `resourceDir`       |

## viteConfig 中的特例

- `base`：预置 `./`，**可覆盖但强烈不建议**；改了要同步 `render/index.html` 里的资源路径，且打包后白屏往往就是这里。
- `build.minify`：不可通过配置覆盖，只能命令行 `--no-minify` 控制。
- 其余字段与 Vite 官方配置一致（`plugins`、`resolve.alias`、`define` 等）。

## 主进程与 preload 的预置行为

- 主进程产物：`dist/resource/electron.cjs`（**CJS**），`__dirname` 可用、`import.meta` 不可用。
- preload 预置：CJS 格式、输出到与主进程同目录、注入与主进程一致的环境变量、`external` 默认含 `electron`。
- 环境变量由 CLI 统一注入，两个进程拿到的值与 `.env*` 一致。

## builderConfig 预置（可全部覆盖）

生产模板生效后的关键项大致如下（不同版本数值会变，以 `electron-builder` 类型为准）：

```yaml
appId: org.quiteer.electronup
productName: <package.json name>
protocols: {name: <name>, schemes: [deeplink]}
files: [{filter: ['dist/resource/**/*']}]
extraFiles: [{filter: [lib]}]
directories: {output: dist/out}
win: {icon: public/icon.png, target: {target: nsis, arch: ia32}}
nsis: {oneClick: false, perMachine: true, allowElevation: true, allowToChangeInstallationDirectory: true, artifactName: '<name> ${arch} Setup ${version}.${ext}'}
```

要点：

- `files` 是**白名单**，运行期需要的静态资源必须落在这条 filter 覆盖范围内。
- `lib/` 通过 `extraFiles` 进包，适合放 `.node`、外部可执行文件。
- 命令行 flag 优先级高于这里的配置。

## 自动更新（0.3.0 新增）

`electronup` 额外导出 `initAutoUpdater` / `checkForUpdates` / `autoUpdater`（基于 electron-updater）：

```ts
// main/index.ts
import { initAutoUpdater } from 'electronup'

app.whenReady().then(() => {
  initAutoUpdater({ checkOnStart: true, autoDownload: true })
})
```

`autoUpdater` 是惰性代理，配置加载阶段不会触发 electron 副作用。发布端还需要 `builderConfig.publish` 与对应的更新源配置。

## 0.2.x → 0.3.x 迁移对照

| 0.2.x                      | 0.3.x                                                 |
| -------------------------- | ----------------------------------------------------- |
| `tsdownConfig`             | `packConfig`                                          |
| 主进程由 tsdown 构建       | 主进程由 vite-plus pack 构建，产物仍是 `electron.cjs` |
| `electron` 由 CLI 传递依赖 | `electron` 需在模板里显式声明为 devDependency         |
| 无 `--web`                 | `electronup build --web` 只构建渲染层                 |

## 配置调试

构建时会生成 `electronup-effective-config.yaml`（三工具的最终合并配置）。排查「配置没生效」先看这个文件，而不是猜。
