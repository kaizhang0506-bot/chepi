export const SUGGESTED_TAGS = ['二次元','赛车','JDM','机甲','极简','赛博','暗黑','蓝白配色','红黑配色','人物主体','速度线','大面积留白'];
export function parseTags(value:string):string[]{
 const tags=[...new Set(value.split(/[,，、;；\n]+/).map(t=>t.trim()).filter(Boolean))];
 if(tags.length>20)throw new Error('每个案例最多添加 20 个标签。');
 if(tags.some(t=>t.length>24))throw new Error('每个标签最多 24 个字。');
 return tags;
}
export function validTags(value:unknown):boolean{return value===undefined||(Array.isArray(value)&&value.length<=20&&value.every(t=>typeof t==='string'&&t.trim().length>0&&t.length<=24)&&new Set(value).size===value.length);}
