# 部署 BeadBoo

[← 返回 README](../README.md)

## Docker

仓库提供 `Dockerfile`、`.dockerignore` 和 `docker-compose.example.yaml`。镜像使用 Node.js 构建静态资源，运行阶段仅复制 `dist/` 和现有的 `scripts/serve.mjs`，以非 root 用户通过 Node.js 在容器内的 8080 端口提供服务；宿主机不需要安装 Node.js 或 pnpm。健康检查使用 Node.js 请求 `/index.html`。

仓库只保留可复用的 Compose 示例。实际使用的 `compose.yaml`、`docker-compose.yaml` 及其 `.yml`、override 等变体均由 `.gitignore` 忽略，以免提交各台机器的部署配置。

### 首次部署

示例可独立启动，Docker Compose 会自动创建项目网络。在 BeadBoo 项目根目录执行：

```sh
# 只在首次部署时复制；后续升级保留本机已编辑的配置。
cp -n docker-compose.example.yaml docker-compose.yaml
docker compose config --quiet
docker compose up -d --build --wait
docker compose ps
```

启动后访问 `http://localhost:8080`。示例将宿主机的 8080 端口映射到容器内的 8080 端口；如需调整宿主机端口，请修改本机 `docker-compose.yaml` 的 `ports` 配置左侧端口号。容器内端口由 `PORT` 环境变量控制，默认是 8080。

其他设备可通过 `http://<服务器局域网 IP>:8080` 使用普通网页功能。该局域网 HTTP 地址不支持 Service Worker 离线缓存；需要完整 PWA 能力时，请按部署环境配置可信 HTTPS。域名、反向代理及共享网络等设置由部署者在本机配置中管理。

### 更新与维护

获取目标版本代码后，在项目根目录重新构建并更新容器：

```sh
docker compose up -d --build --wait
docker compose logs --tail=100 web
```

升级时不要直接覆盖本机的 `docker-compose.yaml`；如示例发生变化，请比较后合并所需设置。图纸与进度保存在各客户端浏览器中，应用容器无需挂载图纸数据卷；请使用应用内导出功能备份作品。

## 静态托管

```sh
pnpm install --frozen-lockfile
pnpm run build
```

将生成的 **`dist/`** 目录部署到支持 HTTPS 的静态托管服务，应用无需 Node.js 后端。当前构建使用根路径资源地址，请部署到域名根路径；仓库子路径部署需要另外调整资源路径、PWA scope 和 Service Worker 配置。

使用 Service Worker 和离线功能需要 HTTPS；桌面 `localhost` 可用于本地调试。局域网 HTTP 地址可使用普通网页功能。

在 iPhone Safari 打开站点，选择「分享 → 添加到主屏幕」。首次联网访问后，等待「我的」显示「离线资源已就绪」，即可离线打开已缓存应用与本地图纸。新版本就绪时，用户可在「我的」确认更新。

如需使用已有的可信证书进行本地 HTTPS 测试：

```sh
TLS_CERT=/path/to/certificate.pem TLS_KEY=/path/to/private-key.pem PORT=5173 pnpm start
```

本仓库尚未配置公开在线演示或自动部署。
