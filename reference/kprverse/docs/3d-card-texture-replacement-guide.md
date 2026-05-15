# KPR Verse 首页3D场景 — 技术文档

> 本文档面向 **AI 助手** 和 **人类维护者**，记录 KPR Verse 首页3D渲染系统的完整架构、
> Three.js 混淆映射表、3D卡片/3D背景替换方法，以及所有踩坑经验。
> 
> **核心理念**：所有修改必须理解 Three.js 渲染管线的依赖关系，盲目注释/删除代码必白屏。

---

## 一、首页3D渲染系统总架构

### 1.1 渲染层级

```
┌──────────────────────────────────────────────────────────┐
│                    全屏 WebGL Canvas                       │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  Landing 场景 (class Ho, offset ~194400)              │ │
│  │  ├── GLB模型/Plane贴图 (this.gltfScene)  ← 人物/图片 │ │
│  │  ├── Pattern 精灵动画 (header-sprite.json + webp)     │ │
│  │  ├── KPR Logo 遮罩 (logoBehind + logoInMask)         │ │
│  │  └── Overlay 渐变遮罩 (alphaOverride 过渡)           │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  PersistentCardMask (class _s, offset ~7400)          │ │
│  │  ├── 独立3D场景和正交相机                              │ │
│  │  ├── Stencil遮罩卡片 (正面envFront/背面envBack)       │ │
│  │  └── 3个紫色背景面板                                   │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  Project Story 场景 (class Yo)                        │ │
│  │  └── GLB模型 + 角色头发/衣服精灵动画 + Logo           │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  Collection 场景 (class Ko)                           │ │
│  │  └── GLB模型 + 紫色背景盒(#A79BED)                    │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  Tableau 场景 (3个2D+3D混合):                              │
│  ├── Keep: tableaux-keep-*.glb + mapCardKeep等KTX2纹理   │
│  ├── Factions: tableaux-factions-*.glb                    │
│  └── Universe: tableaux-universe-*.glb                    │
└──────────────────────────────────────────────────────────┘
```

### 1.2 Landing → Hero卡片 滚动过渡机制

当从首页 Landing 滚到 ProjectIntro 区域时，**两个3D场景同时运动**：

```
Landing 场景:
  相机 z: 1.2 → 8（拉远）
  相机 xOffset/yOffset: 0 → heroBounds位置
  → GLB模型/平面精确对齐到 .homeProjectIntro__hero 区域

PersistentCardMask:
  卡片从小放大，移动到 heroBounds 位置
  → 覆盖在Landing场景之上

关键代码 (Landing.setupTimeline):
  heroBounds 来自 R("project-intro").heroBounds
  heroBounds = .homeProjectIntro__hero 元素的 boundingClientRect
  .homeProjectIntro__hero 只是一个空的CSS定位容器(21vw×21vw)
  → 给3D场景提供对齐参考
```

### 1.3 Layer 系统

| 层名 | 值 | 用途 |
|------|---|------|
| MAIN | 0 | 主3D内容（GLB模型/平面） |
| BG | 1 | 背景精灵动画、Logo |
| UI | 2 | Overlay 遮罩、UI元素 |
| STENCIL | 3 | 卡片遮罩 |
| POST | 6 | 后处理 |

定义在 `constants.a4ba8ea6.js`，在 Home.js 中导入为 `Ot`。

### 1.4 运行时变量

| 变量 | 含义 | 来源 |
|------|------|------|
| `Q` | 首页CDN基础路径 | 运行时动态生成 |
| `O` | 卡片纹理CDN基础路径 | 运行时动态生成 |
| `U` | 图片CDN基础路径 | 运行时动态生成 |
| `V.textureSize` | 纹理质量标识 (如"high"/"low") | gozer-env |
| `V.gltfBaseFolder` | GLB模型基础路径 | gozer-env |
| `V.hasMobileFallback` | 是否有移动端回退 | gozer-env |
| `Is` | `Gt?"-mobile":""` 移动端后缀 | goser-env |
| `Gt` | 是否移动端 | gozer-env |
| `Xt` | 是否低端设备(降低渲染质量) | gozer-env |

---

## 二、Three.js 混淆映射表

Nuxt 打包后 Three.js 类名被混淆。三层映射关系：

```
Three.js原始类       →  three.module内部名  →  three.module导出名  →  Home.js局部名
   Scene               fo                    d                     ye
   Group               so                    n                     pe
   Object3D            gi                    O                     fe
   Mesh                ur                    g                     ue
   PlaneGeometry       me (=Nr)              P                     Te
   BufferGeometry      Ji                    a2                    (at)
   MeshBasicMaterial   zi                    x                     ce
   ShaderMaterial      _r                    S                     Le
   Material            Li                    Z                     (tt)
   Vector3             Je                    a                     Pe
   Vector2             He                    V                     de
   Color               Ni                    t                     Me
   PerspectiveCamera   yr                    l                     be
   Texture             pn                    ak                    Oe  ← 【关键】创建纹理用 new Oe()
   SRGBColorSpace      W(字符串"srgb")       W                     Se  ← 【关键】tex.colorSpace=Se
   sRGBEncoding        ve                    aC                    Fe  ← 旧版API，tex.encoding=Fe
   UnsignedByteType    pt=1009               m                     _e  ← 【注意】_e不是Texture！是常量1009
   DoubleSide          h=2                   aK                    ve  ← side:ve
   FrontSide           c=0                   ai                    le  ← side:le
   InstancedMesh       Oo                    I                     Ke  ← 【注意】Ke不是颜色空间！
```

> ⚠️ **重大纠正（2026-05-03）**：旧文档中 `Texture→ve→Fe` 和 `sRGBEncoding→ve(常量)→Fe` 是**错误的**！
> - `ve` 在 Home.js 中是 **DoubleSide**（side:ve），不是 Texture
> - `Fe` 是 **sRGBEncoding**（encoding:Fe），不是 Texture
> - `Oe` 才是 **Texture** 类（new Oe(image)）
> - `_e` 是 **UnsignedByteType**（常量 1009），不能 new！fixed版本中用 `_e` 创建Texture是错误的
> - `Ke` 是 **InstancedMesh** 类，不是颜色空间！fixed版本中用 `Ke` 设colorSpace是错误的

### 2.1 Home.js 导入链

