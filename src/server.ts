import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,extname,sep} from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url));
const port=Number(process.env.PORT??4173);
const mime:Record<string,string>={'.png':'image/png','.ttf':'font/ttf','.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8'};
createServer(async(req,res)=>{
  try{
    if(req.method!=='GET' && req.method!=='HEAD'){res.writeHead(405).end();return;}
    const url=new URL(req.url??'/','http://localhost'), path=decodeURIComponent(url.pathname);
    const relative=path==='/'?'web/index.html':path.slice(1);
    if(!['web/','dist/src/','examples/'].some(p=>relative.startsWith(p))){res.writeHead(404).end();return;}
    const absolute=resolve(root,relative);
    if(!absolute.startsWith(resolve(root)+sep)){res.writeHead(403).end();return;}
    const data=await readFile(absolute);
    res.writeHead(200,{'Content-Type':mime[extname(absolute)]??'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"});res.end(req.method==='HEAD'?undefined:data);
  }catch{res.writeHead(404).end('No encontrado');}
}).listen(port,'127.0.0.1',()=>console.log(`Balatro Advisor local: http://localhost:${port} (solo este equipo)`));
