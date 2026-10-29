import type {Project, Params} from './model';

export type Origin = 'default'|'user'|'ai';
export const OPTIONS = {
 theme:[['anime','二次元 / 痛车'],['racing','赛车 / JDM'],['mecha','机甲 / 科幻'],['oriental','国潮 / 东方幻想'],['street','街头 / 涂鸦'],['abstract','抽象艺术 / 高级拉花']],
 subject_type:[['single','单主角'],['double','双主角'],['character_mecha','人物 + 机械'],['mecha','机甲 / 动物 / 图腾'],['logo','Logo / 符号'],['graphic','纯图形（无角色）']],
 visual_style:[['cyber','赛博科技'],['racing','竞技速度'],['minimal','极简高级'],['dream','梦幻唯美'],['dark','暗黑酷炫'],['pop','活泼潮流']],
 color_palette:[['cyan','青 / 蓝 / 紫'],['red','红 / 黑 / 白'],['pink','粉 / 蓝 / 白'],['black_gold','黑 / 金'],['green','绿 / 黑 / 银'],['custom','自定义主色'],['auto','AI 自动配色']],
 composition:[['center_lower','中置靠下'],['front_lower','中前靠下'],['rear_lower','中后靠下'],['dynamic','横向流动构图'],['dual','双主体构图'],['center','中央符号构图']],
 density:[['low','简约 · 30%'],['medium','平衡 · 60%'],['high','丰富 · 85%']],
 character_style:[['anime','日系动漫'],['semi_real','半写实插画'],['mechanical','机械 / 科幻人物'],['original','完全原创视觉形象'],['none','不使用人物']],
 background:[['solid','纯色背景'],['gradient','渐变 / 柔和纹理'],['tech','科技 / 机械背景'],['illustration','场景插画'],['abstract','抽象延展背景']],
 coverage:[['full','大面积全覆盖'],['partial','局部彩绘 / 留白'],['graphic_only','图形拉花为主']],
 left_right_relation:[['same','相同构图'],['mirror','镜像构图（文字正向）'],['different_pose','同主题，不同角色姿势'],['different','同主题，不同构图'],['complementary','左右互补设计']],
 text_mode:[['none','无文字'],['decorative','少量英文 / 数字装饰'],['custom','指定文字或 Logo 名称']],
 hood:[['symbol','中心符号 / Logo'],['character','人物 / 头像'],['graphics','抽象图形'],['continuation','延续侧面背景']],
 roof:[['background','背景纹理延续'],['graphics','几何 / 星空 / 装饰'],['logo','Logo 主体'],['minimal','极简留白']],
 bumpers:[['continuation','延续侧面线条 / 色带'],['gradient','渐变 / 纹理'],['racing','赛车条纹'],['minimal','极简低密度']],
 trunk:[['logo','中心 Logo / 符号'],['character','小人物 / 辅助角色'],['continuation','延续两侧图形'],['minimal','极简设计']],
} as const;
export const GRAPHICS=[['speed_lines','速度线'],['geometry','几何色块'],['hud','科技 HUD / 电路'],['particles','粒子 / 光效'],['flames','火焰 / 闪电'],['floral','花纹 / 自然元素'],['graffiti','涂鸦 / 手绘纹理']] as const;
export type ChoiceKey=keyof typeof OPTIONS;
export type DesignValues=Record<ChoiceKey,string>&{custom_primary_color:string;exact_text:string;notes:string;graphics:string[]};
export type DesignKey=keyof DesignValues;
export interface DesignConfig {values:DesignValues;sources:Partial<Record<DesignKey,Origin>>;}
export const DESIGN_DEFAULTS:DesignValues={theme:'anime',subject_type:'single',visual_style:'cyber',color_palette:'cyan',composition:'center_lower',density:'medium',character_style:'anime',background:'gradient',coverage:'full',left_right_relation:'different_pose',text_mode:'none',hood:'symbol',roof:'background',bumpers:'continuation',trunk:'logo',custom_primary_color:'#009DA6',exact_text:'',notes:'',graphics:['speed_lines','geometry']};
export const POSTER_OPTIONS={source_type:[['poster','海报设计'],['wallpaper','壁纸 / 插画'],['car_wrap','现有汽车彩绘设计'],['other','其他平面设计']],reference_strength:[['style','A · 仅参考风格'],['style_composition','B · 风格 + 构图'],['deep_reconstruction','C · 深度重构']],character_strategy:[['original','重新创作原创人物'],['remove','移除参考人物'],['user_character','用指定主角替换'],['preserve_authorized','保留已授权人物']],wrap_adaptation:[['light','A · 轻度：尽量保留视觉关系'],['standard','B · 标准：兼顾海报气质与车身构图'],['strong','C · 强度：通用性优先，允许较大重排']],left_right:[['redesign','参考海报重新设计左右侧'],['same','左右采用相近构图'],['complementary','左右互补式创作']],other_panels:[['extract','提取背景、图形与配色延展'],['thematic','围绕同一主题自由创作'],['minimal','简化，以背景、色带和少量 Logo 为主']],confirmation:[['confirm','分析后由我确认，再进入 Step 2'],['auto','分析后填入推荐值（保留我的选择）']]} as const;
export const RETAIN=[['palette','色彩配色'],['style','美术风格 / 氛围'],['composition','主体布局 / 构图'],['graphics','装饰图形'],['background','背景'],['typography','字体与排版']] as const;
export type PosterKey=keyof typeof POSTER_OPTIONS;
export type AnalysisResult={style:string;mood:string;palette:string[];subject_type:string;subject_position:string;visual_flow:string;background_elements:string;typography:string;density:string;adaptation_notes:string;suggestions:Partial<DesignValues>};
export interface PosterConfig {source_type:string;reference_strength:string;character_strategy:string;wrap_adaptation:string;left_right:string;other_panels:string;confirmation:string;retain_elements:string[];enabled:boolean;custom_instructions:string;permission:boolean;permission_note:string;asset?:{id:string;width:number;height:number;bytes:number;name:string};status:'empty'|'uploaded'|'analyzing'|'failed'|'review'|'confirmed'|'manual';error:string;result?:AnalysisResult;character?:{id:string;src:string};revision:number;updated:number;}
export function newDesign():DesignConfig{return {values:structuredClone(DESIGN_DEFAULTS),sources:{}};}
export function newPoster():PosterConfig{return {source_type:'poster',reference_strength:'style_composition',character_strategy:'original',wrap_adaptation:'standard',left_right:'redesign',other_panels:'extract',confirmation:'confirm',retain_elements:['palette','style','composition','graphics'],enabled:true,custom_instructions:'',permission:false,permission_note:'',status:'empty',error:'',revision:1,updated:Date.now()};}
export function label(key:ChoiceKey,value:string):string{return OPTIONS[key].find(x=>x[0]===value)?.[1]||value;}
export function setDesign(config:DesignConfig,key:DesignKey,value:string|string[],source:Origin='user'):DesignConfig{return {values:{...config.values,[key]:value},sources:{...config.sources,[key]:source}};}
export function hasCharacter(v:DesignValues):boolean{return ['single','double','character_mecha'].includes(v.subject_type)&&v.character_style!=='none';}
export function clearSuggestions(config:DesignConfig):DesignConfig{let next=structuredClone(config);for(const key of Object.keys(config.sources) as DesignKey[])if(config.sources[key]==='ai')next=setDesign(next,key,structuredClone(DESIGN_DEFAULTS[key]),'default');return next;}
export function applySuggestions(config:DesignConfig,suggestions:Partial<DesignValues>):DesignConfig{let next=clearSuggestions(config);for(const key of Object.keys(suggestions) as DesignKey[])if(config.sources[key]!=='user')next=setDesign(next,key,suggestions[key]!, 'ai');return next;}
export function validDesign(value:unknown):DesignConfig {
 const d=value as DesignConfig;if(!d?.values||!d.sources||typeof d.sources!=='object')throw new Error('设计配置结构无效');
 for(const key of Object.keys(OPTIONS) as ChoiceKey[])if(!OPTIONS[key].some(o=>o[0]===d.values[key]))throw new Error(`设计选项无效：${key}`);
 for(const key of ['custom_primary_color','exact_text','notes'] as const)if(typeof d.values[key]!=='string'||d.values[key].length>2000)throw new Error('设计文本过长或格式无效');
 if(!Array.isArray(d.values.graphics)||!d.values.graphics.every(g=>GRAPHICS.some(x=>x[0]===g)))throw new Error('辅助元素无效');
 for(const [key,v] of Object.entries(d.sources))if(!(key in DESIGN_DEFAULTS)||!['user','ai','default'].includes(v))throw new Error('参数来源无效');
 return d;
}
export function parseAnalysis(value:unknown):AnalysisResult{
 const a=value as AnalysisResult;if(!a||typeof a!=='object')throw new Error('分析结果应为 JSON 对象');
 for(const key of ['style','mood','subject_type','subject_position','visual_flow','background_elements','typography','density','adaptation_notes'] as const)if(typeof a[key]!=='string'||a[key].length>2000)throw new Error(`分析字段缺失或过长：${key}`);
 if(!Array.isArray(a.palette)||a.palette.length>12||!a.palette.every(c=>/^#[0-9a-f]{6}$/i.test(c)))throw new Error('分析配色需为 HEX 数组');
 if(!a.suggestions||typeof a.suggestions!=='object'||Array.isArray(a.suggestions)||Object.keys(a.suggestions).some(k=>!(k in DESIGN_DEFAULTS)))throw new Error('分析建议字段无效');
 validDesign({values:{...DESIGN_DEFAULTS,...a.suggestions},sources:{}});return a;
}
export function validPoster(value:unknown):PosterConfig{
 const p=value as PosterConfig;if(!p||typeof p!=='object')throw new Error('海报配置无效');
 for(const key of Object.keys(POSTER_OPTIONS) as PosterKey[])if(!POSTER_OPTIONS[key].some(o=>o[0]===p[key]))throw new Error(`海报选项无效：${key}`);
 if(!Array.isArray(p.retain_elements)||!p.retain_elements.every(v=>RETAIN.some(x=>x[0]===v))||typeof p.enabled!=='boolean'||typeof p.permission!=='boolean')throw new Error('海报配置格式无效');
 for(const key of ['custom_instructions','permission_note','error'] as const)if(typeof p[key]!=='string'||p[key].length>2000)throw new Error('海报说明无效');
 if(!['empty','uploaded','analyzing','failed','review','confirmed','manual'].includes(p.status)||!Number.isFinite(p.revision)||!Number.isFinite(p.updated))throw new Error('海报状态无效');
 if(p.asset&&(!/^asset_[a-zA-Z0-9_-]+$/.test(p.asset.id)||typeof p.asset.name!=='string'||![p.asset.width,p.asset.height,p.asset.bytes].every(n=>Number.isFinite(n)&&n>=0)))throw new Error('素材信息无效');
 if(p.character&&(!/^asset_[a-zA-Z0-9_-]+$/.test(p.character.id)||!/^data:image\/(png|jpeg|webp);base64,/.test(p.character.src)))throw new Error('主角素材无效');
 if(p.result)parseAnalysis(p.result);return p;
}
export function migrateDesign(params:Params):DesignConfig{
 let d=newDesign();const mapping:Partial<Record<keyof Params,ChoiceKey>>={theme:'theme',subject:'subject_type',style:'visual_style',palette:'color_palette',composition:'composition',complexity:'density',relation:'left_right_relation'};
 const aliases:Record<string,string>={'未来都市':'anime','原创赛车手':'single','赛博机能':'cyber','中后靠下':'rear_lower','中置靠下':'center_lower','中前靠下':'front_lower','平衡':'medium','简约':'low','丰富':'high','同主题不同构图':'different','左右相同':'same','镜像构图':'mirror','AI 自动搭配':'auto'};
 for(const [old,key] of Object.entries(mapping) as [keyof Params,ChoiceKey][]){const v=params[old];if(typeof v==='string'){const match=OPTIONS[key].find(o=>o[1]===v)?.[0]||aliases[v];if(match)d=setDesign(d,key,match);}}
 if(params.words)d=setDesign(setDesign(d,'text_mode','custom'),'exact_text',params.words);
 return d;
}
export function configErrors(project:Project,stage:'poster'|'design'|'start'='start'):string[]{
 const errors:string[]=[],p=project.poster,v=project.design.values;
 if(project.entry==='poster'){
 if(project.references.length!==1||!p.asset)errors.push('D1：请上传并选定一张参考图片。');
 if(!p.retain_elements.filter(v=>p.reference_strength!=='style'||v!=='composition').length)errors.push('D3：至少保留一个参考元素。');
 if((p.reference_strength==='deep_reconstruction'||p.character_strategy==='preserve_authorized')&&(!p.permission||!p.permission_note.trim()))errors.push('D2 / D3：请记录深度重构或保留人物的使用权限。');
 if(stage!=='poster'&&!['confirmed','manual'].includes(p.status))errors.push('D6：请确认分析结果，或选择手动继续。');
 if(stage==='start'&&p.character_strategy==='user_character'&&!p.character)errors.push('Step 3：请上传用于替换的指定主角素材。');
 }
 if(stage!=='poster'){
 if(project.entry!=='original'&&project.entry!=='poster'&&!project.references.length)errors.push('请上传参考素材。');
 if(v.color_palette==='custom'&&!/^#[0-9a-f]{6}$/i.test(v.custom_primary_color))errors.push('自定义主色需为 #RRGGBB，例如 #009DA6。');
 if(v.text_mode==='custom'&&!v.exact_text.trim())errors.push('选择指定文字后，请填写准确文字或 Logo 名称。');
 if(v.exact_text.length>500)errors.push('指定文字请控制在 500 字以内。');
 }
 return errors;
}
export function posterBrief(p:PosterConfig){return {schema_version:'1.0',config_version:p.revision,updated_at:p.updated,generation_mode:'poster_reference',reference:{source_type:p.source_type,asset_id:p.asset?.id||null,reference_strength:p.reference_strength,retain_elements:p.retain_elements.filter(v=>p.reference_strength!=='style'||v!=='composition'),requested_retain_elements:p.retain_elements,character_strategy:p.character_strategy,wrap_adaptation:p.wrap_adaptation,permission:{confirmed:p.permission,note:p.permission_note},character_asset_id:p.character?.id||null},panel_strategy:{left_right:p.left_right,other_panels:p.other_panels},analysis:{enabled:p.enabled,confirmation:p.confirmation,status:p.status,result:p.result||null},custom_instructions:p.custom_instructions,next_step:'design_parameters'};}
export function designBrief(project:Project){const d=project.design,v=d.values,character=hasCharacter(v)&&!(project.entry==='poster'&&project.poster.character_strategy==='remove');let relation=v.left_right_relation;let origin=d.sources.left_right_relation||'default';if(project.entry==='poster'&&origin==='default'){relation={redesign:character?'different_pose':'different',same:'same',complementary:'complementary'}[project.poster.left_right]||relation;origin=project.poster.left_right==='redesign'?'default':'user';}if(!character&&relation==='different_pose')relation='different';
 return {design_instructions:(project.designNote||'').trim(),schema_version:'1.0',step:'design_parameters',ui_mode:project.mode==='pro'?'professional':'quick',vehicle:project.vehicle,theme:v.theme,subject_type:character?v.subject_type:['logo','mecha','graphic'].includes(v.subject_type)?v.subject_type:'graphic',visual_style:v.visual_style,color_palette:v.color_palette,custom_primary_color:v.color_palette==='custom'?v.custom_primary_color:null,composition:v.composition,density:{low:.3,medium:.6,high:.85}[v.density],advanced:{character_style:character?v.character_style:'none',subject_height_ratio:character?[.55,.65]:null,background:v.background,coverage:v.coverage,left_right_relation:relation,graphics:v.graphics,text_mode:v.text_mode,exact_text:v.text_mode==='custom'?v.exact_text:'',mirror_text:false,mirror_logo:false,panels:{left:relation,right:relation,hood:!character&&v.hood==='character'?'symbol':v.hood,roof:v.roof,front_bumper:v.bumpers,rear_bumper:v.bumpers,trunk:!character&&v.trunk==='character'?'logo':v.trunk},notes:v.notes},sources:{...Object.fromEntries(Object.keys(DESIGN_DEFAULTS).map(k=>[k,d.sources[k as DesignKey]||'default'])),left_right_relation:origin},poster_reference:project.entry==='poster'?posterBrief(project.poster):null,canvas_background_rule:'背景、底色或纹理铺满整幅，安全区外可有背景和辅助装饰',safety_zone_scope:'仅约束人脸、重要文字、Logo等关键内容；需按实际车型核对车窗和车轮',safety_zone_enabled:true,safety_priority:'Step 3 hard constraints override all design preferences',panel_count:7,safety_zones:Object.fromEntries(Object.entries(project.parts).map(([k,p])=>[k,p.safe]))};
}