```
Home.0d973127.js 导入:
  ├── from "./three.module.c9112413.js"   ← Three.js核心(被混淆)
  ├── from "./custom-material.8570572a.js" ← 自定义材质(K = ShaderMaterial子类)
  ├── from "./constants.a4ba8ea6.js"      ← Layer/Layer常量
  │     Ot = {MAIN:0, BG:1, UI:2, STENCIL:3, POST:6}
  │     Ft = 颜色常量 {LAVENDER, DARK_LAVENDER, ...}
  ├── from "./loader-globals.d8a67046.js"  ← 加载器全局状态
  ├── from "./LoaderMixin.13fbd445.js"     ← 资产加载mixin
  ├── from "./gozer-env.ed057cb2.js"       ← 环境检测(移动端/低端设备)
  ├── from "./simple-three.1b842056.js"    ← Three.js封装(Kt/ue等)
  └── from "./MathUtils.08fed4e9.js"       ← 数学工具
```

### 2.2 custom-material 模块映射

```
custom-material.8570572a.js 导入为:
  g as C, S as L, p as P, t as M, a as R, H as I,
  s as E, k as O, T as F, b as D, l as B, w as U,
  c as j, d as N, o as z, B as $, G as H, e as G,
  f as X, h as V, i as Y, C as K, W, j as q,
  m as Z, n as Q, q as J, r as ee

其中 K = custom-material 的 C 导出 = 自定义ShaderMaterial子类
用于Landing场景中GLB模型每个mesh的材质替换
```

### 2.3 three.module 导出完整表

three.module.c9112413.js 导出映射（别名 → 内部名 → 推测类）：

```
$ → Jl, A → ah, B → Bi, C → rt, D → Oo, E → Le, F → xt, G → eh,
H → Ac, I → Oo, J → Gc, K → mo, L → ct, M → We, N → at, O → gi,
P → Nr, Q → Ze, R → it, S → _r, T → n, U → K, V → He, W → mn,
X → ut, Y → qo, Z → Li, _ → zo, a → Je, ... (完整表见源文件末尾)
```

> 查找方法：在 three.module.c9112413.js 文件末尾搜索 `export{` 即可看到完整映射。

---

## 三、3D卡片纹理替换

### 3.1 3D卡片结构

KPR Verse 首页3D翻转卡片（ProjectIntro 组件），由 PersistentCardMask 渲染：

| 部分 | 技术 | 说明 |
|------|------|------|
| **外框** | WebGL stencil（`cardMask` / `Os` 类） | 圆角矩形遮罩边框 |
| **正面图片** | Three.js 球面网格 + KTX2 纹理 | `envFront`，原始路径 `${O}project-intro/front-face${Is}.ktx2` |
| **背面图片** | Three.js 球面网格 + KTX2 纹理 | `envBack`，原始路径 `${O}project-intro/back-face.ktx2` |
| **翻转动画** | Three.js 渲染循环 | 鼠标悬停翻转，共享全屏 WebGL canvas |

关键点：**3D效果来自 Three.js 渲染管线**（网格+相机透视+旋转动画），图片本身只是2D贴图。

### 3.2 替换步骤

1. 准备新图片，放到 `images/` 目录下
2. 在 `_nuxt/Home.0d973127.js` 中搜索 `frontSide:` 或 `backSide:`
3. 替换路径，**必须加 `#texture` 后缀**

当前修改：
```js
// 原始:
frontSide:`${O}project-intro/front-face${Is}.ktx2`
backSide:`${O}project-intro/back-face.ktx2`

// 当前:
frontSide:`/images/newImage/02.jpg#texture`   ← ProjectIntro 卡片正面图，文件位于 images/newImage/02.jpg
backSide:`/images/newImage/02.jpg#texture`    ← ProjectIntro 卡片背面图，文件位于 images/newImage/02.jpg
```

**替换方式**：server.js Patch 5，读取 `site-config.json` 的 `projectIntro` 节点：
```json
"projectIntro": {
  "mode": "image",           // mode="image" 启用替换，mode="off" 关闭
  "image": "/images/newImage/02.jpg"
}
```

**DOM 位置**：`.homeProjectIntro__media` — 3D翻转卡片在此 div 中由 WebGL Canvas 渲染。

**3D类**：`Es`（PersistentCardMask），正面 `envFront` + 背面 `envBack`，stencil 圆角遮罩。

### 3.2b ProjectIntro 侧面图片替换

ProjectIntro 左下角有一个普通 `<img>` 标签（非 Three.js 纹理），位于 `.homeProjectIntro__img1Wrap` 内。

当前修改：
```js
// 原始 (Home.js lit-html 模板):
src="${U}project-intro/trailer-side-media.webp"

// 当前:
src="/images/newImage/03.jpg"              ← ProjectIntro 侧面图，文件位于 images/newImage/03.jpg
```

**替换方式**：server.js Patch 6，直接替换 Home.js 中的 lit-html 模板字符串。
⚠️ 注意：`site-config.json` 的 `images` 配置对此图无效（lit-html 动态渲染，content-patcher 在 DOM 创建前已跑完）。

**DOM 位置**：`.homeProjectIntro__img1Wrap > img.homeProjectIntro__img1`

### 3.3 纹理加载流程

```
Es.onSetup()
  → Es.setupScene()          // 设置3D场景
  → Es.setupCard()           // 设置卡片
    → this.assets.frontSide  // 纹理路径字符串
    → this.assets.backSide   // 纹理路径字符串

LoaderMixin.onBeforeSetup()   // 在 onSetup 之前执行
  → 遍历 this.assets 的每个值
  → 根据路径扩展名或 #type 后缀选择加载器
  → 加载完成后，把 this.assets[key] 替换为加载结果（THREE.Texture 等）
  → 之后 setupScene/setupCard 使用的 this.assets 已经是纹理对象

setupScene 中创建3D网格:
  this.envFront = new ue(Yt, Kt(this.assets.frontSide))
  //                                         ↑ 已经是 THREE.Texture
  // Kt(texture) → new MeshBasicMaterial({map: texture, transparent: true})
  // ue(geometry, material) → 创建3D网格
