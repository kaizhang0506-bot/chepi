import {writePsd,readPsd,type Layer as PsdLayer} from 'ag-psd';
import type {Part} from './model';
import {renderPart,layerCanvas} from './render';
export async function encodePsd(part: Part,physical?:{widthCm:number;heightCm:number}): Promise<ArrayBuffer> {
 if(part.width*part.height*(part.layers.length+1)>80000000)throw new Error('当前部位图层像素总量过大，请减少图层后导出。');
 const composite=await renderPart(part);const children:PsdLayer[]=[];
 for(const l of part.layers){const c=await layerCanvas(part,l);const node:PsdLayer={name:l.name,left:Math.floor(l.x),top:Math.floor(l.y),canvas:c,opacity:l.opacity,hidden:!l.visible,transparencyProtected:l.locked};
 if(l.kind==='text'){const rgb={r:parseInt(l.color.slice(1,3),16),g:parseInt(l.color.slice(3,5),16),b:parseInt(l.color.slice(5,7),16)};node.text={text:l.text||'',transform:[1,0,0,1,l.x,l.y+l.fontSize*.9],antiAlias:'smooth',style:{font:{name:'Arial-BoldMT'},fontSize:l.fontSize,fillColor:rgb,leading:l.fontSize*1.06},paragraphStyle:{justification:'left'}};}
 children.push(node);}
 const imageResources=physical?{resolutionInfo:{horizontalResolution:part.width/physical.widthCm*2.54,horizontalResolutionUnit:'PPI' as const,widthUnit:'Centimeters' as const,verticalResolution:part.height/physical.heightCm*2.54,verticalResolutionUnit:'PPI' as const,heightUnit:'Centimeters' as const}}:undefined;
 const buffer=writePsd({width:part.width,height:part.height,canvas:composite,children,imageResources},{trimImageData:true,generateThumbnail:false});
 const check=readPsd(buffer,{skipLayerImageData:true,skipCompositeImageData:true,skipThumbnail:true});
 if(check.width!==part.width||check.height!==part.height||check.children?.length!==part.layers.length)throw new Error('PSD 导出自检失败');
 part.layers.forEach((l,i)=>{const actual=check.children![i];if(actual.name!==l.name||!!actual.hidden!==!l.visible||(l.kind==='text'&&actual.text?.text.replace(/\r/g,'\n')!==l.text))throw new Error('PSD 图层或文字自检失败');});
 return buffer;
}
