# ProfileCard 资料卡注入说明

最后更新：2026-05-15

## 当前结构

本项目是 Nuxt/Vue 静态打包产物，不适合直接安装 React 并渲染 React Bits 的 JSX 组件。当前做法是用 `server.js` 在 HTML 的 `</head>` 前注入两份静态资源：

```html
<link rel="stylesheet" href="/profile-cards.css">
<script src="/profile-cards.js" defer></script>
```

相关文件：

- `server.js`：负责注入 `/profile-cards.css` 和 `/profile-cards.js`
- `profile-cards.css`：复刻 React Bits ProfileCard 的卡片、光晕、shine、glare、头像、信息栏和 hover tilt 视觉
- `profile-cards.js`：等待 Nuxt DOM 出现后，把资料卡 append 到目标位置
- `images/newImage/gt-avatar-cutout.png`：由 `1775713677253.jpg` 蓝底证件照抠出的透明头像

不要把资料卡 DOM 直接写进 `_nuxt/Home.*.js`。该文件是打包产物，项目已经有大量运行时 patch，直接改容易和贴图补丁互相污染。

## 两个挂载点

### 1. 大个人资料卡

大卡固定挂到首页 ProjectIntro 左下 block 的右上角：

```html
<div data-ui="bottomLeft" class="block--bottomleft  block">
```

选择器写法：

```js
document.querySelector('.homeProjectIntro .block--bottomleft.block') ||
  document.querySelector('.block--bottomleft.block')
```

注意：HTML 里 `block--bottomleft` 和 `block` 中间有双空格，但选择器必须写成 `.block--bottomleft.block`，不要把双空格原样写进选择器。

大卡容器 class：

```text
mornikar-profile-grid mornikar-profile-grid--feature
```

当前大卡数据在 `profile-cards.js` 顶部的 `profileCard`：

- name：`GT/罗锦涛`
- title：`AI产品经理`
- handle：`1548324254@qq.com`
- status：`离职`
- avatar：`/images/newImage/gt-avatar-cutout.png`
- contact 按钮：跳转 `https://github.com/mornikar`

当前大卡曾经按用户要求做过 3 倍等比视觉放大，后来因为视觉过大，改为当前的 1.5 倍：

```css
.mornikar-profile-card-wrapper--feature {
  transform: translate3d(0, 0, 0.1px) scale(1.5);
  transform-origin: top right;
}
```

光晕参数固定为：

```css
--behind-glow-color: rgba(125, 190, 255, 0.67);
--behind-glow-size: 50%;
```

视觉风格已从自定义五彩背景改回 React Bits ProfileCard 原版结构和类名：

```text
pc-card-wrapper
└─ pc-behind
└─ pc-card-shell
   └─ pc-card
      └─ pc-inside
         ├─ pc-shine
         ├─ pc-glare
         ├─ pc-content pc-avatar-content
         └─ pc-content / pc-details
```

内渐变使用 React Bits 示例值：

```css
--inner-gradient: linear-gradient(145deg,#60496e8c 0%,#71C4FF44 100%);
```

不要再恢复旧的 `.mornikar-profile-card-*` 自定义视觉层；那一版会把背景做成五彩主视觉，和 React Bits 原版不一致。

### 2. 三张小资料卡

三张小卡不再放在 `block--bottomleft`。它们被移动到 footer 装饰层：

```html
<div class="pointer-events-none">
  ...
  <div class="section kpr">
```

选择逻辑在 `findFooterTarget()`：

```js
var footerTarget = document.querySelector('.the-footer .pointer-events-none');
if (footerTarget && footerTarget.querySelector('.section.kpr')) return footerTarget;
```

小卡容器 class：

```text
mornikar-profile-grid mornikar-profile-grid--mini-strip
```

当前小卡数据在 `profile-cards.js` 顶部的 `smallCards` 数组。它们只是装饰和实验入口，按钮仍指向 `mailto:1548324254@qq.com`。

## 层次图

```text
homeProjectIntro
└─ block--bottomleft block
   ├─ 原页面 img1 / hero / description 等内容
   └─ mornikar-profile-grid--feature
      └─ mornikar-profile-card-wrapper--feature
         ├─ mornikar-profile-card-behind
         └─ mornikar-profile-card
            ├─ mornikar-profile-shine
            ├─ mornikar-profile-avatar
            ├─ mornikar-profile-main
            └─ mornikar-profile-info

the-footer
└─ pointer-events-none
   ├─ 原 footer KPR 装饰图层
   └─ mornikar-profile-grid--mini-strip
      ├─ mornikar-profile-card-wrapper--mini
      ├─ mornikar-profile-card-wrapper--mini
      └─ mornikar-profile-card-wrapper--mini
```

## CSS 定位经验

大卡依赖 `.block--bottomleft.block` 自身的 `position: relative`，使用绝对定位：

```css
.mornikar-profile-grid--feature {
  position: absolute;
  right: var(--blockPadding, 4rem);
  top: var(--blockPadding, 4rem);
  z-index: 90;
}
```

三张小卡挂在 footer 的 `pointer-events-none` 下，因此要额外让子卡片恢复点击能力：

```css
.mornikar-profile-grid,
.mornikar-profile-card-wrapper,
.mornikar-profile-contact {
  pointer-events: auto;
}
```

同时给 footer 目标层补上：

```css
.the-footer .pointer-events-none {
  position: relative;
  overflow: visible;
}
```

## 踩坑记录