```

---

## 四、3D背景（Landing场景）替换

### 4.1 原始架构

Landing 场景（class Ho）加载一个 GLB 3D模型作为首页全屏背景：

```
assets: {
  gltf: `${Q}landing/landing-${V.textureSize}.glb`,  // GLB 3D模型
  json: "/images/sheets/header-sprite.json#json",      // 精灵动画定义
  atlas: `${U}sheets/header-sprite.webp#texture`       // 精灵动画纹理
}

setupScene() 原始逻辑:
  1. 加载GLB → this.gltf = this.assets.gltf
  2. 取GLB场景 → this.gltfScene = this.gltf.scene
  3. 遍历所有mesh，替换为自定义ShaderMaterial（暗化15%）
  4. 添加到场景 → this.scene.add(this.gltfScene)
```

`this.gltfScene` 在以下动画中被引用：
- `setupTimeline()` — `.rotation` 滚动过渡动画
- `show()` — `.rotation` + `.scale` 入场动画
- `onPointerDown()` / `offPointerDown()` — `.position.z` 按压动画

### 4.2 方案D：PlaneGeometry + 贴图替代GLB

**思路**：用 `Object3D` 容器 + `PlaneGeometry` + `MeshBasicMaterial` + 纹理贴图替代整个GLB模型。
保留 `this.gltfScene` 引用（Object3D容器），所有动画代码无需修改。

当前修改（文件：`_nuxt/Home.0d973127.js`）：

```js
// 资产路径修改:
// 原始: gltf:`${Q}landing/landing-${V.textureSize}.glb`
// 当前: gltf:"/images/newImage/01.jpg#texture"  ← Landing背景图，文件位于 images/newImage/01.jpg

// setupScene() 修改:
// 原始:
async setupScene(){
  this.scene=new ye;
  this.gltf=this.assets.gltf,
  this.gltfScene=this.gltf.scene,
  this.gltfScene.traverse((e=>{
    const{order:t}=e.userData;
    if(e.material){
      const t=e.material.side;
      e.material.map&&(e.material.map.encoding=Fe,
        e.material=new K({uniforms:{uTexture:e.material.map},options:{},
          fs:"...暗化15% shader..."})),
      e.material.side=t}
    t&&(e.renderOrder=20-t)})),
  this.scene.add(this.gltfScene)
}

// 当前（方案D）:
async setupScene(){
  this.scene=new ye;
  this.gltfScene=new fe;                            // Object3D容器(替代GLB scene)
  const e=new Te(0.896,1.2544),                     // PlaneGeometry 宽0.896 高1.2544 (原始2×2.8的0.448倍)
        t=new ce({map:this.assets.gltf,side:2});     // MeshBasicMaterial + 纹理 + DoubleSide
  t.map.encoding=Fe;                                 // 设置sRGB编码
  const s=new ue(e,t);                               // Mesh(几何体, 材质)
  this.gltfScene.add(s),                             // 加入容器(保持动画引用有效)
  this.scene.add(this.gltfScene)
}
```

### 4.3 可调参数

| 参数 | 当前值 | 说明 | 调整建议 |
|------|--------|------|----------|
| `Te(0.896, 1.2544)` | 宽0.896×高1.2544 (原始2×2.8的0.448倍) | 平面几何体尺寸 | 如果太小看不见，调大到 `(4, 5.6)` 或更大 |
| `side:2` | DoubleSide | 双面渲染 | 可改为 `0`(FrontSide) 或 `1`(BackSide) |
| 平面位置 | 默认(0,0,0) | 在gltfScene容器内 | 可通过 `s.position.set(x,y,z)` 调整 |
| `MeshBasicMaterial` | 无暗化 | 原GLB有15%暗化shader | 如需暗化，改用 `Le`(ShaderMaterial) |
| 纹理图片 | `01.jpg` | Landing背景图，位于 `images/newImage/01.jpg` | 修改 assets.gltf 路径即可，必须加 `#texture` 后缀 |

### 4.4 Landing 相机参数参考

```
初始位置:     z=1.2,  lookAt=(0, 0.18, 0)
滚动后位置:   z=8,    lookAt=(0, 0.3, 0)
出场后位置:   z=-2,   rotation=(y:-1.2, x:-0.5)
入场动画:     rotation: y:1→0, scale: 0.3→1 (3秒)
pointer交互:  position.z += 按压时 -0.15
```

---

## 五、核心机制：LoaderMixin 加载器

纹理加载由 `LoaderMixin.13fbd445.js` 处理，根据**文件扩展名**自动选择加载器：

| 加载器类型 | 支持的扩展名 | 返回值类型 |
|-----------|-------------|-----------|
| `image` | `.jpg`, `.jpeg`, `.png`, `.avif`, `.webp` | `HTMLImageElement` |
| `texture` | `.jpg`, `.jpeg`, `.png`, `.avif`, `.webp` | `THREE.Texture` |
| `ktx` | `.ktx2`, `.ktx` | `THREE.Texture`（GPU压缩） |
| `gltf` | `.gltf`, `.glb` | GLTF 模型 |
| `spritesheet` | `.json` | 精灵图表 |
| `json` | `.json` | JSON 数据 |

**类型匹配规则**：按对象遍历顺序，返回第一个匹配的类型。

### ⚠️ 关键坑点：`image` vs `texture`

`.jpg`/`.png` 同时匹配 `image` 和 `texture` 两个加载器，但 `image` 排在前面，默认返回 `HTMLImageElement`。
3D材质的 `map` 必须是 `THREE.Texture`，传 `HTMLImageElement` 会导致初始化失败 → 白屏卡loading。

**解决**：路径末尾加 `#texture` 强制走 texture 加载器。

### LoaderMixin 源码关键片段

```js
// 路径解析：支持 url#type 格式
const O = (e, t) => {
  const s = e.split("#");
  if (2 === s.length) return { url: s[0], type: s[1] };  // ← #type 强制指定
  // 否则按扩展名自动匹配（image 排在 texture 前面！）
  const r = e.split(".").pop();
  for (let [type, config] of Object.entries(t)) {
    if (config.extType.indexOf(`.${r}`) >= 0) return { url: s[0], type };
  }
};

// 加载器类型映射（遍历顺序重要！）
const defaultLoaders = {
  json:        { loader, extType: [".json"] },
  image:       { loader, extType: [".jpg",".jpeg",".png",".avif",".webp"] },  // ← 先匹配
  texture:     { loader, extType: [".jpg",".jpeg",".png",".avif",".webp"] },  // ← 后匹配
  spritesheet: { loader, extType: [".json"] },
  gltf:        { loader, extType: [".gltf",".glb"] },
  ktx:         { loader, extType: [".ktx2",".ktx"] },
};
```

