type Env={DB:D1Database;BUCKET:R2Bucket};
type User={id:string;role:string};
type Helpers={body:(r:Request,limit?:number)=>Promise<any>;json:(d:unknown,status?:number)=>Response;Fault:new(message:string,status?:number)=>Error;hashPassword:(s:string)=>Promise<string>;nameCheck:(v:unknown)=>string};
export async function managementApi(request:Request,env:Env,user:User,h:Helpers):Promise<Response|null>{
 const {body,json,Fault}=h,path=new URL(request.url).pathname,method=request.method,isAdmin=user.role==='admin';
 if(path==='/api/account/settings'&&method==='GET'){const rows=await env.DB.prepare('SELECT key,value FROM studio_settings').all<{key:string;value:string}>();return json({settings:Object.fromEntries(rows.results.map(r=>[r.key,JSON.parse(r.value)]))});}
 if(path==='/api/account/cases'&&method==='GET'){const rows=await env.DB.prepare("SELECT c.*,u.username FROM studio_cases c JOIN studio_users u ON u.id=c.user_id WHERE c.user_id=? OR c.status='approved' OR ?=1 ORDER BY c.created DESC LIMIT 200").bind(user.id,isAdmin?1:0).all();return json({items:rows.results.map(r=>({...r,tags:JSON.parse(String(r.tags))}))});}
 if(path==='/api/account/cases'&&method==='POST'){
  const data=await body(request,30*1024*1024);const c=data.case;
  if(!c||typeof c.title!=='string'||!c.title.trim()||c.title.length>120||typeof c.style!=='string'||c.style.length>80||!['external','own'].includes(c.source)||!Array.isArray(c.tags)||c.tags.length>20||c.tags.some((t:unknown)=>typeof t!=='string'||t.length>24))throw new Fault('案例名称、风格或标签无效');
  const images=[c.image,...Object.values(c.panels||{})].filter(Boolean);if(!images.length||images.length>8||images.some(s=>typeof s!=='string'||!/^data:image\/(png|jpeg|webp);base64,/.test(s)))throw new Fault('案例图片无效');
  const count=await env.DB.prepare('SELECT COUNT(*) AS n FROM studio_cases WHERE user_id=?').bind(user.id).first<{n:number}>();if((count?.n||0)>=100)throw new Fault('每个账户最多上传 100 个案例');
  const id=crypto.randomUUID(),key=`cases/${user.id}/${id}.json`;await env.BUCKET.put(key,JSON.stringify({...c,id}));try{await env.DB.prepare('INSERT INTO studio_cases(id,user_id,title,style,tags,status,object_key,created) VALUES (?,?,?,?,?,?,?,?)').bind(id,user.id,c.title,c.style,JSON.stringify(c.tags),isAdmin?'approved':'pending',key,Date.now()).run();}catch(e){await env.BUCKET.delete(key);throw e;}return json({id});
 }
 const match=path.match(/^\/api\/account\/cases\/([a-f0-9-]{36})$/);
 if(match){const row=await env.DB.prepare('SELECT * FROM studio_cases WHERE id=?').bind(match[1]).first<{user_id:string;status:string;object_key:string;tags:string;title:string}>();if(!row||(!isAdmin&&row.user_id!==user.id&&(row.status!=='approved'||method!=='GET')))throw new Fault('案例不存在或没有权限',404);
  if(method==='GET'){const obj=await env.BUCKET.get(row.object_key);if(!obj)throw new Fault('案例文件不存在',404);const c=await obj.json<Record<string,unknown>>();return json({...c,tags:JSON.parse(row.tags),title:row.title});}
  if(method==='PATCH'){const data=await body(request);if(!Array.isArray(data.tags)||data.tags.length>20||data.tags.some((t:unknown)=>typeof t!=='string'||!t.trim()||t.length>24))throw new Fault('标签格式无效');if(data.status!==undefined&&(!isAdmin||!['approved','pending','disabled'].includes(data.status)))throw new Fault('无权修改审核状态',403);await env.DB.prepare('UPDATE studio_cases SET tags=?,status=? WHERE id=?').bind(JSON.stringify(data.tags),data.status??row.status,match[1]).run();return json({ok:true});}
  if(method==='DELETE'){await env.DB.prepare('DELETE FROM studio_cases WHERE id=?').bind(match[1]).run();await env.BUCKET.delete(row.object_key);return json({ok:true});}
 }
 if(!path.startsWith('/api/account/admin/'))return null;
 if(!isAdmin)throw new Fault('需要管理员权限',403);
 if(path.endsWith('/history')&&method==='GET')return json({items:(await env.DB.prepare('SELECT d.id,d.name,d.created,u.username FROM studio_designs d JOIN studio_users u ON u.id=d.user_id ORDER BY d.created DESC LIMIT 500').all()).results});
 if(path.endsWith('/create-user')&&method==='POST'){const data=await body(request),name=h.nameCheck(data.username);if(name==='测试管理员')throw new Fault('此账号名已保留');const hash=await h.hashPassword('12345');try{await env.DB.prepare("INSERT INTO studio_users(id,username,password,role,disabled,created,must_change) VALUES (?,?,?,'user',0,?,1)").bind(crypto.randomUUID(),name,hash,Date.now()).run();}catch{throw new Fault('创建失败，账号可能已存在');}return json({ok:true});}
 if(path.endsWith('/reset-password')&&method==='POST'){const data=await body(request);const target=await env.DB.prepare('SELECT id,role FROM studio_users WHERE id=?').bind(data.id).first<{id:string;role:string}>();if(!target||target.role==='admin')throw new Fault('仅可重置普通账户');await env.DB.batch([env.DB.prepare('UPDATE studio_users SET password=?,must_change=1 WHERE id=?').bind(await h.hashPassword('12345'),target.id),env.DB.prepare('DELETE FROM studio_sessions WHERE user_id=?').bind(target.id)]);return json({ok:true});}
 if(path.endsWith('/settings')&&method==='POST'){const data=await body(request);if(typeof data.referencesEnabled!=='boolean'||typeof data.generationGuidance!=='string'||data.generationGuidance.length>2000)throw new Fault('系统设置无效');await env.DB.batch(Object.entries({referencesEnabled:data.referencesEnabled,generationGuidance:data.generationGuidance}).map(([k,v])=>env.DB.prepare('INSERT INTO studio_settings(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(k,JSON.stringify(v))));return json({ok:true});}
 return null;
}
