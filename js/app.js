(function(){'use strict';
const $=s=>document.querySelector(s);
const body=document.body,openButton=$('#openButton'),flipButton=$('#flipButton'),resetButton=$('#resetButton'),reelTrack=$('#reelTrack'),reelViewport=$('#reelViewport'),reelStatus=$('#scrollStatus'),speedIndicator=$('#speedIndicator'),goldBurst=$('#goldBurst'),viewer=$('#inspectViewer'),pickCanvas=$('#pickCanvas'),fallback=$('#pickFallback');
const TYPES={common:{name:'COMMON',color:'#c9d1d7',image:'common.png'},milspec:{name:'MIL-SPEC',color:'#329fff',image:'milspec.png'},restricted:{name:'RESTRICTED',color:'#af69ff',image:'restricted.png'},classified:{name:'CLASSIFIED',color:'#ff5ad1',image:'classified.png'},covert:{name:'SPECIAL',color:'#ffbb69',image:'covert.png'}};
let fallbackYaw=-7,fallbackPitch=-3,fallbackBack=false;
let activeSpin=false,runner=0,stage='ready',pick=null,sound=null,openId=0;
function setState(v){stage=v;body.dataset.state=v;}
function rand(seed){let a=seed;return()=>{a=(a*1664525+1013904223)>>>0;return a/4294967296;};}
const rng=rand(20261027);
function pickRarity(){let t=rng();return t<.40?'common':t<.69?'milspec':t<.86?'restricted':t<.96?'classified':'covert';}
function generateDust(){const p=$('#particles');for(let i=0;i<47;i++){const d=document.createElement('span');d.className='dust';d.style.left=(rng()*100)+'%';d.style.top=(rng()*100)+'%';d.style.setProperty('--dur',(6+rng()*12)+'s');d.style.setProperty('--delay',(-rng()*15)+'s');d.style.setProperty('--dx',(rng()*130-65)+'px');p.append(d);}}
function preloadAssets(){return Promise.all(Object.values(TYPES).map(t=>new Promise(resolve=>{const i=new Image();i.onload=i.onerror=resolve;i.src='assets/crates/'+t.image;})));}
function buildReel(){reelTrack.innerHTML='';const winningIndex=43,total=48;let sequence=Array.from({length:total},(_,i)=>pickRarity());sequence[winningIndex]='covert';sequence[winningIndex-1]='classified';sequence[winningIndex-2]='restricted';sequence[winningIndex-4]='covert';sequence[winningIndex-7]='milspec';sequence[winningIndex+1]='common';for(let i=0;i<total;i++){const key=sequence[i],t=TYPES[key],tile=document.createElement('div');tile.className='reel-tile'+(i===winningIndex?' winner':'');tile.style.setProperty('--tilecolor',t.color);tile.dataset.tier=key;tile.setAttribute('aria-label',t.name);tile.innerHTML=`<img src="assets/crates/${t.image}" alt="" draggable="false"><span class="tile-id">CASE / ${String(i+1).padStart(3,'0')}</span><span class="tile-rarity">${t.name}</span>`;reelTrack.append(tile);}return winningIndex;}
function soundSetup(){try{const A=window.AudioContext||window.webkitAudioContext;if(A){sound=new A();if(sound.state==='suspended')sound.resume();}}catch(e){sound=null;}}
function blip(freq=560,volume=.012,duration=.045,type='triangle'){if(!sound)return;try{const osc=sound.createOscillator(),gain=sound.createGain(),n=sound.currentTime;osc.type=type;osc.frequency.setValueAtTime(freq,n);gain.gain.setValueAtTime(Math.max(.0001,volume),n);gain.gain.exponentialRampToValueAtTime(.0001,n+duration);osc.connect(gain);gain.connect(sound.destination);osc.start(n);osc.stop(n+duration+.01);}catch(e){}}
function winningSound(){blip(246,.085,.65,'sawtooth');setTimeout(()=>blip(493,.08,.56,'triangle'),100);setTimeout(()=>blip(739,.065,.62,'sine'),180);}
function spin(){if(activeSpin||stage==='spin')return;activeSpin=true;openButton.disabled=true;openButton.querySelector('.button-main').textContent='UNLOCKING...';soundSetup();blip(190,.028,.17,'sawtooth');setState('spin');reelStatus.textContent='AUTHENTICATING CONTAINER...';speedIndicator.textContent='MAX / 100';const winner=buildReel();const rollId=++openId;
// Wait one frame for fonts/layout before measuring the tile geometry.
requestAnimationFrame(()=>requestAnimationFrame(()=>{
 if(rollId!==openId)return;
 const tiles=[...reelTrack.children],a=tiles[0].getBoundingClientRect(),b=tiles[1].getBoundingClientRect(),stride=b.left-a.left,tileWidth=a.width,center=reelViewport.clientWidth/2;
 let xStart=center-tileWidth/2, xEnd=center-(winner*stride+tileWidth/2);
 let motion=Math.abs(xEnd-xStart),duration=window.matchMedia('(prefers-reduced-motion: reduce)').matches?1500:6800,startTime=null,lastTile=-1;
 const ease=t=>1-Math.pow(1-t,4.3);
 function frame(time){if(rollId!==openId)return;if(startTime===null)startTime=time;let p=Math.min(1,(time-startTime)/duration),e=ease(p),x=xStart+(xEnd-xStart)*e;
 reelTrack.style.transform=`translate3d(${x.toFixed(2)}px,0,0)`;
 let velocity=(motion/duration)*4.3*Math.pow(1-p,3.3),speed=Math.min(1,velocity/6);
 reelViewport.style.setProperty('--velocity',speed.toFixed(3));speedIndicator.textContent=String(Math.round(speed*100)).padStart(2,'0')+' / MAX';
 let tile=Math.floor((center-x)/stride);if(tile!==lastTile){if(lastTile>=0)blip(320+Math.round(rng()*90),.007+speed*.008,.025,'square');lastTile=tile;}
 if(p>.78)reelStatus.textContent='LOCKING ONTO A SIGNATURE...';else if(p>.20)reelStatus.textContent='SCANNING DROP ENTRIES...';
 if(p<1)runner=requestAnimationFrame(frame);else{reelViewport.style.setProperty('--velocity','0');speedIndicator.textContent='00 / MAX';reelStatus.textContent='★ SPECIAL DROP DETECTED';tiles[winner].classList.add('winner');blip(940,.07,.22,'sine');activeSpin=false;
 setTimeout(()=>{if(rollId!==openId)return;goldBurst.classList.remove('active');void goldBurst.offsetWidth;goldBurst.classList.add('active');winningSound();setTimeout(()=>{if(rollId!==openId)return;setState('inspect');if(pick){pick.setActive(true);pick.reset();}else fallback.hidden=false;},930);setTimeout(()=>goldBurst.classList.remove('active'),1500);},420);
 }
 }
 runner=requestAnimationFrame(frame);
 }));
}
function reopen(){openId++;cancelAnimationFrame(runner);activeSpin=false;goldBurst.classList.remove('active');openButton.disabled=false;openButton.querySelector('.button-main').textContent='UNLOCK CONTAINER';reelTrack.style.transform='none';reelViewport.style.setProperty('--velocity','0');setState('ready');if(pick)pick.setActive(false);fallbackYaw=-7;fallbackPitch=-3;fallbackBack=false;applyFallback();window.scrollTo({top:0,behavior:'instant'});}
function applyFallback(){const el=$('.fallback-stack');if(el){el.style.setProperty('--yaw',fallbackYaw+'deg');el.style.setProperty('--pitch',fallbackPitch+'deg');el.style.setProperty('--angle',(-fallbackYaw*.9)+'deg');el.classList.toggle('show-back',fallbackBack);}}
function flipFallback(){const el=$('.fallback-stack');if(!el)return;el.classList.remove('is-flipping');void el.offsetWidth;el.classList.add('is-flipping');setTimeout(()=>{fallbackBack=!fallbackBack;applyFallback()},250);setTimeout(()=>el.classList.remove('is-flipping'),700);}
function onDrag(){let pointer=null,moved=false,sx=0,sy=0,startYaw=0,startPitch=0;
 viewer.addEventListener('pointerdown',e=>{if(stage!=='inspect')return;pointer=e.pointerId;sx=e.clientX;sy=e.clientY;startYaw=pick?pick.targetYaw:fallbackYaw;startPitch=pick?pick.targetPitch:fallbackPitch;if(pick){pick.dragging=true;pick.auto=false;}viewer.setPointerCapture(e.pointerId);});
 viewer.addEventListener('pointermove',e=>{if(stage!=='inspect')return;if(pointer===e.pointerId){const dx=(e.clientX-sx)/Math.min(viewer.clientWidth,650),dy=(e.clientY-sy)/Math.min(viewer.clientHeight,650);if(pick){pick.targetYaw=startYaw+dx*5.5;pick.targetPitch=Math.max(-1.25,Math.min(1.25,startPitch-dy*4.4));}else{fallbackYaw=Math.max(-38,Math.min(38,startYaw+dx*75));fallbackPitch=Math.max(-32,Math.min(32,startPitch-dy*85));applyFallback();}moved=true;}});
 const end=e=>{if(e.pointerId===pointer){if(pick)pick.dragging=false;pointer=null;}};viewer.addEventListener('pointerup',end);viewer.addEventListener('pointercancel',end);
 viewer.addEventListener('dblclick',()=>{if(pick)pick.flip();else{flipFallback()}blip(690,.04,.16,'sine')});
 viewer.addEventListener('wheel',e=>{if(stage!=='inspect')return;e.preventDefault();if(pick)pick.zoom=Math.max(.73,Math.min(1.36,pick.zoom-e.deltaY*.0007));},{passive:false});
}
async function boot(){generateDust();preloadAssets();try{pick=new window.PickRenderer(pickCanvas);await pick.init();pick.setActive(false);pick.onAngles=(x,y)=>{let f=n=>((n%360)+360)%360;$('#angleReadout').textContent=`X ${x.toFixed(1)}° / Y ${f(y).toFixed(1)}°`;};}catch(error){console.warn('3D fallback:',error.message);pick=null;fallback.hidden=false;}
 onDrag();
 openButton.addEventListener('click',spin);resetButton.addEventListener('click',reopen);
 flipButton.addEventListener('click',()=>{if(pick){pick.flip();flipButton.querySelector('.button-main').textContent='FLIP AGAIN';blip(680,.04,.15,'triangle');}else{flipFallback();flipButton.querySelector('.button-main').textContent='FLIP AGAIN';}});
 document.addEventListener('keydown',e=>{if(e.key==='Enter'&&stage==='ready'&&document.activeElement!==openButton)spin();if(stage==='inspect'&&pick){if(e.key==='ArrowLeft'){pick.auto=false;pick.targetYaw-=.19;}if(e.key==='ArrowRight'){pick.auto=false;pick.targetYaw+=.19;}if(e.key==='ArrowUp'){pick.auto=false;pick.targetPitch=Math.min(1,pick.targetPitch+.14);}if(e.key==='ArrowDown'){pick.auto=false;pick.targetPitch=Math.max(-1,pick.targetPitch-.14);}if(e.key.toLowerCase()==='f')pick.flip();}});
 // Intentional deterministic birthday win, no paid loot-box mechanics.
 window.__rareDropDebug={get state(){return stage},trigger:spin,restart:reopen,inspect:()=>{setState('inspect');if(pick)pick.setActive(true);},get renderer(){return pick}};
}
boot();
})();
