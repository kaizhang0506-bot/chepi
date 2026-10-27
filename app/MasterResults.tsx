'use client';
import useMasterReview from './useMasterReview';

import {useRef} from 'react';
import {Download,ArrowRight,ImagePlus,RotateCcw} from 'lucide-react';
import {PARTS,type Project,type PartName} from '@/lib/model';
import {batchStatus,layerDescription,sameMasters,type PsdSession,type PsdResult} from '@/lib/psd-batch';
import {download} from '@/lib/render';

export default function MasterResults({project,images,session,onSession,onEdit,onImport,onTask,notify,onProject}:{project:Project;images:Partial<Record<PartName,string>>;session:PsdSession|null;onSession:(s:PsdSession)=>void;onEdit:(part?:PartName)=>void;onImport:(part:PartName)=>void;onTask:()=>void;notify:(message:string)=>void;onProject?:(p:Project)=>void}){
 const lock=useRef(false);const review=useMasterReview(project,onProject,notify,images);
 const fresh=session&&sameMasters(session.source,project.parts),items=fresh?session.items:[];
 const running=!!session?.running;
 const ready=PARTS.filter(n=>project.parts[n].layers.some(l=>l.visible));
 const successful=items.filter(i=>i.status==='completed'&&i.blob),failed=items.filter(i=>i.status==='failed');
 async function saveResults(results:PsdResult[],snapshot:Project=project){
  try{const {packPsdResults}=await import('@/lib/psd-batch');download(await packPsdResults(snapshot,results),`${snapshot.name}-${results.filter(i=>i.status==='completed').length}部位PSD设计稿.zip`);notify('成功的 PSD 已交给浏览器下载；项目仍保留，可继续编辑。');}
  catch(error){notify(`下载失败：${error instanceof Error?error.message:'请重试下载'}`);}
 }
 async function convert(retry=false){
  if(!review.gate())return;
  if(lock.current||running){notify('PSD 正在处理中，请稍候。');return;}
  if(ready.length!==PARTS.length){notify(`请先补齐有可见内容的七张母版，还缺：${PARTS.filter(n=>!ready.includes(n)).join('、')}。`);return;}
  const names=retry?failed.map(i=>i.part):[...PARTS];
  if(!names.length){notify('没有失败部位需要重试。');return;}
  lock.current=true;const snapshot=project;
  let next:PsdResult[]=PARTS.map(part=>names.includes(part)?{part,status:'waiting'}:items.find(i=>i.part===part)!);
  onSession({source:snapshot.parts,items:next,running:true});
  try{
   const {convertPsdBatch}=await import('@/lib/psd-batch');
   await convertPsdBatch(snapshot,names,result=>{next=next.map(i=>i.part===result.part?result:i);onSession({source:snapshot.parts,items:next,running:true});});
   onSession({source:snapshot.parts,items:next,running:false});
   if(next.some(i=>i.status==='completed'))await saveResults(next,snapshot);
   else notify('全部 PSD 转换失败。请查看各部位原因，修复后重试；母版仍保留。');
  }catch(error){next=next.map(i=>i.status==='waiting'||i.status==='processing'?{part:i.part,status:'failed',error:error instanceof Error?error.message:'转换服务加载失败'}:i);onSession({source:snapshot.parts,items:next,running:false});notify('PSD 转换未完成，请查看结果并重试。');}
  finally{lock.current=false;}
 }
 return <div className="master-results">
  <header className="master-heading"><span className="eyebrow">RECTANGULAR MASTERS / 7 PANELS</span><h2>母版就绪，选择你的下一步。</h2><p>直接使用当前母版生成 PSD，无需进入编辑器或上车预览，也不会重新调用生图。</p><strong>{ready.length} / 7 张母版已有可见内容</strong></header>
  <div className="master-actions"><button className="button secondary" aria-disabled={running} onClick={()=>{if(!review.gate())return;if(fresh&&successful.length===7)void saveResults(items);else void convert();}}><Download size={18}/>{running?'PSD 处理中…':fresh&&successful.length===7?'下载已生成的 PSD':'生成 PSD 并下载'}</button><button className="button primary" onClick={()=>{if(review.gate())onEdit();}}>下一步：母版编辑 <ArrowRight size={18}/></button></div>
  <p className="hint">默认可继续编辑；直接下载后也能随时返回项目。转换复用现有图层，单张合成图不会自动变成真实分层文件。</p>
  {session&&!fresh&&<p className="config-warning" role="status">母版已修改，旧的 PSD 下载已停用。请按当前母版重新生成。</p>}
  {fresh&&<section className="master-status" aria-live="polite"><strong>{batchStatus(items)}</strong><span>{successful.length} 个已完成 · {failed.length} 个失败</span>{failed.length>0&&!running&&<button className="text-button" onClick={()=>void convert(true)}><RotateCcw size={15}/>仅重试失败部位</button>}{successful.length>0&&!running&&<button className="text-button" onClick={()=>void saveResults(items)}>下载成功文件</button>}</section>}
  {review.toolbar}<div className="master-grid">{PARTS.map(name=>{const part=project.parts[name],result=items.find(i=>i.part===name);return <article className="master-card" key={name}><div className="master-thumb">{images[name]&&part.layers.some(l=>l.visible)?<img src={images[name]} alt={`${name}矩形母版`}/>:<span>等待母版素材</span>}</div><div className="master-card-title"><strong>{name}</strong><small>{part.width} × {part.height} px</small></div><p>{layerDescription(part)}</p>{review.card(name)}{result&&<p className={result.status==='failed'?'config-warning':''}>{({waiting:'等待转换',processing:'正在生成 PSD',completed:'PSD 已完成',failed:'转换失败'})[result.status]}{result.error&&`：${result.error}`}</p>}<div className="master-card-actions"><button className="text-button" onClick={()=>onImport(name)}><ImagePlus size={14}/>导入素材</button><button className="text-button" onClick={()=>onEdit(name)}>编辑</button>{result?.status==='completed'&&result.blob&&<button className="text-button" onClick={()=>{try{download(result.blob!,`${project.name}-${name}-设计稿.psd`);notify(`${name} PSD 已交给浏览器下载。`);}catch{notify('下载失败，请检查浏览器下载权限后重试。');}}}>下载 PSD</button>}</div></article>;})}</div>
  <button className="full-text-button" onClick={onTask}>查看生成说明 / 继续回填素材 <ArrowRight size={14}/></button>
 </div>;
}
