# 豆豆工坊 Web

移动端 Web / iOS PWA 首版，版本沿用 `0.1.0-alpha.3`。独立项目，不修改原 Expo 手机 App。

## 启动

需要 Node.js 22.13+（或受支持的更高版本）和 pnpm 10.28.2（版本固定在 `package.json` 的 `packageManager` 字段）。若尚未安装 pnpm，可运行 `corepack enable`。

```sh
pnpm install --frozen-lockfile
pnpm run build
pnpm start
```

默认监听 `0.0.0.0:5173`。Mac 打开 `http://localhost:5173`；同一 Wi-Fi 的手机打开 `http://<Mac 局域网 IP>:5173`。`PORT=5174 pnpm start` 可调整端口。

`pnpm run dev` 会构建后启动；修改代码后需要重新构建并刷新，不提供热更新。构建输出 `dist/` 可部署到域名根路径的静态 Web 托管，无需 Node 后端。

## 已支持

- 制作、图纸、色卡、我的；图片→色卡→尺寸→预览四步创建。
- 24、32、48、64、96、128、256 格横向预设；宽高分别自定义 1–512 格。预设保持图片比例，并把任意一边限制到 512。
- 自定义尺寸支持完整放入（透明留白）和居中裁剪铺满；不会拉伸图片。
- 图片颜色转换、PNG 和 SVG 导出在 Web Worker 执行。图片不会上传。
- Canvas 图纸预览、单指拖动、双指缩放、鼠标滚轮缩放、锁定、定位区域、色号查询。
- 按区域和颜色批量标记完成，画布显示完成底色、纹理和勾选；撤销、恢复进度、图纸副本编辑。
- 10 张预设（含样例），咪小窝、Artkal、MARD、COCO、漫漫、盼盼；品牌/色号搜索。预设必须主动添加，不自动进入用户色卡。
- 自定义色卡和图纸分开保存在 IndexedDB。写入事务完成后才更新 UI，双份快照可恢复上一份有效记录，检测其他标签页的写入冲突。
- PNG 全图预览、完整色号 SVG、CSV 用量、JSON 图纸；“我的”可导入原 App 导出的 JSON 或 Web 图纸备份。
- 图纸备份包含用色快照和进度；尚未用于图纸的独立色卡不包含在图纸备份中。

预设数据来源、准确性和许可见 `COLOR-CARDS.md` 与 `licenses/`。预设并非全部来自品牌官方，不应将社区参考数据宣传为官方色表。

## iPhone 与 PWA

局域网 HTTP 用于测试页面。正式提供主屏幕 App 和离线能力，请将 `dist/` 部署到 HTTPS 域名；桌面 `localhost` 可用于 Service Worker 调试。

iPhone Safari 打开 HTTPS 页面后：分享→添加到主屏幕→作为网页 App 打开→添加。首次联网访问，待“我的”显示“离线资源已就绪”，后续可以离线打开已缓存的应用和本地图纸。

本地 HTTPS 测试可指定已有的可信证书：

```sh
TLS_CERT=/path/to/certificate.pem TLS_KEY=/path/to/private-key.pem PORT=5173 pnpm start
```

未配置公网托管、域名或证书，不会自动发布。浏览器与主屏幕 App 的存储可能分开，请用备份迁移；清除网站数据会删除本地记录。跨设备同步、登录和服务端图纸存储尚未接入。

Service Worker 只预缓存同源构建产物，新版本提示后由用户在“我的”确认更新。其他打开的标签页不会强制刷新。为旧标签页保留旧版本缓存；可在浏览器站点设置清理，但清理时注意先备份图纸。

## 架构

复用 Expo + React Native Web 界面及确定性算法；`*.web.tsx` 提供浏览器 Canvas，`src/web/worker.ts` 执行重计算，`src/web/storage.ts` 提供异步存储。

预设保留 `PresetCardSource.load(signal)`、`schemaVersion`、`catalogVersion` 与校验层。将 `ColorCardsProvider` 的 `presetSource` 替换为 HTTP adapter 即可迁移 API，页面无需直接依赖接口地址。当前使用随构建发布的本地目录，没有实际远端 API。

图纸保存色卡快照，不随预设更新而改变；图纸只是参考图，实体颜色请按品牌型号辨认。Web 使用浏览器视觉与动画，不调用 iOS 原生液态玻璃组件。

## 验证

```sh
pnpm run typecheck
pnpm test
pnpm run build
# 先启动 pnpm start
pnpm exec playwright install chromium
pnpm run test:e2e
# 在 macOS 使用已安装的 Chrome
BROWSER_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' pnpm run test:e2e
# Safari 内核兼容性验证
pnpm exec playwright install webkit
BROWSER_ENGINE=webkit TEST_OFFLINE=0 pnpm run test:e2e
node scripts/offline-webkit.mjs
```

端到端测试使用隔离浏览器存储，不改动用户当前图纸。测试覆盖自定义画布、预设搜索、保存/刷新/撤销、删除恢复、SVG 和 JSON 导出、导入去重、离线重开、拖动锁定和 512 格图纸。截图和测试临时文件位于 `work/`（不纳入版本控制）。真机 Safari 的相册选取、主屏幕安装及刘海/键盘区域需要连接 iPhone 后继续验收。

WebKit 自动化的 `context.setOffline(true)` 在本机触发浏览器内部错误；WebKit 的离线回退使用独立端口、停止服务器验证。Chromium 的断网重开测试保持启用。此结果不替代 iPhone 真机离线验收。
