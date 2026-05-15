# KPR Verse 本地镜像 — 说明文档

> kprverse.com 的完整本地镜像，用于参考学习其 Web 交互与视觉实现。

## 🏗️ 技术栈

| 层级 | 技术 | 说明 |
|:-----|:-----|:-----|
| **框架** | Nuxt 3 (Vue 3 SSR) | `window.__NUXT__` 注入 480KB 服务端数据，首屏直出 |
| **3D 渲染** | Three.js + WebGL | 场景渲染、自定义 Shader（`custom-material.8570572a.js`） |
| **动画** | GSAP | `timeline`、`fromTo`、`to()` 驱动滚动/入场/交互动画 |
| **物理** | Matter.js + Cannon.js | 3D/WebGL 物理模拟（钱包相关场景） |
| **音效** | Howler.js | 菜单音效 `UI_menu_OPEN/CLOSE/rollover` |
| **精灵图** | TexturePacker | `header-sprite.json` + `header-sprite.png`，RGBA8888 格式 |
| **调试** | Tweakpane | 开发时参数调整面板（224KB，生产环境仍打包） |
| **登录** | 第三方 Widget | `main.bundle.js` 从 CloudFront 加载，S3 存储字体资源 |
| **分析** | Google Analytics | GA4 (G-VNY65FGL4R)，localhost 下无法工作 |

## 📁 目录结构

```
kprverse/
├── index.html              # 原始 HTML（含 SSR 内容 + __NUXT__ 数据）
├── index_original.html     # server.js 实际提供的 HTML 副本
├── server.js               # 本地代理服务器（端口 5679）
├── assets.json             # 162 条资源索引（TexturePacker 精灵帧数据）
├── _nuxt/                  # Nuxt 构建产物
│   ├── entry.06ae7dd6.js   # 入口（688KB，含 Vue/Nuxt 运行时）
│   ├── Home.0d973127.js    # 首页核心（217KB，场景+动画+Canvas）
│   ├── three.module.*.js   # Three.js 运行时（475KB）
│   ├── custom-material.*.js# 自定义 Shader（54KB）
│   ├── loader-globals.*.js # 资源加载器（98KB）
│   ├── the-menu.*.js       # 菜单组件（GSAP + Howler）
│   ├── wallet-store.*.js   # 钱包/Web3 相关（311KB）
│   ├── tweakpane.*.js      # 调试面板（224KB）
│   ├── *.css               # 57 个 CSS chunk（组件级拆分）
│   ├── *.svg               # 18 个 SVG 图标
│   ├── *.woff/woff2/ttf    # 5 个字体文件（ABCWhyte、IBMPlexMono、Hexaframe）
│   └── *.png               # 精灵图
├── audio/                  # 音效文件
│   ├── UI_menu_OPEN.mp3    # 菜单打开音效（24.5KB）
│   ├── UI_menu_CLOSE.mp3   # 菜单关闭音效（21.2KB）
│   ├── UI_menu_rollover.mp3      # 悬停音效（0-byte placeholder）⚠️
│   └── UI_menu_text_rollover.mp3 # 文字悬停音效（0-byte placeholder）⚠️
└── images/                 # 图片资源
    └── sheets/
        ├── header-sprite.json  # TexturePacker 精灵帧数据
        └── header-sprite.png   # 精灵图合集（2048×2048）
```

> ⚠️ `images/` 目录下大部分内容（`images/tableau/`、`images/collection/` 等）未本地存储，由 server.js 从 kprverse.com 实时代理。

## 🔄 架构总览

