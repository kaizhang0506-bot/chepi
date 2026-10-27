import {systemSettings} from './system-settings';
import {PARTS,type CaseReference,type PartName,type Project} from './model';
import {renderPart} from './render';

export interface SavedCase extends CaseReference { createdAt:number; }

function openCases():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const r=indexedDB.open('yucai-wrap-cases',1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('cases'))r.result.createObjectStore('cases',{keyPath:'id'});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error||new Error('案例库无法打开'));r.onblocked=()=>reject(new Error('案例库正被其他页面占用'));});}
export async function listCases():Promise<SavedCase[]>{const db=await openCases();try{return await new Promise((resolve,reject)=>{const r=db.transaction('cases','readonly').objectStore('cases').getAll();r.onsuccess=()=>resolve((r.result as SavedCase[]).sort((a,b)=>b.createdAt-a.createdAt));r.onerror=()=>reject(r.error||new Error('读取案例失败'));});}finally{db.close();}}
export async function saveCase(c:SavedCase):Promise<void>{const db=await openCases();try{await new Promise<void>((resolve,reject)=>{const t=db.transaction('cases','readwrite');t.objectStore('cases').put(c);t.oncomplete=()=>resolve();t.onerror=t.onabort=()=>reject(t.error||new Error('保存案例失败，本机空间可能不足'));});}finally{db.close();}}
export async function deleteCase(id:string):Promise<void>{const db=await openCases();try{await new Promise<void>((resolve,reject)=>{const t=db.transaction('cases','readwrite');t.objectStore('cases').delete(id);t.oncomplete=()=>resolve();t.onerror=t.onabort=()=>reject(t.error||new Error('删除案例失败'));});}finally{db.close();}}
export async function favoriteProject(project:Project,title:string,style:string,feedback:string):Promise<SavedCase>{const panels:Partial<Record<PartName,string>>={};for(const name of PARTS){if(!project.parts[name].layers.some(l=>l.visible))continue;panels[name]=(await renderPart(project.parts[name])).toDataURL('image/png');}if(!Object.keys(panels).length)throw new Error('还没有可收藏的母版，请先完成至少一张。');return {id:crypto.randomUUID(),title,style,feedback,source:'own',panels,createdAt:Date.now()};}
export function caseImage(c:CaseReference,name:PartName):string|undefined{return c.panels?.[name]||c.image||c.panels?.左侧||Object.values(c.panels||{})[0];}
export function selectedCaseSummary(project:Project,name:PartName){return (systemSettings().referencesEnabled?(project.caseReferences||[]):[]).map(c=>({id:c.id,title:c.title,style:c.style,feedback:c.feedback,tags:c.tags||[],source:c.source,image:caseImage(c,name)}));}
