import { mkdir, cp, rm, writeFile, readFile, readdir } from 'node:fs/promises';
const {version}=JSON.parse(await readFile('package.json','utf8'));
await rm('dist', {recursive:true, force:true});
await mkdir('dist', {recursive:true});
for (const path of ['index.html','src','public']) await cp(path, `dist/${path}`, {recursive:true});
// Version module URLs together: existing players must not mix cached v1 modules with v2.
for(const name of await readdir('dist/src'))if(name.endsWith('.js')){
 const path=`dist/src/${name}`,source=await readFile(path,'utf8');
 await writeFile(path,source.replace(/(from\s*['"])(\.\/[^'"?]+\.js)(['"])/g,`$1$2?v=${version}$3`));
}
const html=await readFile('dist/index.html','utf8');
await writeFile('dist/index.html',html.replace('./src/style.css',`./src/style.css?v=${version}`).replace('./src/main.js',`./src/main.js?v=${version}`));
await writeFile('dist/.nojekyll', '');
console.log(`Built static game ${version} in dist/ with versioned module URLs.`);
