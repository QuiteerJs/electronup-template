# AGENTS.md

> 面向 AI 编码代理的项目规则。动手改代码前先读完本文件。
> 需要执行具体任务（新增页面、加 IPC 通道、改打包配置、排错）时，按末尾「能力索引」加载 `.agents/skills/electronup-dev/SKILL.md`。

## 项目概览

`electronup-template` 的 `react-swc` 分支：一个可直接运行、可直接打包的 Electron + TypeScript 桌面应用骨架，用一条命令完成「双进程热更新 + 多环境构建 + 多平台安装包」。

- 编排工具：`electronup` CLI —— 只对 Vite / tsdown / electron-builder 做预置配置，不魔改原工具，几乎所有原配置都可覆盖
- 渲染进程：React + TypeScript，SWC 编译（待接入，见下方说明）
- 主进程：`main/`，TypeScript 经 **tsdown** 打包为 **CJS**
- 配置入口：**只有** `electronup.config.ts` 一个文件
- 包管理器：**pnpm**（`pnpm-lock.yaml`）；Node 版本见 `.node-version`（当前 `24.12.0`）

> **当前分支 `react-swc`**：目标技术栈 React + TypeScript，用 SWC 替代 Babel 做编译（启动与 HMR 更快）。
>
> ⚠️ 现状：该分支**尚未落地** React 代码，`render/` 仍是模板默认的原生 TS 入口（`render/main.ts` + `render/counter.ts`）。
> 要真正用 React，先完成下面的接入清单，否则不要在「已有 React 代码」的假设上继续改。

> 接入清单：
> 1. `pnpm add react react-dom` + `pnpm add -D @vitejs/plugin-react-swc @types/react @types/react-dom`
> 2. `viteConfig.plugins: [react()]`（`import react from '@vitejs/plugin-react-swc'`）
> 3. 入口改 `render/main.tsx` 并同步 `render/index.html` 的 `<script src>`，`tsconfig.json` 的 `include` 补 `render/**/*.tsx`
> 4. SWC 插件不支持 Babel 插件生态（如 babel-plugin-import），需要此类能力请回到 `react` 分支；Fast Refresh 行为与 `react` 分支一致

## 目录约定

| 目录 | 作用 | 对应配置字段（顶层） |
| --- | --- | --- |
| `main/` | 主进程源码，入口 `main/index.ts` | `mainDir`，默认 `main` |
| `render/` | 渲染进程，`index.html` 所在目录即 Vite `root` | `renderDir`，默认 `render` |
| `public/` | 全局静态资源，原样拷贝，以 `/` 引用 | `publicDir`，默认 `public` |
| `lib/` | 动态库（原生 `.node` 等），整目录随包额外拷贝 | `libDir`，默认 `lib` |
| `dist/resource/` | 构建产物（vite 渲染层 + tsdown 主进程） | `resourceDir`，默认 `dist` |
| `out/` | electron-builder 安装包输出 | `outDir`，默认 `out` |

**路径类配置只在顶层生效**：写成 `viteConfig.root`、`viteConfig.build.outDir`、`viteConfig.publicDir` 都会被外层字段覆盖，改了等于没改。

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `pnpm dev` | 开发：渲染层 HMR，主进程改动自动重启 |
| `pnpm build` | 构建当前平台的安装包 |
| `pnpm build:dir` | 只出免安装目录版，验证打包结果的首选 |
| `pnpm build:win` / `build:win32` / `build:win64` | Windows：默认双架构 / ia32 / x64 |
| `pnpm build:mac` / `build:mac-x64` / `build:mac-arm64` / `build:mac-universal` | macOS 各架构 |
| `pnpm build:linux` | Linux |
| `pnpm build:option` | 交互式选择构建目标 |
| `pnpm lint` / `pnpm lint:fix` | ESLint（`@antfu/eslint-config`） |

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

| 触发场景 | 加载 |
| --- | --- |
| 新增功能页 / 组件、加 IPC 通道、加环境变量、改打包目标、排查 dev 或打包异常 | `.agents/skills/electronup-dev/SKILL.md` |
| `electronup.config.ts` 字段全表、默认值、可覆盖性 | `.agents/skills/electronup-dev/references/config.md` |
| 命令与 flag、mode 矩阵、平台/架构、产物路径 | `.agents/skills/electronup-dev/references/cli-and-build.md` |
| `window.$ipc` / `$clipboard` / `$webFrame`、内置通道、类型增强 | `.agents/skills/electronup-dev/references/ipc-and-preload.md` |
