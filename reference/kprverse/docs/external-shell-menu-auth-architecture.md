# KPR 外站 Shell、菜单与 GitHub 授权架构说明

本文记录当前 KPR/Mornikar 本地镜像中，外站 shell、菜单重写、以及 `SIGN IN -> GitHub -> MMO_CMS` 授权验证的实现方式。目标是让后续维护者可以继续添加菜单项、改 iframe 目标，或迁移到 GitHub Pages 静态部署。

## 1. 外站 Shell 是什么

外站 shell 的目标是保留 KPR 原来的导航框架，只替换正文背景层：

- 保留：`btn-burger`、顶部 `group submenu`、左侧 `left flex-col desktop-only`、菜单展开动画和 hacky-text 字体滚动特效。
- 隐藏：KPR 原页面正文、canvas、preloader、原 journal/media/gallery/about 内容。
- 替换：用一个全屏 iframe 作为背景正文层。

当前关键实现文件：

- `server.js`
  - `externalShellTargets`：外站路由到 iframe URL 的映射。
  - `buildExternalShellInject()`：服务端注入 shell CSS 和 iframe 挂载脚本。
  - `buildShellRouteGuardInject()`：运行时菜单和 SPA 路由兜底。
  - `serveLocal()`：所有外站 shell 路由统一使用 `/protocol` 作为 KPR 外框模板。
- `mornikar-static-shell.css`
- `mornikar-static-shell.js`
- `mornikar-menu-links.js`

静态 GitHub Pages 上的 `/protocol/` 只是内部兜底模板，不是给用户理解或浏览的内容页。当前首页点击 `MMO_CMS` / `MORNIKAR` 时，会在当前 KPR 页面中直接挂载外站 iframe，并把地址栏显示为实际目标路径：

- `MMO_CMS` 显示为 `/Mornikar/admin/`
- `MORNIKAR` 显示为 `/Mornikar/`

如果用户直接打开旧入口 `/protocol/` 或 `/protocol/?shell=mornikar`，`mornikar-static-shell.js` 会挂载对应 iframe，并用 `history.replaceState()` 把地址栏改回上面的实际目标路径。

## 2. 当前外站路由映射

先区分三个地址概念：

- **内部 shell 模板地址**：`/protocol/`。它复用 KPR 原始框架，只作为静态部署的兜底模板，不是用户可见的业务页。
- **显示地址**：浏览器地址栏最终显示的地址，例如 `/Mornikar/admin/` 或 `/Mornikar/`。
- **iframe 目标地址**：外站 shell 内部 iframe 的 `src`。这是实际被嵌入到背景正文层的外站页面。

不要让用户停留在 `/protocol/` 的原始内容页；如果看到 protocol 内容，说明 shell 没有成功挂载或静态资源版本没有刷新。

```js
const externalShellTargets = {
  '/protocol': { label: 'MMO_CMS', url: 'https://mornikar.github.io/Mornikar/admin/' },
  '/journal': { label: 'Mornikar', url: 'https://mornikar.github.io/Mornikar/' },
  '/media': { label: 'Portfolio', url: 'https://github.com/mornikar' },
  '/gallery': { label: 'GALLERY', url: 'https://github.com/mornikar' },
  '/about': { label: 'ABOUT', url: 'https://github.com/mornikar' },
  '/mornikar': { label: 'mornikar', url: 'https://github.com/mornikar' },
  '/bilibili': { label: 'BILIBILI', url: 'https://space.bilibili.com/46336819' },
  '/opensea-profile': { label: 'OPENSEA', url: 'https://opensea.io/profile' },
};
```

当前验收口径：

| 菜单项 | 内部 shell 模板 | 显示地址 | iframe 目标地址 | 说明 |
| --- | --- | --- | --- | --- |
| `MMO_CMS` | `/protocol/` | `/Mornikar/admin/` | `https://mornikar.github.io/Mornikar/admin/` | 受 GitHub 授权保护；点击后保留 KPR 框架，地址栏不应停在 `/protocol/`。 |
| `MORNIKAR` | `/protocol/?shell=mornikar` | `/Mornikar/` | `https://mornikar.github.io/Mornikar/` | 复用稳定的 `/protocol` 外框模板，只通过 query 或点击逻辑切换 iframe 目标。 |

