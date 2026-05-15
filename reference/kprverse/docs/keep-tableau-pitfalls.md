# Keep Tableau 背景替换 — 踩坑文档

> **目的**：记录 Keep 3D 画景（Tableau）背景替换过程中的所有失败尝试和关键认知，
> 防止未来 AI 迭代时重复踩同样的坑。每次尝试前必须先读本文档。

---

## 一、Keep Tableau 渲染管线（必须理解）

### 1.1 类结构

```
Keep 画景 = 匿名 class extends te (基类 Tableau)
├── options: { id:"keep", useMask:!0, usePass:!0, cBackground:7495782 }
├── assets: { glb, bgImg(新增), ...V.hasMobileFallback?{}:{sheetCharacter0...} }
├── 方法继承:
│   ├── onSetup()         → 父类: setupScene → setupSceneBG → setupCamera → setupPass → setupCards → setupSecondLayer → setupStoryBlock
│   ├── setupScene()      → 父类共享！GLB 遍历 + spritesheet 对象创建
│   ├── setupSceneBG()    → 父类共享！创建 meshBG (ShaderMaterial 纯色, BG layer)
│   ├── setupCards()      → Keep 空实现
│   ├── onAfterSetup()    → Keep 独有！useControls + getAnimIn
│   └── render()          → 父类共享！多 pass 渲染
```

### 1.2 渲染管线（render 方法）

```
if (useMask && mode === DEFAULT):
  1. 设置 renderTarget = pass.fbo.write
  2. clear()
  3. clearDepth() + clearStencil()
  4. bs({renderer, layer:STENCIL, camera:perspCamera, scene})    ← Stencil 遮罩
  5. xs({renderer, layer:BG, camera:orthoCamera, scene})         ← BG 层 (meshBG)
  6. xs({renderer, layer:MAIN, camera:this.camera, scene})       ← MAIN 层 (GLB sprites)
  7. Ss(renderer)                                                 ← 后处理
  8. setRenderTarget(null)
  9. pass.render(true, {clear:true})                              ← 最终合成

if (useMask && mode !== DEFAULT):
  1. 设置 renderTarget = pass.fbo.write
  2. clear()
  3. orthoCamera.layers.set(BG), renderer.render(scene, orthoCamera)
  4. this.camera.layers.set(MAIN), renderer.render(scene, this.camera)
  5. setRenderTarget(null)
  6. pass.render(false, {clear:true})
```

### 1.3 Layer 常量

```
Ot.MAIN    = 0    ← 默认层，GLB spritesheet 对象在此
Ot.BG      = 1    ← meshBG (纯色背景) 在此，用 orthoCamera 渲染
Ot.UI      = 2    ← UI 元素
Ot.STENCIL = 3    ← Stencil 遮罩对象
Ot.POST    = 6    ← 后处理
```

### 1.4 meshBG 关键属性

```
meshBG = new Mesh(PlaneGeometry(1,1), ShaderMaterial)
  - ShaderMaterial: 只输出 uniform uColor (cBackground=7495782)
  - layers.set(Ot.BG)  → 在 BG 层渲染
  - name = "MeshBG"
  - resize 时: meshBG.scale.set(width, height, 1)  → 自动拉伸填满视口
```

---

## 二、失败尝试记录

### 尝试 1: DOM overlay "硬贴"

**做法**：在 `tableau__inner` 上叠加 DOM `<img>` 元素
**结果**：❌ 用户拒绝
**原因**：3D Canvas 渲染不透明内容覆盖了 DOM overlay，不是真正替换背景
**教训**：**3D 场景的背景必须在 Three.js 管线内替换，不能靠 DOM 叠加**

### 尝试 2: 添加纹理平面到 BG 层

**做法**：在 onAfterSetup 中 `new Mesh(PlaneGeometry(20,20), texture)`, 设置 `layers.set(Ot.BG)`, `renderOrder=-1`, `position.z=-5`
**结果**：❌ 不可见
**原因**：BG 层使用 orthoCamera 渲染，而 GLB 模型在 MAIN 层上完全覆盖了 BG 层内容。GLB spritesheet 对象是不透明的，遮住了 BG 层的一切
**教训**：**BG 层在 MAIN 层之前渲染，但 MAIN 层内容会完全覆盖 BG 层。仅当 MAIN 层有透明区域时 BG 层才可见**

