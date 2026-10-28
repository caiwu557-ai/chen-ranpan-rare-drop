// Development-only: requires an installed Playwright and Chrome.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const [url,outArg]=process.argv.slice(2);
assert.ok(url&&outArg,'Usage: node tests/verify.cjs URL NEW_REPORT_DIRECTORY');
let browser;
(async()=>{
 const out=path.resolve(outArg);assert.ok(!fs.existsSync(out),'Report directory exists');fs.mkdirSync(out,{recursive:true});
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 if(url.startsWith('file:'))await context.setOffline(true);
 const page=await context.newPage(),errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
 await page.goto(url);await page.waitForFunction(()=>window.__rareDropDebug?.renderer?.ready,{},{timeout:45000});
 await page.locator('#openButton').click();await page.waitForFunction(()=>window.__rareDropDebug.state==='inspect',{},{timeout:20000});
 await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));
 const renderer=await page.evaluate(()=>{const r=window.__rareDropDebug.renderer;return{ready:r.ready,glError:r.gl.getError()};});assert.equal(renderer.glError,0);
 const box=await page.locator('#inspectViewer').boundingBox();
 const angles=()=>page.evaluate(()=>{const r=window.__rareDropDebug.renderer;return{yaw:r.targetYaw,pitch:r.targetPitch,base:r.faceYaw};});
 await page.mouse.move(box.x+box.width*.72,box.y+box.height/2);
 let tilt=await angles();assert.ok(tilt.yaw>0&&tilt.yaw<=.32);assert.ok(tilt.pitch===0);
 await page.mouse.move(box.x+box.width*.28,box.y+box.height*.25);
 tilt=await angles();assert.ok(tilt.yaw<0&&tilt.pitch>0);
 await page.mouse.down();await page.mouse.move(box.x+box.width*.72,box.y+box.height/2);await page.mouse.up();
 assert.ok((await angles()).yaw<=.32,'Mouse button must not enable free rotation');
 await page.mouse.move(2,2);assert.equal((await angles()).yaw,0);assert.equal((await angles()).pitch,0);
 for(const [name,yaw]of [['front',0],['left',-.55],['right',.55],['side',Math.PI/2],['back',Math.PI]]){
  await page.evaluate(yaw=>{const r=window.__rareDropDebug.renderer;r.auto=false;r.yaw=r.targetYaw=yaw;r.pitch=r.targetPitch=0;},yaw);
  await page.waitForTimeout(160);await page.locator('#pickCanvas').screenshot({path:path.join(out,name+'.png')});
 }
 await page.locator('#flipButton').click();assert.equal((await angles()).base,Math.PI);
 await page.mouse.move(box.x+box.width*.72,box.y+box.height/2);tilt=await angles();assert.ok(tilt.yaw>Math.PI&&tilt.yaw<=Math.PI+.32);
 await page.mouse.move(2,2);assert.equal((await angles()).yaw,Math.PI);
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(out,'mobile.png'),fullPage:true});
 await page.reload();await page.waitForFunction(()=>window.__rareDropDebug?.renderer?.ready);
 assert.deepEqual(errors,[]);if(url.startsWith('file:'))assert.deepEqual(requests,[]);
 assert.ok(!requests.some(u=>/\.png(?:[?#]|$)/.test(u)),'Production images must use WebP');
 fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({url,renderer,errors,httpRequestCount:requests.length,checks:['all images loaded','WebGL2','complete unlock','hover direction and bounds','no drag rotation','return to center','five viewing angles','back face hover','flip','mobile viewport','reopen','WebP only']},null,2));
 console.log('PUBLIC_BUILD_PASS',JSON.stringify({renderer,errors,httpRequestCount:requests.length}));
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();});
