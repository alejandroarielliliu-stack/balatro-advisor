import {cp,mkdir,readFile,readdir,rename,rm,stat,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// Allowlisted browser artifact. No user saves, developer evidence, server or
// Node demos enter the web root. Run after the existing TypeScript build.
const root=fileURLToPath(new URL('../',import.meta.url));
const output=path.resolve(root,'out'),pending=path.resolve(root,'out.pending');
const allowed=new Set(),entry='dist/src/ui/app.js';
async function collect(relative){
 if(allowed.has(relative))return;
 if(!relative.startsWith('dist/src/')||!relative.endsWith('.js'))throw Error('Browser import outside the compiled client: '+relative);
 const code=await readFile(path.join(root,relative),'utf8');allowed.add(relative);
 for(const match of code.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)(['"])([^'"\n]+)\1/g)){
  const imported=match[2];
  if(!imported.startsWith('.'))throw Error('External or Node browser import: '+imported);
  const resolved=path.posix.normalize(path.posix.join(path.posix.dirname(relative),imported));
  await collect(resolved);
 }
}
async function copyFile(relative){
 const target=path.join(pending,relative);await mkdir(path.dirname(target),{recursive:true});await cp(path.join(root,relative),target);
}
async function webFiles(relative='web'){
 for(const item of await readdir(path.join(root,relative),{withFileTypes:true})){
  if(item.isSymbolicLink())throw Error('Symlinks are not permitted in web assets.');
  const file=path.posix.join(relative,item.name);
  if(item.isDirectory())await webFiles(file);
  else if(/\.(css|png|ttf|json)$/.test(file)||file==='web/assets/efhiii/balatro-sim.js'||file==='web/assets/efhiii/LICENSE'||file==='web/assets/fonts/README.md')await copyFile(file);
 }
}
await collect(entry);
// Only fixed paths under this project can be replaced by this builder.
if(path.dirname(output)!==path.resolve(root)||path.dirname(pending)!==path.resolve(root))throw Error('Unsafe artifact path.');
await rm(pending,{recursive:true,force:true});await mkdir(pending,{recursive:true});
try{
 await webFiles();
 for(const file of [...allowed].sort())await copyFile(file);
 for(const file of ['examples/shop-purchase.json','examples/round-plan.json'])await copyFile(file);
 let html=await readFile(path.join(root,'web/index.html'),'utf8');
 if(/(?:href|src)=["']\/(?:web|dist)\//.test(html))throw Error('The HTML still depends on domain-root asset paths.');
 html=html.replace('<i></i> Local','<i></i> Guardado local');
 await writeFile(path.join(pending,'index.html'),html);
 await writeFile(path.join(pending,'.nojekyll'),'');
 await rm(output,{recursive:true,force:true});await rename(pending,output);
 const size=(await stat(path.join(output,'index.html'))).size;
 console.log(JSON.stringify({directory:'out',browserModules:allowed.size,indexBytes:size,storage:'browser-local',serverRequired:false}));
}catch(error){await rm(pending,{recursive:true,force:true});throw error;}
