import {originOk} from '../lib/request-guard';
export async function localSegmentation(request:Request):Promise<Response>{
 const url=new URL(request.url);
 if(process.env.LOCAL_LAYER_SERVICE!=='1')return new Response(null,{status:404});
 if(!['127.0.0.1','localhost','[::1]'].includes(url.hostname)||['forwarded','x-forwarded-for','x-forwarded-host','rpc-persist-host'].some(h=>request.headers.has(h))||!originOk(request,url))return new Response('Forbidden',{status:403});
 if(request.method!=='POST'||!request.headers.get('content-type')?.startsWith('application/json'))return new Response('Invalid request',{status:400});
 const data=await request.text();if(data.length>18000000)return new Response('Image too large',{status:413});
 try{const response=await fetch('http://127.0.0.1:8766/separate',{method:'POST',headers:{'content-type':'application/json','connection':'close'},body:data,signal:AbortSignal.timeout(240000)});const payload=await response.arrayBuffer();return new Response(payload,{status:response.status,headers:{'content-type':'application/json','cache-control':'no-store'}});}
 catch{return Response.json({error:'本地分层模型未启动或响应超时。'},{status:503});}
}