---

## 六、踩坑记录（必读）

### 坑1：直接改 .jpg 不加 #texture → 白屏卡 loading

**现象**：把路径改成 `/images/newImage/02.jpg`（不加 `#texture`），页面白屏卡在 loading 动画。

**原因**：`.jpg` 默认走 `image` 加载器，返回 `HTMLImageElement`，3D材质创建失败，初始化卡住。

**解决**：路径末尾加 `#texture` 强制走 `texture` 加载器。

### 坑2：注释掉 P("projectIntroMedia",this.scene) → 白屏卡 loading

**现象**：把场景注册代码注释掉，页面白屏。

**原因**：3D渲染管线有依赖关系，跳过场景注册会导致初始化流程卡住。

**解决**：不要注释场景注册代码，只修改纹理路径。

### 坑3：修改 Es.render() 方法 → 白屏/语法错误

**现象**：修改 `Es` 类的 `render()` 方法（如提前 return null），页面白屏或语法错误。

**原因**：render 方法提前返回会导致3D渲染管线异常；修改代码时容易留下多余的 `}`。

**解决**：不要修改 render 方法，只修改纹理路径。

### 坑4：KTX2 文件不在本地服务器

**原因**：KTX2 纹理从外部 CDN 加载（通过 `${O}` 前缀），不经过本地服务器。

**解决**：不需要找原始 KTX2 文件，直接用 `#texture` 语法替换为本地 JPG/PNG 即可。

### 坑5：Google 服务连接超时

**现象**：控制台显示 `GET https://accounts.google.com/gsi/client net::ERR_CONNECTION_TIMED_OUT`

**影响**：无影响，跟我们的修改无关，可以忽略。

### 坑6：替换Landing GLB时必须保留 this.gltfScene

**现象**：如果直接删除 `this.gltfScene` 相关代码，Landing场景的滚动动画、入场动画、按压交互全部报错。

**原因**：`this.gltfScene` 在以下方法中被动画系统引用：
- `setupTimeline()` — `this.gltfScene.rotation` 滚动过渡
- `show()` — `this.gltfScene.rotation` 和 `this.gltfScene.scale` 入场
- `onPointerDown()` — `this.gltfScene.position` 按压

**解决**：用 `new fe`（Object3D）创建容器替代GLB scene，把新mesh添加到容器中。所有动画引用 `.rotation/.scale/.position` 在 Object3D 上同样有效。

---

## 七、相关文件

| 文件 | 作用 |
|------|------|
| `_nuxt/Home.0d973127.js` | 主页面组件，包含所有3D场景类和纹理路径 |
| `_nuxt/three.module.c9112413.js` | Three.js 核心库（被混淆，类名映射见第二章） |
| `_nuxt/custom-material.8570572a.js` | 自定义 ShaderMaterial（K类，Landing用） |
| `_nuxt/constants.a4ba8ea6.js` | Layer常量(Ot) + 颜色常量(Ft) |
| `_nuxt/LoaderMixin.13fbd445.js` | 资产加载器 mixin，处理资源加载和类型匹配 |
| `_nuxt/simple-three.1b842056.js` | Three.js 封装，包含 `Kt`(创建材质)、`ue`(创建网格) |
| `_nuxt/loader-globals.d8a67046.js` | 加载器全局状态 |
| `_nuxt/gozer-env.ed057cb2.js` | 环境检测（移动端/低端设备/纹理质量） |
| `_nuxt/MathUtils.08fed4e9.js` | 数学工具函数 |
| `_nuxt/camera.17fed500.js` | 相机系统封装 |
| `server.js` | Node.js 代理服务器，本地文件优先，缺失从 kprverse.com 代理 |
| `images/newImage/` | 本地替换图片目录 (01-07.jpg/png/webp) |

---

## 八、快速参考卡

| 操作 | 方法 |
|------|------|
| 替换3D卡片正面图 | `frontSide:` 路径改为 `/images/xxx.jpg#texture` | `.homeProjectIntro__media` 区域 |
| 替换3D卡片背面图 | `backSide:` 路径改为 `/images/xxx.jpg#texture` | `.homeProjectIntro__media` 区域 |
| 替换侧面图片(img1) | Home.js 模板 `src="${U}...webp"` 改为 `src="/images/xxx.jpg"` | `.homeProjectIntro__img1Wrap` |
| 替换3D背景(GLB→贴图) | `gltf:` 路径改为 `/images/xxx.jpg#texture` + 修改 `setupScene()` |
| 添加场景内多平面 | 在 `assets` 增加新键 + 在 `setupScene` 中创建新 PlaneGeometry+Mesh |
| 调整平面尺寸 | 修改 `new Te(宽, 高)` 参数 |
| 调整平面位置 | 修改 `mesh.position.set(x, y, z)` 参数 |
| 恢复原始纹理 | 路径改回对应的 `${O}...` 或 `${Q}...` 模板字符串 |
| 查看当前纹理路径 | 搜索 `Home.0d973127.js` 中的 `frontSide:` / `backSide:` / `gltf:` |
| 验证修改 | `Ctrl+Shift+R` 硬刷新，不需要重启服务器 |

**牢记**：替换纹理路径时，**必须加 `#texture` 后缀**，否则白屏！

---

## 九、Collection 场景多平面架构（卡片 + 人设）

### 9.1 架构说明

Collection 场景（class `Ko`）使用方案D将原始 GLB 模型替换为两个 Three.js 平面：

| 平面 | 资源键 | 图片 | PlaneGeometry | 位置 | 说明 |
|------|--------|------|---------------|------|------|
| **卡片** | `this.assets.gltf` | `05.png` | `Te(1.5, 1.5)` | `(0, 0, 0)` | 主卡片，在框内 |
| **人设** | `this.assets.charImg` | `01.webp` | `Te(1, 1.4)` | `(1.5, 0, 0.1)` | 人物立绘，在框外右侧 |

### 9.2 当前修改（server.js Patch 7a + 7b）

