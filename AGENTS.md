# AGENTS.md

> 面向 AI 编码代理的项目规则。动手改代码前先读完本文件。
> 需要执行具体任务（新增页面、加 IPC 通道、改打包配置、排错）时，按末尾「能力索引」加载 `.agents/skills/electronup-dev/SKILL.md`。

## 项目概览

`electronup-template` 的 `react` 分支：一个可直接运行、可直接打包的 Electron + TypeScript 桌面应用骨架，用一条命令完成「双进程热更新 + 多环境构建 + 多平台安装包」。

- 编排工具：`electronup` CLI —— 只对 Vite / tsdown / electron-builder 做预置配置，不魔改原工具，几乎所有原配置都可覆盖
- 渲染进程：React 19 + TypeScript（`@vitejs/plugin-react`，Babel 编译）
- 主进程：`main/`，TypeScript 经 **tsdown** 打包为 **CJS**
- 配置入口：**只有** `electronup.config.ts` 一个文件
- 包管理器：**pnpm**（`pnpm-lock.yaml`）；Node 版本见 `.node-version`（当前 `24.12.0`）

## 本分支渲染层：React + TypeScript

| 文件                      | 作用                                                                   |
| ------------------------- | ---------------------------------------------------------------------- |
| `render/index.html`       | Vite 入口，`#app` 为挂载点                                             |
| `render/main.tsx`         | 入口：`createRoot(container).render(<StrictMode><App /></StrictMode>)` |
| `render/App.tsx`          | 根组件                                                                 |
| `render/components/*.tsx` | 业务组件                                                               |
| `render/env.d.ts`         | `ImportMetaEnv` 与 `vite/client` 类型声明                              |
| `render/style.css`        | 全局样式                                                               |

约定：

- 函数组件 + hooks，不写 class 组件
- 组件文件用 `.tsx`，相对导入带扩展名（`allowImportingTsExtensions` 已开）
- 新增 `VITE_` 变量后，同步在 `env.d.ts` 的 `ImportMetaEnv` 补类型
- 类型检查走 `pnpm typecheck`（`tsc --noEmit`）
- `@vitejs/plugin-react` 已在 `electronup.config.ts` 的 `viteConfig.plugins` 配好，不要重复添加

## 目录约定

| 目录             | 作用                                          | 对应配置字段（顶层）       |
| ---------------- | --------------------------------------------- | -------------------------- |
| `main/`          | 主进程源码，入口 `main/index.ts`              | `mainDir`，默认 `main`     |
| `render/`        | 渲染进程，`index.html` 所在目录即 Vite `root` | `renderDir`，默认 `render` |
| `public/`        | 全局静态资源，原样拷贝，以 `/` 引用           | `publicDir`，默认 `public` |
| `lib/`           | 动态库（原生 `.node` 等），整目录随包额外拷贝 | `libDir`，默认 `lib`       |
| `dist/resource/` | 构建产物（vite 渲染层 + tsdown 主进程）       | `resourceDir`，默认 `dist` |
| `out/`           | electron-builder 安装包输出                   | `outDir`，默认 `out`       |

**路径类配置只在顶层生效**：写成 `viteConfig.root`、`viteConfig.build.outDir`、`viteConfig.publicDir` 都会被外层字段覆盖，改了等于没改。

## 常用命令

| 命令                                                                           | 说明                                 |
| ------------------------------------------------------------------------------ | ------------------------------------ |
| `pnpm dev`                                                                     | 开发：渲染层 HMR，主进程改动自动重启 |
| `pnpm build`                                                                   | 构建当前平台的安装包                 |
| `pnpm build:dir`                                                               | 只出免安装目录版，验证打包结果的首选 |
| `pnpm build:win` / `build:win32` / `build:win64`                               | Windows：默认双架构 / ia32 / x64     |
| `pnpm build:mac` / `build:mac-x64` / `build:mac-arm64` / `build:mac-universal` | macOS 各架构                         |
| `pnpm build:linux`                                                             | Linux                                |
| `pnpm build:option`                                                            | 交互式选择构建目标                   |
| `pnpm lint` / `pnpm lint:fix`                                                  | ESLint（`@antfu/eslint-config`）     |
| `pnpm typecheck`                                                               | 类型检查（不产出文件）               |

- **没有测试框架**，不存在 `pnpm test`，不要臆造测试脚本或测试目录。
- 一次构建只能产出一个平台的包，多平台要分批执行。

## 环境变量与 mode

- 加载链：`.env` + `.env.<mode>`；`pnpm dev` 默认 `development`，`pnpm build` 默认 `production`
- 显式指定：`pnpm dev -m staging` → `.env` + `.env.staging`，**mode 名必须与文件名后缀完全一致**
- 渲染层只暴露 `VITE_` 前缀，用 `import.meta.env.VITE_XXX`；主进程用 `process.env.VITE_XXX`（electronup 会把同一批变量注入 tsdown 产物，双进程变量一致）
- 开发期渲染层地址由 `process.env.RENDER_PORT` 拼出（见 `main/index.ts`），端口被占用时 CLI 会自动换端口，**不要写死 5173**
- `electronup.config.ts` 内**读不到**这些环境变量（官方明确不支持）。需要按环境分支时，只能用 `defineConfig(({ command }) => ...)` 的 `command`（`serve` / `build`），或用 CLI 参数

## 改动约定（易踩坑）

1. 换入口目录 / 产物目录 → 改 config 顶层字段，不要动 `viteConfig`
2. 主进程产物是 **CJS**：不要用 `import.meta`，不要依赖 ESM-only 包；必须用时把包加进 `tsdownConfig.noExternal` 让其内联
3. 新增需编译的原生模块（sqlite3、node-pty 等）：确认 `electron-builder install-app-deps` 跑过，并把运行期文件放进 `lib/`（走 `extraFiles`）或已被 `files` 覆盖
4. 打包是**显式白名单**（`builderConfig.files`），新增运行期静态文件后要确认仍被包含，否则打包后文件丢失
5. IPC 不要手搓重复轮子：内置能力优先用 `@quiteer/electron-ipc`（主进程 `Ipc.init()` 一次，渲染层 `window.$ipc`）与 `@quiteer/electron-preload`（默认导出 preload 绝对路径，一行接入 `webPreferences.preload`）
6. 依赖只用 `pnpm add` / `pnpm add -D`；不要 `npm i`、不要手改 `pnpm-lock.yaml`
7. 提交信息走 conventional commits（`simple-git-hooks` + `qui` 校验），提交时 `lint-staged` 会自动 `eslint --fix`
8. 代码风格由 antfu 配置决定：无分号、单引号、2 空格缩进；项目**没有** prettier，不要引入
9. 当前 `builderConfig.asar` 为 `false`，便于排查；对外发版前建议改回 `true`

## 能力索引

| 触发场景                                                                    | 加载                                                          |
| --------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 新增功能页 / 组件、加 IPC 通道、加环境变量、改打包目标、排查 dev 或打包异常 | `.agents/skills/electronup-dev/SKILL.md`                      |
| `electronup.config.ts` 字段全表、默认值、可覆盖性                           | `.agents/skills/electronup-dev/references/config.md`          |
| 命令与 flag、mode 矩阵、平台/架构、产物路径                                 | `.agents/skills/electronup-dev/references/cli-and-build.md`   |
| `window.$ipc` / `$clipboard` / `$webFrame`、内置通道、类型增强              | `.agents/skills/electronup-dev/references/ipc-and-preload.md` |