### 尝试 3: 修改共享 setupScene 方法

**做法**：在 `setupScene()` 中添加 `n.isTexture` 检查来区分 Keep 与其他 Tableau
**结果**：❌ 白屏
**原因**：`setupScene()` 是父类方法，被 Factions/Universe/Keep 三个 Tableau 共享。修改它破坏了 Factions 和 Universe 的 GLB 遍历逻辑
**教训**：**⚠️ 绝对不要修改父类共享方法！所有 Tableau 共享 setupScene/setupSceneBG/setupCamera。修改必须限定在 Keep 独有的方法中（如 onAfterSetup）**

### 尝试 4: 在 Keep 类中覆盖 setupScene

**做法**：给 Keep 添加自己的 `setupScene()` 方法
**结果**：❌ 白屏
**原因**：Keep 的 `setupCards()` 和 `render()` 依赖 `setupScene()` 中 GLB 遍历创建的 spritesheet 对象（kai_fx, ship_fx, beams_fx 等）。覆盖 setupScene 后这些对象不存在，后续流程崩溃
**教训**：**Keep 的 GLB 遍历是必须保留的——spritesheet 对象被 setupCards/render 依赖。不能绕过 GLB 加载**

### 尝试 5: 添加纹理平面到 MAIN 层

**做法**：在 onAfterSetup 中 `scene.add(new Mesh(...))`, 不设 layers（默认 layer 0 = MAIN），renderOrder=-1, position.z=-5
**结果**：⚠️ 未验证（在尝试之前已改为 meshBG 方案）
**预期问题**：MAIN 层上的 GLB spritesheet 对象覆盖整个视口，纹理平面即使在 z=-5 也可能被遮挡

### 尝试 6: 替换 meshBG 材质（当前方案）

**做法**：在 onAfterSetup 中替换 `this.meshBG.material` 为 `MeshBasicMaterial({map: bgImg})`
**结果**：🔄 待验证
**原理**：meshBG 在 BG 层上用 orthoCamera 渲染，resize 时自动拉伸填满视口。替换材质后，BG 层渲染步骤会输出纹理而非纯色。由于 MAIN 层的 spritesheet 有透明区域，BG 层的纹理应该能透过来

---

## 三、核心认知（必读）

### 3.1 三个 Tableau 共享 vs 独有

| 方法 | 共享/独有 | 说明 |
|------|----------|------|
| `setupScene()` | **共享** | GLB 遍历 + spritesheet 创建，3个 Tableau 都用 |
| `setupSceneBG()` | **共享** | 创建 meshBG (ShaderMaterial 纯色) |
| `setupCamera()` | **共享** | 创建 perspCamera + cameraSystem |
| `setupCards()` | **独有** | Keep=空，Factions/Universe 各有实现 |
| `onAfterSetup()` | **独有** | 每个有不同实现（camera.position.z 值不同） |
| `render()` | **共享** | 多层渲染管线 |

**唯一安全的修改点**：`onAfterSetup()` — 这是 Keep 独有的，改了不影响其他 Tableau

### 3.2 资产定义中的条件展开

```js
assets: {
  glb: "...",
  bgImg: "...#texture",        // ← 必须放在条件展开外！
  ...V.hasMobileFallback ? {} : {
    sheetCharacter0: "...",     // ← 这些在 hasMobileFallback=true 时被排除
    sheetCharacter1: "...",
  }
}
```

**坑**：如果 `bgImg` 放在 `...V.hasMobileFallback?{}:{...}` 内部，当 `hasMobileFallback=true` 时 bgImg 会被排除，导致 `this.assets.bgImg` 为 undefined

### 3.3 LoaderMixin 的 #type 后缀

```
.jpg/.png/.webp → 默认用 image loader → 返回 HTMLImageElement → 不能做 Three.js texture
.jpg#texture    → 用 texture loader → 返回 THREE.Texture → 可以做 map
```

**坑**：不加 `#texture` 后缀，`this.assets.bgImg` 会是 HTMLImageElement 而不是 THREE.Texture，传给 `MeshBasicMaterial({map: ...})` 会报错或不显示

### 3.4 meshBG 的 resize 行为

```
onResize: null==(n=this.meshBG) || n.scale.set(width, height, 1)
```