```js
// assets 修改:
// 原始: t(this,"assets",{gltf:`${V.gltfBaseFolder}collection/collection-${V.textureSize}.glb`})
// 当前: t(this,"assets",{gltf:"/images/newImage/05.png#texture",charImg:"/images/newImage/01.webp#texture"})

// setupScene() 修改:
// 原始: GLB traversal + 紫色背景盒(#A79BED)
// 当前 (方案D + 人设平面):
setupScene(){
  this.scene=new ye;
  this.gltfScene=new fe;
  // 卡片平面 (05.png)
  const e=new Te(1.5,1.5),
        t=new ce({map:this.assets.gltf,side:2});
  t.map.encoding=Fe;
  const s=new ue(e,t);
  this.gltfScene.add(s);
  // 人设平面 (01.webp) — 在框外右侧
  const n=new Te(1,1.4),
        a=new ce({map:this.assets.charImg,side:2,transparent:!0});
  a.map.encoding=Fe;
  const r=new ue(n,a);
  r.position.set(1.5,0,0.1);
  this.gltfScene.add(r);
  this.scene.add(this.gltfScene)
}
```

### 9.3 可调参数

| 参数 | 当前值 | 说明 |
|------|--------|------|
| `Te(1.5, 1.5)` | 卡片尺寸 | 主卡片平面几何体 |
| `Te(1, 1.4)` | 人设尺寸 | 人设平面几何体 |
| `r.position.set(1.5, 0, 0.1)` | 人设位置 | x=1.5(右侧), y=0(垂直居中), z=0.1(略前) |
| `transparent:!0` | 人设透明 | 支持 webp/png 透明背景 |

**DOM 位置**：`.homeCollectionIntro__hero` — Collection 3D场景在此 div 中由 WebGL Canvas 渲染。

---

## 十、Collection 人设图 DOM Overlay（`.mornikar-char-portrait`）

### 10.1 架构说明

Collection 区域的人设图采用 **DOM overlay** 方案，在 Three.js Canvas 上方叠加一个 `<div>` + `<img>`，而非在 3D 场景内渲染平面（旧方案D中 Three.js 平面已弃用）。

**原因**：DOM overlay 可以直接用 CSS 控制尺寸/位置，通过 MutationObserver 镜像 GSAP 进场出场动画，实现成本远低于在 minified Home.js 中维护 3D 平面。

### 10.2 DOM 结构

```
.homeCollectionIntro__heroWrap      ← 人设图挂载点（3D Canvas 的父容器）
├── <canvas>                        ← Three.js 3D 场景
└── .mornikar-char-portrait         ← 人设图 wrapper（position: absolute）
    └── <img src="/images/newImage/01.webp">
```

### 10.3 样式参数

| 选择器 | 属性 | 值 | 说明 |
|--------|------|-----|------|
| `.homeCollectionIntro__heroWrap` | overflow | visible !important | 允许人设图溢出 Canvas 区域 |
| `.homeCollectionIntro__heroWrap` | position | relative | 为 absolute 子元素提供定位上下文 |
| `.homeCollectionIntro .block--middle` | overflow | visible !important | 解除中间栏裁剪 |
| `.homeCollectionIntro .blocks` | overflow | visible !important | 解除 flex 容器裁剪 |
| `.homeCollectionIntro__inner` | overflow | visible !important | 解除内层容器裁剪 |
| `.homeCollectionIntro` | overflow | visible !important | 解除最外层裁剪 |
| `.homeCollectionIntro` | contain | none !important | 覆盖原始 `contain:content`，否则裁剪溢出内容 |
| `.mornikar-char-portrait` | position | absolute | 绝对定位，覆盖在 Canvas 上 |
| `.mornikar-char-portrait` | top / left | 50% / 50% | 居中定位 |
| `.mornikar-char-portrait` | transform | translate(-50%, -50%) | 自身居中偏移 |
| `.mornikar-char-portrait` | z-index | 10 | 在 Canvas 上方 |
| `.mornikar-char-portrait` | pointer-events | none | 不拦截鼠标事件 |
| `.mornikar-char-portrait img` | width | 53vw !important | 人设图宽度（相对视口） |
| `.mornikar-char-portrait img` | max-width | none !important | 破除 px 单位的 max-width 约束 |
| `.mornikar-char-portrait img` | height | auto !important | 等比缩放 |
| `.mornikar-char-portrait img` | object-fit | contain !important | 保持比例 |
| `.mornikar-char-portrait img` | filter | drop-shadow(0 4px 20px rgba(0,0,0,0.4)) | 阴影增加层次感 |

> ⚠️ **尺寸单位必须用 `vw`，不能用 `px`**：px 值虽然写入了 inline style，但会被父容器链的 `max-width` 等约束裁剪，实际渲染尺寸不随 px 值变化。`vw` 单位 + `max-width: none` 才能真正生效。

### 10.4 GSAP 进场出场动画镜像

人设图不在 GSAP timeline 中（GSAP 只控制 `.block--left` 和 `.block--right`），通过 **MutationObserver** 监听 `.block--left` 的 `style` 属性变化，实时镜像动画：

```
GSAP 进场: fromTo([left, right], {y:视口高, alpha:1}, {y:0, alpha:1})
GSAP 出场: to([left, right], {alpha:0, y:-50*scale})

MutationObserver 回调:
  1. 读取 leftBlock 的 computedStyle.transform → 解析 matrix() 提取 translateY
  2. 读取 leftBlock 的 computedStyle.opacity
  3. 设置 wrapper.style.opacity = opacity
  4. 设置 wrapper.style.transform = translate(calc(-50%), calc(-50% + translateY))
```

### 10.5 鼠标视差

在 GSAP 动画偏移之上叠加鼠标视差，匹配 Three.js Canvas 的倾斜效果：

```
parallaxStrength = 20px (最大偏移)
鼠标坐标归一化: cx = (clientX / innerWidth - 0.5) * 2  → [-1, 1]
最终 transform = translate(calc(-50% + parallaxX), calc(-50% + gsapY + parallaxY))
```

### 10.6 配置

`site-config.json` 中：

```json
"collectionIntro": {
  "characterImage": "/images/newImage/01.webp"
}
```

### 10.7 踩坑记录

