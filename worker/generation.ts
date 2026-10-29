import { ImageGenerationClient, HeaderUtils, Config } from 'coze-coding-dev-sdk';
import { putObject, getObject } from '../lib/server-store';
import { originOk } from '../lib/request-guard';
import { generationFailure } from '../lib/generation-errors';

const PARTS = ['左侧', '右侧', '机盖', '车顶', '前保险杠', '后保险杠', '后备箱'] as const;
type PartName = typeof PARTS[number];
// 生图尺寸需满足 SDK 约束：总像素 ≥ 3686400、宽高比 ≤ 16；按各部位画幅比例就近取值。
const GEN_SIZES: Record<PartName, string> = {
  '左侧': '3456x1152', '右侧': '3456x1152', '机盖': '2288x1760', '车顶': '2880x1312',
  '前保险杠': '3456x1152', '后保险杠': '3750x1000', '后备箱': '2048x2048',
};
class Fault extends Error { constructor(public status: number, message: string) { super(message); } }
const json = (value: unknown, status = 200): Response => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });
const hits = new Map<string, { count: number; expires: number }>();
function limit(key: string, max: number): void {
  const now = Date.now(), row = hits.get(key);
  if (!row || row.expires < now) { hits.set(key, { count: 1, expires: now + 15 * 60 * 1000 }); return; }
  row.count++;
  if (row.count > max) throw new Fault(429, '生成请求过于频繁，请 15 分钟后重试。');
}
// SDK Config 超时在线上曾不生效导致请求挂死；此处为无条件触发的服务端兜底，时长须晚于 SDK 超时（270s）、早于客户端超时（300s）。
async function withDeadline<T>(task: Promise<T>, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => { timer = setTimeout(() => { console.error('Generation deadline exceeded', { label, waitedMs: 280000 }); reject(new Fault(504, `${label}等待超时，本次未替换原设计，请稍后重试。`)); }, 280000); });
  task.catch(() => undefined);
  try { return await Promise.race([task, deadline]); } finally { if (timer) clearTimeout(timer); }
}
const MIME: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' };
function detectExt(b: Buffer): 'png' | 'jpg' | 'webp' {
  if (b.length > 4 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e) return 'png';
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8) return 'jpg';
  if (b.length > 12 && b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP') return 'webp';
  throw new Fault(502, '模型返回的内容不是有效的 PNG、JPG 或 WebP 图片。');
}
export async function generationApi(request: Request): Promise<Response> { const requestId=crypto.randomUUID();let stage='请求模型';try {
  const url = new URL(request.url), path = url.pathname;
  if (path.startsWith('/api/generated/')) {
    const match = path.slice('/api/generated/'.length).match(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(png|jpg|webp)$/);
    if (!match) return json({ error: '生成结果不存在' }, 404);
    const b64 = await getObject(`generated/${match[1]}.${match[2]}`);
    if (!b64) return json({ error: '生成结果不存在或已被清理' }, 404);
    return new Response(Buffer.from(b64, 'base64'), { headers: { 'content-type': MIME[match[2]], 'cache-control': 'public, max-age=31536000, immutable' } });
  }
  if (path === '/api/upload-layer') {
    if (request.method !== 'POST') return json({ error: '方法不支持' }, 405);
    if (!originOk(request, url)) return json({ error: '请求来源无效' }, 403);
    if (!request.headers.get('content-type')?.startsWith('application/json')) return json({ error: '请求类型无效' }, 415);
    limit(`upload-layer:${request.headers.get('x-forwarded-for') || 'local'}`, 120);
    const body = await request.json().catch(() => null) as { dataURL?: string } | null;
    if (!body || typeof body.dataURL !== 'string') return json({ error: '请求体无效' }, 400);
    const m = body.dataURL.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/);
    if (!m) return json({ error: '图片数据无效，仅支持 PNG / JPG / WebP。' }, 400);
    const bytes = Buffer.from(m[2], 'base64');
    if (!bytes.length || bytes.length > 15 * 1024 * 1024) return json({ error: '图片过大（超过 15 MB），请压缩后重试。' }, 413);
    const ext = detectExt(bytes);
    const id = crypto.randomUUID();
    stage = '保存图层'; await putObject(`generated/${id}.${ext}`, bytes.toString('base64'));
    return json({ url: `/api/generated/${id}.${ext}` });
  }
  if (path === '/api/inpaint') {
    if (request.method !== 'POST') return json({ error: '方法不支持' }, 405);
    if (!originOk(request, url)) return json({ error: '请求来源无效' }, 403);
    if (!request.headers.get('content-type')?.startsWith('application/json')) return json({ error: '请求类型无效' }, 415);
    limit(`inpaint:${request.headers.get('x-forwarded-for') || 'local'}`, 10);
    const body = await request.json().catch(() => null) as { source?: string; width?: number; height?: number; elements?: string[] } | null;
    if (!body) return json({ error: '请求体无效' }, 400);
    if (typeof body.source !== 'string' || !/^data:image\/(png|jpeg|webp);base64,/.test(body.source) || body.source.length > 30e6) return json({ error: '原图数据无效' }, 400);
    if (![body.width, body.height].every(v => typeof v==='number' && Number.isInteger(v) && v >= 256 && v <= 4096)) return json({ error: '画布尺寸无效' }, 400);
    const elements = Array.isArray(body.elements) ? body.elements.filter((e): e is string => typeof e === 'string' && !!e.trim()) : [];
    if (!elements.length || elements.length > 12 || elements.some(e => e.length > 80)) return json({ error: '补绘元素列表无效' }, 400);
    const w = Number(body.width), h = Number(body.height);
    const scale = Math.max(1, Math.sqrt(3686400 / (w * h)));
    let sw = Math.round(w * scale), sh = Math.round(h * scale);
    if (sw > 4096 || sh > 4096) { const s = Math.min(4096 / sw, 4096 / sh); sw = Math.round(sw * s); sh = Math.round(sh * s); }
    const prompt = `移除画面中的以下元素：${elements.join('、')}。被移除区域用周围背景的纹理、光影与色调自然延续补全；画面其余区域保持与原图一致。不要添加新的元素、文字或水印。输出完整画面。`;
    const client = new ImageGenerationClient(new Config({timeout:270000,retryTimes:0}), HeaderUtils.extractForwardHeaders(request.headers));
    const result = await withDeadline(client.generate({ prompt, image: body.source, size: `${sw}x${sh}`, watermark: false, responseFormat: 'url' }), '背景补绘服务');
    if (result.error?.message) throw new Fault(502, `补绘模型返回错误：${result.error.message}`);
    const first = result.data?.[0];
    if (first?.error?.message) throw new Fault(502, `补绘模型返回错误：${first.error.message}`);
    let bytes: Buffer | null = null;
    if (first?.b64_json) bytes = Buffer.from(first.b64_json, 'base64');
    else if (first?.url) { stage='下载生成图片';const res = await fetch(first.url,{signal:AbortSignal.timeout(45000)}); if (!res.ok) throw new Fault(502, `补绘结果下载失败（HTTP ${res.status}）`); bytes = Buffer.from(await res.arrayBuffer()); }
    if (!bytes?.length) throw new Fault(502, '补绘模型未返回图片数据');
    const ext = detectExt(bytes);
    const id = crypto.randomUUID();
    stage='保存图片';await putObject(`generated/${id}.${ext}`, bytes.toString('base64'));
    return json({ id, url: `/api/generated/${id}.${ext}`, model: result.model || '' });
  }
  if (request.method !== 'POST') return json({ error: '方法不支持' }, 405);
  if (!originOk(request, url)) return json({ error: '请求来源无效' }, 403);
  if (!request.headers.get('content-type')?.startsWith('application/json')) return json({ error: '请求类型无效' }, 415);
  limit(`generate:${request.headers.get('x-forwarded-for') || 'local'}`, 30);
  const body = await request.json().catch(() => null) as { part?: string; prompt?: string; width?: number; height?: number; references?: string[] } | null;
  if (!body) return json({ error: '请求体无效' }, 400);
  if (!body.part || !PARTS.includes(body.part as PartName)) return json({ error: '部位无效' }, 400);
  const part = body.part as PartName;
  if (typeof body.prompt !== 'string' || !body.prompt.trim() || body.prompt.length > 16000) return json({ error: '生成说明无效' }, 400);
  if (![body.width, body.height].every(v => typeof v==='number' && Number.isInteger(v) && v >= 256 && v <= 4096)) return json({ error: '画布尺寸无效' }, 400);
  const references=body.references||[];
  if(!Array.isArray(references)||references.length>12||references.some(s=>typeof s!=='string'||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(s)||s.length>12e6)||references.reduce((n,s)=>n+s.length,0)>48e6)return json({error:'参考图过多或过大，请缩小图片后再试。'},400);
  const finalPrompt = `${body.prompt.trim()}\n\n输出要求：这是一张要印刷到车身上的平面装饰图案设计稿，铺满整幅、纯二维平面图形，不出现任何实体车辆元素（整车、车身、车窗、轮毂），不得出现“车中套车”或多车重复的嵌套构图；输出一张完整设计画面（整图，不拆分图层），画幅比例约 ${body.width}×${body.height}；主体完整、构图饱满，画面边缘不得留白或出现画框描边；不要输出任何文字说明。`;
  const client = new ImageGenerationClient(new Config({timeout:270000,retryTimes:0}), HeaderUtils.extractForwardHeaders(request.headers));
  const result = await withDeadline(client.generate({ prompt: finalPrompt, ...(references.length?{image:references}:{}), size: GEN_SIZES[part], watermark: false, responseFormat: 'url' }), '生图服务');
  if (result.error?.message) throw new Fault(502, `生图模型返回错误：${result.error.message}`);
  const first = result.data?.[0];
  if (first?.error?.message) throw new Fault(502, `生图模型返回错误：${first.error.message}`);
  let bytes: Buffer | null = null;
  if (first?.b64_json) bytes = Buffer.from(first.b64_json, 'base64');
  else if (first?.url) { stage='下载生成图片';const res = await fetch(first.url,{signal:AbortSignal.timeout(45000)}); if (!res.ok) throw new Fault(502, `生成结果下载失败（HTTP ${res.status}）`); bytes = Buffer.from(await res.arrayBuffer()); }
  if (!bytes?.length) throw new Fault(502, '生图模型未返回图片数据');
  const ext = detectExt(bytes);
  const id = crypto.randomUUID();
  stage='保存图片';await putObject(`generated/${id}.${ext}`, bytes.toString('base64'));
  return json({ id, url: `/api/generated/${id}.${ext}`, part, referenceCount:references.length, requestId, size: first.size || GEN_SIZES[part], model: result.model || '' });
} catch (err) {
  if (err instanceof Fault) return json({ error: err.message,requestId }, err.status);
  const failure=generationFailure(err,stage);
  console.error('Generation failed', {requestId,stage,name:err instanceof Error?err.name:'UnknownError',message:err instanceof Error?err.message:String(err),code:err instanceof Error?(err as NodeJS.ErrnoException).code:undefined,status:failure.status});
  return json({ error: failure.message,requestId }, failure.status);
} }
