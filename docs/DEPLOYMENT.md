# 部署 BeadBoo

[← 返回 README](../README.md)

```sh
pnpm install --frozen-lockfile
pnpm run build
```

将生成的 **`dist/`** 目录部署到支持 HTTPS 的静态托管服务，应用无需 Node.js 后端。当前构建使用根路径资源地址，请部署到域名根路径；仓库子路径部署需要另外调整资源路径、PWA scope 和 Service Worker 配置。

生产环境需要 HTTPS 才能使用 Service Worker 和离线功能；桌面 `localhost` 可用于本地调试。局域网 HTTP 地址仅用于普通页面预览。

在 iPhone Safari 打开站点，选择「分享 → 添加到主屏幕」。首次联网访问后，等待「我的」显示「离线资源已就绪」，即可离线打开已缓存应用与本地图纸。新版本就绪时，用户可在「我的」确认更新。

如需使用已有的可信证书进行本地 HTTPS 测试：

```sh
TLS_CERT=/path/to/certificate.pem TLS_KEY=/path/to/private-key.pem PORT=5173 pnpm start
```

本仓库尚未配置公开在线演示或自动部署。