| 坑 | 现象 | 原因 | 解决 |
|----|------|------|------|
| px 尺寸不生效 | 写 width:1625px 视觉无变化 | 父容器链有 max-width 约束，px 值被裁剪 | 改用 vw 单位 + max-width:none |
| contain:content 裁剪 | 人设图放大后被截断 | `.homeCollectionIntro` 原始 `contain:content` 会裁剪溢出内容 | `contain:none !important` |
| overflow 链截断 | 人设图超出 Canvas 区域不可见 | heroWrap → block--middle → blocks → inner → Collection 多层 overflow:hidden | 逐层设置 overflow:visible |
| CSS transition 与 GSAP 冲突 | 动画不流畅/延迟 | transition 延迟了 MutationObserver 的 transform 更新 | 去掉 transition，由 JS 直接驱动 |

### 10.8 尺寸调整记录

| 日期 | 尺寸 | 说明 |
|------|------|------|
| 2026-05-09 | 260px | 初始尺寸（在 leftBlock 内） |
| 2026-05-09 | 53vw | 移到 heroWrap 内，改用 vw 单位，居中覆盖在 3D Canvas 上 |

---

## 十一、Collection MediaWrap 人设图 DOM Overlay（`.mornikar-media-overlay`）

### 11.1 架构说明

Collection 右下角 `.mediaWrap` 区域原始内容是 `<img class="mediaEl" src="face-traits.webp">`，由 lit-html 模板动态渲染。采用 **DOM overlay** 方案（与第十章人设图 `.mornikar-char-portrait` 同一思路），在 `.mediaWrap` 上叠加偏侧人设图，并隐藏原始 `.mediaInner`。

### 11.2 DOM 结构

```
.block--rightBottom                         ← GSAP 动画目标（右下区域）
└── .homeCollectionIntro__mediaWrap         ← overlay 挂载点
    ├── .mediaInner (visibility:hidden)     ← 原始图，隐藏但占位
    │   └── <img class="mediaEl">           ← face-traits.webp（Patch 8 已替换 src 为 08.webp）
    └── .mornikar-media-overlay             ← 人设图 wrapper（position: absolute）
        └── <img src="/images/newImage/08.webp">
```

### 11.3 样式参数

| 选择器 | 属性 | 值 | 说明 |
|--------|------|-----|------|
| `.homeCollectionIntro__mediaWrap` | overflow | visible !important | 允许人设图溢出 |
| `.block--rightBottom` | overflow | visible !important | 解除右下区域裁剪 |
| `.block--right` | overflow | visible !important | 解除右栏裁剪 |
| `.homeCollectionIntro__mediaWrap .mediaInner` | visibility | hidden !important | 隐藏原始图，占位但不显示 |
| `.mornikar-media-overlay` | position | absolute | 绝对定位 |
| `.mornikar-media-overlay` | top | 400px | 距容器顶部 400px（偏下） |
| `.mornikar-media-overlay` | left | -220px | 距容器左侧 -220px（大幅左偏） |
| `.mornikar-media-overlay` | height | 125% | 相对 mediaWrap 高度的 125%（1.25倍放大） |
| `.mornikar-media-overlay` | pointer-events | none | 不拦截鼠标事件 |
| `.mornikar-media-overlay` | z-index | 10 | 在 Canvas 上方 |
| `.mornikar-media-overlay img` | height | 100% | 填满 wrapper |
| `.mornikar-media-overlay img` | width | auto | 等比缩放 |
| `.mornikar-media-overlay img` | max-width | none | 破除宽度约束 |
| `.mornikar-media-overlay img` | object-fit | contain | 保持比例 |
| `.mornikar-media-overlay img` | object-position | right center | 图片右侧对齐 |
| `.mornikar-media-overlay img` | filter | drop-shadow(0 4px 20px rgba(0,0,0,0.4)) | 阴影增加层次感 |

### 11.4 GSAP 进场出场动画镜像

通过 MutationObserver 监听 `.block--rightBottom` 的 `style` 属性变化，镜像 GSAP 动画：

```
GSAP 进场: fromTo([left, right], {y:视口高, alpha:1}, {y:0, alpha:1})
GSAP 出场: to([left, right], {alpha:0, y:-50*scale})

MutationObserver 回调:
  1. 读取 rightBlock 的 computedStyle.transform → 解析 matrix() 提取 translateY
  2. 读取 rightBlock 的 computedStyle.opacity
  3. 设置 wrapper.style.opacity = opacity
  4. 设置 wrapper.style.transform = translateY(offsetY)
```

### 11.5 鼠标视差

在 GSAP 动画偏移之上叠加鼠标视差：

```
parallaxStrength = 15px (最大偏移)
鼠标坐标归一化: cx = (clientX / innerWidth - 0.5) * 2  → [-1, 1]
最终 transform = translate(parallaxX, gsapY + parallaxY)
```

### 11.6 配置

`site-config.json` 中：

```json
"collectionIntro": {
  "characterImage": "/images/newImage/01.webp",
  "mediaImage": "/images/newImage/08.webp"
}
```

### 11.7 服务端 Patch（server.js Patch 8）

原始 `<img src="${U}collection/face-traits.webp">` 在 lit-html 模板中硬编码，客户端 DOM 替换会被重渲染覆盖。因此在 server.js 中做服务端替换：

```js
// Patch 8: Collection mediaWrap image (face-traits) replacement
const mediaElPattern = /src="\$\{U\}collection\/face-traits\.webp"/;
jsContent = jsContent.replace(mediaElPattern, 'src="/images/newImage/08.webp"');
```

> ⚠️ 虽然 Patch 8 替换了 src，但 `.mediaInner` 已被 `visibility:hidden` 隐藏，实际显示的是 DOM overlay。

### 11.8 踩坑记录

| 坑 | 现象 | 原因 | 解决 |
|----|------|------|------|
| lit-html 重渲染覆盖 | content-patcher 替换 img src 后又被还原 | lit-html 模板动态渲染，每次更新重建 DOM | 在 server.js Patch 8 做服务端替换 |
| 两张图同时显示 | Patch 8 替换 + DOM overlay 同时可见 | 原始 `.mediaInner` 仍在渲染 | `visibility:hidden` 隐藏原始 mediaInner |
| overflow 链截断 | 人设图偏移后超出区域被裁剪 | block--right → block--rightBottom → mediaWrap 多层 overflow | 逐层设置 overflow:visible |

