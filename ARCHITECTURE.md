# MORNIKAR PORTFOLIO v4.0 — 架构与代码设计文档

> 暗色科技感视差滚动个人作品集网站
> 设计参考：明日方舟官网 + KPR 视差沉浸叙事
> 部署目标：Vercel

---

## 1. 项目概述

| 属性 | 说明 |
|:-----|:-----|
| **项目名称** | MORNIKAR Portfolio |
| **版本** | v4.0 — 全面重构 |
| **类型** | 静态单页网站 (SPA-like) |
| **设计风格** | 暗色科幻终端，3层 Canvas 视差 + 三角/电路线条粒子 |
| **部署平台** | Vercel |
| **技术栈** | 纯原生 HTML5 / CSS3 / ES6+，零框架依赖 |

---

## 2. 目录结构

```
MMO_mornikar_index/
├── index.html              # 主页面（单入口）
├── css/
│   └── main.css            # 设计系统 + 全局样式 + 组件 + 动画 + 响应式
├── js/
│   ├── parallax.js         # 3层视差引擎（Canvas 2D 程序化生成）
│   ├── particles.js        # 三角形 + 电路线条粒子覆盖层
│   └── main.js             # 主交互（Loader/打字机/滚动/技能条/导航）
├── assets/                 # 静态资源预留目录
├── vercel.json             # Vercel 部署配置
└── ARCHITECTURE.md         # 本文档
```

---

## 3. 视觉设计系统

### 3.1 色彩体系

| Token | 值 | 用途 |
|:------|:---|:-----|
| `--c-bg` | `#060610` | 页面最深背景 |
| `--c-bg2` | `#0b0b1a` | 卡片/终端背景 |
| `--c-bg3` | `#10101f` | 嵌套层级背景 |
| `--c-surface` | `rgba(11,11,26,.75)` | 半透明面板 |
| `--c-text` | `#e4e4e8` | 主文字 |
| `--c-dim` | `#8a8a9a` | 次要文字 |
| `--c-muted` | `#55556a` | 弱化文字 |
| `--c-cyan` | `#00d4ff` | 强调色（荧光青）|
| `--c-cyan10` | `rgba(0,212,255,.08)` | 强调色低透明度 |
| `--c-cyan30` | `rgba(0,212,255,.3)` | 强调色中透明度 |
| `--c-red` | `#ff3344` | 警示/点缀色 |
| `--c-border` | `rgba(255,255,255,.05)` | 默认边框 |

### 3.2 字体系统

| 用途 | 字体 | 来源 |
|:-----|:-----|:-----|
| 英文标题/Display | Orbitron | Google Fonts |
| 中文正文 | Noto Sans SC | Google Fonts |
| 终端/代码 | JetBrains Mono | Google Fonts |

### 3.3 设计原则

- **圆角**：0-2px 锐利直角，工业/军事终端感
- **间距**：8px 基准，大段落留白 80-120px
- **动效**：视差滚动 + 打字机 + 扫描线 + 噪点纹理

---

## 4. 核心架构

### 4.1 视差滚动引擎 (`js/parallax.js`)

三层独立 Canvas，各自程序化渲染不同深度的视觉元素：

| 层级 | CSS Class | 速度 | 内容 |
|:-----|:----------|:-----|:-----|
| Layer 0 — Deep | `.p-layer--deep` | 0.045x | 透视网格 + 消散点 + 星星 + 六边形点阵 |
| Layer 1 — Mid | `.p-layer--mid` | 0.15x | 线框三角形 + 填充三角 + 电路线条 + 六边形轮廓 |
| Layer 2 — Front | `.p-layer--front` | 0.35x | 对角光束 + 漂浮尘埃 + 明亮火花粒子 |

**实现要点：**
- `requestAnimationFrame` 主循环，每帧重绘所有 Canvas
- 滚动偏移量平滑插值（`scrollY += (target - current) * 0.08`）
- 鼠标位置产生横向视差偏移，增强空间深度感
- Canvas 尺寸 160% 视口，通过 `translate` 定位，避免边缘空白
- 所有视觉元素 100% 程序化生成，零外部图片

### 4.2 粒子覆盖层 (`js/particles.js`)

在视差背景之上、内容之下绘制三角形和电路线条粒子：

