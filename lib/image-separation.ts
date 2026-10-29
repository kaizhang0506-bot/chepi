import {canvas,imageFor} from './render';
import {makeLayer,type Part,type Layer} from './model';
export interface BrushStroke {erase:boolean;size:number;points:{x:number;y:number}[];}
export interface SeparationRegion {id:string;name:string;color:string;strokes:BrushStroke[];}
export interface SeparationInput {version:1;source:string;name:string;width:number;height:number;regions:SeparationRegion[];}
export interface SeparationResult {part:Part;method:'manual'|'imported'|'ai'|'local';backgroundFilled:boolean;warnings?:string[];}
export const REGION_COLORS=['#ff5370','#23bac4','#9469ef','#e59b24','#4cac6a','#ed68b3'];
export function outputSize(width:number,height:number,scale:number):{width:number;height:number}{
 const w=Math.round(width*scale),h=Math.round(height*scale);
 if(!Number.isFinite(scale)||scale<=0||w<1||h<1||w>8192||h>8192||w*h>16000000)throw new Error('输出边长最多 8192 像素，总像素最多 1600 万；请降低倍率或尺寸。');
 return {width:w,height:h};
}
export function maskCanvas(input:SeparationInput,region:SeparationRegion):HTMLCanvasElement{
 const c=canvas(input.width,input.height),ctx=c.getContext('2d')!;
 for(const stroke of region.strokes){ctx.globalCompositeOperation=stroke.erase?'destination-out':'source-over';ctx.fillStyle='#ffffff';ctx.strokeStyle='#ffffff';ctx.lineWidth=stroke.size*Math.min(input.width,input.height);ctx.lineCap='round';ctx.lineJoin='round';const first=stroke.points[0];if(!first)continue;ctx.beginPath();ctx.arc(first.x*input.width,first.y*input.height,ctx.lineWidth/2,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(first.x*input.width,first.y*input.height);for(const p of stroke.points.slice(1))ctx.lineTo(p.x*input.width,p.y*input.height);ctx.stroke();}
 return c;
}
// Each visible source pixel has exactly one owner. Later regions win overlaps.
export function assignPixels(source:Uint8ClampedArray,masks:Uint8ClampedArray[]):Uint8ClampedArray[]{
 const layers=Array.from({length:masks.length+1},()=>new Uint8ClampedArray(source.length));
 for(let i=0;i<source.length;i+=4){let owner=0;for(let j=masks.length-1;j>=0;j--)if(masks[j][i+3]>=128){owner=j+1;break;}layers[owner].set(source.subarray(i,i+4),i);}
 return layers;
}
export async function cutByMasks(input:SeparationInput):Promise<SeparationResult>{
 if(!input.regions.length||!input.regions.some(r=>r.strokes.some(s=>!s.erase)))throw new Error('请先用画笔涂满要提取的区域。这里只按实际涂抹范围提取，不会自动寻找轮廓。');
 const original=canvas(input.width,input.height),ctx=original.getContext('2d')!;ctx.drawImage(await imageFor(input.source),0,0,input.width,input.height);
 const pixels=assignPixels(ctx.getImageData(0,0,input.width,input.height).data,input.regions.map(r=>maskCanvas(input,r).getContext('2d')!.getImageData(0,0,input.width,input.height).data));
 const layers=pixels.map((data,i)=>{if(i>0&&!data.some((v,k)=>k%4===3&&v>0))throw new Error(`「${input.regions[i-1].name}」没有可提取像素，可能被后面的区域覆盖；请补画或删除空区域。`);const c=canvas(input.width,input.height),cx=c.getContext('2d')!,im=cx.createImageData(input.width,input.height);im.data.set(data);cx.putImageData(im,0,0);return makeLayer('image',{name:i?input.regions[i-1].name:'剩余背景 · 遮挡处未补绘',src:c.toDataURL(),width:input.width,height:input.height});});
 layers.push(makeLayer('image',{name:'原稿对照',src:input.source,width:input.width,height:input.height,visible:false,locked:true}));
 return {method:'manual',backgroundFilled:false,part:{width:input.width,height:input.height,safe:{x:0,y:0,width:100,height:100},layers}};
}
const CONTOUR_TOLERANCES=[40,70,110];
function boundaryPalette(data:Uint8ClampedArray,w:number,h:number):number[][]{
 const counts=new Map<number,number>();
 const add=(p:number)=>{const i=p*4,k=((data[i]>>5)<<10)|((data[i+1]>>5)<<5)|(data[i+2]>>5);counts.set(k,(counts.get(k)||0)+1);};
 for(let x=0;x<w;x++){add(x);add((h-1)*w+x);}
 for(let y=0;y<h;y++){add(y*w);add(y*w+w-1);}
 return [...counts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k])=>[((k>>10)&31)<<5,((k>>5)&31)<<5,(k&31)<<5]);
}
function contourPass(data:Uint8ClampedArray,w:number,h:number,tol:number):number{
 const pal=boundaryPalette(data,w,h),n=w*h;
 const cand=new Uint8Array(n),keep=new Uint8Array(n),queue=new Int32Array(n);
 for(let p=0;p<n;p++){const i=p*4,r=data[i],g=data[i+1],b=data[i+2];for(const c of pal){const dr=r-c[0],dg=g-c[1],db=b-c[2];if(dr*dr+dg*dg+db*db<=tol*tol){cand[p]=1;break;}}}
 let tail=0;
 const mark=(p:number)=>{if(cand[p]&&!keep[p]){keep[p]=1;queue[tail++]=p;}};
 for(let x=0;x<w;x++){mark(x);mark((h-1)*w+x);}
 for(let y=0;y<h;y++){mark(y*w);mark(y*w+w-1);}
 let head=0;
 while(head<tail){const p=queue[head++],px=p%w;
  if(px>0)mark(p-1);if(px<w-1)mark(p+1);if(p>=w)mark(p-w);if(p+w<n)mark(p+w);}
 let fg=0;
 for(let p=0;p<n;p++)if(keep[p]){const i=p*4;data[i]=data[i+1]=data[i+2]=0;data[i+3]=0;}else fg++;
 return fg/n;
}
// Removes the bbox-local background that is colorimetrically connected to the
// crop border, so layers come out as content silhouettes instead of solid rectangles.
export function contourize(data:Uint8ClampedArray,w:number,h:number):number{
 const clean=new Uint8ClampedArray(data);
 const passes=CONTOUR_TOLERANCES.map(tol=>{const work=new Uint8ClampedArray(clean);return {work,ratio:contourPass(work,w,h,tol)};});
 const usable=passes.filter(p=>p.ratio>=0.1&&p.ratio<=0.85).sort((a,b)=>a.ratio-b.ratio);
 const chosen=usable[0]||passes[1];
 data.set(chosen.work);
 return chosen.ratio;
}
export async function requestAutomaticSeparation(input:SeparationInput,useBrush:boolean):Promise<SeparationResult>{
 const local=await fetch('/api/local-segment',{method:'POST',headers:{'content-type':'application/json'},signal:AbortSignal.timeout(250000),body:JSON.stringify({image:input.source})});
 if(local.status!==404){
  const data=await local.json() as {width?:number;height?:number;background?:string;layers?:{name:string;src:string;x:number;y:number;width:number;height:number}[];warnings?:string[];error?:string};
  if(!local.ok||!data.background||!data.layers?.length||data.width!==input.width||data.height!==input.height)throw new Error(data.error||'本地分层结果无效，请重试。');
  const layers=[makeLayer('image',{name:'背景 · 本地补绘待检查',src:data.background,width:input.width,height:input.height}),...data.layers.map(l=>makeLayer('image',l)),makeLayer('image',{name:'原稿对照',src:input.source,width:input.width,height:input.height,visible:false,locked:true})];
  return {part:{width:input.width,height:input.height,safe:{x:0,y:0,width:100,height:100},layers},method:'local',backgroundFilled:true,warnings:data.warnings};
 }
 const response=await fetch('/api/separate',{method:'POST',headers:{'content-type':'application/json'},signal:AbortSignal.timeout(150000),body:JSON.stringify({image:input.source,width:input.width,height:input.height,regionNames:useBrush?input.regions.map(r=>r.name):[]})});
 const plan=await response.json() as {layers?:{name:string;description?:string;bbox:[number,number,number,number]}[];error?:string};
 if(!response.ok)throw new Error(plan.error||`自动分层失败（HTTP ${response.status}）`);
 const regions=plan.layers||[];
 if(!regions.length)throw new Error('AI 未识别出可拆分的元素，请换一张图或改用画笔手动提取。');
 const original=canvas(input.width,input.height),ctx=original.getContext('2d')!;ctx.drawImage(await imageFor(input.source),0,0,input.width,input.height);
 const warnings:string[]=[];
 const layers=[makeLayer('image',{name:'背景 · 遮挡区域待补绘',src:input.source,width:input.width,height:input.height})];
 for(const region of regions){
  const x=Math.round(region.bbox[0]*input.width),y=Math.round(region.bbox[1]*input.height);
  const w=Math.max(1,Math.round((region.bbox[2]-region.bbox[0])*input.width)),h=Math.max(1,Math.round((region.bbox[3]-region.bbox[1])*input.height));
  const piece=canvas(w,h),pieceCtx=piece.getContext('2d')!;pieceCtx.drawImage(original,x,y,w,h,0,0,w,h);
  const crop=pieceCtx.getImageData(0,0,w,h);
  const ratio=contourize(crop.data,w,h);
  if(ratio<0.03||ratio>0.95){warnings.push(`「${region.name}」未能可靠识别透明轮廓，已跳过。请用画笔提取或导入透明素材。`);continue;}
  pieceCtx.putImageData(crop,0,0);
  layers.push(makeLayer('image',{name:region.name,src:piece.toDataURL('image/png'),x,y,width:w,height:h}));
 }
 if(layers.length===1)throw new Error('元素分析已完成，但未能抠出可靠轮廓。请使用画笔提取或导入透明 PNG；不会将矩形裁切冒充轮廓分层。');
 // Remove only extracted pixels; without inpainting the holes remain visible, not duplicated.
 ctx.globalCompositeOperation='destination-out';
 for(const l of layers.slice(1))ctx.drawImage(await imageFor(l.src!),l.x,l.y,l.width,l.height);
 layers[0].src=original.toDataURL('image/png');
 layers.push(makeLayer('image',{name:'原稿对照',src:input.source,width:input.width,height:input.height,visible:false,locked:true}));
 return {warnings,method:'ai',backgroundFilled:false,part:{width:input.width,height:input.height,safe:{x:0,y:0,width:100,height:100},layers}};
}
export async function blendInpaintBackground(result:SeparationResult,inpaintUrl:string):Promise<boolean>{
 const {width,height}=result.part;
 const fg=result.part.layers.filter((l,i)=>i>0&&l.visible);
 if(!fg.length)return false;
 const originalLayer=result.part.layers.find(l=>l.locked&&l.name==='原稿对照');
 const orig=await imageFor(originalLayer?.src||result.part.layers[0].src!),inp=await imageFor(inpaintUrl);
 const mask=canvas(width,height),mctx=mask.getContext('2d')!;
 for(const l of fg)mctx.drawImage(await imageFor(l.src!),l.x,l.y,l.width,l.height);
 const cut=canvas(width,height),cctx=cut.getContext('2d')!;
 cctx.drawImage(inp,0,0,width,height);
 cctx.globalCompositeOperation='destination-in';
 cctx.filter='blur(3px)';
 cctx.drawImage(mask,0,0);
 const out=canvas(width,height),octx=out.getContext('2d')!;
 octx.drawImage(orig,0,0,width,height);
 octx.drawImage(cut,0,0);
 result.part.layers[0].src=out.toDataURL('image/png');
 result.part.layers[0].name='AI 底图 · 背景补绘';
 result.backgroundFilled=true;
 return true;
}
export async function urlToDataUrl(url:string):Promise<string>{
 const res=await fetch(url,{signal:AbortSignal.timeout(30000)});
 if(!res.ok)throw new Error(`图片读取失败（HTTP ${res.status}）`);
 const blob=await res.blob();
 return await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=()=>reject(new Error('图片读取失败'));r.onabort=()=>reject(new Error('图片读取已取消'));r.readAsDataURL(blob);});
}
export async function uploadLayer(dataUrl:string):Promise<string>{
 const res=await fetch('/api/upload-layer',{method:'POST',headers:{'content-type':'application/json'},signal:AbortSignal.timeout(60000),body:JSON.stringify({dataURL:dataUrl})});
 const out=await res.json().catch(()=>null) as {url?:string;error?:string}|null;
 if(!res.ok||!out?.url)throw new Error(out?.error||`图层保存失败（HTTP ${res.status}）`);
 return out.url;
}
export interface SplitResult{layers:Layer[];warnings:string[];}
// 把一张平铺生成稿自动拆分为「背景 + 前景元素」图层，背景经补绘、整体结果上传为远端地址，供编辑器直接落位调整。
export async function splitFlatImage(src:string,width:number,height:number,label:string):Promise<SplitResult>{
 const source=src.startsWith('data:')?src:await urlToDataUrl(src);
 const input:SeparationInput={version:1,name:label,source,width,height,regions:[]};
 const separated=await requestAutomaticSeparation(input,false);
 try{if(!separated.backgroundFilled){
  const fg=separated.part.layers.filter((l,i)=>i>0&&!l.locked).map(l=>l.name);
  const res=await fetch('/api/inpaint',{method:'POST',headers:{'content-type':'application/json'},signal:AbortSignal.timeout(300000),body:JSON.stringify({source,width,height,elements:fg})});
  const data=await res.json().catch(()=>null) as {url?:string;error?:string}|null;
  if(!res.ok||!data?.url)throw new Error(data?.error||`背景补绘失败（HTTP ${res.status}）`);
  await blendInpaintBackground(separated,data.url);}
 }catch(err){
  separated.warnings=[...(separated.warnings||[]),`背景补绘未完成：${err instanceof Error?err.message:String(err)}。背景层将保留透明遮挡区域，可在「分层工具」中补绘。`];
 }
 const layers:Layer[]=[];
 for(const l of separated.part.layers){
  if(l.name==='原稿对照'&&l.locked&&separated.method!=='local')continue;
  const layer:Layer={...l};
  if(separated.method!=='local'&&layer.src&&layer.src.startsWith('data:'))layer.src=await uploadLayer(layer.src);
  if(layers.length===0)layer.locked=true;
  layers.push(layer);
 }
 return {layers,warnings:separated.warnings||[]};
}
export async function readSeparationImage(file:File):Promise<{src:string;width:number;height:number}>{
 if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>20*1024*1024)throw new Error('请选择 20 MB 以内的 PNG、JPG 或 WebP 图片。');
 const src=await new Promise<string>((resolve,reject)=>{const r=new FileReader(),timer=setTimeout(()=>{r.abort();reject(new Error('读取图片超时'));},15000);r.onload=()=>{clearTimeout(timer);resolve(String(r.result));};r.onerror=r.onabort=()=>{clearTimeout(timer);reject(new Error('图片读取失败'));};r.readAsDataURL(file);});
 const im=await imageFor(src);if(im.width*im.height>4000000||im.width>4096||im.height>4096)throw new Error('当前分层画布支持边长不超过 4096、总像素不超过 400 万的图片，请先缩小后上传。');
 return {src,width:im.width,height:im.height};
}
export function validateSeparationInput(raw:unknown):SeparationInput{
 const v=raw as SeparationInput;
 if(!v||v.version!==1||typeof v.name!=='string'||v.name.length>200||!/^data:image\/(png|jpeg|webp);base64,/.test(v.source)||!Number.isInteger(v.width)||!Number.isInteger(v.height)||v.width<1||v.height<1||v.width>4096||v.height>4096||v.width*v.height>4000000||!Array.isArray(v.regions)||v.regions.length>8)throw new Error('不是有效的分层标记文件');
 const ids=new Set<string>();for(const r of v.regions){if(!r||typeof r.id!=='string'||ids.has(r.id)||typeof r.name!=='string'||r.name.length>80||!/^#[0-9a-f]{6}$/i.test(r.color)||!Array.isArray(r.strokes)||r.strokes.length>500)throw new Error('区域配置无效');ids.add(r.id);for(const s of r.strokes)if(typeof s.erase!=='boolean'||!Number.isFinite(s.size)||s.size<.001||s.size>1||!Array.isArray(s.points)||s.points.length>20000||s.points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.x>1||p.y<0||p.y>1))throw new Error('画笔数据无效');}
 return v;
}