这样做是因为 KPR/Nuxt 对 `/journal` 有原生页面逻辑，容易被 SPA 内部路由吃掉；而 `/protocol` 外框模板已经验证稳定。

## 3. 外站 Shell 的工作流

本地服务收到请求后：

1. `server.js` 解析请求路径和 query。
2. `getQueryShellTarget()` 先检查特殊 query，例如 `/protocol?shell=mornikar` 或 GitHub Pages 规范化后的 `/protocol/?shell=mornikar`。
3. `getExternalShellTarget()` 查普通路由映射。
4. 如果是外站 shell，`shellTemplatePath` 固定使用 `/protocol`。
5. 读取 `/protocol` HTML，并通过 `stripMornikarStaticBoot()` 去掉静态 boot 块，避免服务端 shell 和静态 shell 抢 iframe。
6. 注入：
   - `buildShellRouteGuardInject()`
   - `buildExternalShellInject(shellTarget)`
   - GitHub 登录脚本
   - profile/menu patch 脚本
7. 浏览器加载后，`mornikar-external-shell-bg iframe` 成为正文背景层，KPR 导航框架浮在上面。

静态首页点击流程：

1. `index.html` 头部的 `installMornikarShellRouteGuard()` 捕获菜单点击。
2. 对 `MMO_CMS` / `MORNIKAR`，脚本不会先跳转到 `/protocol/`，而是在当前页面调用 `mountExternalShell()`。
3. `mountExternalShell()` 添加 `html.mornikar-external-shell`、创建 `.mornikar-external-shell-bg iframe`，并保留 `btn-burger`、`.the-menu`、`.left.flex-col.desktop-only` 等 KPR 外框元素。
4. 通过 `history.pushState()` 把地址栏显示为 `/Mornikar/admin/` 或 `/Mornikar/`。
5. 菜单里的 `Home` 会关闭 shell 并回到 `/`。

## 4. 如何添加一个外站菜单项

添加菜单项需要同时考虑服务端映射、文字 patch、静态部署三处。

### 4.1 服务端添加目标

在 `server.js` 的 `externalShellTargets` 添加：

```js
'/new-page': { label: 'NEW_PAGE', url: 'https://example.com/' },
```

如果它需要复用某个稳定模板，可以在 `serveLocal()` 的 `routeShellAliases` 或 `getQueryShellTarget()` 中加别名。

### 4.2 菜单文字和跳转

菜单文字 patch 在两个文件中维护：

- `profile-cards.js`：本地服务 `5679` 当前会注入，用于首页资料卡和菜单文字修复。
- `mornikar-menu-links.js`：静态部署使用的轻量菜单修复脚本。

添加新菜单时，在 `patchTextLinks()` 或对应的 `patchLabelByText()` 调用中加入：

```js
patchLabelByText('OLD_TEXT', 'NEW_PAGE', '/new-page', { matchNext: true });
```

`setHackyText()` 只改 `.spacer` 和 `.animation` 的文本，所以 hacky-text 滚动特效会保留。

### 4.3 静态页面

静态页面的 boot 块在各 HTML 文件中：

```html
<!-- MORNIKAR_STATIC_BOOT_START -->
...
<!-- MORNIKAR_STATIC_BOOT_END -->
```

上线 GitHub Pages 时要保留：

- `mornikar-static-shell.css`
- `mornikar-static-shell.js`
- `mornikar-menu-links.js`
- `.nojekyll`

`.nojekyll` 必须存在，否则 GitHub Pages 可能不提供 `_nuxt/` 目录资源。

## 5. GitHub 登录授权

`SIGN IN` 由 `_nuxt/github-login.js` 和 `_nuxt/github-login.css` 接管。

核心行为：

- 如果页面没有 `#widget-login-dropdown`，脚本会创建一个固定在右上角的登录容器。
- 未登录时在同一个容器位置显示 `SIGN IN`。
- 点击后弹出 GitHub 授权面板。
- 授权成功后写入：
  - `localStorage.mornikar_github_auth`
  - `localStorage.gh_user`，兼容旧逻辑