meshBG 用 `PlaneGeometry(1,1)` 创建，初始只有 1x1 单位。但在 resize 时会被拉伸到 `(width, height, 1)` 填满视口。

**坑**：如果在 onAfterSetup 中手动设置 `meshBG.scale.set(...)`，resize 后会被覆盖。不需要手动设 scale。

### 3.5 Keep 的 Stencil 遮罩

Keep 使用 `useMask:!0`，意味着 render() 会先渲染 STENCIL 层建立遮罩，然后 BG/MAIN 层只在遮罩区域内可见。这是 Keep 画景有圆角/形状裁剪的原因。

**坑**：BG 层的纹理只会在 stencil 遮罩区域内显示，不会超出画景边界。这是正确行为。

---

## 四、安全操作检查清单

修改 Keep Tableau 前必须确认：

- [ ] 修改只影响 Keep 独有的方法（onAfterSetup），不修改共享方法
- [ ] 新增 asset 放在条件展开 `...V.hasMobileFallback?{}:{...}` **外部**
- [ ] 纹理 asset 使用 `#texture` 后缀
- [ ] 不覆盖 setupScene()（GLB 遍历是必须的）
- [ ] 不修改 setupSceneBG() 的创建逻辑（3个 Tableau 共享）
- [ ] 不添加新的 layers.set() 调用（meshBG 已在正确层）
- [ ] 不手动设置 meshBG.scale（resize 会处理）
- [ ] 变量映射确认：ce=MeshBasicMaterial, ue=Mesh, Te=PlaneGeometry, Fe=SRGBColorSpace

---

## 五、变量混淆映射表（Home.0d973127.js）

| 混淆名 | Three.js 原名 | 用途 |
|--------|--------------|------|
| `ye` | `Scene` | 3D 场景容器 |
| `fe` | `Object3D` | 基础3D对象 |
| `ue` | `Mesh` | 网格体 |
| `Te` | `PlaneGeometry` | 平面几何 |
| `ce` | `MeshBasicMaterial` | 基础材质 |
| `Le` | `ShaderMaterial` | 着色器材质 |
| `Fe` | `SRGBColorSpace` | 颜色空间 |
| `Pe` | `Vector3` | 向量 |
| `Me` | `Color` | 颜色 |
| `Ot` | `Layer constants` | {MAIN:0, BG:1, UI:2, STENCIL:3, POST:6} |
| `te` | `Tableau` | Tableau 基类 |
| `xe` | `OrthographicCamera` | 正交相机 |
| `bs()` | stencil render | 渲染 stencil 层 |
| `xs()` | layer render | 渲染指定层 |
| `Ss()` | post-process | 后处理渲染 |

---

## 六、当前方案状态

**Patch 9a**: 在 Keep assets 中添加 `bgImg:"/images/newImage/10.webp#texture"`（在 glb 之后、条件展开之前）✅ 已部署

**Patch 9b**: 在 Keep onAfterSetup 中替换 meshBG 材质：
```js
if(this.meshBG && this.assets.bgImg){
  this.meshBG.material.dispose();
  this.meshBG.material = new ce({map: this.assets.bgImg, side: 2, depthWrite: false});
  this.meshBG.material.map.encoding = Fe;
}
```
🔄 待浏览器验证

---

*最后更新：2026-05-13*
*累计失败尝试：5次（2次白屏、2次不可见、1次被拒为"硬贴"）*

---
---

## 2026-05-15 修正结论：`meshBG` 不足以替换可见旧背景，必须定向替换 GLB backdrop mesh

**目标**：将 Keep Tableau 可见背景替换为 `/images/newImage/10.webp`。

**被验证失败的方案**：只替换 `this.meshBG.material`。原因是 Keep 渲染顺序为 `STENCIL -> BG(meshBG) -> MAIN(GLB)`，而用户可见的旧背景主要来自 GLB MAIN 层里的背景平面，`meshBG` 会被 MAIN 层覆盖，所以视觉上仍是旧图。

**旧损坏方案也不能用**：遍历 `this.gltfScene` 并替换所有非 sprite mesh。这个方案会误伤角色、飞船、结构、光效等 mesh，风险太大。

**已验证的目标 mesh**：解析 `/gltf/compressed/etc1s/tableaux-keep/tableaux-keep-2048.glb` 得到：

- `sky_backdrop`：mesh 0，material `group_01`
- `mountains_godrays_backdrop`：mesh 1，material `group_02`

