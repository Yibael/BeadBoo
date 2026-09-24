# BeadBoo

**把喜欢的图片变成拼豆图纸，记录每一格进度。**

BeadBoo（原「豆豆工坊」）是一款面向手机浏览器的拼豆图纸工具，支持图片转换、品牌色卡、自定义画布、用量统计和拼制进度。图片处理在当前设备完成，图纸保存在浏览器中；支持安装为 PWA，并在资源缓存完成后离线使用。

*A local-first bead pattern maker and progress tracker for the web.*

目前处于 **`0.1.0-alpha.3`** 阶段，界面语言为简体中文。本仓库提供 Web / PWA 应用，不包含已发布的原生安装包。

## 功能

- **图片转图纸**：导入图片或使用内置示例，通过「图片 → 色卡 → 尺寸 → 预览」创建图纸。
- **灵活的画布**：宽高分别支持 1–512 格，提供常用尺寸预设、等比放入与居中裁剪。
- **色卡管理**：内置 10 张预设，涵盖 Artkal、MARD、COCO、漫漫、咪小窝、盼盼及示例配色；支持搜索、按需添加、复制和自定义颜色。
- **拼制辅助**：缩放、拖动、锁定视图，查看格子色号，按区域和颜色批量标记完成、撤销并恢复进度。
- **导出与备份**：PNG 预览、带完整色号的 SVG 图纸、CSV 用量表和 JSON 备份；支持导入图纸及备份。
- **本地处理与离线使用**：Web Worker 执行图纸转换和图片导出，IndexedDB 保存图纸与色卡，PWA 缓存应用资源。

## 快速开始

### 环境要求

- Node.js：`^22.13.0 || ^24.3.0 || >=25.0.0`，与 `package.json` 保持一致。
- pnpm：`10.28.2`，由 `packageManager` 字段固定版本。

```sh
git clone https://github.com/Yibael/BeadBoo.git
cd BeadBoo

# 使用 Corepack 时，先启用 pnpm
corepack enable
pnpm install --frozen-lockfile
pnpm run build
pnpm start
```

打开 `http://localhost:5173`。服务默认监听 `0.0.0.0:5173`，同一 Wi-Fi 下可在手机访问 `http://<电脑局域网 IP>:5173`。使用 `PORT=5174 pnpm start` 调整端口。

`pnpm run dev` 会先构建再启动服务；当前不提供热更新，修改代码后需要重新构建并刷新页面。

## 使用流程

1. 在「制作」导入图片，或选择一个内置示例。
2. 添加并选择色卡，设置画布尺寸，按需要调整转换效果。
3. 预览后点击「创建图纸」，保存并进入拼制页面。
4. 选择工作区域和颜色，按照高亮格子摆豆，完成后批量标记进度。
5. 在「图纸」继续已有作品；在「我的」导出或导入 JSON 备份。

新用户的「我的色卡」为空，需要从预设目录主动添加色卡，或创建自定义色卡。示例 D 系列色号不对应实体品牌产品。

## 数据与隐私

图片不会上传，转换与导出在设备上执行。图纸和色卡保存在当前浏览器的 IndexedDB 中，保存使用事务和双份快照，并检测其他标签页的写入冲突。

- 清除网站数据可能删除图纸，请定期导出备份。
- 浏览器与主屏幕 PWA 的存储可能分开，迁移时使用 JSON 备份。
- 备份包含图纸、进度及图纸使用的色卡快照；尚未用于图纸的独立色卡不包含在备份中。
- 已保存图纸保留自己的颜色快照，不会因预设更新而自动改变。
- 当前没有登录、云端存储或跨设备同步。

为兼容更名前的数据，内部数据库和部分原生配置仍保留历史标识；它们不影响 BeadBoo 的显示名称。

## 部署与 PWA

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

## 开发与测试

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

具体检查结果见 [VALIDATION.md](VALIDATION.md)。自动化移动视口测试不替代 iPhone 真机验收；相册选取、安全区域、键盘、主屏幕安装和真实断网仍需在设备上验证。

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
licenses/                第三方数据许可与来源记录
```

界面基于 React、TypeScript、Expo 和 React Native Web，浏览器画布使用 Canvas，重计算使用 Web Worker。`*.web.tsx` / `*.web.ts` 提供浏览器适配。预设色卡当前随应用发布，数据源接口可替换为 HTTP 适配器。

## 参与贡献

欢迎通过 [Issues](https://github.com/Yibael/BeadBoo/issues) 报告问题或提出建议，也欢迎提交 Pull Request。

1. Fork 仓库并创建独立分支。
2. 保持改动聚焦；行为变更请补充相关测试，界面变更请附手机尺寸截图。
3. 提交前运行类型检查、单元测试和构建；涉及创建、存储或画布交互时运行相关端到端验证。
4. 在 PR 中说明问题、修改内容与验证结果。

报告问题时请提供浏览器和设备信息、复现步骤、预期结果与实际结果。新增或修改色卡时，请一并提供数据来源、许可、色号规则及排除项，不要将社区参考值表述为品牌官方标准。

## 色卡数据与致谢

感谢 Artkal 公开颜色参考表，以及 HansBug 的 `pindou-color-data` 社区整理。色卡来源、数量、缺项及使用边界见 [COLOR-CARDS.md](COLOR-CARDS.md) 和 [licenses/](licenses/)。参考 RGB 用于屏幕预览和颜色匹配，实物颜色应以对应品牌、系列及批次为准。

## 许可证

本项目目前暂未添加项目级开源许可证。第三方色卡数据保留其独立许可与版权声明，详见 [数据许可](licenses/pindou-color-data/LICENSE.txt) 及各来源记录；该数据许可不代表本项目整体的许可。

## 变更记录

版本改动见 [CHANGELOG.md](CHANGELOG.md)。
