import {imageFor,canvas} from './render';
import {systemSettings} from './system-settings';
import {designBrief,configErrors} from './design-config';
import { PARTS, makeLayer, validateEntry, type Project, type PartName, type Layer, type SafeArea, type Entry, type VehicleType } from './model';
import { PHYSICAL_SPECS,TARGET_DPI,targetPixels } from './part-specs';
import {selectedCaseSummary} from './case-library';
export interface GenerationRequest { system_guidance:string; design_brief:ReturnType<typeof designBrief>; assets:{asset_id:string;image:string}[]; style_cases:ReturnType<typeof selectedCaseSummary>; vehicle: VehicleType; entry: Entry; part: PartName; width: number; height: number; production: {widthCm:number;heightCm:number;dpi:number;width:number;height:number}; safe: SafeArea; references: string[]; prompt_text: string; }
export interface GenerationResult { layers: Layer[]; notes: string[]; }
export type TaskStatus = 'idle' | 'waiting' | 'running' | 'completed' | 'failed';
export interface GenerationProvider { generate(request: GenerationRequest,signal?: AbortSignal): Promise<GenerationResult>; }
export const cozeProvider: GenerationProvider = { async generate(request,signal) {
  const images=[...new Set([...request.references,...request.assets.map(a=>a.image),...request.style_cases.map(c=>c.image).filter((s):s is string=>!!s)])].slice(0,12);
  const references=await Promise.all(images.map(async src=>{const im=await imageFor(src);const factor=Math.min(1,1600/Math.max(im.width,im.height));const c=canvas(Math.max(1,Math.round(im.width*factor)),Math.max(1,Math.round(im.height*factor)));c.getContext('2d')!.drawImage(im,0,0,c.width,c.height);return c.toDataURL('image/jpeg',0.86);}));
  const timeout=AbortSignal.timeout(300000);
  let res:Response;
  try{res=await fetch('/api/generate',{method:'POST',headers:{'content-type':'application/json'},signal:signal?AbortSignal.any([signal,timeout]):timeout,body:JSON.stringify({part:request.part,prompt:request.prompt_text,width:request.width,height:request.height,references})});}
  catch(err){if((err as Error)?.name==='TimeoutError'||/timed out/i.test(String((err as Error)?.message)))throw new Error('生成等待超时（5 分钟无响应），请稍后重试；本次未替换原设计。');throw err;}
  const data=await res.json().catch(()=>null) as {error?:string;url?:string;size?:string;requestId?:string}|null;
  if(!res.ok||!data?.url)throw new Error((data?.error||`生图服务响应异常（HTTP ${res.status}），请检查平台接口和运行日志。`)+(data?.requestId?`\n错误编号：${data.requestId}`:''));
  const [gw,gh]=(data.size||'').split('x').map(Number);
  const scale=gw&&gh?Math.max(request.width/gw,request.height/gh):1;
  const w=Math.round((gw||request.width)*scale),h=Math.round((gh||request.height)*scale);
  return {layers:[makeLayer('image',{name:`生图 · ${request.part}`,src:data.url,x:Math.round((request.width-w)/2),y:Math.round((request.height-h)/2),width:w,height:h})],
    notes:['上传的参考素材已随任务传给模型；当前返回完整合成图，独立元素需在图片分层中拆分并检查。']};
}};
export function requestFor(project: Project,part: PartName): GenerationRequest {const error=validateEntry(project);if(error)throw new Error(error);const errors=configErrors(project);if(errors.length)throw new Error(errors.join('\n'));const p=project.parts[part];return {system_guidance:systemSettings().generationGuidance,design_brief:designBrief(project),assets:project.entry==='poster'?[...(project.poster.asset?[{asset_id:project.poster.asset.id,image:project.references[0]}]:[]),...(project.poster.character?[{asset_id:project.poster.character.id,image:project.poster.character.src}]:[])]:[],style_cases:selectedCaseSummary(project,part),vehicle:project.vehicle,entry:project.entry,part,width:p.width,height:p.height,production:{...PHYSICAL_SPECS[part],...targetPixels(part),dpi:TARGET_DPI},safe:p.safe,references:project.references,prompt_text:promptFor(project,part)};}
export function promptFor(project: Project,part: PartName): string {
 const p=project.parts[part],s=p.safe;
 const note=(project.designNote||'').trim();
 return `系统统一要求：${systemSettings().generationGuidance||'无额外要求'}\n汽车彩绘矩形母版设计 / ${part}\n输出为印刷到车身上的平面装饰图案（贴花设计稿）本身，纯二维平面图形作品，不是汽车照片、不是三维渲染效果图、不是车身实拍。严禁绘制任何实体车辆元素（整车、车身轮廓、车窗、车灯、轮毂、反光镜、门缝、车标、车牌等），不得出现“车中套车”、多辆车重叠或重复镜像的嵌套构图。画面内不存在车，只有铺满整幅矩形画布的图形、底色与装饰。\n车型类别: ${project.vehicle}\n任务类型: ${project.entry==='restore'?'已有车身效果图提取、透视修正与缺失补绘；不要擅自重新设计':project.entry==='poster'?'参考海报视觉语言重新创作；不是拉伸或复制原图':project.entry==='original'?'原创设计':project.entry==='mixed'?'保留指定主角，原创辅助元素':'指定主角设计'}\n设计代理画布: ${p.width} × ${p.height} px，RGB。\n正式母版: ${PHYSICAL_SPECS[part].widthCm} × ${PHYSICAL_SPECS[part].heightCm} cm；生产目标 ${TARGET_DPI} DPI，${targetPixels(part).width} × ${targetPixels(part).height} px。不要把低分辨率图仅更改 DPI 后宣称为生产文件。\n规范化设计配置（实际生效值，含来源）：\n${JSON.stringify(designBrief(project),null,2)}\n${note?`用户文字设计需求（最高创意优先级，高于上述配置与建议；与安全区、尺寸约束冲突时以安全区为准）：\n${note}\n`:''}优先级：Step 3安全约束 > 用户文字设计需求 > Step 2明确选择 > 海报分析建议 > 默认值。D5其他部位策略控制主题衍生方式，Step 2的具体部位策略控制内容。普通文字及Logo不得镜像反向。\n已选优秀案例（仅作为风格与质量反馈，优先级低于明确参数和安全区；参考图像随结构化任务传递）：\n${JSON.stringify(selectedCaseSummary(project,part).map(({image,...meta})=>meta),null,2)}\n整张矩形母版必须由背景、底色或纹理连续铺满至四边，不留透明区域或因安全区产生的空白。安全区不是裁切范围，不限制背景、纹理和辅助装饰；即使选择局部彩绘或留白，也须保留覆盖整幅的底色或背景。
关键内容安全区: X ${s.x}–${s.x+s.width}%, Y ${s.y}–${s.y+s.height}%。仅将人脸、关键人物细节、重要文字和 Logo 等重要元素控制在安全区内，避免落在边缘裁切或潜在遮挡位置；允许背景与非关键装饰延伸到安全区外。安全区是通用构图预设，并非真实车型刀模，最终须人工核对。\n需独立编辑的元素分别输出：人物、完整背景、主图形、文字、Logo、光效、辅助装饰、底色。底色与背景纹理分开；每个主要人物独立，V1 不要求进一步拆头部或武器。背景应补全被遮挡区域。普通文字由网页添加，不要烧录到背景中。禁止裁切人脸。保险杠不放人脸和重要文字，车顶以背景延续为主。\n所有 ${PARTS.length} 个部位保持统一视觉语言；本任务只处理 ${part}。`;
}
