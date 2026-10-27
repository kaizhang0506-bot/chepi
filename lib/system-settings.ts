let settings={referencesEnabled:true,generationGuidance:''};
export const systemSettings=()=>({...settings});
export async function refreshSystemSettings(){const r=await fetch('/api/account/settings',{credentials:'same-origin',signal:AbortSignal.timeout(10000)});if(!r.ok)return;const value=await r.json() as {settings?:{referencesEnabled?:boolean;generationGuidance?:string}};settings={referencesEnabled:value.settings?.referencesEnabled!==false,generationGuidance:value.settings?.generationGuidance||''};}
