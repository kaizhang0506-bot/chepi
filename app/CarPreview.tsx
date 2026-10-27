'use client';
import {useId} from 'react';
import type {PartName,VehicleType} from '@/lib/model';

import {EXTRA_PLATES} from '@/lib/vehicle-preview';

type View = 'side'|'front'|'back'|'top';
type PreviewProps = {vehicle?:VehicleType;image?:string;images?:Partial<Record<PartName,string>>;view?:View;part?:PartName;atlas?:string};
const CROPS:Record<View,string>={side:'0 35 890 420',front:'935 15 550 455',back:'135 500 540 470',top:'785 535 750 395'};
// Registered to the photographic plate; glass, wheels, lamps and trim are excluded.
const SIDE='M28 232 L47 213 L100 203 L257 187 L804 180 L812 252 L825 274 L829 301 L765 323 L748 276 Q738 239 706 233 L619 233 Q592 237 581 267 L565 338 L267 339 L249 275 Q241 238 218 235 L115 235 Q91 239 82 274 L72 309 L28 308 Z';
const HOOD='M836 614 Q898 589 969 603 L945 649 Q930 722 949 814 L966 852 Q900 881 833 853 L817 815 L813 656 Z';
const ROOF='M1080 635 L1431 642 Q1460 650 1461 683 L1463 799 Q1459 819 1432 824 L1081 824 L1083 802 L1319 802 L1320 656 L1084 655 Z';
const FRONT='M984 319 L1040 321 L1062 301 L1104 302 L1104 325 L1325 325 L1325 302 L1361 302 L1382 319 L1432 320 L1431 346 L1387 350 L1371 333 L1349 333 L1349 356 L1086 356 L1086 333 L1065 333 L1043 351 L985 346 Z';
const REAR_DOOR='M238 649 L308 648 L305 692 Q306 757 351 788 L235 788 Z M497 648 L568 648 L574 785 L457 788 Q508 756 509 695 Z';
const REAR_BUMPER='M174 758 L199 759 L200 778 L230 779 L230 796 L579 796 L579 775 L608 774 L609 757 L628 757 L632 813 L608 820 L590 804 L570 804 L570 838 L237 838 L237 805 L213 805 L198 820 L175 813 Z';

