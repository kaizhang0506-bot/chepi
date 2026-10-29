import {LLMClient,Config,HeaderUtils} from 'coze-coding-dev-sdk';
import {originOk} from '../lib/request-guard';

class Fault extends Error{constructor(public status:number,message:string){super(message);}}
const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}});
const hits=new Map<string,{count:number;expires:number}>();
function limit(key:string,max:number){const t=Date.now();const row=hits.get(key);if(!row||row.expires<t){hits.set(key,{count:1,expires:t+15*60*1000});return;}row.count++;if(row.count>max)throw new Fault(429,'请求过于频繁，请 15 分钟后再试。');}
const SUGGESTED_TAGS=['二次元','赛车','JDM','机甲','极简','赛博','暗黑','蓝白配色','红黑配色','人物主体','速度线','大面积留白'];

function clientFor(request:Request){return new LLMClient(new Config(),HeaderUtils.extractForwardHeaders(request.headers));}
function extractJson(text:string):Record<string,unknown>{
 const start=text.indexOf('{'),end=text.lastIndexOf('}');
 if(start<0||end<=start)throw new Fault(502,'模型未返回有效的 JSON 结果，请重试。');
 try{const parsed=JSON.parse(text.slice(start,end+1)) as unknown;if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('not object');return parsed as Record<string,unknown>;}
 catch{throw new Fault(502,'模型返回的 JSON 无法解析，请重试。');}
}
async function invoke(request:Request,messages:unknown[],model:string,timeoutMs=120000):Promise<Record<string,unknown>>{
 const task=clientFor(request).invoke(messages as never,{model,temperature:0.3});
 const content=(await Promise.race([task,new Promise<never>((_,reject)=>setTimeout(()=>reject(new Fault(504,'模型响应超时，请重试。')),timeoutMs))])).content;
 return extractJson(String(content||''));
}
const IMAGE_LIMITS={analyze:12*1024*1024,separate:8*1024*1024,tag:8*1024*1024} as const;
function dataUri(raw:unknown,kind:keyof typeof IMAGE_LIMITS):string{
 if(typeof raw!=='string'||!/^data:image\/(png|jpeg|webp);base64,/.test(raw))throw new Fault(400,'图片格式无效，请使用 PNG / JPG / WebP。');
 if(raw.length>IMAGE_LIMITS[kind])throw new Fault(413,'图片过大，请压缩后重试。');
 return raw;
}
const asImage=(uri:string)=>({type:'image_url',image_url:{url:uri,detail:'high'}});

