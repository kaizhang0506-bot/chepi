'use client';
import {Sparkles,Layers,Download,Copy,ImagePlus,ArrowRight,LoaderCircle} from 'lucide-react';
import {PARTS,type Project,type PartName} from '@/lib/model';
import {promptFor,type TaskStatus} from '@/lib/generation';
import './design-composer.css';

interface Props {
 project:Project; active:PartName; tasks:Partial<Record<PartName,TaskStatus>>;
 errors:Partial<Record<PartName,string>>; preview?:string; batchRunning:boolean;
 onPart:(part:PartName)=>void; onNote:(text:string)=>void; onGenerate:()=>void;
 onBatch:()=>void; onImport:()=>void; onEdit:()=>void; onCopy:()=>void; onDownload:()=>void;
 autoSplit:boolean; onAutoSplit:(v:boolean)=>void;
}
export default function DesignGeneration(p:Props){
 const state=p.tasks[p.active],running=state==='running',anyRunning=p.batchRunning||Object.values(p.tasks).includes('running');
 const part=p.project.parts[p.active],hasResult=part.layers.length>0;
 return <div className="generation-studio">
  <p className="generation-intro">描述需求 → 生成当前部位 → 检查效果。满意后再继续整套设计。</p>
  <div className="generation-panels" aria-label="选择生成部位">{PARTS.map(n=><button key={n} aria-pressed={n===p.active} onClick={()=>p.onPart(n)}>{n}<small>{p.tasks[n]==='running'?'生成中':p.tasks[n]==='failed'?'需重试':p.project.parts[n].layers.length?'已有设计':'未生成'}</small></button>)}</div>
  <div className="generation-columns">
   <section className="generation-brief"><label htmlFor="generation-description">设计需求 <small>{(p.project.designNote||'').length}/2000</small></label><textarea id="generation-description" rows={8} maxLength={2000} value={p.project.designNote||''} onChange={e=>p.onNote(e.target.value)} placeholder="输入你希望设计的画面、人物、颜色、文字和不希望出现的内容。可以沿用参数，只修改这段描述。"/><p className="hint">修改描述将在下一次生成时生效，正在运行的任务使用提交时的内容。</p>
    {p.project.references.length>0&&<div className="generation-references"><strong>本次参考素材 · {p.project.references.length} 张</strong><div>{p.project.references.map((src,i)=><img key={i} src={src} alt={`参考素材 ${i+1}`}/>)}</div></div>}
    <label className="generation-auto-split"><input type="checkbox" checked={p.autoSplit} disabled={anyRunning} onChange={e=>p.onAutoSplit(e.target.checked)}/>生成后自动拆分为人物 / 背景 / 元素图层<span>（需额外等待分层与补绘，可分别移动位置）</span></label>
    <div className="generation-buttons"><button className="button primary" disabled={anyRunning||!!p.project.review?.panels[p.active]?.locked} onClick={p.onGenerate}>{running?<LoaderCircle className="spin" size={18}/>:<Sparkles size={18}/>} {running?'正在生成，请稍候':state==='failed'?`重试生成${p.active}`:hasResult?`重新生成${p.active}`:`开始生成${p.active}`}</button><button className="button secondary" disabled={anyRunning} onClick={p.onBatch}><Layers size={16}/>生成其余空白部位</button></div>
    {p.project.review?.panels[p.active]?.locked&&<p role="status">当前母版已锁定，请在母版成果中解锁后再生成。</p>}
   </section>
   <section className="generation-result"><header><strong>{p.active} · 设计结果</strong><span>{part.width} × {part.height} px</span></header><div className="generation-image">{hasResult&&p.preview?<img src={p.preview} alt={`${p.active}当前母版结果`}/>:<div><ImagePlus size={38}/><p>生成结果会显示在这里</p></div>}{running&&<div className="generation-loading"><LoaderCircle className="spin" size={28}/><strong>正在生成{p.active}…</strong><span>请保持页面打开。原有设计暂时保留。</span></div>}</div>
    <div className={`generation-status ${state==='failed'?'is-error':''}`} role={state==='failed'?'alert':'status'}>{state==='failed'?`生成失败：${p.errors[p.active]||'请重试'}`:running?'正在请求生图服务，完成后自动显示结果。':state==='completed'?'生成完成。请检查画面后继续编辑或分层。':'可先生成一个部位，确认风格后再继续。'}</div>
    {hasResult&&<button className="button secondary" onClick={p.onEdit}>打开母版继续编辑 <ArrowRight size={16}/></button>}
   </section>
  </div>
  <details className="generation-details"><summary>查看完整生成说明 / 手动导入</summary><textarea aria-label="完整生成说明" className="prompt-text" readOnly value={promptFor(p.project,p.active)}/><div className="separation-actions"><button className="button secondary" onClick={p.onDownload}><Download size={15}/>下载说明</button><button className="button secondary" onClick={p.onCopy}><Copy size={15}/>复制说明</button><button className="button secondary" onClick={p.onImport}><ImagePlus size={15}/>导入已有结果</button></div></details>
 </div>;
}
