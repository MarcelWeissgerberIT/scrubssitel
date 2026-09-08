import assert from 'node:assert/strict';
// Established simulation suites need an operational fixture, while production
// addRoom deliberately creates an empty, unfinished shell.
export function furnishedRoom(game,...args){
 const result=game.addRoom(...args);if(!result.room)return result;
 assert.equal(game.autoFurnish(result.room.id).error,undefined,'fixture furniture must fit');
 assert.equal(game.finishRoom(result.room.id).error,undefined,'fixture room must be operational');
 return result;
}
