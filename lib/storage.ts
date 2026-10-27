import type { Project } from './model';
function database(): Promise<IDBDatabase> { return new Promise((resolve,reject)=>{
 const r=indexedDB.open('yucai-wrap-studio',1);let settled=false;
 const fail=(error:unknown)=>{if(settled)return;settled=true;clearTimeout(timer);reject(error);};
 const timer=setTimeout(()=>fail(new Error('本地存储打开超时')),8000);
 r.onupgradeneeded=()=>{if(settled){r.transaction?.abort();return;}if(!r.result.objectStoreNames.contains('projects'))r.result.createObjectStore('projects');};
 r.onsuccess=()=>{if(settled){r.result.close();return;}settled=true;clearTimeout(timer);r.result.onversionchange=()=>r.result.close();resolve(r.result);};
 r.onerror=()=>fail(r.error||new Error('本地存储不可用'));
 r.onblocked=()=>fail(new Error('其他页面正在占用本地存储，请关闭旧页面后重试'));
 }); }
export async function saveProject(project: Project): Promise<void> {const db=await database();try{await new Promise<void>((resolve,reject)=>{
 const t=db.transaction('projects','readwrite');t.objectStore('projects').put(project,'current');
 const timer=setTimeout(()=>{try{t.abort();}catch{/* Transaction may already be inactive. */}reject(new Error('本地保存超时'));},8000);
 t.oncomplete=()=>{clearTimeout(timer);resolve();};
 t.onerror=t.onabort=()=>{clearTimeout(timer);reject(t.error||new Error('本地保存未完成'));};
 });}finally{db.close();}}
export async function loadProject(): Promise<unknown> {const db=await database();try{return await new Promise((resolve,reject)=>{const r=db.transaction('projects').objectStore('projects').get('current');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}finally{db.close();}}
