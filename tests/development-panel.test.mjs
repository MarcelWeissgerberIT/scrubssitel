import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
import {renderDevelopmentPanel,renderRoomUpgrade} from '../src/development-panel.js';
import {renderGameMenu} from '../src/game-menu.js';
import {translator} from '../src/i18n.js';
const helpers=lang=>({copy:(en,de)=>lang==='de'?de:en,label:value=>value[lang],money:value=>String(value)+' USD',escape:String,t:translator(lang),btn:(action,body,cls,attrs='')=>`<button data-action="${action}" class="${cls}" ${attrs}>${body}</button>`,panelHeader:(title,kicker)=>`<header>${kicker}<h2>${title}</h2></header>`});

test('development is reachable from the build wheel and shows independent affordable wing purchases',()=>{
 for(const lang of ['en','de']){
  const game=new Game(),h=helpers(lang),menu=renderGameMenu(game,{open:true,section:'rooms',helpers:h});
  assert.match(menu,/data-action="panel"[^>]*data-panel="development"/);
  const html=renderDevelopmentPanel(game,{helpers:h,preview:'east'});
  assert.equal((html.match(/data-action="expand-clinic"/g)||[]).length,2);
  assert.match(html,/20000 USD/);assert.match(html,/25000 USD/);
  assert.match(html,/data-expansion="east"[^>]*>[^<]*20000 USD/);
  assert.match(html,/24 × 18/);assert.match(html,/108/);assert.match(html,/144/);
  assert.equal((html.match(/aria-pressed="true"/g)||[]).length,2,'selected view and preview are announced');
 }
});

test('purchased wings cannot be bought twice; shortfalls and extra corner space update after a purchase',()=>{
 const game=new Game(),h=helpers('de');game.expand('east');game.cash=24000;
 const html=renderDevelopmentPanel(game,{helpers:h,preview:'south'});
 assert.equal((html.match(/data-action="expand-clinic"/g)||[]).length,1);
 assert.match(html,/data-action="expand-clinic"[^>]*data-expansion="south" disabled/);
 assert.match(html,/Es fehlen noch: 1000 USD/);assert.match(html,/30 × 18/);assert.match(html,/180/);
 game.cash=25000;game.expand('south');
 const complete=renderDevelopmentPanel(game,{helpers:h});assert.doesNotMatch(complete,/data-action="expand-clinic"/);assert.match(complete,/30 × 24/);assert.match(complete,/Neue Fläche bebauen/);
});

test('upgrade cards expose actual room cost and upkeep, and disable unaffordable and maximum upgrades',()=>{
 const game=new Game(),room=game.addRoom('gp',{x:2,y:2,w:4,h:4}).room,h=helpers('de');
 game.cash=909;
 const poor=renderRoomUpgrade(game,room,h);assert.match(poor,/data-action="upgrade"[^>]*disabled/);assert.match(poor,/Es fehlen noch: 1 USD/);assert.match(poor,/910 USD/);assert.match(poor,/\+35 USD/);
 game.cash=910;assert.doesNotMatch(renderRoomUpgrade(game,room,h),/disabled/);
 game.upgrade(room.id);const next=renderRoomUpgrade(game,room,h);assert.match(next,/1820 USD/);assert.match(next,/Stufe 2 → 3/);
 game.cash=1820;game.upgrade(room.id);assert.doesNotMatch(renderRoomUpgrade(game,room,h),/data-action="upgrade"/);
 assert.match(renderDevelopmentPanel(game,{view:'upgrades',helpers:h}),/vollständig verbessert/);
});
