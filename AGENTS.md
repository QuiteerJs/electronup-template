# AGENTS.md

> 面向 AI 编码代理的项目规则。动手改代码前先读完本文件。
> 需要执行具体任务（新增页面、加 IPC 通道、改打包配置、排错）时，按末尾「能力索引」加载 `.agents/skills/electronup-dev/SKILL.md`。

## 项目概览

`electronup-template` 的 `solid` 分支：一个可直接运行、可直接打包的 Electron + TypeScript 桌面应用骨架，用一条命令完成「双进程热更新 + 多环境构建 + 多平台安装包」。

- 编排工具：`electronup` CLI —— 只对 Vite / vite-plus pack / electron-builder 做预置配置，不魔改原工具，几乎所有原配置都可覆盖
- 渲染进程：SolidJS + TypeScript（`vite-plugin-solid`）
- 主进程：`main/`，TypeScript 经 **vite-plus pack** 打包为 **CJS**（产物 `dist/resource/electron.cjs`）
- 配置入口：**只有** `electronup.config.ts` 一个文件
- 包管理器：**pnpm**（`pnpm-lock.yaml`）；Node 版本见 `.node-version`（当前 `24.12.0`）

## 本分支渲染层：SolidJS + TypeScript

| 文件                      | 作用                                      |
| ------------------------- | ----------------------------------------- |
| `render/index.html`       | Vite 入口，`#app` 为挂载点                |
| `render/main.tsx`         | 入口：`render(() => <App />, container)`  |
| `render/App.tsx`          | 根组件                                    |
| `render/components/*.tsx` | 业务组件                                  |
| `render/env.d.ts`         | `ImportMetaEnv` 与 `vite/client` 类型声明 |
| `render/style.css`        | 全局样式                                  |

约定：

- 细粒度响应式：用 `createSignal` / `createMemo` / `createEffect`，不要把 React 的 `useState` + 依赖数组心智搬过来
- 组件函数体只执行一次，DOM 更新由信号驱动；副作用放 `onMount` / `onCleanup`
- JSX 写 `class` 而不是 `className`；`jsx: preserve` + `jsxImportSource: solid-js` 已在 `tsconfig.json` 配好
- 新增 `VITE_` 变量后，同步在 `env.d.ts` 的 `ImportMetaEnv` 补类型
- 类型检查走 `pnpm typecheck`（`tsc --noEmit`）
- `vite-plugin-solid` 已在 `electronup.config.ts` 的 `viteConfig.plugins` 配好，不要重复添加

## 目录约定

| 目录             | 作用                                                 | 对应配置字段（顶层）                |
| ---------------- | ---------------------------------------------------- | ----------------------------------- |
| `main/`          | 主进程源码，入口 `main/index.ts`                     | `mainDir`，默认 `main`              |
| `render/`        | 渲染进程，`index.html` 所在目录即 Vite `root`        | `renderDir`，默认 `render`          |
| `public/`        | 全局静态资源，原样拷贝，以 `/` 引用                  | `publicDir`，默认 `public`          |
| `lib/`           | 动态库（原生 `.node` 等），整目录随包额外拷贝        | `libDir`，默认 `lib`                |
| `dist/resource/` | 构建产物（vite 渲染层 + pack 主进程 `electron.cjs`） | `resourceDir`，默认 `dist/resource` |
| `dist/out/`      | electron-builder 安装包输出                          | `outDir`，默认 `dist/out`           |

**路径类配置只在顶层生效**：写成 `viteConfig.root`、`viteConfig.build.outDir`、`viteConfig.publicDir` 都会被外层字段覆盖，改了等于没改。

## 常用命令

| 命令                                                                           | 说明                                                                |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| `pnpm dev`                                                                     | 开发：渲染层 HMR，主进程改动自动重启                                |
| `pnpm build`                                                                   | 构建当前平台的安装包                                                |
| `pnpm build:dir`                                                               | 只出免安装目录版，验证打包结果的首选                                |
| `pnpm build:web`                                                               | 只构建渲染层，不碰主进程与安装包（CI / 无 Electron 二进制时也能跑） |
| `pnpm build:win` / `build:win32` / `build:win64`                               | Windows：默认双架构 / ia32 / x64                                    |
| `pnpm build:mac` / `build:mac-x64` / `build:mac-arm64` / `build:mac-universal` | macOS 各架构                                                        |
| `pnpm build:linux`                                                             | Linux                                                               |
| `pnpm build:option`                                                            | 交互式选择构建目标                                                  |
| `pnpm lint` / `pnpm lint:fix`                                                  | ESLint（`@antfu/eslint-config`）                                    |
| `pnpm typecheck`                                                               | 类型检查（不产出文件）                                              |

- **没有测试框架**，不存在 `pnpm test`，不要臆造测试脚本或测试目录。
- 一次构建只能产出一个平台的包，多平台要分批执行。

## 环境变量与 mode