### 11.9 位置调整记录

| 日期 | top | left | height | 说明 |
|------|-----|------|--------|------|
| 2026-05-10 | 0px | -40% | 100% | 初始偏侧定位 |
| 2026-05-10 | 200px | -20px | 100% | 改为 px 定位，下移200+左移20 |
| 2026-05-10 | 600px | -50px | 150% | 左移30+下移400+放大1.5倍 |
| 2026-05-10 | 400px | -90px | 125% | 上移200+左移40+缩小1.2倍 |
| 2026-05-10 | 400px | -220px | 125% | 左移130px（分3次：40+50+40），当前值 |

---

## 十二、Tableau GLB 背景层替换（Keep / Factions）

### 12.1 架构结论

Keep、Factions、Universe 三个 Tableau 共享基类渲染管线，但每一页有自己的匿名子类、assets 和 `onAfterSetup()`。替换背景图时不要改共享 `setupScene()` / `setupSceneBG()`，应在目标 Tableau 子类的 `onAfterSetup()` 里定向替换 GLB 背景 mesh 的材质贴图。

运行时 GLB mesh 会被 `custom-material` 默认包装类重新包成 `ShaderMaterial`，原始 `material.map` 会进入 `material.uniforms.tMap.value`。因此真实贴图入口优先级是：

1. `material.uniforms.tMap.value`
2. `material.uniforms.uTexture.value`
3. `material.map`
4. 新建 `MeshBasicMaterial`

### 12.2 Keep 已验证结果

目标图：`/images/newImage/10.webp#texture`

目标 mesh：

- `sky_backdrop`
- `mountains_godrays_backdrop`

效果：已命中最背后的背景材质入口，肉眼可见场景结构仍保留为“背景 + 城堡/建筑贴图 + 近点人设/前景贴图”。当前视觉只露出 `10.webp` 的下方一小段，这是因为被替换的 GLB 背景平面在原始相机、UV、遮罩和前景层叠关系中只贡献可见底部区域。该结果说明替换入口正确，但图片构图需要按 GLB 背景平面的可见区域来准备。

### 12.3 Factions 当前试验方案

背景目标图：`/images/newImage/11.webp#texture`

解析 `tableaux-factions-2048.glb` 得到的后景 mesh：

- `sky_bg`：最背后的天空/背景层，material `Group_01`
- `mountain_01`：第二层远景，material `group_02`

服务端 Patch 做法：

```js
// Factions assets 中注入
bgImg: "/images/newImage/11.webp#texture"

// Factions.onAfterSetup() 中替换
const targetNames = ["sky_bg", "mountain_01"];
mesh.material.uniforms.tMap.value = this.assets.bgImg;
mesh.material.fragmentShader = mesh.material.fragmentShader.replace(
  "texture2D(tMap, vUv)",
  "texture2D(tMap, vec2(1.0-vUv.x,1.0-vUv.y))"
);
```

做背景替换时，不要把 `ship_01`、`ship_02`、`Head_accessoris`、`Man_head`、`man_Body`、`girl`、`platform`、`bridge`、`main_base`、`mountain_02` 等前景、人物、结构和装饰 mesh 放进 BG 目标列表。人物替换要单独走 12.4 的 CHAR_MALE 目标列表。

**AI 维护提示**：如果视觉只显示 `11.webp` 的局部，不代表入口失败；先看浏览器控制台是否出现 `[Factions BG] replaced GLB mesh: ... via uniforms.tMap + shaderUV180`。若日志命中但构图不理想，应调整图片内容/UV/平面缩放策略，而不是回退去替换共享管线或全量 GLB mesh。

### 12.4 Factions 前景人物材质入口

人物目标图：`/images/newImage/04.webp#texture`

Factions 背景前的两个人物不是一个整体 mesh，而是拆成多个 GLB 平面：

- `girl`：女角色主体，material `group_03`
- `Man_head`：男角色头部，material `group_03_01`
- `man_Body`：男角色身体，material `group_02.002`
- `Head_accessoris`：男角色头部配饰，material `group_02.002`

已验证过的“实验艺术版”：把这四个 mesh 全部视为“人物组”，在 Factions `onAfterSetup()` 中替换为同一张 `04.webp`。结果确认材质入口命中，但 `04.webp` 同时套到女角色和男性拆分平面上，视觉上偏实验艺术，不适合作为当前人设效果。

```js
const targetNames = ["girl", "Man_head", "man_Body", "Head_accessoris"];
mesh.material.uniforms.tMap.value = this.assets.charImg;
```

碎片化根因：

- 原男性角色不是一个完整画布，而是 `Man_head`、`man_Body`、`Head_accessoris` 三个局部 mesh。
- 这些局部 mesh 各自有自己的几何范围、透明区域和 UV；把一张完整人设图塞进这三个材质入口，会天然变成“支离破碎”的局部贴图，不是单纯被其它物体挡住。
- `texture.center/texture.rotation` 对原始自定义 `ShaderMaterial` 基本无效，因为 shader 直接 `texture2D(tMap, vUv)` 采样，没有使用 Three.js 的 texture transform matrix。

已验证但不采用的方案：

- 把 `girl`、`Man_head`、`man_Body`、`Head_accessoris` 都替换成 `04.webp`：入口命中，但女角色和男性拆分件同时套完整图，视觉偏实验艺术。
- 只把 `Man_head`、`man_Body`、`Head_accessoris` 替换成 `04.webp`：入口命中，但男性仍然由局部 mesh 裁切，画面碎片化。
- 对上述材质设置 `texture.rotation = Math.PI`：不能可靠纠正倒置，因为自定义 shader 不吃 texture transform。

当前正式试验状态：

- 背景 `11.webp` 保留“倒过来”的效果；不再对 BG 材质做 shader UV 180° 翻转。
- `girl` 直接 `visible=false` 隐藏，方便以后换成新的女性人设素材。
- 原男性拆分 mesh `Man_head`、`man_Body`、`Head_accessoris` 也直接隐藏，不再把完整 `04.webp` 塞进这些局部材质入口。
- 新增一个完整的 Three.js 平面 `mornikar_factions_male_04`，使用 `04.webp` 作为 `MeshBasicMaterial.map`，放在 Factions 男性角色大致位置。