export default function CarPreview({image,images,view='side',part,vehicle='SUV',atlas:customAtlas}:PreviewProps){
 const config=EXTRA_PLATES[vehicle];
 const atlas=customAtlas||config?.atlas||'/cars/suv-studio-v2.png';
 const id=useId().replace(/:/g,'');
 const actualView:View=part==='机盖'||part==='车顶'?'top':view;
 const key=actualView==='side'?'side':actualView==='front'?'front':actualView==='back'?(part==='后保险杠'?'bumper':'rear'):part==='机盖'?'hood':'roof';
 const paint=config?.paths[key]||(actualView==='side'?SIDE:actualView==='front'?FRONT:actualView==='back'?(part==='后保险杠'?REAR_BUMPER:REAR_DOOR):part==='机盖'?HOOD:ROOF);
 const rect=config?.rects[key]||(actualView==='side'?{x:24,y:158,width:809,height:270}:actualView==='front'?{x:979,y:298,width:459,height:64}:actualView==='back'?{x:173,y:part==='后保险杠'?757:644,width:461,height:part==='后保险杠'?84:148}:part==='机盖'?{x:808,y:590,width:166,height:288}:{x:1078,y:632,width:390,height:197});
 const caption=part||({side:'侧面',front:'前部',back:'后部',top:'顶部'}[actualView]);
 const sources={...images,...(image&&part?{[part]:image}:{})};
 const mirrored=actualView==='side'&&part==='右侧';
 const fullFront='M990 238 L1016 201 L1040 199 L1387 199 L1405 205 L1432 239 L1437 347 L1419 357 L1377 355 L1377 332 L1347 332 L1347 357 L1080 357 L1080 332 L1057 332 L1057 354 L988 347 Z M1017 201 L1107 201 L1107 272 L1041 272 L1041 298 L1017 298 Z M1314 201 L1408 201 L1408 298 L1387 298 L1387 272 L1314 272 Z M1104 299 L1104 327 L1327 327 L1327 299 Z';
 const fullRear='M246 539 L560 539 L569 550 L239 550 Z M179 661 L231 646 L578 646 L625 665 L635 811 L607 817 L585 790 L229 790 L202 816 L171 810 Z M198 666 L198 759 L235 759 L235 666 Z M573 666 L573 759 L607 759 L607 666 Z M305 695 A101 103 0 1 0 507 695 A101 103 0 1 0 305 695 Z';
 const sidePaint='M27 233 L56 212 L259 188 L803 179 L811 254 L828 276 L829 324 L746 349 L74 350 L24 331 Z M79 340 A84 88 0 1 0 247 340 A84 88 0 1 0 79 340 Z M581 340 A86 88 0 1 0 753 340 A86 88 0 1 0 581 340 Z M340 105 L364 96 L772 96 L784 104 Z';
 type Surface={name:PartName;path:string;box:{x:number;y:number;width:number;height:number};};
 let surfaces:Surface[]=[];
 if(actualView==='side')surfaces=[{name:part==='右侧'?'右侧':'左侧',path:config?.paths.side||sidePaint,box:config?.rects.side||{x:24,y:90,width:809,height:260}}];
 if(actualView==='front')surfaces=[{name:'前保险杠',path:config?.paths.front||fullFront,box:config?.rects.front||{x:980,y:197,width:460,height:165}},{name:'机盖',path:vehicle==='SUV'?'M1021 176 Q1210 153 1401 176 L1407 198 Q1215 218 1013 198 Z':'',box:{x:1013,y:161,width:394,height:48}}];
 if(actualView==='back')surfaces=[{name:'后备箱',path:config?.paths.rear||fullRear,box:config?.rects.rear||{x:174,y:538,width:461,height:254}},{name:'后保险杠',path:config?.paths.bumper||REAR_BUMPER,box:config?.rects.bumper||{x:173,y:757,width:461,height:84}},...(vehicle==='SUV'?[{name:'后备箱' as PartName,path:'M315 695 A90 94 0 1 0 495 695 A90 94 0 1 0 315 695 Z M328 690 L328 716 L485 716 L485 690 Z',box:{x:315,y:601,width:180,height:188}}]:[])];
 if(actualView==='top')surfaces=[{name:'机盖',path:config?.paths.hood||HOOD,box:config?.rects.hood||{x:808,y:590,width:166,height:288}},{name:'车顶',path:config?.paths.roof||'M1080 628 Q1260 631 1432 638 L1462 651 L1467 800 L1450 832 L1081 837 Z M1103 657 L1103 803 L1321 803 L1321 657 Z',box:config?.rects.roof||{x:1078,y:632,width:390,height:197}},...(vehicle==='SUV'?[{name:'左侧' as PartName,path:'M1053 604 L1420 605 L1457 622 L1082 620 Z',box:{x:1053,y:599,width:404,height:30}},{name:'右侧' as PartName,path:'M1084 844 L1454 833 L1427 868 L1068 887 Z',box:{x:1068,y:833,width:386,height:54}}]:[])];
 const combined=!!images;
 return <svg className="photo-car-preview" viewBox={(config?.crops||CROPS)[actualView]} role="img" aria-label={`${caption}车衣效果预览，AI生成的写实${vehicle}底图`} style={{isolation:'isolate'}}>
  <defs>
   <mask id={`${id}-paint`} maskUnits="userSpaceOnUse" x="0" y="0" width="1536" height="1024">
    <path d={paint} fill="white" fillRule="evenodd"/>
    {vehicle==='SUV'&&actualView==='side'&&<g fill="black"><path d="M234 225L253 225L254 267L242 257Z"/><rect x="392" y="207" width="43" height="13" rx="6"/><rect x="578" y="205" width="45" height="13" rx="6"/></g>}
   </mask>
   <filter id={`${id}-reflection`}><feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0.333 0.333 0.333 0 -0.55"/></filter>
   {surfaces.map((s,i)=><mask key={i} id={`${id}-surface-${i}`} maskUnits="userSpaceOnUse" x="0" y="0" width="1536" height="1024"><path d={s.path} fill="white" fillRule="evenodd"/></mask>)}
  </defs>
  <g transform={mirrored?`translate(${Number((config?.crops||CROPS).side.split(' ')[2])} 0) scale(-1 1)`:undefined}>
  <image href={atlas} width="1536" height="1024"/>
  {combined?surfaces.map((s,i)=>sources[s.name]&&<g key={i} data-panel={s.name} mask={`url(#${id}-surface-${i})`}><image href={sources[s.name]} {...s.box} preserveAspectRatio="none" style={{mixBlendMode:'multiply'}} transform={mirrored?`translate(${s.box.x*2+s.box.width} 0) scale(-1 1)`:undefined}/><image href={atlas} width="1536" height="1024" opacity=".24" style={{mixBlendMode:'multiply'}}/><image href={atlas} width="1536" height="1024" filter={`url(#${id}-reflection)`} opacity=".2" style={{mixBlendMode:'screen'}}/></g>):image&&<g mask={`url(#${id}-paint)`}>
   <image href={image} {...rect} preserveAspectRatio="xMidYMid slice" opacity=".96" style={{mixBlendMode:'multiply'}}/>
   <image href={atlas} width="1536" height="1024" filter={`url(#${id}-reflection)`} opacity=".19" style={{mixBlendMode:'screen'}}/>
  </g>}
  </g>
 </svg>;
}
