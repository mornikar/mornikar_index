# B站视频预览 - 使用说明文档

> 本文档同时面向 **AI 助手** 和 **人类维护者**，详细说明轮播卡片视频预览系统的架构、配置格式和操作步骤。

---

## 一、功能概述

轮播卡片（Gallery Carousel）支持自动播放 B站视频的前 N 秒预览，默认静音循环。用户点击卡片可打开完整视频弹窗（带声音）。

### 体验细节
- 卡片上自动播放视频前 N 秒（默认 10s），静音循环
- 右上角显示 `PREVIEW` 徽章
- 右下角静音图标按钮（点击 → 打开有声音的完整弹窗）
- 悬停时中央显示播放按钮
- 仅第一张卡片启用预览（避免多流同时加载拖慢页面）

---

## 二、系统架构

```
┌──────────────────────────────────────────────────────────┐
│  浏览器                                                   │
│                                                          │
│  ┌─────────────┐     ┌──────────────────────────────┐    │
│  │ site-config │────▶│ content-patcher.js           │    │
│  │  .json      │     │  读取 gallery.videos[]       │    │
│  └─────────────┘     │  创建 <video> 或 <iframe>    │    │
│                      └──────────┬───────────────────┘    │
│                                 │                         │
│                    ┌────────────▼────────────┐            │
│                    │  优先: 原生 <video>      │            │
│                    │  src=/api/bilibili/stream│            │
│                    │  静音+自动播放+10s循环    │            │
│                    └────────────┬────────────┘            │
│                                 │ 失败/超时8s              │
│                    ┌────────────▼────────────┐            │
│                    │  回退: B站 iframe embed  │            │
│                    │  player.bilibili.com     │            │
│                    └─────────────────────────┘            │
└──────────────────────────────────────────────────────────┘
                      │
                      │ /api/bilibili/stream?bvid=XXX
                      ▼
┌──────────────────────────────────────────────────────────┐
│  server.js (Node.js 代理)                                │
│                                                          │
│  GET /api/bilibili/info?bvid=XXX                         │
│    → 调用 api.bilibili.com/x/web-interface/view           │
│    → 返回 { ok, bvid, cid, title, cover, duration }      │
│    → 缓存 2 小时                                         │
│                                                          │
│  GET /api/bilibili/stream?bvid=XXX                       │
│    → 先获取 cid（从缓存或 info API）                      │
│    → 调用 api.bilibili.com/x/player/playurl              │
│    → 代理视频流（支持 Range 请求）                         │
│    → 缓存流地址 1 小时                                    │
│    → 优先 MP4 (durl)，回退 DASH (dash.video[0])          │
└──────────────────────────────────────────────────────────┘
```

### 为什么需要服务端代理？
B站视频流 URL 有跨域限制（Referer 检查），浏览器无法直接通过 `<video src="https://...">` 加载。server.js 在服务端请求并转发流数据，绕过 CORS 限制。

---

## 三、配置格式（site-config.json）

视频预览配置位于 `site-config.json` 的 `gallery` 节点：

```jsonc
{
  "gallery": {
    "carouselInterval": 8,          // 轮播自动切换间隔（秒），可选
    "previewDuration": 10,          // 视频预览循环秒数，默认 10，可选
    "videos": [
      {
        "selector": ".collectionGallery__item",  // CSS 选择器，匹配轮播卡片元素
        "bvid": "BV1jymLBsENj",                  // B站视频 BV 号（必填）
        "label": "AI PM Skills Demo",            // 视频标题/标签（用于弹窗标题）
        "cover": "/images/gallery-cover-1.jpg"   // 封面图（可选，目前未使用）
      }
    ]
  }
}
```

### 字段说明

| 字段 | 必填 | 说明 |
|------|------|------|
| `selector` | 是 | CSS 选择器，定位页面上的轮播卡片 DOM 元素。通常为 `.collectionGallery__item` |
| `bvid` | 是 | B站视频的 BV 号，格式 `BV` + 字母数字，如 `BV1jymLBsENj`。从B站视频页 URL 获取：`https://www.bilibili.com/video/BV1jymLBsENj` |
| `label` | 否 | 视频标题，显示在弹窗顶部。缺省时显示 `"Video"` |
| `cover` | 否 | 封面图路径。当前版本使用视频首帧作为封面，此字段预留 |

### 全局字段

| 字段 | 默认值 | 说明 |
|------|--------|------|
| `previewDuration` | `10` | 预览循环时长（秒）。视频播放到此时长后自动回到 0 秒重新播放 |
| `carouselInterval` | `8` | 轮播切换间隔（秒），与视频预览无关 |

---

## 四、操作步骤：给新卡片添加B站视频预览

### 人类操作

1. **获取 BV 号**
   - 打开B站视频页面，URL 格式：`https://www.bilibili.com/video/BVxxxxxxxxxx`
   - 复制 `BVxxxxxxxxxx` 部分

2. **确认选择器**
   - 在浏览器中右键目标卡片 → 检查元素
   - 找到卡片元素的 CSS class，如 `.collectionGallery__item`
   - 如果有多个卡片，注意选择器的匹配范围

