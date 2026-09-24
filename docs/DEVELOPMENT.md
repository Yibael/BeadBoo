# 开发 BeadBoo

[← 返回 README](../README.md)

## 命令与测试

| 命令 | 用途 |
| --- | --- |
| `pnpm run dev` | 构建并启动本地服务 |
| `pnpm start` | 提供现有 `dist/` 构建产物 |
| `pnpm run typecheck` | TypeScript 类型检查 |
| `pnpm test` | 算法、色卡、存储和导出等单元测试 |
| `pnpm run build` | 生成 Web 应用、Worker 和离线缓存 |
| `pnpm run test:e2e` | 在已启动的服务上运行移动视口端到端测试 |

常规检查：

```sh
pnpm run typecheck
pnpm test
pnpm run build
```

端到端测试需要先在另一个终端运行 `pnpm start`：

```sh
pnpm exec playwright install chromium
pnpm run test:e2e

# macOS 也可使用本机安装的 Chrome
BROWSER_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' pnpm run test:e2e
```

Safari 内核检查：

```sh
pnpm exec playwright install webkit
BROWSER_ENGINE=webkit TEST_OFFLINE=0 pnpm run test:e2e
node scripts/offline-webkit.mjs
```

WebKit 的 `context.setOffline(true)` 曾触发浏览器内部错误，因此使用独立脚本在停止服务器后验证缓存页面。端到端测试使用隔离浏览器存储，截图和临时文件输出到忽略版本控制的 `work/` 目录。

具体检查结果见 [VALIDATION.md](../VALIDATION.md)。自动化移动视口测试不替代 iPhone 真机验收；相册选取、安全区域、键盘、主屏幕安装和真实断网仍需在设备上验证。

## 项目结构

```text
App.tsx                  应用入口与页面导航
src/
  components/            通用界面、图纸画布与色卡组件
  screens/               制作、图纸列表、详情和色卡页面
  lib/                   图纸算法、色卡数据与导出逻辑
  storage/               仓储、色卡状态与预设来源接口
  web/                   浏览器存储、Worker、备份与 PWA 设置
public/                  HTML、PWA 清单、图标及静态资源
scripts/                 构建、预览和浏览器验证脚本
tests/                   单元测试
docs/                    开发、部署指南与 README 界面截图
licenses/                第三方数据许可与来源记录
```

界面基于 React、TypeScript、Expo 和 React Native Web，浏览器画布使用 Canvas，重计算使用 Web Worker。`*.web.tsx` / `*.web.ts` 提供浏览器适配。预设色卡当前随应用发布，数据源接口可替换为 HTTP 适配器。

## 数据兼容

BeadBoo 原名「豆豆工坊」。为兼容更名前的数据，内部数据库和部分原生配置仍保留历史标识；修改这些标识前应先设计数据迁移。
