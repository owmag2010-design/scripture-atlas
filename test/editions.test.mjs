import test from 'node:test';import assert from 'node:assert/strict';
import {validateSuggestions,shareableDraft} from '../public/js/pastor-ai-core.js';
import {buildDocx} from '../public/js/docx.js';import {readBackupZip} from '../public/js/pastor-core.js';
const sources=[{id:'S1',text:'The sower soweth the word.'}];
test('AI suggestions retain only supported source identifiers and verified quotations',()=>{const good={type:'heading',text:'Listen to the word',cites:['S1','FAKE']};const raw={suggestions:[good,{type:'paragraph',text:'Unknown claim',cites:['FAKE']},{type:'paragraph',text:'Jesus said "you will all be wealthy tomorrow"',cites:['S1']},{type:'script',text:'bad',cites:['S1']}]};assert.deepEqual(validateSuggestions(raw,sources),[{...good,cites:['S1']}]);});
test('AI draft sharing excludes delivery cues',()=>assert.equal(shareableDraft({blocks:[{type:'cue',text:'PRIVATE'},{type:'paragraph',text:'PUBLIC'}]}),'PUBLIC'));