服务端 Patch 当前实现：

```js
// 禁用女角色原始 mesh
if (meshName === "girl") mesh.visible = false;

// 禁用原男性拆分 mesh
["Man_head", "man_Body", "Head_accessoris"].includes(meshName) && (mesh.visible = false);

// 新增完整男性人设平面
const aspect = charImg.image?.width && charImg.image?.height
  ? charImg.image.width / charImg.image.height
  : 0.66;
const h = 0.5;
const plane = new Mesh(new PlaneGeometry(h * aspect, h), new MeshBasicMaterial({
  map: charImg,
  transparent: true,
  depthWrite: false,
  depthTest: false,
  side: DoubleSide
}));
plane.name = "mornikar_factions_male_04";
plane.position.set(0.12, 0.02, -1.16);
plane.rotation.set(0, 0, 0);
plane.renderOrder = 50;
gltfScene.add(plane);
```

视角修正经验：新增的 `PlaneGeometry` 默认位于 XY 平面，法线朝 +Z；当前 Factions 相机从 +Z 看向场景，所以完整人设平面应保持 `rotation.set(0, 0, 0)`。不要沿 X 轴设置 `Math.PI / 2`，否则平面会横躺/侧向，肉眼会看到“一张纸”的边缘视角。

尺寸修正经验：第一次完整人设平面高度 `1.25` 过大，画面只能看到下半身；随后改为 `0.625`，当前又按用户肉眼效果再等比缩小 `0.8` 倍，最终高度为 `0.5`，宽度继续用 `height * aspect` 等比计算。

注意：这些 mesh 的原始 material 可能与远景贴图共享同一张 source texture，但经过 `custom-material` 包装后，每个 mesh 都有自己的 `ShaderMaterial` 和 `uniforms.tMap`。因此运行时按 mesh 名定向替换 `tMap.value`，不会等价于替换整张原始 KTX2 纹理，也不会自动影响未命中的 `sky_bg`、`platform`、`bridge` 等其它 mesh。

验证日志：

- `[Factions CHAR_SOURCE] disabled GLB mesh: girl`
- `[Factions CHAR_SOURCE] disabled GLB mesh: Man_head`
- `[Factions CHAR_SOURCE] disabled GLB mesh: man_Body`
- `[Factions CHAR_SOURCE] disabled GLB mesh: Head_accessoris`
- `[Factions BG] replaced GLB mesh: sky_bg via uniforms.tMap`
- `[Factions BG] replaced GLB mesh: mountain_01 via uniforms.tMap`
- `[Factions CHAR_PLANE] added full male plane 04.webp size: ...`

### 12.5 Universe Tableau：背景 15.webp + 前景人物 05.webp

触发位置：主页第三个 Tableau，代码里的 section 是 `class="homeUniverse homeSection"`，内部同样有 `class="tableau__inner"`。

GLB 解析文件：`tableaux-universe-2048.glb`。

关键 mesh：

- 背景/环境：`city_and_ground`、`cloud_hadows`、`cloud`
- 前景人物：`character`
- 特效保留：`beams_fx`、`magic_fx`、`sky_glow_fx`
- 前景装饰/文字先不动：`foreground`、`foreground _2`、`keep`、`keepFont`

当前实现：

- 在 Universe assets 中注入 `bgImg:"/images/newImage/15.webp#texture"`。
- 在 Universe assets 中注入 `charImg:"/images/newImage/05.webp#texture"`。
- 在 Universe `onAfterSetup()` 中定向替换：
  - `city_and_ground`、`cloud_hadows`、`cloud` -> `15.webp`
  - `character` -> `05.webp`

验证日志：

- `[Universe BG] replaced GLB mesh: city_and_ground via uniforms.tMap`
- `[Universe BG] replaced GLB mesh: cloud_hadows via uniforms.tMap`
- `[Universe BG] replaced GLB mesh: cloud via uniforms.tMap`
- `[Universe CHAR] replaced GLB mesh: character via uniforms.tMap`

注意：Universe 的人物是单个 `character` mesh，比 Factions 的男性拆分 mesh 简单，所以先直接走原 mesh 的 `tMap` 替换，不新增独立平面。若后续肉眼仍看到裁切或比例不对，再考虑像 Factions 一样隐藏原 mesh 并新建完整 `PlaneGeometry`。

### 12.6 Launch singleCard：三张入口卡片贴图

触发位置：Launch 页三张可点击入口卡片，DOM class 分别是：

- `singleCard singleCard--universe`
- `singleCard singleCard--keep`
- `singleCard singleCard--factions`

关键经验：这些 class 只是 DOM 点击/标题容器，不直接承载图片。图片实际在 `Ui` 类的 WebGL assets 中：

```js
mapCardKeep: `${O}launch/card-keep.ktx2`
mapCardFactions: `${O}launch/card-factions.ktx2`
mapCardUniverse: `${O}launch/card-universe.ktx2`
```

当前替换：

- `singleCard--universe` -> `mapCardUniverse:"/images/newImage/04.jpg#texture"`
- `singleCard--keep` -> `mapCardKeep:"/images/newImage/10.jpeg#texture"`
- `singleCard--factions` -> `mapCardFactions:"/images/newImage/09.jpg#texture"`

注意：这里是 WebGL shader 的 `tMap` 纹理来源，不能只改 `.singleCard--xxx` 的 CSS 或 DOM 背景。

不应再看到 `[Factions CHAR_MALE]` 的材质替换日志；男性完整人设现在走新增平面，不走原拆分 mesh 的 `tMap`。

---

*最后更新：2026-05-15*
*基于实际踩坑验证，3D卡片方案经过5次失败迭代确认，3D背景方案D已实施*
*Landing 平面尺寸调整记录：2×2.8 → 1.6×2.24(×0.8) → 1.28×1.792(×0.64) → 0.896×1.2544(×0.448，当前)*
*Collection 场景：卡片(05.png)+人设01(01.webp DOM overlay,heroWrap)+人设08(08.webp DOM overlay,mediaWrap)*
*Tableau 背景层：Keep 已命中 tMap；Factions 当前试验 sky_bg + mountain_01 替换为倒置 11.webp，girl 和原男性拆分 mesh 隐藏，完整男性 04.webp 走新增平面*
