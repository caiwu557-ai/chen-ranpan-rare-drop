// Standalone local static server; uses Node's built-in modules only.
// Bound to loopback by default: not reachable from other devices.
import http from 'node:http';
import {readFile, stat} from 'node:fs/promises';
import {resolve, dirname, extname, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=dirname(fileURLToPath(import.meta.url));
const PORT=Number(process.env.PORT || 8765);
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon'};
http.createServer(async(req,res)=>{
 try{
  const path=decodeURIComponent(new URL(req.url||'/', 'http://localhost').pathname);
  const target=resolve(ROOT,'.'+(path==='/'?'/index.html':path));
  if(target!==ROOT&&!target.startsWith(ROOT+sep)){res.writeHead(403);res.end('Forbidden');return;}
  if(!(await stat(target)).isFile()){res.writeHead(404);res.end('Not found');return;}
  const bytes=await readFile(target);
  res.writeHead(200,{'Content-Type':MIME[extname(target)]||'application/octet-stream','Content-Length':bytes.length,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
  res.end(bytes);
 }catch(e){res.writeHead(404);res.end('Not found');}
}).listen(PORT,'127.0.0.1',()=>console.log(`RARE DROP ready → http://127.0.0.1:${PORT}`));
