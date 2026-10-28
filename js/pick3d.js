/* Sealed beveled pick with virtual depth layers and view-dependent foil.
   Shader approach adapted from Holo Card Studio; see THIRD-PARTY-NOTICES.md. */
(function(){'use strict';
const VS=`#version 300 es
precision highp float;
in vec3 aPos;in vec2 aUV;in vec3 aNormal;
uniform float uYaw,uPitch,uRoll,uZoom,uAspect,uHover,uLayerParallax;
out vec2 vUV;out vec3 vN;out vec3 vPosition;out float vCamDist;out vec3 vLocalView;
vec3 rotateObject(vec3 p){
 p.xz=mat2(cos(uYaw),-sin(uYaw),sin(uYaw),cos(uYaw))*p.xz;
 p.yz=mat2(cos(uPitch),-sin(uPitch),sin(uPitch),cos(uPitch))*p.yz;
 p.xy=mat2(cos(uRoll),sin(uRoll),-sin(uRoll),cos(uRoll))*p.xy;
 return p;
}
void main(){
 vec3 p=aPos;
 float yc=cos(uYaw),ys=sin(uYaw),xc=cos(uPitch),xs=sin(uPitch),zc=cos(uRoll),zs=sin(uRoll);
 p.xz=mat2(yc,-ys,ys,yc)*p.xz;
 p.yz=mat2(xc,-xs,xs,xc)*p.yz;
 p.xy=mat2(zc,zs,-zs,zc)*p.xy;
 vec3 n=aNormal;
 n.xz=mat2(yc,-ys,ys,yc)*n.xz;
 n.yz=mat2(xc,-xs,xs,xc)*n.yz;
 n.xy=mat2(zc,zs,-zs,zc)*n.xy;
 float cameraDistance=3.4;
 float viewZ=p.z-cameraDistance;
 float near=0.1,far=15.0;
 gl_Position=vec4(p.x*2.26*uZoom/uAspect,p.y*2.26*uZoom,((far+near)/(near-far))*viewZ+(2.0*far*near)/(near-far),-viewZ);
 vUV=aUV;vN=normalize(n);vPosition=p;vCamDist=-viewZ;
 vec3 view=vec3(0.,0.,cameraDistance)-p;
 vLocalView=vec3(dot(view,rotateObject(vec3(1,0,0))),dot(view,rotateObject(vec3(0,1,0))),dot(view,rotateObject(vec3(0,0,1))));
}
`;
const FS=`#version 300 es
precision highp float;
in vec2 vUV;in vec3 vN;in vec3 vPosition;in float vCamDist;in vec3 vLocalView;
uniform sampler2D uTexture,uSubject,uLine,uText;
uniform int uKind;
uniform float uYaw,uPitch,uTime,uFoilIntensity;
out vec4 outColor;
// Holo Card Studio's view-space parallax / overlay foil approach, adapted to a pick.
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
vec3 iridescent(float t){return .52+.48*cos(6.283185*(vec3(.02,.35,.68)+t));}
vec3 overlay(vec3 b,vec3 f){return mix(2.*b*f,1.-2.*(1.-b)*(1.-f),step(vec3(.5),b));}
float inside(vec2 p){return step(0.,p.x)*step(0.,p.y)*step(p.x,1.)*step(p.y,1.);}
vec4 sampleLayer(sampler2D t,vec2 uv){vec4 c=texture(t,clamp(uv,0.,1.));c.a*=inside(uv);return c;}
void main(){
 vec3 n=normalize(vN), view=normalize(vec3(-vPosition.xy,3.4-vPosition.z));
 vec3 light=normalize(vec3(-.42,.68,1.0));
 float facing=clamp(dot(n,view),0.0,1.0);
 float fresnel=pow(1.0-facing,2.3);
 if(uKind==5){
  float diffuse=.25+.75*max(dot(n,light),0.0);
  float stripe=1.-smoothstep(.025,.055,abs(vUV.y-.5));
  vec3 base=mix(vec3(.48,.55,.62),vec3(.09,.12,.16),stripe)*diffuse;
  base+=vec3(.95,.69,.34)*pow(max(dot(reflect(-light,n),view),0.0),48.0)*1.4;
  base+=iridescent(vUV.x*2.+dot(n,view)*1.5)*fresnel*.24;
  outColor=vec4(base,1.0);return;
 }
 vec2 uv=vUV;
 vec4 tex=texture(uTexture,uv);
 if(tex.a<.035)discard;
 // A single sealed surface clips every virtual depth layer to the same silhouette.
 vec3 localView=normalize(vLocalView);
 if((uKind==0 && localView.z<=0.)||(uKind==4 && localView.z>=0.))discard;
 vec2 slope=localView.xy/max(abs(localView.z),.38);
 vec2 bu=uv-slope*.022,su=uv+slope*.062;
 vec4 sub=sampleLayer(uSubject,su);
 vec3 base=tex.rgb;
 float disc=1.-smoothstep(.18,.215,length(uv-vec2(.5,.674)));
 float wave=.5+.5*sin(dot(uv+slope*.52,vec2(.848,-.530))*9.+noise(uv*5.)*2.);
 vec3 foil=iridescent(wave*.8+noise(uv*9.)*.12);
 float sweep=pow(max(0.,sin(dot(uv,vec2(.83,.35))*6.283+dot(slope,vec2(5.4,3.1)))),18.);
 if(uKind==0){
  vec3 recessed=texture(uTexture,bu).rgb;
  base=mix(base,recessed,disc);
  // Remove baked rainbow chroma only in the foil inset; realtime light supplies it.
  float lum=dot(base,vec3(.2126,.7152,.0722));
  base=mix(base,vec3(lum),disc*.82);
  base=mix(base,overlay(base,foil),disc*.80*uFoilIntensity);
  base+=foil*sweep*(.12+disc*.48)*uFoilIntensity;
  vec2 grain=floor(bu*330.);
  float flake=pow(max(0.,sin(hash(grain)*50.+dot(slope,vec2(23.,17.)))),32.)*step(.94,hash(grain+5.));
  base+=foil*flake*disc*.8*uFoilIntensity;
  vec4 shadow=sampleLayer(uSubject,su+vec2(-.012,.018));
  base*=1.-shadow.a*(1.-sub.a)*.48;
  float subjectLum=dot(sub.rgb,vec3(.2126,.7152,.0722));
  float foilPrint=disc*smoothstep(.18,.55,subjectLum);
  vec3 subject=mix(sub.rgb,vec3(subjectLum),foilPrint*.92);
  subject=mix(subject,overlay(subject,foil),(.12+foilPrint*.72)*uFoilIntensity);
  subject+=foil*sweep*foilPrint*.50*uFoilIntensity;
  base=mix(base,subject,sub.a);
  vec4 line=sampleLayer(uLine,uv);
  base+=line.rgb*line.a*sweep*.36;
  vec4 lettering=sampleLayer(uText,uv);
  base=mix(base,lettering.rgb,lettering.a);
 }else{
  base=mix(base,overlay(base,foil),.13*uFoilIntensity);
  base+=foil*sweep*.12;
 }
 float highlight=pow(max(dot(reflect(-light,n),view),0.),65.);
 base+=vec3(.92,.96,1.)*highlight*.20+vec3(.26,.44,.62)*fresnel*.20;
 outColor=vec4(base,tex.a);return;
}`;
function compile(gl,type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;}
function createProgram(gl){const p=gl.createProgram();gl.attachShader(p,compile(gl,gl.VERTEX_SHADER,VS));gl.attachShader(p,compile(gl,gl.FRAGMENT_SHADER,FS));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));return p;}
function loadImage(url){return new Promise((resolve,reject)=>{const i=new Image();i.decoding='async';i.onload=()=>resolve(i);i.onerror=()=>reject(new Error('Cannot load '+url));i.src=url;});}
function buildQuad(z,back=false){const vertices=[];const indices=[0,1,2,0,2,3];let pts=[[-1,-1],[1,-1],[1,1],[-1,1]];for(const [x,y] of pts){vertices.push(x,y,z,back?(1-x)/2:(x+1)/2,(y+1)/2,0,0,back?-1:1);}return{vertices,indices};}
function buildSide(contour){
 const vertices=[],indices=[];
 let area=0;for(let i=0;i<contour.length;i++){const a=contour[i],b=contour[(i+1)%contour.length];area+=a[0]*b[1]-b[0]*a[1];}
 const sign=area>0?1:-1;
 const rings=[[1,.079],[1.018,.059],[1.022,.035],[1.022,-.035],[1.018,-.059],[1,-.079]];
 for(let j=0;j<rings.length-1;j++)for(let i=0;i<contour.length;i++){
  const a=contour[i],b=contour[(i+1)%contour.length],prev=contour[(i+contour.length-1)%contour.length],next=contour[(i+2)%contour.length];
  const [s,z]=rings[j],[t,w]=rings[j+1],start=vertices.length/8;
  for(const [p,q,r,scale,depth,v]of [[a,prev,b,s,z,j/5],[b,a,next,s,z,j/5],[b,a,next,t,w,(j+1)/5],[a,prev,b,t,w,(j+1)/5]]){
   const dx=r[0]-q[0],dy=r[1]-q[1],length=Math.hypot(dx,dy),radial=Math.hypot(...p);
   const nz=(t-s)*radial/(z-w),norm=Math.hypot(1,nz);
   vertices.push(p[0]*scale,p[1]*scale,depth,(i+(p===b?1:0))/contour.length,v,sign*dy/length/norm,-sign*dx/length/norm,nz/norm);
  }
  indices.push(start,start+1,start+2,start,start+2,start+3);
 }
 return{vertices,indices};
}
class PickRenderer{
 constructor(canvas){this.canvas=canvas;this.gl=canvas.getContext('webgl2',{alpha:true,antialias:true,depth:true,premultipliedAlpha:false,powerPreference:'high-performance'});if(!this.gl)throw new Error('WebGL2 not supported');this.yaw=-.22;this.pitch=-.10;this.roll=-.06;this.targetYaw=this.yaw;this.targetPitch=this.pitch;this.zoom=1;this.dragging=false;this.active=false;this.ready=false;this.auto=true;this.foilIntensity=1.12;this.rotations=0;this.then=0;this.frame=this.frame.bind(this);this.needsFrame=false;}
 async init(){const gl=this.gl;const base='assets/pick/';let [bg,sub,line,text,back,response]=await Promise.all([loadImage(base+'background.png'),loadImage(base+'subject.png'),loadImage(base+'lineart.png'),loadImage(base+'text.png'),loadImage(base+'back.png'),Promise.resolve(window.PICK_OUTLINE)]);this.program=createProgram(gl);this.locations={};for(const a of ['aPos','aUV','aNormal'])this.locations[a]=gl.getAttribLocation(this.program,a);for(const u of ['uYaw','uPitch','uRoll','uZoom','uAspect','uTime','uFoilIntensity','uTexture','uKind'])this.locations[u]=gl.getUniformLocation(this.program,u);this.textures=[bg,sub,line,text,back].map(im=>{let t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,im);gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t});this.meshes=[buildQuad(.079),buildQuad(.094),buildQuad(.101),buildQuad(.113),buildQuad(-.079,true),buildSide(response)].map(m=>this.createMesh(m));gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.clearColor(0,0,0,0);this.ready=true;this.start();}
 createMesh(mesh){const gl=this.gl;let vao=gl.createVertexArray();gl.bindVertexArray(vao);const vb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(mesh.vertices),gl.STATIC_DRAW);const eb=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,eb);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(mesh.indices),gl.STATIC_DRAW);const stride=8*4;[[this.locations.aPos,3,0],[this.locations.aUV,2,3*4],[this.locations.aNormal,3,5*4]].forEach(([loc,num,offset])=>{gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,num,gl.FLOAT,false,stride,offset);});gl.bindVertexArray(null);return{vao,count:mesh.indices.length};}
 start(){if(this.needsFrame)return;this.needsFrame=true;requestAnimationFrame(this.frame)}
 stop(){this.active=false;this.auto=false;}
 setActive(active){this.active=active;if(active)this.start()}
 flip(){this.targetYaw+=Math.PI;this.auto=false;}
 reset(){this.targetYaw=-.22;this.targetPitch=-.10;this.zoom=1;this.auto=true;}
 frame(now){if(!this.needsFrame)return;const gl=this.gl;if(!this.ready)return;const dt=Math.min(0.06,(now-this.then)/1000||.016);this.then=now;
 if(this.active){if(this.auto&&!this.dragging){this.targetYaw=-.12+Math.sin(now*.00045)*.38;this.targetPitch=-.085+Math.sin(now*.00052)*.14;}this.yaw+=(this.targetYaw-this.yaw)*Math.min(1,dt*7.5);this.pitch+=(this.targetPitch-this.pitch)*Math.min(1,dt*7.5);this.roll=Math.sin(now*.00048)*.018;
 let w=this.canvas.clientWidth,h=this.canvas.clientHeight,dpr=Math.min(devicePixelRatio||1,2);let rw=Math.round(w*dpr),rh=Math.round(h*dpr);if(this.canvas.width!==rw||this.canvas.height!==rh){this.canvas.width=rw;this.canvas.height=rh;}gl.viewport(0,0,rw,rh);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(this.program);
 let uniform=(name,val)=>gl.uniform1f(this.locations[name],val);uniform('uYaw',this.yaw);uniform('uPitch',this.pitch);uniform('uRoll',this.roll);uniform('uZoom',this.zoom);uniform('uAspect',w/h);uniform('uTime',now*.001);uniform('uFoilIntensity',this.foilIntensity);gl.uniform1i(this.locations.uTexture,0);
 for(const [unit,name]of [[1,'uSubject'],[2,'uLine'],[3,'uText']]){gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,this.textures[unit]);gl.uniform1i(gl.getUniformLocation(this.program,name),unit);}
 // Virtual layers stay inside the solid face, including at grazing angles.
 for(let idx of [4,5,0]){gl.uniform1i(this.locations.uKind,idx);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.textures[idx===5?0:idx]);gl.bindVertexArray(this.meshes[idx].vao);gl.drawElements(gl.TRIANGLES,this.meshes[idx].count,gl.UNSIGNED_SHORT,0);}
 if(this.onAngles)this.onAngles(this.pitch*180/Math.PI,this.yaw*180/Math.PI);
 }
 requestAnimationFrame(this.frame);
 }
}
window.PickRenderer=PickRenderer;
})();
