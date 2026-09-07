import { mkdir, cp, rm, writeFile } from 'node:fs/promises';
await rm('dist', {recursive:true, force:true});
await mkdir('dist', {recursive:true});
for (const path of ['index.html','src','public']) await cp(path, `dist/${path}`, {recursive:true});
await writeFile('dist/.nojekyll', '');
console.log('Built static game in dist/ (no runtime dependencies).');
