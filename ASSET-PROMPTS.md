# 示例素材生成记录

工具：内置 imagegen；透明背景开启；未使用 API CLI。输出已复制到 `public/demo/character.png`，保留原始透明通道。

## 最终提示词

Create a production-ready isolated original anime character asset for an automotive vinyl wrap design. A futuristic silver-haired female racing pilot in black technical jacket with vivid cyan and magenta panels, energetic three-quarter pose facing slightly left, shown from head through hips, detailed expressive face, flowing hair, bold ink outlines and polished cel shading, contemporary Japanese graphic illustration. Entire silhouette including all hair and arms comfortably inside frame. True transparent background, no scenery, no ground shadow, no text, no logo, no car. This is an independent foreground layer that will be composited over a separate graphic background, wide-ish portrait composition. Original character, not a known franchise. Save as PNG with alpha.

## 使用方式

人物作为独立 PNG 图层使用。背景、青粉装饰线、标题和副标题由网页独立绘制，导出时仍为各自图层。此素材仅展示编辑流程，不代表用户每次提交参数都会自动得到新的生成结果。

## 写实 SUV 底图（2026-10-21）

内置 imagegen 生成，1536 × 1024，保存为 public/cars/suv-studio-v2.png。提示词要求：同一辆白色、仰望 U8 风格的方正豪华 SUV，摄影棚浅灰背景，侧面、正面、背面、俯视四视图；黑色玻璃、轮毂和下饰板，真实车漆高光、板缝和接地阴影，无文字、无商标。俯视车头朝左。

网页以分部位遮罩叠加设计图，保留玻璃、轮胎、灯组和高光。底图由 AI 生成，不代表实车照片或精确尺寸模型。

## 轿车与 MPV（2026-10-22）

通过内置 imagegen 各生成一张 1536 × 1024 四视图棚拍风格底图，分别保存在 public/cars/sedan-studio.png 与 public/cars/mpv-studio.png。提示要求同一白色无品牌车辆的侧面、正面、背面、朝左俯视，灰色背景、黑色玻璃与轮胎、完整车身、无文字。分别强调低矮三厢轿车与长车身滑门商务 MPV；各图单独配置漆面遮罩。
