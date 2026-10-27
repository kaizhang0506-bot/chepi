import {PARTS,type Project,type Part} from './model';
import {configErrors} from './design-config';
export type ConfigStage='poster'|'parameters'|'review';
export function configurationTarget(project:Project,requested?:ConfigStage):{stage:ConfigStage;errors:string[]}{
 const first=project.entry==='poster'?'poster':'parameters';
 if(requested!=='review')return {stage:requested==='poster'?first:requested||first,errors:[]};
 const errors=configErrors(project,'design');return {stage:errors.length?first:'review',errors};
}
export function reorderBlock(part:Part,id:string,direction:number):string|null{
 const index=part.layers.findIndex(l=>l.id===id);
 if(index<0)return '请先选择一个图层';
 if(index+direction>=part.layers.length)return '已经是最上层';
 if(index+direction<0)return '已经是最下层';
 return null;
}
export function emptyParts(project:Project){return PARTS.filter(n=>project.parts[n].layers.length===0);}
export function openFilePicker(input:Pick<HTMLInputElement,'click'>|null,notify:(message:string)=>void,message:string):void{
 try{if(!input)throw new Error('文件选择器尚未准备好，请重新打开此步骤');notify(message);input.click();}
 catch(error){notify(`无法打开文件选择：${error instanceof Error?error.message:'请检查浏览器权限后重试'}`);}
}
export async function withTimeout<T>(operation:Promise<T>,ms:number,message:string):Promise<T>{
 let timer:ReturnType<typeof setTimeout>|undefined;
 try{return await Promise.race([operation,new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error(message)),ms);})]);}
 finally{clearTimeout(timer);}
}
