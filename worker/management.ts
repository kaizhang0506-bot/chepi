import {db,mutate,putObject,getObject,deleteObject} from '../lib/server-store';
type User={id:string;role:string};
type Helpers={body:(r:Request,limit?:number)=>Promise<any>;json:(d:unknown,status?:number)=>Response;Fault:new(message:string,status?:number)=>Error;hashPassword:(s:string)=>Promise<string>;nameCheck:(v:unknown)=>string};
export async function managementApi(request:Request,user:User,h:Helpers):Promise<Response|null>{
 const {body,json,Fault,hashPassword,nameCheck}=h,path=new URL(request.url).pathname,method=request.method,isAdmin=user.role==='admin';
 if(path==='/api/account/settings'&&method==='GET'){return json({settings:Object.fromEntries(Object.entries(db().settings).map(([k,v])=>[k,JSON.parse(v)]))});}
 if(path==='/api/account/cases'&&method==='GET'){const data=db();const rows=data.cases.filter(c=>c.user_id===user.id||c.status==='approved'||isAdmin).sort((a,b)=>b.created-a.created).slice(0,200).map(c=>({...c,tags:JSON.parse(String(c.tags)),username:data.users.find(u=>u.id===c.user_id)?.username||''}));return json({items:rows});}
 if(path==='/api/account/cases'&&method==='POST'){
  const data=await body(request,30*1024*1024);const c=data.case;
  if(!c||typeof c.title!=='string'||!c.title.trim()||c.title.length>120||typeof c.style!=='string'||c.style.length>80||!['external','own'].includes(c.source)||!Array.isArray(c.tags)||c.tags.length>20||c.tags.some((t:unknown)=>typeof t!=='string'||t.length>24))throw new Fault('案例名称、风格或标签无效');
  const images=[c.image,...Object.values(c.panels||{})].filter(Boolean);if(!images.length||images.length>8||images.some((s:unknown)=>typeof s!=='string'||!/^data:image\/(png|jpeg|webp);base64,/.test(s)))throw new Fault('案例图片无效');
  const count=db().cases.filter(x=>x.user_id===user.id).length;if(count>=100)throw new Fault('每个账户最多上传 100 个案例');
  const id=crypto.randomUUID(),key=`cases/${user.id}/${id}.json`;await putObject(key,JSON.stringify({...c,id}));try{await mutate(d=>d.cases.push({id,user_id:user.id,title:c.title,style:c.style,tags:JSON.stringify(c.tags),status:isAdmin?'approved':'pending',object_key:key,created:Date.now()}));}catch(e){await deleteObject(key);throw e;}return json({id});
 }
 const match=path.match(/^\/api\/account\/cases\/([a-f0-9-]{36})$/);
 if(match){const row=db().cases.find(x=>x.id===match[1]);if(!row||(!isAdmin&&row.user_id!==user.id&&(row.status!=='approved'||method!=='GET')))throw new Fault('案例不存在或没有权限',404);
  if(method==='GET'){const content=await getObject(row.object_key);if(content===null)throw new Fault('案例文件不存在',404);const c=JSON.parse(content) as Record<string,unknown>;return json({...c,tags:JSON.parse(row.tags),title:row.title});}
  if(method==='PATCH'){const data=await body(request);if(!Array.isArray(data.tags)||data.tags.length>20||data.tags.some((t:unknown)=>typeof t!=='string'||!t.trim()||t.length>24))throw new Fault('标签格式无效');if(data.status!==undefined&&(!isAdmin||!['approved','pending','disabled'].includes(data.status)))throw new Fault('无权修改审核状态',403);await mutate(d=>{const target=d.cases.find(x=>x.id===match[1]);if(target){target.tags=JSON.stringify(data.tags);target.status=data.status??target.status;}});return json({ok:true});}
  if(method==='DELETE'){await mutate(d=>{d.cases=d.cases.filter(x=>x.id!==match[1]);});await deleteObject(row.object_key);return json({ok:true});}
 }
 if(!path.startsWith('/api/account/admin/'))return null;
 if(!isAdmin)throw new Fault('需要管理员权限',403);
 if(path.endsWith('/history')&&method==='GET'){const data=db();return json({items:data.designs.slice().sort((a,b)=>b.created-a.created).slice(0,500).map(x=>({id:x.id,name:x.name,created:x.created,username:data.users.find(u=>u.id===x.user_id)?.username||''}))});}
 if(path.endsWith('/create-user')&&method==='POST'){const data=await body(request),name=nameCheck(data.username);if(name==='测试管理员')throw new Fault('此账号名已保留');const hash=await hashPassword('12345');try{await mutate(d=>{if(d.users.some(x=>x.username===name))throw new Fault('创建失败，账号可能已存在');d.users.push({id:crypto.randomUUID(),username:name,password:hash,role:'user',disabled:0,created:Date.now(),must_change:1});});}catch(e){if(e instanceof Fault)throw e;throw new Fault('创建失败，账号可能已存在');}return json({ok:true});}
 if(path.endsWith('/reset-password')&&method==='POST'){const data=await body(request);const target=db().users.find(x=>x.id===data.id);if(!target||target.role==='admin')throw new Fault('仅可重置普通账户');const hash=await hashPassword('12345');await mutate(d=>{const row=d.users.find(x=>x.id===data.id);if(row){row.password=hash;row.must_change=1;}d.sessions=d.sessions.filter(s=>s.user_id!==data.id);});return json({ok:true});}
 if(path.endsWith('/settings')&&method==='POST'){const data=await body(request);if(typeof data.referencesEnabled!=='boolean'||typeof data.generationGuidance!=='string'||data.generationGuidance.length>2000)throw new Fault('系统设置无效');await mutate(d=>{Object.assign(d.settings,Object.fromEntries(Object.entries({referencesEnabled:data.referencesEnabled,generationGuidance:data.generationGuidance}).map(([k,v])=>[k,JSON.stringify(v)])));});return json({ok:true});}
 return null;
}
