import {CharacterModel,appearanceFor,portraitSeed} from './characters.js';
import {characterScale} from './animation.js';

const cache=new Map();
const makeCanvas=()=>document.createElement('canvas');

// Frame the actual hair and face, including tall buns and children's portraits.
// Candidates and hired employees use the same appearance resolver as the floor.
export function drawCharacterPortrait(canvas,person,createCanvas=makeCanvas){
 const employee=!!(person.role||person.applicantId||person.castId&&!/^(patient|child)-/.test(person.castId));
 const actor={...person,child:Number.isFinite(person.age)?person.age<16:!!person.child,state:'idle',hasSeat:false};
 if(employee){actor.applicantId=person.applicantId||(typeof person.id==='string'?person.id:undefined);actor.id=portraitSeed(person);}
 const source=createCanvas();source.width=400;source.height=600;
 const ctx=source.getContext('2d',{willReadFrequently:true}),u=280;
 const pose={portrait:true,time:1,yaw:.30,phase:0,walk:0,sit:0,work:0,celebrate:0};
 const bounds=new CharacterModel(ctx).draw(actor,pose,{x:200,y:550},u/characterScale(actor));
 const pixels=ctx.getImageData(0,0,source.width,source.height).data;
 let top=600,left=400,right=0;
 const faceBottom=Math.min(599,Math.ceil(bounds.head.y+u*.20));
 for(let y=0;y<=faceBottom;y++)for(let x=0;x<400;x++)if(pixels[(y*400+x)*4+3]>12){top=Math.min(top,y);left=Math.min(left,x);right=Math.max(right,x);}
 const padding=10,portraitTop=top-padding,desiredHeight=bounds.head.y+u*.39-portraitTop;
 const cropWidth=Math.max(desiredHeight*5/6,right-left+padding*2),cropHeight=cropWidth*6/5;
 const cropX=(left+right)/2-cropWidth/2;
 canvas.width=200;canvas.height=240;
 const output=canvas.getContext('2d');
 const backdrop=output.createLinearGradient(0,0,200,240);backdrop.addColorStop(0,'#f6f5e9');backdrop.addColorStop(1,'#dce9dd');
 output.fillStyle=backdrop;output.fillRect(0,0,200,240);
 output.fillStyle='#ffffff55';output.beginPath();output.ellipse(97,99,84,86,0,0,Math.PI*2);output.fill();
 output.imageSmoothingEnabled=true;output.imageSmoothingQuality='high';
 output.drawImage(source,cropX,portraitTop,cropWidth,cropHeight,0,0,200,240);
 return {top,left,right,cropX,cropY:portraitTop,cropWidth,cropHeight};
}

export function characterPortrait(person){
 const key=appearanceFor(person).key;
 if(!cache.has(key)){const canvas=makeCanvas();drawCharacterPortrait(canvas,person);cache.set(key,canvas.toDataURL('image/png'));}
 return cache.get(key);
}