export async function analysisApi(request:Request):Promise<Response>{
 try{
  const url=new URL(request.url),path=url.pathname;
  if(!originOk(request,url))return json({error:'请求来源无效'},403);
  if(request.method!=='POST')return json({error:'方法不支持'},405);
  if(!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'请求类型无效'},415);
  const ip=request.headers.get('x-forwarded-for')||'local';
  const body=await request.json().catch(()=>null) as Record<string,unknown>|null;
  if(!body)return json({error:'请求体无效'},400);

  if(path==='/api/analyze'){
   limit(`analyze:${ip}`,20);
   const image=dataUri(body.image,'analyze');
   const options=body.options as Record<string,[string,string][]>|undefined;
   const optionLines=options?Object.entries(options).map(([key,sets])=>`${key}: ${sets.map(([v,label])=>`${v}(${label})`).join('、')}`).join('\n'):'';
   const configNote=typeof body.config==='string'?body.config:'';
   const result=await invoke(request,[
    {role:'system',content:'你是资深汽车彩绘（车衣改色膜）艺术总监。分析用户提供的参考图，严格输出一个 JSON 对象，不要输出任何其他文字或代码围栏。'},
    {role:'user',content:[
     {type:'text',text:`分析这张参考图，输出 JSON，字段如下（全部中文）：\nstyle: 美术风格一句话（≤60字）\nmood: 情绪氛围（≤40字）\npalette: 主色数组，3-8 个 #RRGGBB\nsubject_type: 主体类型描述（≤40字）\nsubject_position: 主体位置与构图描述（≤60字）\nvisual_flow: 视觉动线描述（≤60字）\nbackground_elements: 背景元素描述（≤80字）\ntypography: 字体与排版气质（≤60字）\ndensity: 信息密度评价（≤30字）\nadaptation_notes: 适配汽车曲面/分块的建议与风险（≤120字）\nsuggestions: 设计参数推荐对象，键值只能取下面给出的候选值，不确定的键不要输出\n${optionLines?`候选值（key: value(中文含义)）：\n${optionLines}`:''}\n${configNote?`用户当前已选：${configNote}`:''}\n只输出 JSON。`},
     asImage(image)]},
   ],'doubao-seed-2-0-pro-260215');
   const out=sanitizeSuggestions(result,options);
   return json(out);
  }

  if(path==='/api/separate'){
   limit(`separate:${ip}`,20);
   const image=dataUri(body.image,'separate');
   const width=body.width,height=body.height;
   if(![width,height].every(v=>typeof v==='number'&&Number.isInteger(v)&&v>=1&&v<=4096))return json({error:'画布尺寸无效'},400);
   const hints=Array.isArray(body.regionNames)?body.regionNames.filter((v:unknown):v is string=>typeof v==='string'&&v.trim().length>0).slice(0,8):[];
   const result=await invoke(request,[
    {role:'system',content:'你是平面设计的图层拆解专家。观察图片，把画面内容拆成若干矩形内容区（不含整幅背景底图），严格输出 JSON，不要输出任何其他文字。'},
    {role:'user',content:[
     {type:'text',text:`这张图 ${width}×${height}px。输出 JSON：{"layers":[{"name":"图层名(≤16字)","description":"内容一句话(≤40字)","bbox":[x0,y0,x1,y1]}]}。\n要求：\n- 3 到 8 层；按视觉从主到次排序（如：主标题文字、人物主体、装饰图形、Logo、色带）\n- bbox 为 0-1 归一化坐标 [x0,y0,x1,y1]，指向该元素的紧致矩形，元素边缘可略放宽（外扩约 1-2%）\n- 不要输出覆盖整张图的层；不要虚构图中不存在的元素${hints.length?`\n- 用户已用画笔标注了这些区域名称，优先按这些语义拆层：${hints.join('、')}`:''}\n只输出 JSON。`},
     asImage(image)]},
   ],'doubao-seed-2-0-pro-260215');
   const raw=result.layers;
   if(!Array.isArray(raw))throw new Fault(502,'模型未返回图层列表，请重试。');
   const layers=raw.slice(0,8).map((item,index)=>{
    const l=item as Record<string,unknown>;
    const bbox=Array.isArray(l.bbox)&&l.bbox.length===4&&l.bbox.every(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1)?(l.bbox as number[]):null;
    if(!bbox||typeof l.name!=='string'||!l.name.trim())return null;
    const [x0,y0,x1,y1]=bbox;if(x1-x0<0.01||y1-y0<0.01)return null;
    return {name:l.name.trim().slice(0,16)||`区域 ${index+1}`,description:typeof l.description==='string'?l.description.slice(0,60):'',bbox:[Math.min(x0,x1),Math.min(y0,y1),Math.max(x0,x1),Math.max(y0,y1)]};
   }).filter(Boolean).slice(0,8);
   if(!layers.length)throw new Fault(502,'模型未识别出可拆分的元素，请换一张图或改用画笔手动提取。');
   return json({layers});
  }

  if(path==='/api/tag-case'){
   limit(`tag:${ip}`,60);
   const image=dataUri(body.image,'tag');
   const result=await invoke(request,[
    {role:'system',content:'你是汽车彩绘案例库的管理员，为案例图打标签。严格输出 JSON，不要输出任何其他文字。'},
    {role:'user',content:[
     {type:'text',text:`看这张图，输出 JSON：{"tags":["标签"]}。要求：\n- 4 到 8 个标签，每个 ≤12 字\n- 优先从候选标签中选择：${SUGGESTED_TAGS.join('、')}\n- 允许新增更贴切的标签（风格流派、配色、主体、构图特征、适用场景）\n- 不要出现"汽车"、"车贴"这类对所有案例都成立的泛词\n只输出 JSON。`},
     asImage(image)]},
   ],'doubao-seed-2-0-lite-260215');
   const tags=Array.isArray(result.tags)?result.tags.filter((t):t is string=>typeof t==='string'&&t.trim().length>0&&t.length<=12).map(t=>t.trim()).slice(0,8):[];
   if(!tags.length)throw new Fault(502,'模型未识别出有效标签，请手动添加。');
   return json({tags:[...new Set(tags)]});
  }

  return json({error:'接口不存在'},404);
 }catch(err){
  if(err instanceof Fault)return json({error:err.message},err.status);
  const message=err instanceof Error?err.message:'';
  if(/API key is required|COZE_API_TOKEN|api.?key/i.test(message))return json({error:'当前环境尚未连接图片分析服务。你可以先手动设置参数，或在扣子环境接入分析服务后重试。'},503);
  return json({error:message?`AI 服务调用失败：${message}`:'AI 服务暂不可用，请稍后重试。'},500);
 }
}

function sanitizeSuggestions(result:Record<string,unknown>,options?:Record<string,[string,string][]>){
 const out={...result};
 const raw=out.suggestions;
 if(raw&&typeof raw==='object'&&!Array.isArray(raw)&&options){
  const clean:Record<string,unknown>={};
  for(const [key,value] of Object.entries(raw as Record<string,unknown>)){
   const sets=options[key];
   if(!sets)continue;
   if(Array.isArray(value)){const ok=value.filter(v=>sets.some(([v2])=>v2===v));if(ok.length)clean[key]=ok;}
   else if(typeof value==='string'&&sets.some(([v2])=>v2===value))clean[key]=value;
  }
  out.suggestions=clean;
 }
 return out;
}
