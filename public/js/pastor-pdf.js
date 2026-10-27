// Self-hosted PDF library and font. No sermon text leaves the device.
import { sermonDoc, FORMATS } from './pastor-core.js';
import { LOGO_PNG } from './document-brand.js';
let pdfLib, font;
async function engine() {
  pdfLib ||= new Promise((resolve,reject)=>{if(globalThis.jspdf)return resolve(globalThis.jspdf.jsPDF);const s=document.createElement('script');s.src='/js/vendor/jspdf.umd.min.js';s.onload=()=>resolve(globalThis.jspdf.jsPDF);s.onerror=()=>{pdfLib=null;reject(new Error('PDF engine could not load. Please reconnect and retry.'));};document.head.append(s);});
  font ||= fetch('/fonts/NotoSans-Regular.ttf').then(r=>{if(!r.ok)throw new Error('PDF font unavailable');return r.arrayBuffer();}).then(b=>{let s='';for(const n of new Uint8Array(b))s+=String.fromCharCode(n);return btoa(s);}).catch(e=>{font=null;throw e;});
  return {jsPDF:await pdfLib,font:await font};
}
export async function createSermonPdf(p,kind,options={}) { const e=await engine();return buildSermonPdf(e.jsPDF,e.font,p,kind,options); }
export function buildSermonPdf(jsPDF,font,p,kind,{paper='a4',privateNotes=false}={}) {
  const doc=new jsPDF({unit:'pt',format:kind==='slides'?[960,540]:paper==='letter'?'letter':'a4',orientation:kind==='slides'?'landscape':'portrait',compress:true});
  doc.addFileToVFS('NotoSans.ttf',font);doc.addFont('NotoSans.ttf','NotoSans','normal');doc.setFont('NotoSans');
  const blocks=sermonDoc(p,kind,{privateNotes});
  // Never silently output missing glyphs. DOCX retains every script when PDF font coverage is insufficient.
  const cmap=doc.getFont().metadata?.cmap?.unicode?.codeMap;
  for(const b of blocks) for(const ch of b.text) if(ch.codePointAt(0)>32 && cmap && !cmap[ch.codePointAt(0)]) throw new Error('This text includes characters outside the PDF font. Download Word to retain them.');
  if(blocks.some(b=>/[\u0590-\u08ff]/.test(b.text))) throw new Error('For Hebrew or Arabic layout, download Word or use the passage print view.');
  const w=doc.internal.pageSize.getWidth(),h=doc.internal.pageSize.getHeight(),m=48,width=w-m*2;
  const accent=kind==='family'?'#376F64':kind==='group'?'#8D4937':'#9D762D';
  const cover=['manuscript','pulpit','dossier'].includes(kind),slide=kind==='slides';let y=100;
  const logo=(x,y,size=115)=>doc.addImage(LOGO_PNG,'PNG',x,y,size,size/4);
  const seal=(x,y,r)=>{doc.setDrawColor(accent);doc.setLineWidth(.65);doc.circle(x,y,r);doc.circle(x,y,r-7);doc.line(x-r-12,y,x+r+12,y);doc.line(x,y-r-12,x,y+r+12);doc.setFillColor(accent);doc.circle(x,y,3,'F');};
  const header=()=>{doc.setFillColor('#FFFCF7');doc.rect(0,0,w,h,'F');doc.setFillColor(accent);doc.rect(0,0,6,h,'F');logo(m,24,92);doc.setFont('NotoSans');doc.setTextColor(accent);doc.setFontSize(8);doc.text((FORMATS[kind]||'EREUNIA RESEARCH').toUpperCase(),w-m,40,{align:'right'});doc.setDrawColor('#DED5C6');doc.line(m,65,w-m,65);doc.setTextColor('#15120E');};
  const newPage=()=>{doc.addPage();header();y=100;};
  if(cover){
    doc.setFillColor('#F5EFE6');doc.rect(0,0,w,h,'F');logo(m,42,155);doc.setFont('NotoSans');doc.setTextColor(accent);doc.setFontSize(9);doc.text('EREUNIA EDITIONS  /  '+FORMATS[kind].toUpperCase(),m,130);doc.setDrawColor(accent);doc.line(m,146,w-m,146);
    doc.setFont('NotoSans');doc.setFontSize(34);doc.setTextColor('#15120E');const title=doc.splitTextToSize(p.title,width-20);if(title.length>7)throw new Error('Use a shorter document title (up to seven lines).');doc.text(title,m,200,{lineHeightFactor:1.27});
    const titleBottom=200+(title.length-1)*43;doc.setFontSize(12);doc.setTextColor('#675F54');doc.text(p.label,m,titleBottom+40);
    doc.setFillColor('#142C30');doc.rect(0,h-225,w,225,'F');doc.setTextColor('#EDC873');doc.setFontSize(10);doc.text('SEARCH THE SCRIPTURES',m,h-180);doc.setTextColor('#FFFCF7');doc.setFontSize(15);const meta=[p.speaker,p.series,p.date,p.venue].filter(Boolean).join('  /  ');doc.text(doc.splitTextToSize(meta||'A message prepared from the text',width-105),m,h-145);seal(w-m-30,h-140,31);doc.setFontSize(9);doc.setTextColor('#EDC873');doc.text('SCRIPTURE FIRST.  SOURCES VISIBLE.  YOUR VOICE.',m,h-50);newPage();
  }else header();
  for(const b of blocks) {
    if(cover&&b.type==='title')continue;
    if(slide&&['h1','h2'].includes(b.type)&&y>110)newPage();
    const size=slide?(b.type==='cite'?11:b.type==='subtitle'?15:b.type==='title'?36:25):b.type==='title'?29:b.type==='h1'?20:b.type==='h2'?16:b.type==='cite'?8.5:kind==='pulpit'?18:11;
    const line=size*1.55,gap=['title','h1','h2'].includes(b.type)?16:10;
    doc.setFont('NotoSans');doc.setFontSize(size);if(y+line*2>h-58)newPage();
    y+=gap;doc.setTextColor(b.type==='cite'?'#675F54':b.type==='h2'?accent:'#15120E');
    const lines=doc.splitTextToSize(b.text,width-(b.type==='quote'?18:0));
    for(const t of lines){if(y+line>h-50){newPage();doc.setFontSize(size);doc.setTextColor(b.type==='cite'?'#675F54':'#15120E');}if(b.type==='quote'){doc.setDrawColor(accent);doc.setLineWidth(1.4);doc.line(m,y-size,m,y+line-size);}doc.text(t,m+(b.type==='quote'?18:0),y);y+=line;}
  }
  const pages=doc.getNumberOfPages();for(let n=1;n<=pages;n++){doc.setPage(n);doc.setFont('NotoSans');doc.setFontSize(8);doc.setTextColor(n===1&&cover?'#EDC873':'#675F54');doc.text('EREUNIA  /  '+(FORMATS[kind]||'RESEARCH').toUpperCase(),m,h-25);doc.text(`${n} / ${pages}`,w-m,h-25,{align:'right'});doc.link(m,h-36,160,18,{url:'https://ereunia.com'});}
  doc.setProperties({title:p.title,author:'Ereunia',subject:FORMATS[kind]||kind});return new Uint8Array(doc.output('arraybuffer'));
}