| 元素 | 数量 | 特征 |
|:-----|:-----|:-----|
| 浮动三角形（线框） | 10 | 随机旋转、慢速漂移、85% 青色 / 15% 红色 |
| 浮动三角形（填充） | 25 | 极低透明度填充、缓慢旋转 |
| 电路线条 | 6 | 折线段 + 节点 + 动态数据包沿路径移动 |
| 线路节点 | ~18 | 脉冲闪烁 |

**交互：** 鼠标移动时所有元素轻微偏移（视差跟随）

### 4.3 主交互系统 (`js/main.js`)

| 功能 | 实现方式 |
|:-----|:---------|
| 全屏加载 | 模拟进度条 + 阶段文本 + 代码行淡入 |
| 打字机 | `setTimeout` 逐字输出 + 随机延迟 |
| 滚动显现 | `IntersectionObserver` + `.reveal` → `.vis` |
| 数字计数器 | `requestAnimationFrame` + ease-out 缓动 |
| 导航高亮 | 滚动位置计算 + `.show` 显示隐藏 |
| 技能条 | `data-w` 属性 + CSS width 过渡动画 |
| Glitch | 水印文字 CSS `steps()` 抖动 |

---

## 5. 页面结构

```
body
├── #loader              # 全屏加载画面（进度条 + 代码日志）
├── #parallax-scene      # 三层视差 Canvas
│   ├── #layer-deep      # Layer 0: 网格 + 星星
│   ├── #layer-mid       # Layer 1: 三角形 + 电路
│   └── #layer-front     # Layer 2: 光束 + 粒子
├── #fx-canvas           # 三角形 + 电路线条粒子覆盖层
├── .noise-overlay       # SVG 噪点纹理（feTurbulence）
├── .scanlines           # CRT 扫描线（CSS repeating-linear-gradient）
├── nav#nav              # 固定导航栏（blur backdrop + 滚动显示）
└── main.content
    ├── section#hero           # 双栏 Hero（标题+统计+终端片段）
    ├── section#projects       # 项目网格（2列+跨列卡片）
    ├── section#open-source    # 开源项目卡片（3列）
    ├── section#about          # 终端风格个人介绍 + 技能条
    └── footer                 # 页脚
```

---

## 6. 保留的模块（v3→v4）

| 模块 | 保留内容 |
|:-----|:---------|
| 三角形 + 电路线条 | 从 v3 的 project-icon 升级为独立粒子系统 |
| 作品集卡片 | `.proj-card` 结构（卡片框、标签、技术栈、链接） |
| 开源项目卡片 | `.oss-card` 结构（GitHub 图标、星标、语言标记） |
| 字体样式 | Orbitron / Noto Sans SC / JetBrains Mono 三字体 |
| 全屏加载画面 | 进度条 + 阶段状态 + 代码日志 |
| 技能条动画 | `data-w` + CSS width 过渡 |
| 终端风格介绍 | `.term` 窗口（标题栏、命令行、输出块） |

---

## 7. 响应式断点

| 断点 | 调整 |
|:-----|:-----|
| ≤ 960px | Hero 单列、项目网格单列、导航链接隐藏、开源单列 |
| ≤ 600px | 减小 padding、按钮全宽、统计卡片紧凑 |

---

## 8. 性能优化

1. **Canvas 分层渲染**：3层背景 + 1层粒子 = 4 Canvas，独立绘制
2. **平滑插值**：滚动/鼠标偏移量使用 lerp 平滑，避免抖动
3. **IntersectionObserver**：滚动动画仅视口内触发
4. **零外部图片**：所有视觉效果由 Canvas/CSS/SVG 程序化生成
5. **GPU 加速**：`transform` + `opacity` 优先，`will-change` 声明
6. **粒子精简**：总计 ~150 个元素，保持 60fps

---

## 9. Vercel 部署

纯静态网站，零构建步骤。Vercel 自动识别 `index.html`。

```bash
# 推送到 GitHub 后在 Vercel 导入即可
# 或 CLI：npx vercel --prod
```

`vercel.json` 已配置 SPA 路由回退。

---

## 10. 参考资源

- **明日方舟官网**：`https://ak.hypergryph.com` — 暗色终端 UI + 视差滚动
- **KPR Verse**：`https://kprverse.com` — 沉浸式视差叙事交互
- **字体**：Orbitron (几何无衬线) / JetBrains Mono (等宽终端)
