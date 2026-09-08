import assert from 'node:assert/strict';
import {ROOMS} from '../src/content.js';
// Established simulation suites need an operational fixture, while production
// addRoom deliberately creates an empty, unfinished shell.
export function furnishedRoom(game,...args){
 const result=game.addRoom(...args);if(!result.room)return result;
 assert.equal(game.autoFurnish(result.room.id).error,undefined,'fixture furniture must fit');
 assert.equal(game.finishRoom(result.room.id).error,undefined,'fixture room must be operational');
 return result;
}

// Operational scenarios explicitly perform the same placement action as a player.
// A hire without a finished matching room intentionally remains at the entrance.
export function deployStaff(game,staff){
 if(!staff)return;
 const room=staff.role==='janitor'?null:game.rooms.find(r=>ROOMS[r.type].role===staff.role&&game.roomReady(r)&&r.staffId===null);
 if(staff.role!=='janitor'&&!room)return;
 const result=game.placeStaff(staff.id,room?.id??null,staff.role==='janitor'?{x:staff.x,y:staff.y}:undefined);
 assert.equal(result.error,undefined,'fixture must place employee on accessible floor');
 return result;
}
export function hireAndPlace(game,...args){const result=game.hire(...args);deployStaff(game,result.staff);return result;}
