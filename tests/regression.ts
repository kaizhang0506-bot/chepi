import {initialProject,parseProject,PARTS} from '../lib/model';
import {designBrief} from '../lib/design-config';
import {requestFor} from '../lib/generation';
import {generationFailure} from '../lib/generation-errors';
import {contourize,assignPixels} from '../lib/image-separation';

function assert(value:unknown,message:string):asserts value {if(!value)throw new Error(message);}
const p=initialProject();p.entry='original';p.designNote='橙黑赛车，保留角色服装，不要额外人物';
const restored=parseProject(JSON.parse(JSON.stringify(p)));
assert(restored.designNote===p.designNote,'Project round-trip lost design text');
assert(designBrief(restored).design_instructions===p.designNote,'Configuration export lost text');
for(const part of PARTS)assert(requestFor(restored,part).prompt_text.includes(p.designNote),'Part prompt lost text');
assert(generationFailure({response:{status:401}},'请求模型').status===503,'Credential error misclassified');
assert(generationFailure({status:429},'请求模型').status===429,'Quota error misclassified');
assert(generationFailure({name:'TimeoutError'},'请求模型').status===504,'Timeout error misclassified');
assert(!generationFailure(new Error('apiKey=secret'),'请求模型').message.includes('secret'),'Error exposed credential');
const w=40,h=40,pixels=new Uint8ClampedArray(w*h*4);
for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4;pixels[i+3]=255;if((x-20)**2+(y-20)**2<100){pixels[i]=255;pixels[i+1]=130;}}
const ratio=contourize(pixels,w,h);
assert(ratio>.1&&ratio<.4,'Contour area unexpectedly changed');
assert(pixels[3]===0&&pixels[(20*w+20)*4+3]===255,'Contour did not remove outside and preserve center');
const source=new Uint8ClampedArray([255,0,0,255,0,255,0,255]);
const split=assignPixels(source,[new Uint8ClampedArray([0,0,0,255,0,0,0,0])]);
assert(split[0][3]===0&&split[1][3]===255&&split[0][7]===255,'Extraction ownership duplicates foreground');
console.log('PASS: project persistence, all 7 prompts, error classification, contour alpha, exclusive pixel ownership');
