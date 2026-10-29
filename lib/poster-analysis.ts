import type {AnalysisResult,PosterConfig} from './design-config';
import {OPTIONS} from './design-config';
export interface PosterAnalysisRequest {asset_id:string;image:string;config:PosterConfig;}
export interface PosterAnalysisProvider {analyze(request:PosterAnalysisRequest):Promise<AnalysisResult>;}
const CONFIG_KEYS=[['source_type','素材类型'],['reference_strength','参考强度'],['character_strategy','人物策略'],['wrap_adaptation','适配强度'],['left_right','左右侧策略'],['other_panels','其他部位策略'],['retain_elements','保留要素'],['custom_instructions','补充说明']] as const;
export const posterAnalysisProvider:PosterAnalysisProvider={async analyze(request){
 const response=await fetch('/api/analyze',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
  image:request.image,
  options:OPTIONS as unknown as Record<string,[string,string][]>,
  config:CONFIG_KEYS.map(([key,label])=>{
   const value=(request.config as unknown as Record<string,unknown>)[key];
   return value===undefined||value===''||(Array.isArray(value)&&!value.length)?null:`${label}: ${Array.isArray(value)?value.join('、'):value}`;
  }).filter(Boolean).join('；'),
 })});
 const result=await response.json() as AnalysisResult&{error?:string};
 if(!response.ok)throw new Error(result.error||`分析失败（HTTP ${response.status}）`);
 return result;
}};
