import {validTags} from './case-tags';
import {validReview,type ReviewState} from './master-review';
import {newDesign,newPoster,validDesign,validPoster,migrateDesign,type DesignConfig,type PosterConfig} from './design-config';
import { FIXED_SPECS } from './part-specs';
export const PARTS = ['左侧', '右侧', '机盖', '车顶', '前保险杠', '后保险杠', '后备箱'] as const;
export type PartName = typeof PARTS[number];
export const VEHICLES = ['轿车', 'SUV', 'MPV'] as const;
export type VehicleType = typeof VEHICLES[number];
export type Entry = 'poster' | 'original' | 'character' | 'mixed' | 'restore';
export type LayerKind = 'image' | 'text' | 'background' | 'decoration' | 'base';
export interface Layer { id: string; name: string; kind: LayerKind; x: number; y: number; width: number; height: number; opacity: number; visible: boolean; locked: boolean; src?: string; text?: string; color: string; fontSize: number; patternOnly?: boolean; rotation?: 0|90|180|270; }
export interface SafeArea { x: number; y: number; width: number; height: number; }
export interface Part { width: number; height: number; safe: SafeArea; layers: Layer[]; }
export interface CaseReference { id:string; title:string; style:string; feedback:string; tags?:string[]; source:'external'|'own'; image?:string; panels?:Partial<Record<PartName,string>>; }
export interface Params { theme: string; subject: string; style: string; palette: string; composition: string; complexity: string; fidelity: string; reference: string; wrap: string; count: string; pose: string; relation: string; logo: string; words: string; strategy: Record<PartName, string>; }
export interface Project { review?:ReviewState; caseReferences?:CaseReference[]; version: 1; design: DesignConfig; poster: PosterConfig; vehicle: VehicleType; name: string; entry: Entry; mode: 'quick' | 'pro'; params: Params; references: string[]; parts: Record<PartName, Part>; updated: number; }
export const uid = (): string => crypto.randomUUID();
export const DEFAULT_PARAMS: Params = {theme:'未来都市',subject:'原创赛车手',style:'赛博机能',palette:'青 / 粉 / 黑',composition:'中后靠下',complexity:'平衡',fidelity:'保留特征重绘',reference:'风格与构图',wrap:'标准重构',count:'单人',pose:'自动',relation:'同主题不同构图',logo:'',words:'NIGHT\nDRIVE',strategy: Object.fromEntries(PARTS.map((p: PartName) => [p, p==='车顶' ? '背景延续' : p.includes('保险杠') ? '图形与纹理' : '主体与图形'])) as Record<PartName,string>};
export function makeLayer(kind: LayerKind, props: Partial<Layer> = {}): Layer { return {id:uid(),name:'新图层',kind,x:0,y:0,width:600,height:400,opacity:1,visible:true,locked:false,color:'#ffffff',fontSize:90,...props}; }
export function initialProject(): Project {
 const areas: SafeArea[]=[{x:28,y:42,width:44,height:36},{x:28,y:42,width:44,height:36},{x:25,y:25,width:50,height:47},{x:22,y:22,width:56,height:56},{x:38,y:35,width:24,height:35},{x:38,y:35,width:24,height:35},{x:25,y:30,width:50,height:45}];
 const parts={} as Record<PartName,Part>;
 PARTS.forEach((name: PartName,i: number)=>{parts[name]={...FIXED_SPECS[name],safe:areas[i],layers:[]};});
 return {version:1,design:newDesign(),poster:newPoster(),vehicle:'SUV',name:'午夜疾行 · 车衣设计',entry:'poster',mode:'quick',params:structuredClone(DEFAULT_PARAMS),references:[],parts,updated:Date.now()};
}
export function sampleLayers(part: Part): Layer[] {
 const w=part.width,h=part.height;
 return [makeLayer('base',{name:'底色 · 可独立换色',width:w,height:h,color:'#10151d'}),makeLayer('background',{name:'背景 · 完整独立底纹',width:w,height:h,color:'#10151d',locked:true,patternOnly:true}),makeLayer('decoration',{name:'装饰 · 青粉速度线',width:w,height:h,color:'#24e1df'}),makeLayer('image',{name:'人物 · 原创赛车手',src:'/demo/character.png',x:w*.52,y:h*.02,width:h*.95,height:h*1.08}),makeLayer('text',{name:'标题 · 可编辑文字',text:'NIGHT\nDRIVE',x:w*.06,y:h*.14,width:w*.52,height:h*.6,fontSize:Math.round(Math.min(w*.12,h*.26)),color:'#f7f7f3'}),makeLayer('text',{name:'副标题 · 可编辑文字',text:'AFTER HOURS  /  01',x:w*.07,y:h*.81,width:w*.45,height:h*.08,fontSize:Math.round(h*.033),color:'#24e1df'})];
}
export function validateEntry(project: Project): string | null { return project.entry!=='original' && !project.references.length ? '请先上传参考图片；纯原创模式无需参考图。' : null; }
export function changeDimensions(part: Part,width: number,height: number): Part {
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<256||height<256||width>4096||height>4096||width*height>9000000) throw new Error('画布边长需为 256–4096 像素，且总像素不超过 900 万。');
 const sx=width/part.width,sy=height/part.height;
 return {...part,width,height,layers:part.layers.map((l: Layer)=>({...l,x:l.x*sx,y:l.y*sy,width:l.width*sx,height:l.height*sy,fontSize:l.fontSize*sy}))};
}
export function parseProject(value: unknown): Project {
 if(!value||typeof value!=='object')throw new Error('不是有效项目文件');
 const p={...value} as Project;
 if(p.vehicle===undefined)p.vehicle='SUV';
 if(!VEHICLES.includes(p.vehicle))throw new Error('车型类型无效');
 if(p.version!==1||typeof p.name!=='string'||p.name.length>200||!['poster','original','character','mixed','restore'].includes(p.entry)||!['quick','pro'].includes(p.mode)||!p.parts||!p.params||!Array.isArray(p.references)||p.references.length>8)throw new Error('项目版本或结构无效');
 const validSource=(s: unknown): boolean => typeof s==='string' && (/^data:image\/(png|jpeg|webp);base64,/.test(s)||s==='/demo/character.png');
 if(!p.references.every(validSource))throw new Error('参考图格式不支持');
 if(p.caseReferences!==undefined){if(!Array.isArray(p.caseReferences)||p.caseReferences.length>4)throw new Error('案例参考数量无效');const ids=new Set<string>();for(const c of p.caseReferences){if(!c||typeof c.id!=='string'||c.id.length>100||ids.has(c.id)||typeof c.title!=='string'||c.title.length>120||typeof c.style!=='string'||c.style.length>80||typeof c.feedback!=='string'||c.feedback.length>1000||!['external','own'].includes(c.source)||!((c.image&&validSource(c.image))||(c.panels&&PARTS.some(n=>c.panels?.[n]&&validSource(c.panels[n])))))throw new Error('案例参考格式无效');if(!validTags(c.tags))throw new Error('案例标签格式无效');ids.add(c.id);if(c.panels&&(Object.keys(c.panels).some(n=>!PARTS.includes(n as PartName))||Object.values(c.panels).some(src=>!validSource(src))))throw new Error('案例部位图片格式无效');}}
 for(const key of Object.keys(DEFAULT_PARAMS) as (keyof Params)[]) { if(key==='strategy'){if(!p.params.strategy||!PARTS.every((n:PartName)=>typeof p.params.strategy[n]==='string'))throw new Error('部位策略无效');}else if(typeof p.params[key]!=='string')throw new Error('设计参数无效'); }
 for(const name of PARTS){const part=p.parts[name];if(!part||!Array.isArray(part.layers)||part.layers.length>40)throw new Error('部位或图层数量无效');changeDimensions({...part,layers:[]},part.width,part.height);if(part.width!==FIXED_SPECS[name].width||part.height!==FIXED_SPECS[name].height)throw new Error(`${name} 不符合当前固定规格，请使用同规格项目文件`);const s=part.safe;if(!s||![s.x,s.y,s.width,s.height].every(Number.isFinite)||s.x<0||s.y<0||s.width<1||s.height<1||s.x+s.width>100||s.y+s.height>100)throw new Error('安全区无效');
 const ids=new Set<string>();for(const l of part.layers){if(!l||typeof l.id!=='string'||ids.has(l.id)||!['image','text','background','decoration','base'].includes(l.kind)||typeof l.name!=='string'||!/^#[0-9a-f]{6}$/i.test(l.color)||typeof l.visible!=='boolean'||typeof l.locked!=='boolean'||![l.x,l.y,l.width,l.height,l.fontSize,l.opacity].every(Number.isFinite)||l.width<=0||l.height<=0||l.width>16384||l.height>16384||Math.abs(l.x)>16384||Math.abs(l.y)>16384||l.opacity<0||l.opacity>1||l.fontSize<1||l.fontSize>4096)throw new Error('图层属性无效');ids.add(l.id);if(l.rotation!==undefined&&![0,90,180,270].includes(l.rotation))throw new Error('图片方向无效');if(l.kind==='image'&&!validSource(l.src))throw new Error('图层图片格式不支持');if(l.kind==='text'&&(typeof l.text!=='string'||l.text.length>2000))throw new Error('文字内容无效');}}
 p.design=p.design===undefined?migrateDesign(p.params):validDesign(p.design);
 p.poster=p.poster===undefined?newPoster():validPoster(p.poster);
 if(p.review)p.review=validReview(structuredClone(p.review),p);
 if(p.poster.status==='analyzing')p.poster={...p.poster,status:'failed',error:'上次分析已中断，请重试或手动继续。'};
 return p;
}
export function updateLayer(part: Part,id: string,patch: Partial<Layer>): Part { return {...part,layers:part.layers.map((l:Layer)=>l.id===id?{...l,...patch}:l)}; }