**当前正确方案**：

1. 给 Keep assets 插入 `bgImg:"/images/newImage/10.webp#texture"`，位置必须在 `hasMobileFallback` 条件展开外。
2. 覆盖 Keep 自己的 `onAfterSetup()`，不要改 Tableau 基类。
3. 在 `onAfterSetup()` 内只遍历并替换两个背景 mesh：
   - `sky_backdrop`
   - `mountains_godrays_backdrop`
4. 如果 mesh material 有 `uniforms.tMap`，优先替换其 value；否则再回退到 `uniforms.uTexture`、`material.map` 或新建 `MeshBasicMaterial`。
5. 不修改 sprites、角色、飞船、结构、`setupScene()`、`setupSceneBG()` 或共享 render 管线。

**验证结果**：

- `node --check server.js` 通过。
- `/_nuxt/Home.0d973127.js` 响应为 no-cache。
- 响应内包含 `/images/newImage/10.webp#texture`。
- 响应内包含 `sky_backdrop`、`mountains_godrays_backdrop` 和 `targeted backdrop meshes replaced`。
- 响应内不包含旧失败方案日志 `Total non-sprite`。
- 视觉验证需要重启 Node 服务后硬刷新浏览器；旧 Node 进程不会自动加载新的 `server.js`。

**Memory Card**：

- Keep 可见旧背景来自 GLB MAIN 层，不是 `meshBG`。
- 替换目标只限 `sky_backdrop` 与 `mountains_godrays_backdrop`。
- 不要全量遍历替换 GLB 非 sprite mesh。
- 修改 `server.js` 后必须重启服务并硬刷新，避免旧进程/旧 JS 缓存。

---

## 2026-05-15 二次修正：定向 mesh 仍失败时，检查 `custom-material` 的 `tMap`

**新症状**：已定向到 `sky_backdrop` 和 `mountains_godrays_backdrop`，页面仍显示旧背景。

**根因**：Keep GLB mesh 在 `setupScene()` 后会被 `custom-material.8570572a.js` 的默认包装类接管。该类会把原始 `material.map` 包进新的 `ShaderMaterial`，真实渲染贴图入口变成 `material.uniforms.tMap.value`，而不是前一次补丁检查的 `uniforms.uTexture` 或 `material.map`。

**正确替换顺序**：

1. `material.uniforms.tMap.value = this.assets.bgImg`
2. 回退：`material.uniforms.uTexture.value = this.assets.bgImg`
3. 再回退：`material.map = this.assets.bgImg`
4. 最后才新建 `MeshBasicMaterial`

**验证提示**：服务端返回的 `Home.0d973127.js` 里必须能搜到 `uniforms.tMap`、`10.webp#texture`、两个 backdrop mesh 名称。浏览器控制台应出现 `[Keep BG] replaced GLB backdrop mesh: ... via uniforms.tMap`。

**Memory Card**：

- `sky_backdrop` / `mountains_godrays_backdrop` 是正确目标，但材质入口不是原始 `map`。
- GLB 默认包装类使用 `ShaderMaterial` 的 `tMap` uniform 渲染贴图。
- 以后替换 Keep GLB 可见贴图时，优先改 `uniforms.tMap.value`。
- 如果只改 `meshBG`、`uTexture` 或 `material.map`，可能 HTTP 代码看似正确但视觉仍是旧图。

---

## 2026-05-15 视觉验证记录：命中后只露出贴图下方一段是合理现象

**用户肉眼反馈**：这次确实命中了材质入口。Keep 场景可理解为“最背后的背景图层 + 城堡/建筑贴图 + 近点人设/前景贴图”的多层 GLB 叠加；当前替换的是最背后的背景图层。

**视觉效果**：`10.webp` 只显示了下方一小部分，但整体视角效果可接受。这个现象不是替换失败，而是 GLB 背景平面的 UV、相机视角、Stencil 遮罩和前景层遮挡共同决定的结果。

**后续经验**：如果控制台日志显示 `via uniforms.tMap` 且目标 mesh 数量正确，就说明入口命中。构图不理想时，应优先调整替换图片的构图或进一步研究目标 mesh UV/尺寸，不要回退到 `meshBG`、DOM overlay、共享 `setupScene()` 或全量替换非 sprite mesh。