```
┌─────────────────────────────────────────────────┐
│                  浏览器                          │
│  index.html                                      │
│  ├── __NUXT__ SSR 数据 (480KB)                  │
│  ├── entry.js → Vue 3 Hydration                │
│  │   ├── Home.js                                │
│  │   │   ├── Canvas 2D (header sprite 动画)    │
│  │   │   ├── Three.js WebGL (3D 场景)          │
│  │   │   ├── GSAP Timeline (滚动动画)          │
│  │   │   └── Matter.js/Cannon (物理)           │
│  │   ├── the-menu.js (GSAP + Howler)           │
│  │   └── custom-material.js (Shader)           │
│  └── main.bundle.js (登录 Widget，CloudFront)   │
└──────────────────┬──────────────────────────────┘
                   │ HTTP :5679
┌──────────────────▼──────────────────────────────┐
│              server.js                           │
│  策略：本地优先 → 缺失代理 kprverse.com         │
│  ├── /proxy/ext/* → 外部资源代理（S3 字体等）   │
│  ├── CSS 响应自动重写 S3 URL → 本地 /_nuxt/    │
│  └── HTML 注入 CORS 修复脚本                    │
└──────────────────────────────────────────────────┘
```

### 请求流转

1. 浏览器请求 `/_nuxt/footer-link.6611a73b.css`
2. server.js 查找本地文件 → 存在则直接返回
3. 不存在 → `proxyUpstream()` 从 kprverse.com 拉取
4. 如果是 CSS → 自动重写其中的 S3 字体 URL 为本地路径
5. 返回给浏览器（附带 CORS 头）

## ⚠️ 踩坑记录

### 坑 1：Nuxt 构建产物 Hash 不一致

**现象**：多个 CSS 文件 404（如 `footer-link.6611a73b.css`）

**根因**：KPR 站点重新构建后，`entry.js` 引用了新 hash 的 CSS chunk，但本地 `_nuxt/` 只有旧 hash 文件。Nuxt/Vite 每次构建都会生成不同的 content hash。

**解决**：从 kprverse.com 下载缺失的 CSS 文件。长期方案：如果 KPR 更新了，需要重新爬取 `_nuxt/` 目录。

### 坑 2：字体文件 0-byte Placeholder

**现象**：`Failed to decode downloaded font`

**根因**：初始爬取时字体文件是空占位符（0 字节），浏览器尝试解码失败。

**解决**：从 kprverse.com 下载真实字体文件到 `_nuxt/`。

### 坑 3：S3 字体 CORS 阻断

**现象**：`Access to font at 'loginsignup-widget-assets.s3.amazonaws.com' blocked by CORS policy`

**根因**：登录 Widget 的 CSS `@font-face` 直接引用 S3 字体。`@font-face` 发起的请求 **不经过** `window.fetch` / `XMLHttpRequest`，所以 JS 拦截器无效。

**解决**（双管齐下）：
1. 下载 S3 字体到本地 `_nuxt/`
2. server.js 在代理 CSS 时自动重写 `loginsignup-widget-assets.s3.amazonaws.com/fonts/` → `/_nuxt/`

### 坑 4：`npx serve` vs server.js 端口冲突

**现象**：5679 端口跑着 `serve`（纯静态），5678 跑着 `server.js`（支持代理）。用户访问 5679 遇到更多 404。

**根因**：`serve` 不支持代理回退，本地没有的文件直接 404。

**解决**：统一用 server.js 在 5679 端口，停掉 `serve`。

### 坑 5：`header-sprite.json` CONNECTION_RESET

**现象**：`GET /images/sheets/header-sprite.json net::ERR_CONNECTION_RESET`

**根因**：本地没有 `images/` 目录，server.js 尝试代理但上游连接重置（可能是 KPR CDN 对异常请求头的拒绝）。

**解决**：手动从 kprverse.com 下载到本地 `images/sheets/`。

### 坑 6：`login button not found`

**现象**：`main.bundle.js:2 login button not found`

**根因**：KPR 的登录 Widget 在页面加载后查找 `.login-btn` 元素，但 SSR hydration 重建 DOM 时序问题导致 Widget 找不到按钮。

**影响**：非致命，仅登录功能不可用。本地镜像不需要登录功能。

### 坑 7：0-byte 音频文件

