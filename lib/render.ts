import type { Part, Layer } from './model';
const images = new Map<string,Promise<HTMLImageElement>>();
export function imageFor(src: string): Promise<HTMLImageElement> {
 if(!images.has(src)){
  const pending=new Promise<HTMLImageElement>((resolve,reject)=>{
   const im=new Image();const timer=setTimeout(()=>{im.onload=null;im.onerror=null;reject(new Error('素材加载超时，请重新导入图片。'));},20000);
   im.onload=()=>{clearTimeout(timer);resolve(im);};im.onerror=()=>{clearTimeout(timer);reject(new Error('素材无法加载，请重新导入图片。'));};im.src=src;
  });
  images.set(src,pending);void pending.catch(()=>{if(images.get(src)===pending)images.delete(src);});
 }
 return images.get(src)!;
}
export function canvas(width: number,height: number): HTMLCanvasElement {const c=document.createElement('canvas');c.width=width;c.height=height;return c;}
export async function drawLayer(ctx: CanvasRenderingContext2D,l: Layer): Promise<void> {
 ctx.save();ctx.translate(l.x,l.y);const w=l.width,h=l.height;
 if(l.kind==='image'&&l.src){const im=await imageFor(l.src);ctx.save();if(l.rotation===90){ctx.translate(w,0);ctx.rotate(Math.PI/2);ctx.drawImage(im,0,0,h,w);}else if(l.rotation===180){ctx.translate(w,h);ctx.rotate(Math.PI);ctx.drawImage(im,0,0,w,h);}else if(l.rotation===270){ctx.translate(0,h);ctx.rotate(-Math.PI/2);ctx.drawImage(im,0,0,h,w);}else ctx.drawImage(im,0,0,w,h);ctx.restore();}
 if(l.kind==='base'){ctx.fillStyle=l.color;ctx.fillRect(0,0,w,h);}
 if(l.kind==='background'){
  if(!l.patternOnly){ctx.fillStyle=l.color;ctx.fillRect(0,0,w,h);}ctx.strokeStyle='#ffffff0c';ctx.lineWidth=1;
  for(let i=-h;i<w+h;i+=38){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i-h,h);ctx.stroke();}
  const g=ctx.createRadialGradient(w*.75,h*.45,0,w*.75,h*.45,w*.65);g.addColorStop(0,'#263d4e66');g.addColorStop(1,'#00000000');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
 }
 if(l.kind==='decoration'){
  const polygon=(pts: number[][],color: string): void=>{ctx.fillStyle=color;ctx.beginPath();pts.forEach(([x,y]:number[],i:number)=>i?ctx.lineTo(x*w,y*h):ctx.moveTo(x*w,y*h));ctx.closePath();ctx.fill();};
  polygon([[0,.08],[.48,0],[.14,.25],[0,.31]],l.color);polygon([[0,.85],[1,.34],[1,.43],[0,1]],l.color);polygon([[.03,0],[.09,0],[.92,.72],[.79,.67]],'#ff277c');polygon([[.63,0],[.68,0],[.24,1],[.20,1]],'#ff277c');polygon([[.55,1],[1,.69],[1,.77],[.64,1]],'#f1f4e8');
  ctx.fillStyle=l.color;for(let y=0;y<9;y++)for(let x=0;x<13;x++){ctx.globalAlpha=(1-x/14)*.3;ctx.beginPath();ctx.arc(w*(.02+x*.009),h*(.43+y*.026),Math.max(1,h*.003),0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
 }
 if(l.kind==='text') {ctx.fillStyle=l.color;ctx.font=`900 ${l.fontSize}px Arial, sans-serif`;ctx.textBaseline='top';(l.text||'').split('\n').forEach((line:string,i:number)=>ctx.fillText(line,0,i*l.fontSize*1.06));}
 ctx.restore();
}
export async function renderPart(part: Part): Promise<HTMLCanvasElement> {const c=canvas(part.width,part.height),ctx=c.getContext('2d')!;for(const l of part.layers){if(!l.visible)continue;const raster=await layerCanvas(part,l);ctx.save();ctx.globalAlpha=l.opacity;ctx.drawImage(raster,Math.floor(l.x),Math.floor(l.y));ctx.restore();}return c;}
export async function layerCanvas(_part: Part,layer: Layer): Promise<HTMLCanvasElement> {
 let width=layer.width,height=layer.height;
 if(layer.kind==='text'){const ctx=canvas(1,1).getContext('2d')!;ctx.font=`900 ${layer.fontSize}px Arial, sans-serif`;const lines=(layer.text||'').split('\n');width=Math.max(width,...lines.map((line:string)=>ctx.measureText(line).width+4));height=Math.max(height,lines.length*layer.fontSize*1.06+4);}
 const c=canvas(Math.ceil(width+1),Math.ceil(height+1));await drawLayer(c.getContext('2d')!,{...layer,x:layer.x-Math.floor(layer.x),y:layer.y-Math.floor(layer.y)});return c;
}
export function download(blob: Blob,name: string): void {const u=URL.createObjectURL(blob),a=document.createElement('a');try{a.href=u;a.download=name;a.hidden=true;document.body.appendChild(a);a.click();}finally{a.remove();setTimeout(()=>URL.revokeObjectURL(u),20000);}}
export function pngBlob(c: HTMLCanvasElement): Promise<Blob> {return new Promise((resolve,reject)=>c.toBlob((b:Blob|null)=>b?resolve(b):reject(new Error('PNG 编码失败')),'image/png'));}
