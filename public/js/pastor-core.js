// Sermon records are independent of passages. Pure export/restore helpers also run in Node tests.
import { STEPS, KIND_LABEL } from './prep-core.js';
import { crc32 } from './docx.js';
export const RECORD_KEY = 'ereunia:pastor-library:v1';
export const BLOCK_TYPES = { paragraph:'Manuscript', heading:'Heading', scripture:'Scripture quotation', quote:'Sourced quotation', illustration:'Illustration', transition:'Transition', application:'Application', cue:'Private delivery cue' };
export const uid = () => crypto.randomUUID();
export const stamp = () => new Date().toISOString();
export function newSermon(passage, label, id = uid()) {
  return { id, passage, label, title:label, speaker:'', date:'', venue:'', series:'', topics:'', status:'draft', idea:'', duration:25, blocks:[], study:null, questions:'', family:'', transcript:'', timestamps:[], versions:[], created:stamp(), updated:stamp() };
}
const text = (x, max=200000) => typeof x === 'string' ? x.slice(0,max) : '';
export function cleanSermon(x) {
  if (!x || !/^[a-zA-Z0-9-]{1,80}$/.test(x.id || '') || !/^[1-3]?[A-Za-z]+\.\d+(?:\.\d+(?:-\d+)?)?$/.test(x.passage || '')) throw new Error('Invalid sermon record');
  const p = newSermon(x.passage, text(x.label,150),x.id);
  for (const k of ['title','speaker','date','venue','series','topics','idea','questions','family','transcript','created','updated']) p[k] = text(x[k]);
  p.title ||= p.label; p.status = ['draft','ready','preached'].includes(x.status) ? x.status : 'draft'; p.duration = Math.max(1,Math.min(180,Number(x.duration)||25));
  p.blocks = (Array.isArray(x.blocks) ? x.blocks : []).slice(0,300).map(b => ({ id:text(b.id,80)||uid(), type:BLOCK_TYPES[b.type] ? b.type : 'paragraph', text:text(b.text), cite:text(b.cite,2000), observation:text(b.observation,10000), interpretation:text(b.interpretation,10000), application:text(b.application,10000) }));
  p.study = x.study && typeof x.study === 'object' ? x.study : null;
  p.timestamps = (Array.isArray(x.timestamps) ? x.timestamps : []).filter(t=>Number.isFinite(t.seconds)&&t.seconds>=0).map(t=>({seconds:t.seconds,text:text(t.text,500)})).slice(0,1000);
  p.versions = (Array.isArray(x.versions) ? x.versions : []).filter(v=>v && v.record && !v.record.versions).slice(0,8).flatMap(v=>{try{return [{at:text(v.at,50),record:(({versions,...r})=>r)(cleanSermon({...v.record,versions:[]}))}];}catch{return [];}});
  return p;
}
export function snapshot(p) { const { versions, ...record } = structuredClone(p); return { at:stamp(), record }; }
export function fromStudy(p, study) {
  const q = structuredClone(p); q.study = structuredClone(study); if (!q.idea) q.idea = study.idea || '';
  for (const pt of study.points || []) {
    q.blocks.push({id:uid(),type:'heading',text:pt.text||'Point',cite:''});
    for (const b of pt.blocks || []) q.blocks.push({ id:uid(), type: b.kind==='verse'||b.kind==='xref' ? 'scripture' : b.kind==='commentary' ? 'quote' : b.kind==='discovery' ? 'illustration' : 'paragraph', text:b.text||'',cite:b.cite||'' });
  }
  return q;
}
export const wordCount = p => p.blocks.filter(b=>b.type!=='cue').map(b=>b.text).join(' ').trim().split(/\s+/).filter(Boolean).length;
export const fileStem = p => (p.title||p.label||'sermon').replace(/[^\p{L}\p{N} _-]/gu,'').trim().slice(0,75)||'sermon';
export const timeLabel = s => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
export const FORMATS = { manuscript:'Sermon manuscript', pulpit:'Pulpit copy', dossier:'Study dossier', handout:'Congregation handout', group:'Small-group guide', family:'Family take-home', slides:'Presentation slides' };
export function sermonDoc(p, kind='manuscript', { privateNotes=false }={}) {
  const out = [{type:'title',text:p.title},{type:'subtitle',text:[FORMATS[kind]||FORMATS.manuscript,p.label,p.date,p.speaker,p.venue].filter(Boolean).join(' · ')}];
  if(p.idea) out.push({type:'h1',text:p.idea});
  const shared = ['handout','group','family','slides'].includes(kind);
  if(kind==='dossier' && p.study) {
    for(const [k,label] of STEPS) if(p.study.steps?.[k]?.notes && privateNotes) out.push({type:'h2',text:label},{type:'p',text:p.study.steps[k].notes});
    for(const b of p.study.inbox || []) if(privateNotes||!['note','personal'].includes(b.kind)) out.push({type:'h2',text:KIND_LABEL[b.kind]||'Collected material'},{type:'p',text:b.text},{type:'cite',text:b.cite||'Personal note; no external source supplied'});
  }
  if(kind!=='family') for(const b of p.blocks) {
    if(b.type==='cue' && (!privateNotes||shared)) continue;
    if(shared && !['heading','scripture','application'].includes(b.type)) continue;
    out.push({type:b.type==='heading'?'h2':b.type==='scripture'||b.type==='quote'?'quote':b.type==='cue'?'cite':'p',text:(b.type==='cue'?'[DELIVERY] ':'')+b.text});
    if(b.cite) out.push({type:'cite',text:b.cite});
    if(kind==='dossier'&&privateNotes) for(const k of ['observation','interpretation','application']) if(b[k]) out.push({type:'h2',text:k[0].toUpperCase()+k.slice(1)},{type:'p',text:b[k]});
  }
  if(kind==='handout') out.push({type:'h2',text:'Notes and reflection'},{type:'p',text:'________________________________________________________________\n\n________________________________________________________________\n\n________________________________________________________________'});
  if(kind==='group') out.push({type:'h2',text:'Discuss together'},{type:'p',text:p.questions || 'Read the passage together. What do you notice? What does it teach in context? How will you respond this week?\n\nAdd your own questions in the sermon workspace.'});
  if(kind==='family') out.push({type:'h2',text:'Read, talk, live'},{type:'p',text:p.family||'Read the passage together. Retell it in your own words. Talk about one thing you learned and pray together.\n\nAdd a passage-specific family activity in the sermon workspace.'});
  out.push({type:'cite',text:'Prepared with Ereunia · ereunia.com. Scripture quotations and source citations belong to their named editions and authors.'});
  return out.filter(b=>b.text?.trim());
}
export function readBackupZip(bytes) {
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength), files=new Map(); let at=0;
  while(at+30<=bytes.length && view.getUint32(at,true)===0x04034b50) {
    if(view.getUint16(at+8,true)!==0 || view.getUint16(at+6,true)&8) throw new Error('Use a backup ZIP created by Ereunia.');
    const size=view.getUint32(at+18,true), nl=view.getUint16(at+26,true), xl=view.getUint16(at+28,true), start=at+30+nl+xl;
    if(start+size>bytes.length) throw new Error('Incomplete backup');
    const name=new TextDecoder().decode(bytes.slice(at+30,at+30+nl)), data=bytes.slice(start,start+size);
    if(crc32(data)!==view.getUint32(at+14,true)||files.has(name)) throw new Error('Damaged backup');
    files.set(name,data); at=start+size;
  }
  if(!files.has('library.json')) throw new Error('Missing library.json');
  const meta=JSON.parse(new TextDecoder().decode(files.get('library.json')));
  if(meta.format!=='ereunia-pastor-backup-v1'||!Array.isArray(meta.records)||!Array.isArray(meta.audio)) throw new Error('Unrecognised backup');
  return {records:meta.records.map(cleanSermon),audio:meta.audio,files};
}

export function offlineSermonHtml(p) {
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const body=sermonDoc(p,'pulpit',{privateNotes:true}).map(b=>`<${['title','h1','h2'].includes(b.type)?'h2':'p'}>${escape(b.text).replace(/\n/g,'<br>')}</${['title','h1','h2'].includes(b.type)?'h2':'p'}>`).join('');
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(p.title)} · Ereunia pulpit copy</title><style>body{margin:0;background:#f5efe6;color:#15120e}header{position:sticky;top:0;background:#15120e;color:#f2c14e;padding:12px 24px;font:16px system-ui;display:flex;gap:20px;align-items:center;flex-wrap:wrap}button{padding:8px 16px}main{max-width:850px;margin:auto;padding:32px;font:30px/1.65 Georgia,serif}h2{line-height:1.25;font-size:1.4em}small{font:14px system-ui}@media print{header{display:none}}</style><header><b>EREUNIA / OFFLINE PULPIT COPY</b><small>Private delivery cues included. Keep this file private.</small></header><main>${body}</main></html>`;
}
