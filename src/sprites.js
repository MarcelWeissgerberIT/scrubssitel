// The source artwork is generated in OpenArt; files are keyed and cropped at build time.
export class SpriteBank{
 constructor(){this.images=new Map();if(typeof Image==='undefined')return;for(const key of ['milo','bea','rosa','nia','park','otto','patient-0','patient-1','patient-2'])for(const frame of [0,1])this.load(`${key}-${frame}`);}
 load(key){const img=new Image();img.onload=()=>this.images.set(key,img);img.src=new URL(`../public/assets/sprites/${key}.png`,import.meta.url).href;}
 get(key){return this.images.get(key);}
}
