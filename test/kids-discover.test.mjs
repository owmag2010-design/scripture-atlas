import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {WORDS,QUESTS,READINGS,lookupWord,verseMatches,filterWords} from '../public/js/kids/discover-data.js';
import {addDiscovery,readPassport} from '../public/js/kids/discover.js';
import {KID_STORIES} from '../public/js/kids.js';
import {fromOsis} from '../public/js/ref.js';
import {fileId} from '../public/js/books.js';
const books=new Map();
function checkRef(ref){const r=fromOsis(ref);assert.ok(r,`Invalid reference ${ref}`);if(!books.has(r.book))books.set(r.book,JSON.parse(readFileSync(new URL(`../public/data/web/${fileId(r.book)}.json`,import.meta.url),'utf8')));const c=books.get(r.book).chapters[r.chapter-1];assert.ok(c,`Missing chapter ${ref}`);if(r.verse)assert.ok(c[r.verse-1],`Missing verse ${ref}`);}
test('every learning entry and quest leads to real Scripture and an existing story',()=>{
  assert.equal(new Set(WORDS.map(w=>w.id)).size,WORDS.length);
  for(const w of WORDS){assert.ok(w.simple && w.deeper && w.refs.length);w.refs.forEach(checkRef);}
  for(const r of READINGS)checkRef(r.ref);
  for(const q of QUESTS){checkRef(q.ref);assert.ok(WORDS.some(w=>w.id===q.word));assert.ok(KID_STORIES.some(s=>s.id===q.story));assert.ok(q.options[q.answer]);}
});
test('concordance matches words and phrases without partial or regex matches',()=>{
  assert.ok(verseMatches('Peace! Be still!', 'peace'));
  assert.ok(verseMatches('God is love.', 'God is love'));
  assert.equal(verseMatches('lovely things', 'love'),false);
  assert.equal(verseMatches('anything', '.*'),false);
  assert.equal(verseMatches('anything', ''),false);
  assert.equal(verseMatches('anything', '['),false);
});
test('word lookup handles punctuation and explicitly supported inflections',()=>{
  assert.equal(lookupWord('“Disciples,”')?.id,'disciple');
  assert.equal(lookupWord('forgiven')?.id,'forgiveness');
  assert.equal(lookupWord('shepherd’s')?.id,'shepherd');
  assert.equal(lookupWord('unrecognised'),null);
  assert.equal(filterWords('Noah','Places').length,0);
  assert.ok(filterWords('covenant').some(w=>w.id==='covenant'));
});
test('discovery progress is idempotent and keeps other study data intact',()=>{
  const settings=new Map([['adult-note','keep this']]);const store={setting:(k,f)=>settings.has(k)?settings.get(k):f,setSetting:(k,v)=>settings.set(k,v)};
  addDiscovery(store,'words','peace');addDiscovery(store,'words','peace');addDiscovery(store,'passages','Mark.4');
  assert.deepEqual(readPassport(store),{words:['peace'],passages:['Mark.4'],quests:[]});
  assert.equal(settings.get('adult-note'),'keep this');
  settings.set('kids-discovery-v1',{words:'bad imported value',passages:[null,42,'Ps.23']});
  assert.deepEqual(readPassport(store),{words:[],passages:['Ps.23'],quests:[]});
});
