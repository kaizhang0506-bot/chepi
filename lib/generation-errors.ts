export function generationFailure(error:unknown,stage:string):{status:number;message:string}{
 const e=error as {message?:string;name?:string;status?:number;response?:{status?:number}};
 const status=e?.response?.status||e?.status;
 const text=String(e?.message||'');
 if(status===401||status===403||/api.?key|credential|unauthori[sz]ed|authentication|workload.*token/i.test(text))return {status:503,message:'扣子模型身份验证失败。请在扣子项目中启用模型能力，并检查运行环境的服务端凭据后重新部署。'};
 if(status===429||/quota|rate.?limit|insufficient.*balance/i.test(text))return {status:429,message:'模型额度不足或请求过于频繁，请检查扣子额度，稍后再试。'};
 if(e?.name==='TimeoutError'||e?.name==='AbortError'||/timeout|timed out/i.test(text))return {status:504,message:'模型或图片下载超时。本次未替换原设计，请稍后重试。'};
 if(status===400||/InvalidParameter|UnsupportedImage|invalid.*size/i.test(text))return {status:422,message:'模型拒绝了图片或参数，请检查参考图格式和尺寸；详细原因见服务器日志。'};
 if(/ENOSPC|EACCES|EROFS/i.test(text)||stage==='保存图片')return {status:500,message:'生成图片保存失败，请检查服务器存储空间及写入权限。'};
 return {status:502,message:`${stage}失败，本次未替换原设计。请重试；若持续失败，请用下方错误编号查询扣子服务日志。`};
}
