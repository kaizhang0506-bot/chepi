import {canvas,imageFor} from './render';
import {makeLayer,type Part} from './model';
export interface BrushStroke {erase:boolean;size:number;points:{x:number;y:number}[];}
export interface SeparationRegion {id:string;name:string;color:string;strokes:BrushStroke[];}
export interface SeparationInput {version:1;source:string;name:string;width:number;height:number;regions:SeparationRegion[];}
export interface SeparationResult {part:Part;method:'manual'|'imported'|'ai';backgroundFilled:boolean;}
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
export async function requestAutomaticSeparation(_input:SeparationInput, _useBrush:boolean):Promise<SeparationResult>{
 throw new Error('自动分层服务尚未接入。可下载分层任务包交给已接入的模型处理，再回填透明图层；也可展开画笔，按涂抹区域直接提取。');
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
