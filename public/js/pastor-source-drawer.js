// In-workspace source reader. Opening a source never replaces the preparation or its notes.
export function createSourceDrawer(C, onCollect) {
  let dialog=null, sequence=0, stack=[];
  const esc=C.esc, canonical=href=>href.startsWith('#/')?href.slice(1):href;
  function close(){sequence++;dialog?.close();dialog?.remove();dialog=null;stack=[];}
  function shell(){
    if(dialog)return;
    dialog=document.createElement('dialog');dialog.className='pastor-source-drawer';dialog.setAttribute('aria-labelledby','source-title');
    dialog.innerHTML='<header><button type="button" data-source-back class="btn">← Previous source</button><span class="eyebrow">EREUNIA / SOURCE READER</span><button type="button" data-source-close class="btn" aria-label="Close source reader">Close ×</button></header><div class="source-reader-body" tabindex="-1"></div>';
    document.body.append(dialog);dialog.querySelector('[data-source-close]').onclick=close;
    dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
    dialog.querySelector('[data-source-back]').onclick=()=>{stack.pop();show(stack.pop());};
    dialog.addEventListener('click',e=>{const a=e.target.closest('a[href]');if(a&&supports(a.getAttribute('href'))&&!e.ctrlKey&&!e.metaKey){e.preventDefault();show(a.getAttribute('href'));}});
    dialog.showModal();
  }
  function supports(href=''){return (/^\/(word|read|person|place|discoveries)\//.test(canonical(href))||/^\/(library|books)(?:[#?]|$)/.test(canonical(href))||/^\/history\/timeline#e/.test(canonical(href)));}
  async function show(href){
    if(!supports(href))return; shell();stack.push(href);const ticket=++sequence,body=dialog.querySelector('.source-reader-body');
    dialog.querySelector('[data-source-back]').hidden=stack.length<2;body.innerHTML='<h2 id="source-title">Opening source…</h2>';
    try{
      const parts=canonical(href).split('?')[0].split('/').filter(Boolean),kind=parts[0],id=decodeURIComponent(parts[1]||'');let html='',collected=null;
      if(kind==='word'){
        const e=await C.loadLex(id);if(!e)throw new Error('This lexicon entry is not available.');
        const refs=e.refs||[];const rows=await Promise.all(refs.slice(0,20).map(async n=>{const r=C.unpackRef(n),ref=C.formatRef(r.book,r.chapter,r.verse);return `<a class="drawer-verse" href="${C.readUrl('kjv',r.book,r.chapter,r.verse)}"><b>${esc(ref)}</b><span>${esc(await C.verseText('kjv',C.toOsis(r.book,r.chapter,r.verse)).catch(()=>''))}</span></a>`;}));
        html=`<span class="eyebrow">ORIGINAL WORD / ${esc(C.displayStrong(id))}</span><h2 id="source-title" class="source-lemma" lang="${id[0]==='G'?'grc':'hbo'}">${esc(e.lemma)}</h2><p>${esc(e.translit)} · ${esc(e.gloss)}</p><div class="lexdef">${e.def||''}</div><p class="small">STEPBible Translators Brief Lexicon · CC BY 4.0. Context determines the sense; a definition is not a complete interpretation.</p><h3>Elsewhere in Scripture</h3><p class="small">First ${rows.length} of ${refs.length} verse references.</p>${rows.join('')}`;
        collected={kind:'word',text:`${e.lemma} (${e.translit}): ${e.gloss}`,cite:`${C.displayStrong(id)}, STEPBible lexicon (CC BY 4.0)`,href:canonical(href)};
      }else if(kind==='read'){
        const ref=C.fromOsis(parts[2]),t=C.TR[id]?id:'kjv';if(!ref)throw new Error('The Scripture reference could not be read.');
        const book=await C.loadBook(t,ref.book),chapter=book.chapters[ref.chapter-1]||[],v=ref.verse||1,start=Math.max(1,v-2),end=Math.min(chapter.length,v+3),title=C.formatRef(ref.book,ref.chapter,start,end);
        html=`<span class="eyebrow">RELATED SCRIPTURE / ${esc(C.META[t].name)}</span><h2 id="source-title">${esc(title)}</h2><div class="drawer-scripture">${chapter.slice(start-1,end).map((text,i)=>`<p class="${start+i===v?'source-selected':''}"><sup>${start+i}</sup> ${esc(text)}</p>`).join('')}</div><p class="small">The selected verse is highlighted with nearby verses for context.</p>`;
        collected={kind:'xref',text:chapter[v-1]||'',cite:`${C.formatRef(ref.book,ref.chapter,v)} (${C.TR[t]})`,href:canonical(href)};
      }else if(kind==='person'||kind==='place'){
        const p=await C.H[kind](id);if(!p)throw new Error('This background record is not available.');
        html=`<span class="eyebrow">${kind==='person'?'PERSON':'PLACE'} / BACKGROUND</span><h2 id="source-title">${esc(p.name)}</h2><p>${esc(p.desc||p.comment||p.type||'')}</p>${p.other?`<p>${esc(p.other)}</p>`:''}${p.dict?`<h3>Historical dictionary</h3><p class="preserve-lines">${esc(p.dict)}</p><p class="small">Easton's Bible Dictionary (1897), public domain. Historical views and place identifications may be outdated.</p>`:''}${kind==='place'?`<p class="small">Location status: ${esc(p.cls||'unknown')}. ${p.lat!=null&&p.cls!=='unknown'?esc(`${p.lat.toFixed(2)}°, ${p.lon.toFixed(2)}°`):'No confirmed map position recorded.'}</p>`:''}<p class="small">Record: Theographic, CC BY-SA 4.0.</p>`;
        collected={kind:'context',text:`${p.name}: ${p.desc||p.comment||p.type||''}`,cite:'Theographic (CC BY-SA 4.0)',href:canonical(href)};
      }else if(kind==='library'){
        html=`<span class="eyebrow">MANUSCRIPT SHELF</span><h2 id="source-title">Witnesses to the text</h2><p class="small">These reference images illustrate manuscript history; they do not show the selected passage unless their caption says so.</p>${['sinaiticus','aleppo','p52','isaiah-scroll'].map(image=>`<figure>${C.pic(image,{cls:'source-artwork'})}<figcaption class="small">${C.credit(image)}</figcaption></figure>`).join('')}${(C.MANUSCRIPTS||[]).map(m=>`<h3>${esc(m.name)}</h3><p>${esc(m.date||'')} ${esc(m.desc||m.note||'')}</p>`).join('')}`;
      }else if(kind==='books'){
        const b=C.studyBook,c=C.CONTEXT[b];html=`<span class="eyebrow">BOOK BACKGROUND</span><h2 id="source-title">${esc(C.NAMES[b])}</h2><h3>Authorship</h3><p>${esc(c[0])}</p><h3>Dating</h3><p>${esc(c[1])}</p><h3>Setting</h3><p>${esc(c[4])}</p><h3>Themes</h3><p>${esc(c[5])}</p><p class="small">Ereunia book notes. Historical and traditional readings should be weighed with the passage.</p>`;
      }else if(kind==='history'){
        const eventId=Number(canonical(href).split('#e')[1]),record=(await C.H.eventMap()).get(eventId);if(!record)throw new Error('The event record could not be loaded.');
        html=`<span class="eyebrow">PASSAGE TIMELINE</span><h2 id="source-title">${esc(record.title)}</h2><p>${esc(C.yearText(record.year))} · ${esc(C.dateCertainty(record.year).label)}</p><p class="small">Theographic, CC BY-SA 4.0. These dates follow a traditional chronology and should not be treated as precisely established historical dates.</p>`;
        collected={kind:'context',text:record.title+': '+C.yearText(record.year),cite:'Theographic (CC BY-SA 4.0), traditional chronology',href:canonical(href)};
      }else{
        const d=C.DISCOVERIES.find(x=>x.id===id);if(!d)throw new Error('This discovery record is not available.');
        html=`<span class="eyebrow">${esc(d.kind)} / ${esc(d.status)}</span><h2 id="source-title">${esc(d.name)}</h2>${d.image?.local?`<figure>${C.discImg(d,{cls:'source-artwork',eager:true})}<figcaption class="small">${C.discCredit(d)}</figcaption></figure>`:''}<p>${esc(d.summary)}</p><p>${esc(d.description||'')}</p><h3>Connection with Scripture</h3><p>${esc(d.connection||'')}</p><h3>What it establishes</h3><p>${esc(d.establishes||'')}</p><h3>Limits & uncertainty</h3><p>${esc(d.limits||'')}</p><h3>Sources</h3>${(d.sources||[]).map(s=>`<p><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)} ↗</a><br><small>${esc(s.publisher||'')}</small></p>`).join('')}`;
        collected={kind:'discovery',text:`${d.name}: ${d.summary} Limits: ${d.limits||'See the record.'}`,cite:(d.sources||[]).map(s=>s.publisher||s.title).join('; '),href:canonical(href)};
      }
      if(ticket!==sequence||!dialog)return;
      body.innerHTML=collected?html.replace('</h2>','</h2><button type="button" class="btn pri" data-collect-source>+ Keep in collected material</button>'):html;
      body.querySelector('[data-collect-source]')?.addEventListener('click',e=>{onCollect(collected);e.currentTarget.disabled=true;e.currentTarget.textContent='Kept with this passage ✓';});
      body.scrollTop=0;body.focus({preventScroll:true});
    }catch(e){if(ticket===sequence&&dialog)body.innerHTML=`<h2 id="source-title">Source unavailable</h2><p>${esc(e.message)}</p><p>Your preparation is still here. Close this reader to continue.</p>`;}
  }
  function artwork(image){
    close();shell();const body=dialog.querySelector('.source-reader-body');dialog.querySelector('[data-source-back]').hidden=true;
    body.innerHTML=`<span class="eyebrow">STUDY GALLERY / EDITORIAL IMAGE</span><h2 id="source-title">${C.credit(image)}</h2>${C.pic(image,{cls:'source-artwork',eager:true})}<p class="small">A visual signpost for the study activity. This image does not depict or establish the events of your chosen passage. Image credits and licensing are recorded in Ereunia's Library.</p>`;
  }
  return {show,supports,artwork,close};
}