1. 不要直接复制 React JSX。当前页面没有 React runtime，必须用原生 DOM/CSS 注入。
2. 不要把 `class="block--bottomleft  block"` 按字符串空格写选择器；正确选择器是 `.block--bottomleft.block`。
3. footer 的 `pointer-events-none` 会影响点击，资料卡自身必须显式 `pointer-events: auto`。
4. Nuxt DOM 可能晚于脚本执行出现，所以 `server.js` 先等页面 `load` 后再延迟加载 `profile-cards.js`，脚本内部只用短轮询查找挂载点，不再使用 `MutationObserver`。
5. `1775713677253.jpg` 是蓝底头像，当前透明 PNG 是通过蓝底色差抠图生成的；如果将来换成复杂背景照片，需要重新抠图或换成更稳的透明素材。
6. `MutationObserver` 里的文字 patch 必须幂等。曾经因为 `MMO_CMS` / `mornikar` 每次观察到 DOM 变化都重复写 `textContent`，导致页面卡在加载画面。当前用 `document.documentElement.dataset.mornikar*Patched` 做一次性标记，并且 `setHackyText()` 只在文本不同的时候写入。

## 导航文字跳转 patch

`profile-cards.js` 还负责运行时调整三个导航入口：

- 文本 `Journal` / `JOURNAL` -> `Mornikar`，点击跳转 `https://mornikar.github.io/Mornikar/`
- `.menu-nav-item.pointer-events-auto` 中优先命中的 `Protocol` / `Media` / `Gallery` -> `MMO_CMS`，点击跳转 `https://mornikar.github.io/Mornikar/admin/`
- footer social 区第一项 -> `mornikar`，点击跳转 `https://github.com/mornikar`

这些入口通过 `patchTextLinks()` 在 DOM 出现后反复尝试 patch，原因是 Nuxt 的 hacky-text 会晚于页面 HTML 出现。`site-config.json` 中也同步改了 nav/footer 配置，避免后续维护时看到旧配置。

## 2026-05-15 资料卡原版风格约束

这次最终约束是：资料卡视觉必须完全沿用 React Bits `ProfileCard` 的原版结构和 CSS 风格，不再自作主张做自定义五彩背景、旧的 `.mornikar-profile-card-*` 视觉层，或额外头像裁切样式。

当前实现方式仍然是“原生 DOM 等价移植”，原因是这个镜像页面不是 React 工程，不能直接把 JSX 组件塞进 Nuxt 静态页面里。可维护入口如下：

```text
profile-cards.js
└─ makeProfileCard()
   └─ pc-card-wrapper
      ├─ pc-behind
      └─ pc-card-shell
         └─ pc-card
            └─ pc-inside
               ├─ pc-shine
               ├─ pc-glare
               ├─ pc-content pc-avatar-content
               │  ├─ img.avatar
               │  └─ pc-user-info
               └─ pc-content
                  └─ pc-details

profile-cards.css
└─ 保留 React Bits 原版 pc-* 样式
└─ 末尾只允许放页面挂载定位、尺寸缩放和 pointer-events 修正
```

当前大资料卡数据：

```js
name: 'GT/罗锦涛'
title: 'AI产品经理'
handle: '1548324254@qq.com'
status: '离职'
contactText: '联系'
avatarUrl: '/images/newImage/gt-avatar-cutout.png'
behindGlowEnabled: true
behindGlowColor: 'rgba(125, 190, 255, 0.67)'
behindGlowSize: '50%'
href: 'https://github.com/mornikar'
```

注意事项：

1. 不要恢复 `.mornikar-profile-card-*` 旧样式，那一版会偏离 React Bits 原版。
2. 不要给 `.avatar` 额外加 `height/object-fit/object-position` 覆盖，头像展示应尽量交给 React Bits 原版 `.pc-avatar-content .avatar` 控制。
3. 页面定位可以改 `.mornikar-profile-grid--feature`，尺寸可以改 `.pc-card-wrapper--feature` 和 `.pc-card-wrapper--feature .pc-card`，但不要改 `pc-*` 的核心视觉样式。
4. `server.js` 注入使用带版本号的 `/profile-cards.css` 和 `/profile-cards.js`，修改后需要重启 `start.bat` 才能稳定避开旧缓存。

## 2026-05-15 资料卡缩小与 hero 过场

本次调整：

1. 大资料卡从 `scale(1.5)` 改成 `scale(0.75)`，也就是按用户反馈在当前视觉尺寸上再等比缩小 1/2。
2. 大资料卡优先挂载到 `.homeProjectIntro__hero`，而不是直接挂到 `.block--bottomleft.block`。如果这个节点不存在，才回退到旧挂载点。
3. `profile-cards.js` 通过 `syncFeatureCardWithHero()` 读取 `.homeProjectIntro__hero` 的视口位置和 `.homeProjectIntro` 的 opacity，写入 CSS 变量 `--mornikar-hero-progress`，让资料卡跟随 hero 框淡入、轻微上移进入，并在离开时淡出。
4. React Bits 的 `pc-shine` 原版 CSS 本来就有彩色镭射层，但它需要 `iconUrl` 做遮罩。如果 `iconUrl` 为空并写成 `--icon: none`，镭射层会满铺整张卡，看起来像五颜六色的光污染。当前用 `/images/newImage/profile-card-icon-pattern.svg` 作为本地遮罩，保留原版机制，同时避免满屏彩色层。
5. 注入缓存版本号更新为 `reactbits-hero-mask`，修改后需要重启服务，浏览器才会拿到新 CSS/JS。
