# electronup-template

当前分支：react-swc。基于 electronup 0.3.1，使用 Node 24.12.0 与 pnpm 10.30.3。

```bash
pnpm install
pnpm dev
pnpm typecheck
pnpm lint
pnpm build:web
pnpm build:dir
```

主进程输出为 dist/resource/electron.cjs，安装包输出到 dist/out。应用版本由 package.json 的 version 管理；模板初始为 0.0.0。

## 自动更新

默认未设置更新源，不会主动检查更新。构建安装包前，在终端设置 generic 更新服务目录：

```powershell
$env:ELECTRONUP_UPDATE_URL = 'https://your-domain.example/updates/'
pnpm build:win64
```

此地址需替换为你实际使用的服务地址，不要在配置中放 token。上传安装包及 electron-builder 生成的 latest.yml / latest-mac.yml、blockmap 等更新产物到对应目录。macOS 保留 dmg 与 zip 目标；签名与公证需按应用自行配置。

electronup 是构建依赖，封装通过 packConfig.noExternal 内联；electron-updater 是生产依赖，必须随安装包分发。main/updater.ts 仅在 app.isPackaged 且 resources/app-update.yml 存在时初始化，开发环境和未配置更新源时跳过。

验证升级时先安装旧版，再提高应用版本并构建新版；检查下载、退出安装和重启后的版本。build:dir 成功只证明打包链路通过，不代表真实升级已验证。

Electron 45 首次运行时按需下载开发二进制；需要提前准备时运行 `pnpm exec install-electron`。
