# electronup.config.ts 字段参考

配置从 `electronup` 导入 `defineConfig`，支持对象、`async` 函数、以及 `({ command, root }) => config` 函数三种导出形式。`command` 为 `'serve'`（dev）或 `'build'`。

## 顶层字段

| 字段            | 类型                   | 默认值   | 作用                                                              |
| --------------- | ---------------------- | -------- | ----------------------------------------------------------------- |
| `renderDir`     | `string`               | `render` | 渲染进程目录，等价 Vite `root`（`index.html` 所在处）             |
| `mainDir`       | `string`               | `main`   | 主进程源码目录                                                    |
| `publicDir`     | `string`               | `public` | 全局静态资源目录，等价 Vite `publicDir`                           |
| `libDir`        | `string`               | `lib`    | 动态库目录，整目录随包额外拷贝（`extraFiles`）                    |
| `resourceDir`   | `string`               | `dist`   | vite + tsdown 的构建输出目录（`dist/resource`），dev 时也输出到此 |
| `outDir`        | `string`               | `out`    | electron-builder 安装包输出目录                                   |
| `viteConfig`    | `ViteConfig`           | `{}`     | 透传 Vite 用户配置                                                |
| `tsdownConfig`  | `TsdownConfig`         | `{}`     | 主进程构建配置（仅暴露少量字段）                                  |
| `preload`       | `Options \| Options[]` | –        | 预加载脚本的打包配置（vite-plus pack 选项），可传单个或多个入口   |
| `builderConfig` | `Configuration`        | 见下     | electron-builder 配置，类型即 electron-builder 的 `Configuration` |

注意：`builderConfig` 在类型定义中是必填字段，模板里已提供。

## 路径优先级

路径都以项目根目录为基准拼接。这三处**改不动**，必须用顶层字段覆盖：

| 想在 vite 里改 | 实际必须改          |
| -------------- | ------------------- |
| `root`         | `renderDir`         |
| `publicDir`    | `publicDir`（顶层） |
| `build.outDir` | `resourceDir`       |

`viteConfig.o`、`ssr` 被显式排除出类型（`Omit<UserConfig, 'publicDir' | 'ssr'>`）。

## viteConfig 中的特例

- `base`：预置 `./`，**可覆盖但强烈不建议**；改了要同步 `render/index.html` 里的资源路径，且打包后白屏往往就是这里。
- `build.minify`：不可通过配置覆盖，只能命令行 `--no-minify` 控制。
- 其余字段与 Vite 官方配置完全一致（`plugins`、`resolve.alias`、`server`、`define` 等）。

## tsdownConfig

主进程用 tsdown 构建，只暴露两个字段：

| 字段         | 说明                                               |
| ------------ | -------------------------------------------------- |
| `external`   | 不参与打包的模块（运行时由 `node_modules` 提供）   |
| `noExternal` | 强制参与打包（内联）的模块，用来吞掉 ESM-only 依赖 |

预置行为（不可配置）：`format: cjs`、`dts: false`、`clean: false`、入口 `mainDir/index.ts`、`outDir` 为 `resourceDir`、并注入 `NODE_ENV` 与全部 `.env` 变量。

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

## 配置调试

构建时会生成 `electronup-effective-config.yaml`（三工具的最终合并配置）。排查「配置没生效」先看这个文件，而不是猜。