**现象**：`UI_menu_rollover.mp3` 和 `UI_menu_text_rollover.mp3` 为 0 字节。

**根因**：初始爬取时这些文件下载失败或被跳过。

**影响**：轻微，悬停音效缺失。可通过 `curl -o audio/UI_menu_rollover.mp3 https://kprverse.com/audio/UI_menu_rollover.mp3` 下载修复。

## 🔧 如何修改内容

### 替换图片

KPR 的图片分为两类：

#### 1. TexturePacker 精灵图（Canvas 动画帧）

这些图片由 TexturePacker 打包成 sprite sheet，**不能单独替换帧**：

```
images/sheets/
├── header-sprite.json   # 帧坐标映射（TexturePacker 导出）
└── header-sprite.png    # 2048×2048 精灵图合集
```

如果要替换：
1. 用 [TexturePacker](https://www.codeandweb.com/texturepacker) 打开原始帧图片
2. 替换目标帧
3. 重新导出 `.json` + `.png`
4. 放回 `images/sheets/`，**文件名必须一致**

#### 2. Three.js 场景图片（懒加载，由 server.js 代理）

```
images/collection/       # 角色立绘
images/tableau/          # 3D 场景贴图
  ├── keep/              # 角色光效、Kai、Beam Ship
  ├── factions/          # 能量系左右
  └── universe/          # Beam、Magic
```

如果要替换：
1. 把新图片放到对应目录（如果本地没有，先创建目录）
2. 文件名和格式必须与 JS 中引用的一致
3. 如果改了文件名，还需要修改 `_nuxt/Home.*.js` 中的路径

#### 3. 网页 favicon / OG 图片

```html
<!-- index.html 中修改 -->
<link rel="icon" type="image/x-icon" href="/favicon.ico">
<meta name="twitter:image" content="https://kprverse.com/og.jpg">
<meta property="og:image" content="https://kprverse.com/og.jpg">
```

### 替换文字内容

Nuxt SSR 的文字内容在两个地方：

1. **`index.html` 中的 `window.__NUXT__`**（480KB JSON）— 服务端渲染的初始数据
2. **`_nuxt/Home.*.js`** — 客户端硬编码的文本

修改步骤：
1. 在 `index.html` 中搜索目标文字
2. 修改 `__NUXT__` 数据中的对应值
3. 如果文字在 JS chunk 中，还需修改 `_nuxt/Home.*.js`

### 替换音效

```
audio/
├── UI_menu_OPEN.mp3
├── UI_menu_CLOSE.mp3
├── UI_menu_rollover.mp3       # 当前 0-byte ⚠️
└── UI_menu_text_rollover.mp3  # 当前 0-byte ⚠️
```

直接替换 MP3 文件即可，文件名必须一致。推荐保持相同的采样率和比特率。

### 替换字体

字体文件在 `_nuxt/` 目录：

| 文件 | 用途 |
|:-----|:-----|
| `ABCWhyteVariable.*.woff2` | 主排版字体 |
| `IBMPlexMono.*.woff` | 代码/等宽字体（登录 Widget） |
| `Hexaframe.woff` | 装饰字体（登录 Widget） |

替换步骤：
1. 将新字体文件放到 `_nuxt/`
2. 文件名必须一致（CSS 通过文件名引用）
3. 如果改了文件名，需要修改对应 CSS 中的 `@font-face` 声明

### 修改 3D 场景

3D 场景逻辑在 `_nuxt/Home.0d973127.js`（217KB minified），修改难度极高：

- Three.js 场景通过代码硬编码（几何体、材质、灯光）
- 自定义 Shader 在 `custom-material.8570572a.js` 中
- 物理参数在 `wallet-store.*.js` 中

**建议**：如果要重做 3D 场景，不要修改这些 minified JS，而是从零搭建自己的 Three.js 项目，参考 KPR 的视觉效果和动画节奏。

### 修改动画时序

GSAP 动画时序分布在：
- `_nuxt/Home.*.js` — 场景入场/滚动动画
- `_nuxt/the-menu.*.js` — 菜单动画

GSAP 的 `timeline`、`fromTo`、`to()` 调用散落在 minified 代码中，需要搜索关键词定位。

## 🚀 启动方式

```bash
cd reference/kprverse
node server.js
# 访问 http://localhost:5679/
```

server.js 策略：**本地文件优先，缺失资源自动从 kprverse.com 代理**。

首次运行时，大部分 `images/tableau/` 等资源会通过代理加载（需要网络）。如果断网使用，需要提前下载所有资源。

### 坑 8：不读架构说明书导致反复失败 — 2026-05-05

**现象**：修改了 `__NUXT__` 数据（服务端 `patchNuxtHtml` 替换了 Collection_Name 等），DEBUG 横幅确认数据已替换为 "Mornikar's Portfolio"，但页面可见内容没有任何变化。

**根因**：
1. **没有先读架构说明书**就开始改代码，不了解渲染管线
2. KPR Verse 的可见内容主要由 Three.js Canvas 渲染，不是 Vue 的 DOM 渲染
3. `__NUXT__` 数据替换只影响 Vue 组件的 data 层，不影响 Canvas 上的可见文字
4. 混淆了"数据层替换"和"视觉层替换"——改了数据不等于改了显示
5. 架构说明书（kprverse-backup/README.md）已经明确写了"Canvas 渲染的文字不在 DOM 中，content-patcher 无法替换"

**教训**：
1. **铁律**：任何修改前必须先读架构说明书（ARCHITECTURE.md / README.md）
2. 先理解完整渲染管线：数据从哪来 → 经过什么处理 → 最终怎么显示到屏幕
3. 不要假设"改了数据就等于改了显示"，要验证数据流的完整路径
4. 架构说明书是前人踩坑的结晶，跳过就等于重踩一遍
5. 区分三个替换层级：
   - **数据层**：`__NUXT__` / `site-config.json` → 影响 Vue 组件 data
   - **DOM 层**：MutationObserver / content-patcher → 影响 HTML 可见文字
   - **Canvas 层**：Three.js 纹理 / Shader → 影响屏幕上实际渲染的像素

**正确方案**：
- DOM 可见文字 → content-patcher.js MutationObserver（需确认正在工作）
- Canvas 渲染文字 → CSS overlay 覆盖 或 修改 Home.js 纹理代码
- 数据层 → site-config.json + content-patcher `__NUXT__` 拦截（已完成✅）

## 📝 已知限制

| 问题 | 状态 | 影响 |
|:-----|:-----|:-----|
| 登录 Widget 不可用 | 不修复 | 本地镜像无需登录 |
| Google Analytics 失败 | 不修复 | localhost 环境正常 |
| 2 个悬停音效 0-byte | 待下载 | 悬停无声 |
| KPR 更新后 Hash 失效 | 需重新爬取 | 新 chunk 404 |
| 3D 物理场景（wallet） | 依赖 Web3 | 可能报错 |
| Edge lazy loading 干预 | 浏览器行为 | 图片加载延迟 |
| "KPR" 残留在 Canvas 中 | 需改 Home.js 纹理 | Canvas 3D 区域仍显示 KPR |
| 画廊拖拽切换卡片 | 不可行 | 架构冲突（见坑10） |

### 坑 10：画廊拖拽切换卡片不可行 — 2026-05-07

**现象**：用户想把画廊的悬浮切换改为点击拖拽左右切换卡片，三次尝试均失败。

**根因**：画廊是 GSAP + Three.js 驱动的 3D 透视场景，不是平面 slider：
1. **Three.js Canvas 拦截事件**：`gallery.addEventListener('mousedown', ...)` 事件无法到达 DOM，Three.js Canvas 层拦截了鼠标事件
2. **GSAP 每帧覆盖 transform**：对单卡片加 `translateX` 偏移，GSAP 下一帧立刻覆盖回去（因为卡片位置由 GSAP timeline 持续控制）
3. **容器 3D 透视被破坏**：对 `.collectionGallery` 容器加 `translateX`，容器的 `perspective: 500px` + `transform-style: preserve-3d` 导致 3D 布局崩溃

**三次尝试**：
- **尝试1**：`gallery.addEventListener('mousedown')` → 事件被 Canvas 吞掉，"没反应"
- **尝试2**：`document.addEventListener('pointerdown', ..., true)` capture + 单卡片 translateX → GSAP 覆盖偏移，视觉无效果
- **尝试3**：容器级 `--kpr-drag-x` CSS 变量 + 容器 translateX → 3D 透视被破坏，"效果太烂"

**结论**：当前方案（hover 暂停 + wheel 切换）是此 3D 架构下的最优解。如需真正的拖拽，需要劫持 GSAP 的 `pX` 属性计算（minified Ys 类内部），成本和风险极高。

**当前轮播交互**：
- 悬浮（mouseenter）→ 暂停自动轮播（`window.__kprCarouselPaused = true`）
- 离开（mouseleave）→ 恢复轮播
- 滚轮（wheel）在卡片上 → 切换卡片（调用 `__kprGallery.setIndex()`），400ms 节流

---

## 🔁 Mornikar 内容替换方案（双层永久）

> 2026-05-05 确定的方案。确保即使发生灾难性恢复，页面也能显示 Mornikar 内容。

### 架构原理

```
┌──────────────────────────────────────────────────────────┐
│                    三层替换架构                            │
│                                                          │
│  Layer 1: 服务端 HTML 修改（永久性 ✅）                    │
│  ┌──────────────────────────────────────────┐            │
│  │ server.js → patchNuxtHtml()              │            │
│  │ 在 HTML 发送前替换 __NUXT__ 中的字符串     │            │
│  │ Vue 水合时直接用 Mornikar 数据            │            │
│  │ → 即使 content-patcher 失败也生效         │            │
│  └──────────────────────────────────────────┘            │
│                         ↓ 如果 L1 有遗漏                   │
│  Layer 2: 客户端 content-patcher.js（安全网 ✅）           │
│  ┌──────────────────────────────────────────┐            │
│  │ 2a: __NUXT__ setter 拦截                  │            │
│  │ 2b: MutationObserver DOM 替换             │            │
│  │ 2c: buildTextMap() + texts[] 规则         │            │
│  └──────────────────────────────────────────┘            │
│                         ↓ 如果 L2 也没覆盖                 │
│  Layer 3: Three.js Canvas（未实现 ❌）                     │
│  ┌──────────────────────────────────────────┐            │
│  │ Canvas 3D 纹理上的文字                    │            │
│  │ 需要修改 Home.js 纹理代码或 CSS overlay    │            │
│  └──────────────────────────────────────────┘            │
└──────────────────────────────────────────────────────────┘
```

### 关键文件

| 文件 | 作用 | 备份 |
|:-----|:-----|:-----|
| `site-config.json` | 所有替换内容的配置源（数据+文字+图片） | `site-config.json.backup-20260505-mornikar` |
| `server.js` | `patchNuxtHtml()` 服务端替换 + `content-patcher.js` 注入 | `server.js.backup-20260505-mornikar` |
| `_nuxt/content-patcher.js` | 客户端 MutationObserver + __NUXT__ 拦截 | 代码稳定，无需特别备份 |

### site-config.json 字段对照表

`site-config.json` 中每个区块对应 `__NUXT__.data["us-en/"].content.body[]` 的一个 block：

| 配置区块 | Block索引 | 组件名 | 主要替换字段 |
|:---------|:----------|:-------|:-------------|
| `landing` | 0 | HomeLanding | desc, keep, protect, reimagine |
| `storyIntro` | 1 | HomeStoryIntro | title, body, video_caption, character_caption |
| `storyProject` | 2 | HomeStoryProject | strapline_1, strapline_2, console_text_loading, console_text_coordinates |
| `collection` | 3 | HomeCollectionIntro | name, size, launch_date, launch_label, caption_1, caption_2 |
| `collectionGallery` | 4 | HomeCollectionGallery | heading, body, description, console_text |
| `tableaux.keep` | 5 | HomeTableauxKeep | description, console_text |
| `tableaux.factions` | 6 | HomeTableauxFactions | description, console_text |
| `tableaux.universe` | 7 | HomeTableauxUniverse | description, console_text |
| `launch` | 8 | HomeLaunch | description, cta_label, console_text, link_caption_* |

此外 `nav` 对应 `__NUXT__.data["us-en/global/the-nav"]`，`footer` 对应 `us-en/global/the-footer`。

### ✏️ 文字替换编辑指南

> **一句话**：修改 `site-config.json` → 刷新浏览器，立即生效。无需重启服务器。

#### 修改已有字段

1. 打开 `site-config.json`，找到目标区块（如 `collectionGallery.heading`）
2. 修改值
3. 保存文件，刷新浏览器

#### 新增替换字段

如果需要替换一段**目前不在 site-config.json 中的文字**，需要三步：

1. **`site-config.json`**：在对应区块添加新字段（如 `collectionGallery.body`）
2. **`server.js` 的 `patchNuxtHtml()`**：添加 `{ from: 'KPR原文', to: config.区块.字段 }` 映射
3. **`site-config.json` 的 `texts[]`**：添加 `{ original: 'KPR原文', replacement: 'Mornikar替换' }` 兜底规则

> **三层替换原理**：
> - **Layer 1**：`server.js patchNuxtHtml()` — 服务端替换 `__NUXT__`，Vue 水合时就是 Mornikar 数据（永久性最强）
> - **Layer 2**：`content-patcher.js MutationObserver + texts[]` — 客户端 DOM 兜底，防止 L1 遗漏
> - **Layer 3**：Three.js Canvas 纹理 — 目前未实现，Canvas 上的 3D 文字仍显示 KPR

#### 检查 server.js 是否已映射

```bash
# 在 server.js 中搜索关键字
grep -n "collectionGallery" server.js  # 查看区块是否被处理
grep -n "g.body\|g.heading" server.js   # 查看字段是否被映射
```

如果字段未映射，在 `patchNuxtHtml()` 函数的对应区块中添加一行：
```javascript
if (g.body) patches.push({ from: 'KPR原文', to: g.body });
```

#### 关键注意事项

- `site-config.json` 每次请求都会重新读取，修改后**不需要重启服务器**
- `server.js` 修改后**需要重启**（`Ctrl+C` → `node server.js`）
- `content-patcher.js` 修改后**需要刷新浏览器**
- 添加 `texts[]` 规则时，`original` 必须和页面 DOM 中的文字**完全匹配**（大小写、空格、换行）
- `texts[]` 中的长文本需要完整匹配，截断版本也需要单独添加规则

### ⚠️ 关键教训：addMap() 的 `oldText !== newText` 陷阱

`content-patcher.js` 的 `buildTextMap()` 通过 `addMap(map, oldText, newText)` 构建 DOM 替换映射。
**如果 site-config.json 中的值和 __NUXT__ 原始值相同**，`addMap` 的条件 `oldText !== newText` 为 false，不会添加到映射 → **替换不发生**！

**教训**：修改 `site-config.json` 时，必须确保新值和原始 KPR 文字不同，否则替换规则不生效。

### 坑 9：site-config.json 未改文字导致替换无效 — 2026-05-05

**现象**：`__NUXT__` 数据替换成功（DEBUG横幅显示 "Mornikar's Portfolio"），但页面上大部分文字还是 KPR 原文。

**根因**：
1. `site-config.json` 中大部分字段值和原始 KPR 文字一模一样（从未被改为 Mornikar 内容）
2. `buildTextMap()` 的 `addMap()` 有条件 `oldText !== newText`，相同文字不生成替换规则
3. `patchNuxtHtml()` 原来只替换了 collection 的6个字段和 gallery 的2个字段，没有覆盖 landing/storyIntro/storyProject/tableaux/launch/nav/footer

**修复**：
1. 更新 `site-config.json`：所有字段改为 Mornikar Portfolio 内容
2. 扩展 `server.js` 的 `patchNuxtHtml()`：覆盖所有字段的服务端替换
3. 在 `texts[]` 中添加17条 DOM 替换规则（包括截断文本的精确匹配）

### 诊断面板

server.js 中包含一个**已禁用**的诊断面板代码。当需要排查内容替换问题时，可以启用它。

**启用方法**：
1. 打开 `server.js`，搜索 `DIAG-OFF`
2. 将 `<!--DIAG-OFF-->` 改为 `<!--DIAG-ON-->`
3. 重启服务器：`Ctrl+C` 然后重新 `node server.js`
4. 刷新页面，4秒后右下角出现绿色小标签

**诊断面板显示内容**：
- `__NUXT__:OK/MISSING` — __NUXT__ 数据是否加载
- `Col:"Mornikar's Portfolio"` — Collection_Name 的值
- `DOM-KPR:true/false` — DOM 中是否还有 "KPR" 文字
- `DOM-Morn:true/false` — DOM 中是否有 "Mornikar" 文字

**排查逻辑**：
| DOM-KPR | DOM-Morn | 含义 |
|:--------|:---------|:-----|
| false | true | ✅ 完美，所有 DOM 文字已替换 |
| true | true | ⚠️ 部分替换成功，但有 KPR 残留（可能在 Canvas 中） |
| true | false | ❌ 替换未生效，检查 site-config.json 和 patchNuxtHtml |
| false | false | ❌ 页面未加载或内容异常 |

**关闭诊断**：将 `<!--DIAG-ON-->` 改回 `<!--DIAG-OFF-->`，重启服务器。

### 灾难恢复步骤

如果 server.js 或 site-config.json 被意外覆盖：

1. 从备份恢复：
   ```bash
   # 基准备份（2026-05-08，含 collectionGallery.body + footer.email 映射）
   cp server.js.backup-20260508 server.js
   cp site-config.json.backup-20260508 site-config.json
   cp _nuxt/content-patcher.js.backup-20260508 _nuxt/content-patcher.js
   
   # 如果 20260508 备份也丢失，使用更早的 Mornikar 完整版（缺少部分新映射）
   cp site-config.json.backup-20260505-mornikar site-config.json
   ```
2. 重启服务器：`node server.js`
3. 启用诊断面板验证替换是否生效（见上方说明）
4. 如果仍有问题，检查 `patchNuxtHtml()` 函数是否完整（搜索 "Comprehensive server-side" 注释）

#### 备份清单

| 备份文件 | 日期 | 说明 |
|:---------|:-----|:-----|
| `*.backup-20260508` | 2026-05-08 | **当前基准**：含 collectionGallery.body + footer.email + HELLO@KPRVERSE.COM 映射 |
| `*.backup-20260505-mornikar` | 2026-05-05 | 完整 Mornikar 文字替换版（缺部分新映射） |
| `*.before-mornikar-merge-backup` | 2026-05-05 | 合并前备份（原始 KPR 文字，仅作参照） |

> **铁律**：每次修改 site-config.json 或 server.js 后，应同步更新 `.backup-20260508` 备份。命令：
> ```bash
> cp site-config.json site-config.json.backup-20260508
> cp server.js server.js.backup-20260508
> cp _nuxt/content-patcher.js _nuxt/content-patcher.js.backup-20260508
> cp README.md README.md.backup-20260508
> ```
