import {zipSync} from 'fflate';
import {PARTS,type Project,type PartName,type Part} from './model';
import {PHYSICAL_SPECS,TARGET_DPI,targetPixels} from './part-specs';

export interface PsdResult {part:PartName;status:'waiting'|'processing'|'completed'|'failed';blob?:Blob;error?:string;}
export interface PsdSession {source:Project['parts'];items:PsdResult[];running:boolean;}
export function batchStatus(items:PsdResult[]):string{
 if(items.some(i=>i.status==='processing'||i.status==='waiting'))return '处理中';
 const success=items.filter(i=>i.status==='completed').length;
 return !items.length?'尚未生成 PSD':success===items.length?'已完成':success?'部分失败':'全部失败';
}
export function sameMasters(source:Project['parts'],current:Project['parts']):boolean{return PARTS.every(n=>source[n]===current[n]);}
export function layerDescription(part:Part):string{
 const layers=part.layers.filter(l=>l.visible);
 if(!layers.length)return '没有可见内容';
 if(layers.length===1&&layers[0].kind==='image')return '单张图像 · 尚未拆分人物与背景';
 return `${part.layers.length} 个图层 · 请检查分层质量`;
}
export async function convertPsdBatch(project:Project,names:readonly PartName[],onUpdate:(result:PsdResult)=>void):Promise<PsdResult[]>{
 const {encodePsd}=await import('./psd-core');
 const results:PsdResult[]=[];
 for(const part of names){
  onUpdate({part,status:'processing'});
  await new Promise(resolve=>setTimeout(resolve,20));
  let item:PsdResult;
  try{
   if(!project.parts[part].layers.some(l=>l.visible))throw new Error('母版没有可见内容，请先补充素材。');
   const buffer=await encodePsd(project.parts[part],PHYSICAL_SPECS[part]);
   item={part,status:'completed',blob:new Blob([buffer],{type:'image/vnd.adobe.photoshop'})};
  }catch(error){item={part,status:'failed',error:error instanceof Error?error.message:'PSD 转换失败，请重试。'};}
  results.push(item);onUpdate(item);
 }
 return results;
}
export async function packPsdResults(project:Project,items:PsdResult[]):Promise<Blob>{
 const successful=items.filter(i=>i.status==='completed'&&i.blob);
 if(!successful.length)throw new Error('没有成功生成的 PSD，不能下载。');
 const files:Record<string,Uint8Array>={};
 for(const item of successful)files[`${item.part}-设计稿.psd`]=new Uint8Array(await item.blob!.arrayBuffer());
 files['母版规格与转换结果.json']=new TextEncoder().encode(JSON.stringify({notice:'当前为按比例制作的设计稿，不是原尺寸 150 DPI 生产文件。单张图像封装为 PSD 不代表完成素材拆分。',targetDpi:TARGET_DPI,results:items.map(i=>({part:i.part,status:i.status,error:i.error})),parts:successful.map(i=>({name:i.part,...PHYSICAL_SPECS[i.part],productionPixels:targetPixels(i.part),designPixels:{width:project.parts[i.part].width,height:project.parts[i.part].height},layers:layerDescription(project.parts[i.part])}))},null,2));
 return new Blob([zipSync(files,{level:0}).buffer as ArrayBuffer],{type:'application/zip'});
}
