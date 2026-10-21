# 命令、mode 与打包目标

## 命令总览

```bash
electronup [config-file]        # 等同 electronup dev，启动开发环境
electronup build [config-file]  # 构建，不指定平台则按当前系统
electronup --help
electronup build --help
```

`config-file` 省略时为根目录 `electronup.config.ts`；放在别处才需要显式传。

## dev 参数

| 参数 | 说明 |
| --- | --- |
| `-p, --port <port>` | 渲染层 dev 端口，被占用自动换端口（实际端口注入 `RENDER_PORT`） |
| `-m, --mode <mode>` | 指定环境模式 |
| `--no-minify` | 主/渲染进程代码都不压缩，便于调试 |

## build 参数

| 参数 | 说明 |
| --- | --- |
| `--dir` | 只出目录版（免安装，可直接启动），验证打包结果首选 |
| `--no-asar` | `asar: false`，产物为散文件 |
| `--win [ia32\|x64]` | 不传架构则同时产 ia32 + x64 两个包 |
| `--mac [x64\|arm64\|universal]` | 不传则按当前机器架构；`universal` 为双架构合并包 |
| `--linux [x64\|arm64\|armv7l]` | 不传则按当前机器架构 |
| `-o, --option` | 交互式选择构建目标（mac 上可跨三端，win 上只能 win） |
| `-m, --mode <mode>` | 指定环境模式 |
| `--no-minify` | 不压缩 |

一次构建只产出一个平台的包；多平台必须分批执行并各自保存产物。

## mode 与环境变量解析

| 命令 | 加载的文件 |
| --- | --- |
| `electronup`（dev） | `.env` + `.env.development` |
| `electronup build` | `.env` + `.env.production` |
| `electronup -m test` | `.env` + `.env.test` |
| `electronup dev -m production` | `.env` + `.env.production`（dev 跑生产变量） |

- `mode` 字符串必须与 `.env.<mode>` 后缀一致，否则该文件不会被加载，且**不会报错**。
- 同一批变量同时注入渲染层（仅 `VITE_` 前缀）与主进程（`process.env`）。
- 配置文件内读不到环境变量。

## 产物路径

| 阶段 | 路径 | 内容 |
| --- | --- | --- |
| dev / build 中间产物 | `dist/resource/` | `index.html`、`electron.js`、资源文件 |
| 安装包 | `out/` | dmg / nsis / AppImage 等 |

## 各平台注意

- **Windows**：不支持 arm64 目标；不传架构会出两个包，CI 上注意分离产物。
- **macOS**：`x64` 包能在 Apple Silicon 上跑（Rosetta/兼容层，性能差）；`universal` 体积约为单架构两倍。签名/公证不在 electronup 预置范围，需自行在 `builderConfig.mac` 里配。
- **Linux**：`armv7l` 仅部分目标可用，实测前先 `--dir` 验证。

## 与 package.json scripts 的对应

模板脚本是薄封装，等价关系：

| script | 等价命令 |
| --- | --- |
| `dev` | `electronup` |
| `build` | `electronup build` |
| `build:dir` | `electronup build --dir` |
| `build:win32` | `electronup build --win ia32` |
| `build:mac-universal` | `electronup build --mac universal` |
| `build:option` | `electronup build -o` |

要临时试参数，直接 `pnpm exec electronup build --win x64 --no-minify`，不必改 scripts。
