import test from 'node:test';
import assert from 'node:assert/strict';
import {renderGameMenu} from '../src/game-menu.js';
import {Game} from '../src/game.js';
import {translator} from '../src/i18n.js';

test('the central clinic menu exposes both saving and loading in each language',()=>{
 for(const lang of ['de','en']){
  const copy=(en,de)=>lang==='de'?de:en;
  const html=renderGameMenu(new Game(),{open:true,section:'clinic',helpers:{t:translator(lang),copy,label:v=>Array.isArray(v)?v[lang==='de'?1:0]:v,escape:v=>v,btn:(action,body,cls,attrs)=>`<button data-action="${action}" ${attrs}>${body}</button>`}});
  assert.equal((html.match(/data-action="save"/g)||[]).length,1,'Save must remain reachable');
  assert.equal((html.match(/data-action="load-game"/g)||[]).length,1,'Loading must be reachable without reloading the page');
  assert.match(html,new RegExp(`data-action="load-game"[^>]*aria-label="${copy('Load session','Sitzung laden')}"`));
 }
});