- 加载链：`.env` + `.env.<mode>`；`pnpm dev` 默认 `development`，`pnpm build` 默认 `production`
- 显式指定：`pnpm dev -m staging` → `.env` + `.env.staging`，**mode 名必须与文件名后缀完全一致**
- 渲染层只暴露 `VITE_` 前缀，用 `import.meta.env.VITE_XXX`；主进程用 `process.env.VITE_XXX`（electronup 会把同一批变量注入主进程产物，双进程变量一致）
- 开发期渲染层地址由 `process.env.RENDER_PORT` 拼出（见 `main/index.ts`），端口被占用时 CLI 会自动换端口，**不要写死 5173**
- `electronup.config.ts` 不自动注入 .env 文件；可以读取启动 CLI 前终端已经设置的 process.env（如 ELECTRONUP_UPDATE_URL），或按 defineConfig 的 command 分支。

## 改动约定（易踩坑）

1. 换入口目录 / 产物目录 → 改 config 顶层字段，不要动 `viteConfig`
2. 主进程产物是 **CJS**：不要用 `import.meta`，不要依赖 ESM-only 包；必须用时把包加进 `packConfig.noExternal` 让其内联
3. 新增需编译的原生模块（sqlite3、node-pty 等）：确认 `electron-builder install-app-deps` 跑过，并把运行期文件放进 `lib/`（走 `extraFiles`）或已被 `files` 覆盖
4. 打包是**显式白名单**（`builderConfig.files`），新增运行期静态文件后要确认仍被包含，否则打包后文件丢失
5. IPC 不要手搓重复轮子：内置能力优先用 `@quiteer/electron-ipc`（主进程 `Ipc.init()` 一次，渲染层 `window.$ipc`）与 `@quiteer/electron-preload`（默认导出 preload 绝对路径，一行接入 `webPreferences.preload`）
6. 依赖只用 `pnpm add` / `pnpm add -D`；不要 `npm i`、不要手改 `pnpm-lock.yaml`
7. 提交信息走 conventional commits（`simple-git-hooks` + `qui` 校验），提交时 `lint-staged` 会自动 `eslint --fix`
8. 代码风格由 antfu 配置决定：无分号、单引号、2 空格缩进；项目**没有** prettier，不要引入
9. 当前 `builderConfig.asar` 为 `false`，便于排查；对外发版前建议改回 `true`
10. **依赖版本一律用 npm 正式版本**（`electronup` / `electron` / `@quiteer/*` 均为 `^x.y.z`）。禁止 `link:` / `file:` 指向本地路径——模板会被 `create-electronup` 直接拉取，本地链接会让使用者直接装不上
11. `electron` 从 electronup 0.3.0 起不再由 CLI 自带，必须作为 devDependency 显式声明；升级 electronup 时同步检查 `electron`、`@quiteer/electron-ipc`、`@quiteer/electron-preload` 是否需要跟进
12. 构建脚本白名单统一在 **`pnpm-workspace.yaml`** 的 `onlyBuiltDependencies` 维护。Electron 45 在首次使用时按需下载二进制；也可执行 `pnpm exec install-electron` 提前下载。旧版 Electron 若使用 postinstall，仍需保留 electron 的脚本许可。

## 自动更新与模板同步

- 当前基线为 electronup 0.3.1；Node 支持范围见 package.json，统一使用 pnpm 10.30.3。
- electron-updater 是生产依赖，electronup 是开发依赖；packConfig.noExternal 必须内联 electronup，主入口保持 dist/resource/electron.cjs。
- 构建时可设置终端环境变量 ELECTRONUP_UPDATE_URL；未设置时关闭发布源，运行时仅在已打包且 app-update.yml 存在时启用更新。
- macOS 更新需要 zip，默认保留 dmg 和 zip。目录包通过不代表安装、下载和重启升级验收通过。
- 同步 main/vanilla/vue/react/react-swc/solid 时保留框架差异，每个分支独立用 pnpm 生成 lockfile，并执行 typecheck、lint、build:web、build:dir。此仓库为应用模板，不执行 npm publish。

## 能力索引

| 触发场景                                                                    | 加载                                                          |
| --------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 新增功能页 / 组件、加 IPC 通道、加环境变量、改打包目标、排查 dev 或打包异常 | `.agents/skills/electronup-dev/SKILL.md`                      |
| `electronup.config.ts` 字段全表、默认值、可覆盖性                           | `.agents/skills/electronup-dev/references/config.md`          |
| 命令与 flag、mode 矩阵、平台/架构、产物路径                                 | `.agents/skills/electronup-dev/references/cli-and-build.md`   |
| `window.$ipc` / `$clipboard` / `$webFrame`、内置通道、类型增强              | `.agents/skills/electronup-dev/references/ipc-and-preload.md` |

- @quiteer/electron-ipc 3.x 仅提供 ESM 导出，也必须加入 packConfig.noExternal 内联，避免 CJS 主进程启动时报 ERR_PACKAGE_PATH_NOT_EXPORTED。

- 框架插件的 vite 开发依赖使用 npm:vite-plus@^1.3.0 正式包别名，与 electronup 的构建引擎和类型保持一致；不要另装独立 Vite 造成 Plugin 类型冲突。
