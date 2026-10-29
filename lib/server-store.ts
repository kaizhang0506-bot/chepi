import {S3Storage} from 'coze-coding-dev-sdk';

export interface StoreUser{id:string;username:string;password:string;role:string;disabled:number;created:number;must_change:number}
export interface StoreSession{token:string;user_id:string;expires:number}
export interface StoreDesign{id:string;user_id:string;name:string;object_key:string;created:number}
export interface StoreCase{id:string;user_id:string;title:string;style:string;tags:string;status:string;object_key:string;created:number}
export interface StoreAttempt{key:string;count:number;expires:number}
interface StoreDb{users:StoreUser[];sessions:StoreSession[];designs:StoreDesign[];cases:StoreCase[];settings:Record<string,string>;attempts:StoreAttempt[];objects:Record<string,string>}

const EMPTY: StoreDb = {users:[],sessions:[],designs:[],cases:[],settings:{},attempts:[],objects:{}};
const DB_PREFIX = 'db/snapshot-';

let cache: StoreDb = {...EMPTY};
let queue: Promise<unknown> = Promise.resolve();

let s3client: S3Storage | null = null;
function s3(): S3Storage {
  if (!s3client) s3client = new S3Storage({endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL, accessKey: '', secretKey: '', bucketName: process.env.COZE_BUCKET_NAME, region: 'cn-beijing'});
  return s3client;
}

async function listSnapshots(): Promise<string[]> {
  const res = await s3().listFiles({prefix: DB_PREFIX});
  return res.keys || [];
}

async function hydrate(): Promise<void> {
  try {
    const keys = await listSnapshots();
    if (!keys.length) {
      console.error('[store] 无历史快照，使用空库');
      return;
    }
    const latest = [...keys].sort().pop() as string;
    const raw = (await s3().readFile({fileKey: latest})).toString('utf8');
    cache = {...EMPTY, ...JSON.parse(raw) as StoreDb};
    console.error('[store] 已从 S3 水合数据库: ' + latest);
  } catch (err) {
    console.error('[store] 数据库水合失败，使用空库: ' + (err instanceof Error ? err.message : String(err)));
    cache = {...EMPTY};
  }
}
await hydrate();

function readDb(): StoreDb {
  return cache;
}

async function persist(): Promise<void> {
  const newKey = await s3().uploadFile({
    fileContent: Buffer.from(JSON.stringify(readDb()), 'utf8'),
    fileName: `db/snapshot-${Date.now()}.json`,
    contentType: 'application/json',
  });
  try {
    const keys = await listSnapshots();
    await Promise.all(keys.filter(k => k !== newKey).map(k => s3().deleteFile({fileKey: k}).catch(() => undefined)));
  } catch { /* 旧快照清理失败可忽略，下次 persist 会再清理 */ }
}

function enqueue<T>(fn: (db: StoreDb) => T, durable: boolean): Promise<T> {
  const task = queue.then(async () => {
    const db = readDb();
    const result = fn(db);
    if (durable) await persist();
    return result;
  });
  queue = task.then(() => undefined, () => undefined);
  return task;
}

export function mutate<T>(fn: (db: StoreDb) => T): Promise<T> {
  return enqueue(fn, true);
}

export function mutateLocal<T>(fn: (db: StoreDb) => T): Promise<T> {
  return enqueue(fn, false);
}

export function db(): StoreDb {
  return readDb();
}

export async function putObject(key: string, content: string): Promise<void> {
  const actual = await s3().uploadFile({fileContent: Buffer.from(content, 'utf8'), fileName: key, contentType: 'application/octet-stream'});
  await mutate(d => { d.objects[key] = actual; });
}

export async function getObject(key: string): Promise<string | null> {
  const actual = db().objects[key];
  if (!actual) return null;
  try {
    return (await s3().readFile({fileKey: actual})).toString('utf8');
  } catch {
    return null;
  }
}

export async function deleteObject(key: string): Promise<void> {
  const actual = db().objects[key];
  if (!actual) return;
  await s3().deleteFile({fileKey: actual}).catch(() => undefined);
  await mutate(d => { delete d.objects[key]; });
}