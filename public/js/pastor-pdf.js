// Self-hosted PDF library and font. No sermon text leaves the device.
import { sermonDoc } from './pastor-core.js';
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
  const w=doc.internal.pageSize.getWidth(),h=doc.internal.pageSize.getHeight(),m=48,width=w-m*2;let y=78;
  const header=()=>{doc.setFillColor('#15120E');doc.rect(0,0,w,38,'F');doc.setTextColor('#F2C14E');doc.setFontSize(11);doc.text('EREUNIA  /  PREPARE',m,24);doc.setTextColor('#15120E');};header();
  const newPage=()=>{doc.addPage();header();y=68;};
  for(const b of blocks) {
    if(kind==='slides'&&['h1','h2'].includes(b.type)&&y>85)newPage();
    const size=kind==='slides'?(b.type==='cite'?12:b.type==='subtitle'?16:b.type==='title'?38:26):b.type==='title'?28:b.type==='h1'?19:b.type==='h2'?15:b.type==='cite'?9:kind==='pulpit'?18:11;
    const line=size*1.52, gap=['title','h1','h2'].includes(b.type)?14:9;
    doc.setFontSize(size);if(y+line*2>h-55)newPage();
    y+=gap;doc.setTextColor(b.type==='cite'?'#6B6355':'#15120E');
    const lines=doc.splitTextToSize(b.text,width-(b.type==='quote'?14:0));
    for(const t of lines) { if(y+line>h-48){newPage();doc.setFontSize(size);doc.setTextColor(b.type==='cite'?'#6B6355':'#15120E');} doc.text(t,m+(b.type==='quote'?14:0),y);y+=line; }
  }
  const pages=doc.getNumberOfPages();for(let n=1;n<=pages;n++){doc.setPage(n);doc.setFontSize(8);doc.setTextColor('#6B6355');doc.text(`ereunia.com  ·  ${n} / ${pages}`,m,h-25);}
  doc.setProperties({title:p.title,author:'Ereunia',subject:kind});return new Uint8Array(doc.output('arraybuffer'));
}
