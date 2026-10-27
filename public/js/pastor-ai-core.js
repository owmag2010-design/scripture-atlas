import { quotesIn } from './ai-core.js';
export const AI_ACTIONS={research:'Explore the text',outline:'Shape an outline',questions:'Group questions',review:'Review my draft'};
export function validateSuggestions(raw,sources){
  if(!Array.isArray(raw?.suggestions))return [];
  const ids=new Map(sources.map(s=>[s.id,s]));
  const normal=s=>String(s).toLowerCase().replace(/[“”]/g,'"').replace(/[‘’]/g,"'").replace(/\s+/g,' ').trim();
  return raw.suggestions.slice(0,12).flatMap(b=>{
    if(!b||!['heading','paragraph','application','question','feedback'].includes(b.type)||typeof b.text!=='string')return [];
    const text=b.text.trim().slice(0,2000),cites=[...new Set((Array.isArray(b.cites)?b.cites:[]).filter(c=>ids.has(c)))];
    if(!text||!cites.length)return [];
    const evidence=cites.map(c=>ids.get(c).text).join(' ');
    if(quotesIn(text).some(q=>!normal(evidence).includes(normal(q))))return [];
    return [{type:b.type,text,cites}];
  });
}
export function shareableDraft(p){return (p.blocks||[]).filter(b=>b.type!=='cue').map(b=>b.text).join('\n\n').slice(0,18000);}
