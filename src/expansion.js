export const BASE_GRID=Object.freeze({w:24,h:18});
export const EXPANSIONS=Object.freeze([
 Object.freeze({id:'east',cost:20000,name:Object.freeze({en:'East wing',de:'Ostflügel'}),width:6,height:0}),
 Object.freeze({id:'south',cost:25000,name:Object.freeze({en:'South wing',de:'Südflügel'}),width:0,height:6})
]);

export function gridFor(expansions=[]){
 if(!Array.isArray(expansions)||expansions.length>EXPANSIONS.length||new Set(expansions).size!==expansions.length||[...expansions].some(id=>!EXPANSIONS.some(e=>e.id===id)))throw Error('Invalid expansions');
 return expansions.reduce((grid,id)=>{const e=EXPANSIONS.find(e=>e.id===id);return {w:grid.w+e.width,h:grid.h+e.height};},{...BASE_GRID});
}

export function expand(g,id){
 const expansion=EXPANSIONS.find(e=>e.id===id);if(!expansion)return {error:'expansionInvalid'};
 if(g.expansions.includes(id))return {error:'expansionOwned'};
 if(g.over||g.event)return {error:'expansionUnavailable'};
 if(g.cash<expansion.cost)return {error:'notEnough'};
 g.cash-=expansion.cost;g.construction+=expansion.cost;g.expansions.push(id);g.log('expanded',id);
 return {expansion};
}
