# MMO_index 首页说明

`MMO_index` 是部署到 `https://mornikar.github.io/` 的首页静态站。它基于 KPR Verse 的 Nuxt 静态镜像改造，保留原站的视觉框架、菜单动画、WebGL/Canvas 表现和外站 shell 能力，用来承载 Mornikar 的主入口导航。

## 定位

- 首页地址：`https://mornikar.github.io/`
- 项目名称：`MMO_index`
- 本地目录：`D:\Auxiliary_means\Git\MMO_mornikar_index\reference\kprverse`
- 本地启动：在本目录运行 `node server.js`
- 本地端口：`http://localhost:5679/`

## 页面与入口

| 菜单/页面 | 本地路径 | 线上目标 |
|---|---|---|
| Home | `/` | `https://mornikar.github.io/` |
| MMO_CMS | `/protocol` | `https://mornikar.github.io/Mornikar/admin/` |
| Mornikar | `/protocol?shell=mornikar` 或 `/journal` | `https://mornikar.github.io/Mornikar/` |
| Portfolio | `/media` | `https://github.com/mornikar` |
| Gallery | `/gallery` | `https://github.com/mornikar` |
| About | `/about` | `https://github.com/mornikar` |
| BILIBILI | `/bilibili` | `https://space.bilibili.com/46336819` |
| OPENSEA | `/opensea-profile` | `https://opensea.io/profile` |

## 关键实现文件

- `server.js`：本地镜像服务器，本地文件优先，缺失资源代理 `kprverse.com`；同时负责运行时 HTML patch、外站 shell 注入、GitHub 登录接管。
- `site-config.json`：MMO_index 的内容配置，包含站点标题、导航项、footer、图片与文字替换规则。
- `mornikar-menu-links.js`：静态部署时的菜单文字和跳转修复脚本。
- `mornikar-static-shell.js` / `mornikar-static-shell.css`：静态部署时的外站 iframe shell。
- `_nuxt/github-login.js` / `_nuxt/github-login.css`：GitHub 登录入口和授权弹窗。
- `profile-cards.css` / `profile-cards.js`：首页资料卡、三张 mini 卡和菜单辅助交互。

## 外站 Shell 规则

`MMO_CMS` 和 `Mornikar` 都不是直接在 MMO_index 内部渲染，而是通过 KPR 风格外框加 iframe 载入目标站点。

- `MMO_CMS` 使用 `/protocol` 页面作为外框，iframe 指向 `https://mornikar.github.io/Mornikar/admin/`。
- `Mornikar` 使用 `/protocol?shell=mornikar` 作为稳定外框入口，iframe 指向 `https://mornikar.github.io/Mornikar/`。
- `journal` 静态页也保留了 Mornikar shell 配置，作为兼容入口。

不要把 `Mornikar` 直接恢复到 `https://mornikar.github.io/`，否则会递归回首页；旧 Hexo 站已经迁移到 `/Mornikar/`。

## 部署注意

GitHub Pages 根站必须能直接访问以下资源：

- `.nojekyll`，保证 `_nuxt/` 目录不被 GitHub Pages 忽略。
- `_nuxt/`，Nuxt 静态资源和运行时代码。
- `images/`、`audio/`、`svg/`、`favicon.svg`、`og.jpg`。
- `mornikar-static-shell.css`、`mornikar-static-shell.js`、`mornikar-menu-links.js`。
- `profile-cards.css`、`profile-cards.js`。
- 静态页面文件：`index.html`、`protocol`、`journal`、`media`、`gallery`、`about`、`mornikar`、`bilibili`、`opensea-profile`。

旧 Hexo 站 `Mornikar` 不再发布到根目录。它的线上地址是：

- 博客首页：`https://mornikar.github.io/Mornikar/`
- CMS：`https://mornikar.github.io/Mornikar/admin/`
- 文档：`https://mornikar.github.io/Mornikar/docs/`
- 资源存档：`https://mornikar.github.io/Mornikar/assets-archive/`

## 验证清单

1. 打开 `http://localhost:5679/`，确认首页标题和内容是 MMO_index。
2. 点击或访问 `/protocol`，确认进入 MMO_CMS shell，iframe 目标是 `/Mornikar/admin/`。
3. 点击或访问 `/protocol?shell=mornikar`，确认进入 Mornikar shell，iframe 目标是 `/Mornikar/`。
4. 检查 `/_nuxt/` 资源没有被 404。
5. 线上部署后打开 `https://mornikar.github.io/`，确认不是旧 Hexo 首页。
## GitHub Pages 路由发布补充

源码目录保留 KPR 镜像生成的无扩展 HTML 文件，例如 `protocol`、`media`、`legal/privacy-policy`。发布到 `mornikar.github.io` 的 `gh-pages` 根目录时，需要转换为 `protocol/index.html`、`media/index.html`、`legal/privacy-policy/index.html`，否则 GitHub Pages 会以 `application/octet-stream` 返回无扩展文件。

Windows 下不能同时存在小写 `mornikar` 文件和大写 `Mornikar/` 目录。线上以 `/Mornikar/` 为准，旧 `/mornikar` 入口由 `mornikar-menu-links.js` 归一到 `/Mornikar/`。