3. **编辑 `site-config.json`**
   - 打开 `site-config.json`
   - 找到 `"gallery"` → `"videos"` 数组
   - 添加新条目：

   ```json
   {
     "selector": ".collectionGallery__item",
     "bvid": "BV你的视频号",
     "label": "视频标题",
     "cover": "/images/cover.jpg"
   }
   ```

4. **保存并刷新** — 无需重启服务器，刷新浏览器即可

### AI 操作指令模板

当需要为轮播卡片添加新的B站视频预览时，按以下步骤执行：

```
1. 确认目标卡片的 CSS 选择器（通常为 .collectionGallery__item）
2. 从用户提供的B站链接中提取 BV 号
3. 读取 site-config.json
4. 在 gallery.videos[] 数组中追加新条目：
   {
     "selector": "<选择器>",
     "bvid": "<BV号>",
     "label": "<视频标题>",
     "cover": "<封面路径或省略>"
   }
5. 如需修改预览时长，设置 gallery.previewDuration
6. 刷新浏览器验证
```

---

## 五、技术细节（AI 参考）

### 服务端 API

#### `GET /api/bilibili/info?bvid=XXX`

返回视频元数据：

```json
{
  "ok": true,
  "bvid": "BV1jymLBsENj",
  "cid": 123456,
  "title": "视频标题",
  "cover": "http://i0.hdslb.com/...",
  "duration": 192
}
```

- 缓存时间：2 小时
- BV 号格式校验：`/^BV[\w]+$/`

#### `GET /api/bilibili/stream?bvid=XXX`

代理视频流，支持 HTTP Range 请求（拖动进度条）。

- 优先请求 `fnval=1`（MP4/FLV 段式，durl 格式）
- 如不可用则回退 DASH 格式（取最低画质 video track）
- 缓存流地址：1 小时
- 请求 B站时附带 `Referer: https://www.bilibili.com` 和自定义 UA

### 前端预览机制

#### 主方案：原生 `<video>`

```
<video> src="/api/bilibili/stream?bvid=XXX"
  - muted, autoplay, playsInline
  - timeupdate 事件：currentTime >= previewDuration → seek to 0
  - error 事件 → 切换到 iframe 回退
  - 8 秒超时 readyState < 2 → 切换到 iframe 回退
```

#### 回退方案：B站 iframe embed

```
<iframe> src="https://player.bilibili.com/player.html?bvid=XXX&autoplay=1&muted=1&danmaku=0"
  - pointerEvents: none（不阻挡卡片点击）
  - 定时 reload 实现循环（每 previewDuration 秒）
```

### 关键函数

| 函数 | 文件 | 作用 |
|------|------|------|
| `setupGalleryVideoPreview()` | content-patcher.js | 入口，读取配置并绑定卡片 |
| `setupCardVideoPreview(card, v, previewDuration)` | content-patcher.js | 为单张卡片创建原生 `<video>` 预览 |
| `setupCardIframePreview(card, v, previewDuration)` | content-patcher.js | iframe 回退方案 |
| `handleBilibiliApi(req, res, urlPath)` | server.js | 路由分发 info/stream |
| `proxyBiliStream(req, res, bvid)` | server.js | 代理视频流 |
| `biliFetchJSON(url)` | server.js | 请求 B站 API 并解析 JSON |

### 注意事项

1. **仅第一张卡片预览** — `idx === 0` 时才插入视频，避免多流并发导致卡顿和 B站风控
2. **BV 号格式** — 必须以 `BV` 开头，仅含字母数字，否则 API 返回 400
3. **DASH 无音频** — DASH 格式只代理视频轨，预览本身就是静音的所以无影响。完整播放走弹窗 iframe
4. **缓存** — 服务端内存缓存，重启后清空。首次加载可能稍慢（需请求 B站 API 两次：info + playurl）
5. **referer 限制** — 如果 B站更新风控策略导致代理失败，前端会自动回退到 iframe 方案

---

## 六、常见操作示例

### 示例 1：替换现有视频

把第一个卡片的视频换成新的：

```json
"videos": [
  {
    "selector": ".collectionGallery__item",
    "bvid": "BV1新的视频号",
    "label": "新视频标题"
  }
]
```

### 示例 2：添加多张卡片的视频预览

> 注意：当前版本仅对每个选择器匹配的**第一个**卡片启用预览。如需多卡片同时预览，需修改 `content-patcher.js` 中 `if (idx === 0)` 的逻辑。

```json
"videos": [
  {
    "selector": ".collectionGallery__item",
    "bvid": "BV1jymLBsENj",
    "label": "AI PM Skills Demo"
  },
  {
    "selector": ".another-gallery-item",
    "bvid": "BV1另一个视频号",
    "label": "第二个视频"
  }
]
```

### 示例 3：调整预览时长

预览前 15 秒而非 10 秒：

```json
"gallery": {
  "previewDuration": 15,
  "videos": [...]
}
```

---

## 七、文件清单

| 文件 | 作用 |
|------|------|
| `site-config.json` | 配置文件，定义视频列表和预览参数 |
| `_nuxt/content-patcher.js` | 前端脚本，读取配置并注入视频预览 DOM |
| `server.js` | Node.js 服务器，含 B站视频代理 API |

---

*最后更新：2026-05-02*