- 已登录时显示 GitHub 用户头像和用户名。

外站 shell 里也使用同一套登录入口：
- `buildExternalShellInject()` / `buildShellRouteGuardInject()` 只负责把外站 iframe 放到背景层，并保留 KPR 原导航框架。
- GitHub 登录脚本继续占用 KPR 原来的 `#widget-login-dropdown`，不会新建第二个入口。
- `_nuxt/github-login.css` 在 `html.mornikar-external-shell` 下把 `#widget-login-dropdown` 和 GitHub 授权弹窗提升到 shell 导航层上方，确保它显示在 iframe 与 KPR 外框之上。
- `disableLegacyKprLoginWidget()` 会把原 Nuxt 配置里的 `widget_bundle_js` / `widget_bundle_css` 置空，防止旧 KPR 登录组件晚加载后覆盖 GitHub 登录。
- `_nuxt/github-login.js` 的 `installWidgetTakeover()` 会清理旧 `.login-btn`、旧 widget 弹窗和旧 bundle 资源，并把同位置按钮恢复成 GitHub 登录。

## 6. MMO_CMS 授权验证

`MMO_CMS` 是受 GitHub 授权保护的入口。这里同样要区分内部模板、显示地址和 iframe 目标：

- 内部 shell 模板：`/protocol/`
- 用户可见显示地址：`https://mornikar.github.io/Mornikar/admin/`
- iframe 目标地址：`https://mornikar.github.io/Mornikar/admin/`
- 未授权点击 `/protocol` 时，`github-login.js` 会拦截，保存待跳转地址到 `sessionStorage.mornikar_auth_pending_redirect`，并打开 GitHub 登录弹窗。
- 授权成功后，脚本读取 pending redirect，继续跳到 `/protocol`。
- `/protocol?shell=mornikar` 是 MORNIKAR 外站页，不需要 MMO_CMS 授权。

当前授权验证是在 KPR shell 层完成的。若未来 MMO_CMS 本体也要验证同一个授权，需要在 `https://mornikar.github.io/Mornikar/admin/` 中实现自己的 GitHub session/token 验证，或接入同一个后端 OAuth session。

## 7. GitHub OAuth 配置

本地 `server.js` 支持真实 GitHub OAuth，但需要环境变量：

```powershell
$env:GITHUB_CLIENT_ID="your_client_id"
$env:GITHUB_CLIENT_SECRET="your_client_secret"
node server.js
```

相关接口：

- `GET /auth/github/config`
- `GET /auth/github/callback`
- `GET /auth/github/user?code=...`

如果没有配置 `GITHUB_CLIENT_ID/GITHUB_CLIENT_SECRET`，前端会进入 demo 授权模式，仍然会写入同样的 localStorage 授权态，用于本地验证 MMO_CMS 跳转流程。

纯 GitHub Pages 静态部署无法安全保存 `GITHUB_CLIENT_SECRET`，所以不能只靠静态页面完成真实 OAuth code exchange。真实上线可选方案：

1. 使用一个轻量后端或 serverless function 处理 `/auth/github/user`。
2. MMO_CMS 自己接 GitHub OAuth。
3. 本仓库静态页只保留 shell gate 和 demo/dev 授权流程。

## 8. 常见坑

- 不要把 MORNIKAR 直接指回 `/journal`，Nuxt 会把它当原生 journal 页面处理，导致外站 shell 丢失。
- 不要把 `/protocol/` 当业务页面展示给用户；它只是内部 shell 模板和旧链接兜底。
- 静态首页点击外站菜单时，应在当前页面直接 mount shell，然后通过 History API 显示 `/Mornikar/admin/` 或 `/Mornikar/`。
- 不要同时加载服务端 shell 和静态 shell；`server.js` 会用 `stripMornikarStaticBoot()` 剥掉静态 boot 块。
- 菜单文字 patch 必须幂等，避免 MutationObserver 反复写 DOM 导致闪烁。
- `iframe.src` 比较要用 `getAttribute('src')`，直接比 `iframe.src` 可能因浏览器 URL 标准化而误判。
