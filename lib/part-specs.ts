// 来源：用户提供的“母版尺寸表 -150 Dpi.txt”。以下为正式物理尺寸。
export const TARGET_DPI = 150;
export const PHYSICAL_SPECS = {
 '左侧':{widthCm:450,heightCm:150},'右侧':{widthCm:450,heightCm:150},
 '机盖':{widthCm:195,heightCm:150},'车顶':{widthCm:330,heightCm:150},
 '前保险杠':{widthCm:300,heightCm:100},'后保险杠':{widthCm:300,heightCm:80},
 '后备箱':{widthCm:150,heightCm:150},
} as const;
export function targetPixels(name:keyof typeof PHYSICAL_SPECS):{width:number;height:number} {const s=PHYSICAL_SPECS[name];return {width:Math.round(s.widthCm/2.54*TARGET_DPI),height:Math.round(s.heightCm/2.54*TARGET_DPI)};}
export const SPEC_STATUS = '正式物理尺寸已录入 · 当前导出为低分辨率设计稿，非150 DPI生产文件';
// 本地设计代理画布；尚不将原尺寸的大文件渲染送入浏览器。
export const FIXED_SPECS = {
  '左侧': {width:2172,height:724}, '右侧': {width:2172,height:724},
  '机盖': {width:1300,height:1000}, '车顶': {width:2200,height:1000},
  '前保险杠': {width:2100,height:700}, '后保险杠': {width:2250,height:600},
  '后备箱': {width:1200,height:1200},
} as const;
