# RARE DROP — CHEN RANPAN

互动生日礼物：开箱揭晓 → 3D 镭射吉他拨片 → 鼠标悬停侧倾 / 翻面。

**在线体验：https://caiwu557-ai.github.io/chen-ranpan-rare-drop/**

用支持 WebGL2 的 Chrome、Edge、Safari 或 Firefox 打开页面。点击 **UNLOCK CONTAINER**，开箱后将鼠标移到拨片不同位置，拨片会轻微侧倾；无需按住鼠标，不再支持拖拽自由旋转。移开后回正，双击或点击 **FLIP** 翻面，背面也能悬停侧倾。左右倾角上限约 18°，上下约 14°；电脑支持滚轮缩放及方向键微调。手机保留页面滚动和翻面按钮，请用系统浏览器打开。

## 效果实现

- 原生 WebGL2 绘制正反面和具有厚度、连续倒角的金属侧边。
- 视线方向驱动的 UV 视差：背景下沉，山峰前浮，文字固定在表面。
- 局部虹彩箔膜、角度驱动的扫光与细碎闪点，保留文字可读性。
- 素材全部随项目提供，无 CDN、账户、后端、付费抽取或外部 API。开箱结果固定，是私人生日礼物演示。
- 在线图片使用原分辨率 WebP，全部透明通道逐像素保持一致，文字/刻线/遮罩采用无损编码。11 张运行图片从 7,148,603 字节压到 1,322,224 字节，并取消未使用的 1,350,869 字节预览图预加载；总图片传输需求减少约 84%。PNG 原件保留。编码参数和逐文件结果见 `tools/optimize-images.py` 与 `image-optimization.json`。

## 本地运行

安装 Node.js 18+ 后，在项目目录运行 `node server.mjs`，打开 `http://127.0.0.1:8765`。服务器仅监听本机。

在线访问不需要安装 Node。Releases 中 v1.0.0 是此前的拖动交互离线单文件版，解压后双击 HTML，无需服务或开发环境；当前悬停和 WebP 更新以在线页面/main 分支为准。

## 部署

GitHub Pages 设置为从 `main` 分支的根目录发布。使用相对资源路径，可部署在项目子路径。修改本仓库网页文件后推送，Pages 自动重新构建。

## 验证与边界

已在 Chrome / ANGLE SwiftShader 上验证 WebGL2 编译、开箱、悬停方向和限幅、取消拖动旋转、移开回正、背面悬停、翻面、侧边厚度和手机视口布局，并检查网页不再请求 PNG。软件渲染验证不代表实际显卡或手机帧率验收。禁用 WebGL2 时会显示简化图片效果，完整镭射需要启用 WebGL2。

## 开源

网页代码以 MIT 许可发布。Shader 方法参考并改造自 [Holo Card Studio](https://github.com/EverettFish/holo-card-studio)，其版权声明见 [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)。PNG 图片是本项目随附的 AI 生成视觉素材，允许与本项目一起使用和修改；作者不主张对 AI 输出拥有排他权，不提供商标或其他第三方权利保证。本项目与 Valve / Counter-Strike 无关联。
