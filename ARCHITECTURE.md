# MORNIKAR PORTFOLIO — 架构与代码设计文档

> 暗色科技感视差滚动个人作品集网站
> 部署目标：Vercel

---

## 1. 项目概述

| 属性 | 说明 |
|:-----|:-----|
| **项目名称** | MORNIKAR Portfolio |
| **类型** | 静态单页网站 (SPA-like) |
| **设计风格** | 暗色科幻终端风格，参考明日方舟官网 + KPR 视差滚动 |
| **部署平台** | Vercel |
| **技术栈** | 纯原生 HTML5 / CSS3 / ES6+，零框架依赖 |

---

## 2. 目录结构

```
MMO_mornikar_index/
├── index.html              # 主页面（单入口）
├── css/
│   └── main.css            # 全局样式 + 组件样式 + 动画
├── js/
│   ├── parallax.js         # 视差背景系统（Canvas 2D）
│   ├── particles.js        # 粒子系统 + 连线交互
│   └── main.js             # 主交互逻辑（加载器、打字机、滚动动画等）
├── assets/                 # 静态资源（图片等，当前由 Canvas 生成）
└── ARCHITECTURE.md         # 本文档
```

---

## 3. 视觉设计系统

### 3.1 色彩体系

| Token | 值 | 用途 |
|:------|:---|:-----|
| `--bg-primary` | `#0a0a0f` | 页面主背景 |
| `--bg-secondary` | `#0d1117` | 卡片/终端背景 |
| `--bg-tertiary` | `#111827` | 嵌套层级背景 |
| `--text-primary` | `#e6e6e6` | 主文字 |
| `--text-secondary` | `#9ca3af` | 次要文字 |
| `--text-muted` | `#6b7280` | 弱化文字 |
| `--accent-cyan` | `#00d4ff` | 强调色（荧光青）|
| `--accent-red` | `#ff3333` | 警示/点缀色 |
| `--border-color` | `rgba(255,255,255,0.06)` | 默认边框 |

### 3.2 字体系统

| 用途 | 字体 | 来源 |
|:-----|:-----|:-----|
| 英文标题/Display | Orbitron | Google Fonts |
| 中文正文 | Noto Sans SC | Google Fonts |
| 终端/代码 | JetBrains Mono | Google Fonts |

### 3.3 间距系统

8px 基准单位：`--space-xs: 0.5rem` → `--space-2xl: 8rem`

### 3.4 圆角策略

0-2px 锐利直角，保持工业/军事终端感。无大圆角卡片。

---

## 4. 核心架构

### 4.1 视差滚动系统 (`js/parallax.js`)

三层 Canvas 背景，以不同速度响应滚动：

| 层级 | 类型 | 速度 | 内容 |
|:-----|:-----|:-----|:-----|
| Layer 1 | `grid` | 0.1x | 透视网格线 + 消散点 + 星星 + 六边形图案 |
| Layer 2 | `shapes` | 0.3x | 线框立方体 + 三角形 + 电路线条 |
| Layer 3 | `beams` | 0.6x | 对角光束 + 漂浮微粒 + 镜头光晕 |

**实现要点：**
- 使用 `requestAnimationFrame` + `scroll` 事件节流
- 每层独立 Canvas，通过 `data-speed` 属性配置
- 程序化生成，无需外部图片资源
- 支持 `devicePixelRatio` 高清渲染

### 4.2 粒子系统 (`js/particles.js`)

- 60 个漂浮粒子，带透明度随机
- 粒子间距离 < 120px 时绘制连线
- 鼠标靠近时产生排斥力场
- 标签页隐藏时自动暂停动画（性能优化）

### 4.3 主交互系统 (`js/main.js`)

| 功能 | 实现方式 |
|:-----|:---------|
| 加载动画 | 模拟进度条 + 阶段文本切换 |
| 打字机效果 | `setTimeout` 逐字输出 |
| 滚动显现 | `IntersectionObserver` + CSS transition |
| 数字计数器 | `requestAnimationFrame` + ease-out 缓动 |
| 导航高亮 | 滚动位置计算 + 平滑滚动 |
| 卡片视差 | 滚动偏移量 × `data-parallax` 系数 |
| Glitch 效果 | 随机字符替换 + 逐字还原 |
| 技能条动画 | IntersectionObserver 触发 width 过渡 |

---

## 5. 页面结构

```
body
├── loader              # 全屏加载画面
├── scanlines           # 扫描线覆盖层 (CSS repeating-linear-gradient)
├── parallax-container  # 三层视差 Canvas 背景
├── particles           # 粒子 Canvas
├── nav                 # 固定导航栏 (blur backdrop)
└── main
    ├── section#hero           # 首页大字 + 统计 + CTA
    ├── section#projects       # 项目网格 (2列 + 跨列卡片)
    ├── section#design         # 设计作品展示
    ├── section#open-source    # 开源项目卡片
    ├── section#about          # 终端风格个人介绍
    └── footer                 # 页脚
```

---

## 6. 响应式断点

| 断点 | 调整 |
|:-----|:-----|
| ≤ 900px | 项目网格单列、导航链接隐藏、页脚垂直堆叠 |
| ≤ 600px | 减小 padding、按钮全宽、字体缩小 |

---

## 7. 性能优化

1. **Canvas 分层渲染**：三层背景独立 Canvas，避免重绘整个画面
2. **粒子系统暂停**：`visibilitychange` 事件监听，标签页隐藏时停止动画
3. **IntersectionObserver**：滚动动画仅在元素进入视口时触发
4. **无外部图片**：所有视觉效果由 Canvas/CSS 程序化生成，零 HTTP 图片请求
5. **CSS 硬件加速**：`transform` 和 `opacity` 优先使用 GPU 加速

---

## 8. Vercel 部署

### 8.1 配置

项目为纯静态网站，无需构建步骤。Vercel 自动识别 `index.html`。

### 8.2 部署步骤

```bash
# 1. 进入项目目录
cd MMO_mornikar_index

# 2. 初始化 Git（如未初始化）
git init
git add .
git commit -m "init: portfolio site"

# 3. 推送到 GitHub
git remote add origin https://github.com/mornikar/mornikar-portfolio.git
git push -u origin main

# 4. Vercel 导入仓库自动部署
# 或 vercel CLI: npx vercel --prod
```

### 8.3 可选：`vercel.json`

```json
{
  "version": 2,
  "name": "mornikar-portfolio",
  "routes": [
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
```

---

## 9. 扩展建议

| 方向 | 方案 |
|:-----|:-----|
| 添加真实项目截图 | 替换 `project-bg` 渐变背景为 `<img>` |
| 暗/亮主题切换 | Tweaks 面板 + CSS 变量切换 |
| 多语言支持 | `data-i18n` 属性 + JSON 语言包 |
| 博客集成 | 链接到现有 Hexo 博客或嵌入 RSS |
| 3D 元素 | 引入 Three.js 做 WebGL 背景替代 Canvas 2D |

---

## 10. 参考资源

- **明日方舟官网**：`https://ak.hypergryph.com` — 暗色终端 UI 风格参考
- **KPR Verse**：`https://kprverse.com` — 视差滚动叙事体验参考
- **字体**：Orbitron (Google Fonts) — 几何无衬线 Display 字体
