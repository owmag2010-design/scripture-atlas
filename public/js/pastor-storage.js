// Text and recovery copies stay on device; binary recordings/chunks use IndexedDB.
import { RECORD_KEY, cleanSermon, snapshot, stamp } from './pastor-core.js';
export function createSermonStore(storage=localStorage) {
  function read() { const raw=storage.getItem(RECORD_KEY); if(!raw)return []; const data=JSON.parse(raw); if(!Array.isArray(data))throw new Error('Library could not be read. Export your browser data before resetting it.'); return data.map(cleanSermon); }
  return { list:read, get:id=>read().find(p=>p.id===id), save(p,{checkpoint=false,force=false}={}) {
    const list=read(), idx=list.findIndex(x=>x.id===p.id), old=list[idx];
    if(old && old.updated!==p.updated && !force) throw new Error('This sermon changed in another tab. Download your draft, then reload before editing.');
    const next=cleanSermon(p);
    if(old && checkpoint) next.versions=[snapshot(old),...old.versions].slice(0,8);
    next.updated=new Date(Math.max(Date.now(), (Date.parse(old?.updated)||0)+1)).toISOString(); if(idx<0)list.unshift(next);else list[idx]=next;
    storage.setItem(RECORD_KEY,JSON.stringify(list)); return structuredClone(next);
  }};
}
let dbPromise;
export function audioDb() {
  if(!dbPromise) dbPromise=new Promise((resolve,reject)=>{const r=indexedDB.open('ereunia-sermon-audio',1);r.onupgradeneeded=()=>r.result.createObjectStore('files',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>{dbPromise=null;reject(r.error);};}); return dbPromise;
}
export async function audioWrite(file) { const db=await audioDb(); return new Promise((res,rej)=>{const tx=db.transaction('files','readwrite');tx.objectStore('files').put(file);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error||new Error('Audio save failed'));}); }
export async function audioList(sermon) {const db=await audioDb();return new Promise((res,rej)=>{const r=db.transaction('files').objectStore('files').getAll();r.onsuccess=()=>res(r.result.filter(f=>!sermon||f.sermon===sermon));r.onerror=()=>rej(r.error);});}
export async function audioDelete(id) {const db=await audioDb();return new Promise((res,rej)=>{const tx=db.transaction('files','readwrite');tx.objectStore('files').delete(id);tx.oncomplete=res;tx.onerror=()=>rej(tx.error);});}
