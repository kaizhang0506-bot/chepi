export function originOk(request: Request, url: URL): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  const allowed = new Set<string>([url.origin]);
  const fh = request.headers.get('x-forwarded-host'), fp = request.headers.get('x-forwarded-proto');
  if (fh) for (const p of new Set([fp || 'https', 'https', 'http'])) allowed.add(`${p}://${fh}`);
  const rp = request.headers.get('rpc-persist-host');
  if (rp) for (const p of ['https', 'http']) allowed.add(`${p}://${rp}`);
  try { const o = new URL(origin); if (/\.(dev\.coze\.site)$/i.test(o.hostname)) allowed.add(origin); } catch { return false; }
  return allowed.has(origin);
}
