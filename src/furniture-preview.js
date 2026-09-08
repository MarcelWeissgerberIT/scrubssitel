import {FURNITURE} from './objects.js';
import {Renderer} from './renderer.js';
import {sceneLayers} from './scene.js';
import {drawRoomObject} from './room-art.js';

const WIDTH=280,HEIGHT=200,PADDING=18;
const cache=new Map();
const quarterTurn=rotation=>((Math.round(Number(rotation)||0)%4)+4)%4;

function paintedBounds(ctx){
  const {data}=ctx.getImageData(0,0,WIDTH,HEIGHT);
  let left=WIDTH,top=HEIGHT,right=-1,bottom=-1;
  for(let y=0;y<HEIGHT;y++)for(let x=0;x<WIDTH;x++){
    if(data[(y*WIDTH+x)*4+3]===0)continue;
    left=Math.min(left,x);right=Math.max(right,x);
    top=Math.min(top,y);bottom=Math.max(bottom,y);
  }
  return right<0?null:{left,top,right,bottom,width:right-left+1,height:bottom-top+1};
}

// Uses the live registry, rotation adapter and scene ordering, without creating
// a game, installing input handlers or starting animation. Time is frozen idle.
// A provided canvas also permits native Canvas QA without a browser DOM.
export function drawFurniturePreview(canvas,kind,roomType,rotation=0){
  canvas.width=WIDTH;canvas.height=HEIGHT;
  const ctx=canvas.getContext('2d',{willReadFrequently:true}),spec=FURNITURE[kind];
  if(!spec)return null;
  const room={id:'preview-room',type:roomType||spec.rooms[0],x:0,y:0,w:4,h:4,
    staffId:null,patientId:null,
    furniture:[{id:'preview',kind,x:0,y:0,rotation:quarterTurn(rotation)}]};
  const game={rooms:[room],staff:[],patients:[],project:null,admissionsOpen:false};
  // sceneLayers obtains complete furniture parts through roomObjects, including
  // the counter's chair, monitor and bell, and orders them as in the real scene.
  const layers=sceneLayers(game,[]).filter(layer=>layer.object.furnitureId==='preview');
  const probe=Object.assign(Object.create(Renderer.prototype),{
    ctx,game,tw:48,th:48*.51,ox:WIDTH/2,oy:HEIGHT*.68
  });
  const paint=()=>{
    ctx.clearRect(0,0,WIDTH,HEIGHT);
    for(const {object} of layers){
      const view=probe.objectRenderer(object);
      drawRoomObject(view.renderer,room,view.object,0);
    }
    return paintedBounds(ctx);
  };
  let bounds=paint();
  // Measure actual paint: registry heights include mounting elevation and do
  // not describe the visible extent of clocks, plants or the scanner's duck.
  // Redraw at the fitted scale to keep curves sharp rather than resize a PNG.
  for(let pass=0;bounds&&pass<2;pass++){
    const scale=Math.min((WIDTH-PADDING*2)/bounds.width,(HEIGHT-PADDING*2)/bounds.height);
    probe.ox=WIDTH/2+(probe.ox-(bounds.left+bounds.right+1)/2)*scale;
    probe.oy=HEIGHT/2+(probe.oy-(bounds.top+bounds.bottom+1)/2)*scale;
    probe.tw*=scale;probe.th=probe.tw*.51;
    bounds=paint();
  }
  return bounds;
}

export function furniturePreview(kind,roomType,rotation=0){
  if(!FURNITURE[kind])return '';
  const type=roomType||FURNITURE[kind].rooms[0],turn=quarterTurn(rotation);
  const key=JSON.stringify([kind,type,turn]);
  if(!cache.has(key)){
    const canvas=document.createElement('canvas');
    drawFurniturePreview(canvas,kind,type,turn);
    cache.set(key,canvas.toDataURL('image/png'));
  }
  return cache.get(key);
}
