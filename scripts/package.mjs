import {readFileSync,writeFileSync,readdirSync,statSync} from 'node:fs';
import {resolve,join,relative} from 'node:path';
import {zipSync} from 'fflate';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'..');
const files={};
const includeFiles=['package.json','pnpm-lock.yaml','pnpm-workspace.yaml','.npmrc','.coze','.gitignore','next.config.ts','postcss.config.mjs','tsconfig.json','next-env.d.ts','vitest.config.ts','README.md','COZE-INTEGRATION.md','ASSET-PROMPTS.md','VERIFICATION.md'];
function add(path){files[relative(root,path).replaceAll('\\','/')]=new Uint8Array(readFileSync(path));}
function walk(dir){for(const name of readdirSync(dir)){const path=join(dir,name);if(statSync(path).isDirectory())walk(path);else add(path);}}
includeFiles.forEach(name=>add(join(root,name)));['src','public','scripts','tests'].forEach(name=>walk(join(root,name)));
const data=zipSync(files,{level:6});const destination=resolve(root,'..','御彩星绘-汽车车衣工作台-源码.zip');writeFileSync(destination,data);
console.log(JSON.stringify({file:destination,files:Object.keys(files).length,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')},null,2));
