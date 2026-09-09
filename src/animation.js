// Continuous presentation state, independent of the saved management simulation.
export const STRIDE=1.25;
export const CHARACTER_SCALE=.95;
export const SEAT_HEIGHT=.32;
export const HIP_RADIUS=.095;
export const characterScale=person=>CHARACTER_SCALE*(person.child?.73:1);
// Keep saved seat anchors fixed. Bring knees past the cushion's front edge,
// blending the same presentation offset through sitting down and standing up.
export const seatedForward=person=>person.role==='receptionist'?0:person.child?.20:.15;
export function seatOffset(person,pose){const amount=seatedForward(person)*(pose?.sit??(isSeated(person)?1:0)),yaw=pose?.yaw??person.lookYaw??0;return {x:Math.sin(yaw)*amount,y:Math.cos(yaw)*amount};}
const isSeated=person=>person.state==='seated'||person.state==='resting'&&person.hasSeat||person.role==='receptionist'&&person.hasSeat&&person.state!=='travel';
const TAU=Math.PI*2;
export function actionFor(person){
 const need=person.activity;
 if(need?.phase==='wash')return 'wash';
 if(need?.phase==='use'&&['read','play'].includes(need.kind))return need.kind;
 if(need&&['open','close','exitOpen','exitClose'].includes(need.phase))return 'door';
 if(person.job?.phase==='work')return person.job.kind==='fault'?'repair':'mop';
 if(person.state==='working'&&person.role!=='receptionist')return {gp:'examine',pharmacy:'dispense',therapy:'soothe',surgery:'operate',lab:'research'}[person.department]||'care';
 return null;
}
export const mix=(a,b,t)=>a+(b-a)*t;
export function turnToward(a,b,amount){return a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*amount;}
export function stepPose(phase){
 const t=((phase/TAU)%1+1)%1;
 // The support foot moves backwards at a constant rate while planted. The
 // returning foot lifts, passes the other ankle, then settles heel-first.
 if(t<.55)return {forward:STRIDE*.275-STRIDE*t,lift:0,contact:true};
 const u=(t-.55)/.45,e=u*u*(3-2*u);
 return {forward:mix(-STRIDE*.275,STRIDE*.275,e),lift:Math.sin(Math.PI*u)**2*.12,contact:false};
}
export class CharacterAnimator{
 constructor(){this.actors=new Map();}
 reset(){this.actors.clear();}
 update(person,time){
  let a=this.actors.get(person.id);
  if(!a){a={x:person.x,y:person.y,yaw:person.lookYaw??0,phase:0,walk:0,sit:isSeated(person)?1:0,work:0,celebrate:0,time,pose:'idle'};this.actors.set(person.id,a);}
  const dt=Math.max(0,time-a.time),dx=person.x-a.x,dy=person.y-a.y,distance=Math.hypot(dx,dy),moving=distance>1e-5&&dt>0;
  const desiredYaw=person.lookYaw??(moving?Math.atan2(dx,dy):a.yaw);
  if(dt){a.yaw=turnToward(a.yaw,desiredYaw,1-Math.exp(-dt*14));a.phase+=(person.movedDistance??distance)/(STRIDE*characterScale(person))*TAU;}
  const seated=isSeated(person);
  const action=actionFor(person),working=!!action||['working','preparing','service','amenityBuy'].includes(person.state),blend=1-Math.exp(-dt*12);
  a.walk=mix(a.walk,moving?1:0,blend);a.sit=mix(a.sit,seated?1:0,blend);a.work=mix(a.work,working?1:0,blend);a.celebrate=mix(a.celebrate,person.cured?1:0,blend);
  a.pose=seated?(a.sit<.95?'sittingDown':'seated'):a.sit>.05?'standingUp':moving?'walking':working?'working':'idle';
  a.action=action;a.actionTime=person.activity?.elapsed??person.job?.elapsed??time;
  a.x=person.x;a.y=person.y;a.time=time;return {...a,walking:moving};
 }
 prune(ids){const alive=new Set(ids);for(const id of this.actors.keys())if(!alive.has(id))this.actors.delete(id);}
}
export function legKnee(hip,foot,length=.275){
 const fy=foot[1]-hip[1],fz=foot[2]-hip[2],d=Math.max(.0001,Math.hypot(fy,fz)),bend=Math.sqrt(Math.max(0,length*length-d*d/4));
 return [hip[0],(hip[1]+foot[1])/2-fz/d*bend,(hip[2]+foot[2])/2+fy/d*bend];
}
export function skeleton(a,person){
 const sit=a.sit,walk=a.walk*(1-sit),t=a.time,phase=a.phase,breath=Math.sin(t*2.5+person.id)*.003*(1-walk);
 const hipHeight=mix(.49,SEAT_HEIGHT/characterScale(person)+HIP_RADIUS,sit)+Math.sin(phase*2)*.008*walk+breath*(1-sit),lean=Math.sin(phase)*.015*walk;
 const hip=[0,0,hipHeight],chest=[0,lean,hipHeight+.235],head=[0,lean,hipHeight+.45];
 const legs=[],arms=[];
 for(let side=-1;side<=1;side+=2){
  const step=stepPose(phase+(side===1?Math.PI:0)),foot=[side*.12,mix(step.forward*walk,.29,sit),mix(.045,person.child?.17:.045,sit)+step.lift*walk];
  const top=[side*.105,0,hipHeight-.015],bentKnee=legKnee(top,foot),standingKnee=bentKnee.map((v,i)=>mix((top[i]+foot[i])/2+(i===1?.012:0),v,walk)),seatedKnee=[side*.105,.26,hipHeight-.035];
  const knee=standingKnee.map((v,i)=>mix(v,seatedKnee[i],sit));legs.push({side,hip:top,knee,foot,contact:sit>.8||step.contact||walk<.1});
  const shoulder=[side*.235,lean,chest[2]-.025],swing=Math.sin(phase+(side===1?Math.PI:0))*.20*walk;
  let elbow=[side*.27,swing*.45,hipHeight+.11],hand=[side*.26,swing,hipHeight-.015];
  elbow=elbow.map((v,i)=>mix(v,[side*.20,.16,hipHeight+.08][i],sit));hand=hand.map((v,i)=>mix(v,[side*.13,.28,hipHeight+.015][i],sit));
  const work=a.work*(1-a.celebrate),beat=Math.sin(t*(person.role==='receptionist'?9:4)+side)*.022;
  const action=a.action||actionFor(person),at=a.actionTime??t,pulse=Math.sin(at*6+side),reach=Math.sin(at*3+side);
  let workingHand=person.role==='janitor'?[side*.09,.30+Math.sin(at*3)*.09,hipHeight+.03]:person.role==='receptionist'?[side*.12,.57,.63+beat*.4]:[side*.12,.29,hipHeight+.17+beat];
  if(action==='wash')workingHand=[side*.045+pulse*.022,.48/characterScale(person)+reach*.018,.59/characterScale(person)];
  else if(action==='read')workingHand=[side*.17,.31,hipHeight+.13+Math.sin(at*2)*.005];
  else if(action==='play')workingHand=[side*.14,.33+reach*.06,hipHeight+.05+(pulse+1)*.045];
  else if(action==='repair')workingHand=[side*.10,.43,hipHeight+.15+reach*.05];
  else if(action==='door')workingHand=[side*.15,side>0?.38:.12,hipHeight+.15];
  else if(action==='examine')workingHand=[side*.12,side>0?.47:.24,hipHeight+.25+pulse*.012];
  else if(action==='dispense')workingHand=[side*.14,.39+reach*.05,hipHeight+.14+(side>0?(pulse+1)*.05:0)];
  else if(action==='soothe')workingHand=[side*(.20+reach*.035),.36,hipHeight+.20+pulse*.024];
  else if(action==='operate')workingHand=[side*.095,.45+reach*.013,hipHeight+.18+pulse*.012];
  else if(action==='research')workingHand=[side*.11,.36,hipHeight+.18+(side>0?(pulse+1)*.045:0)];
  hand=hand.map((v,i)=>mix(v,workingHand[i],work));elbow=elbow.map((v,i)=>mix(v,[side*.23,.13,hipHeight+.17][i],work));
  if(side===1){const joy=a.celebrate;hand=hand.map((v,i)=>mix(v,[.29+Math.sin(t*8)*.04,.02,head[2]+.16][i],joy));elbow=elbow.map((v,i)=>mix(v,[.34,0,chest[2]+.12][i],joy));}
  arms.push({side,shoulder,elbow,hand});
 }
 return {hip,chest,head,legs,arms};
}
