const API='/api';
export async function api<T=any>(path:string,options:RequestInit={}){const res=await fetch(API+path,{...options,headers:{'Content-Type':'application/json',...(options.headers||{})}});if(!res.ok){const e=await res.json().catch(()=>({message:res.statusText}));throw new Error(Array.isArray(e.message)?e.message.join('，'):e.message||'请求失败')}return res.json() as Promise<T>}
export const json=(method:string,data:any):RequestInit=>({method,body:JSON.stringify(data)});
export const fmt=(v:any,digits=2)=>new Intl.NumberFormat('zh-CN',{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(Number(v||0));
export const day=(v:any)=>v?new Date(v).toLocaleDateString('zh-CN'):'';
export const today=()=>new Date().toISOString().slice(0,10);
