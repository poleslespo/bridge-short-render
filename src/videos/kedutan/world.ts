import * as THREE from "three";
import { Cast } from "./cast";
import { SHOTS, camAt, truckZAt } from "./story";

export type Kit = Record<string, never>;
export const loadKit=async():Promise<Kit>=>({}); // Semua set dressing prosedural, tanpa GLB.
const mat=(color:string,roughness=1)=>new THREE.MeshStandardMaterial({color,roughness});
const basic=(color:string)=>new THREE.MeshBasicMaterial({color});
const box=(w:number,h:number,d:number,_m?:THREE.Material)=>new THREE.BoxGeometry(w,h,d); // _m diabaikan dgn sengaja: material dipasang di Mesh, BUKAN di sini (jebakan Kentongan v1: material yg diselipkan ke box() hilang, pintu jadi putih default)
const sphere=new THREE.SphereGeometry(1,12,8);
const cylinder=(r:number,h:number)=>new THREE.CylinderGeometry(r,r,h,12);
const makeTextTexture=(lines:string[],w=512,h=256,font="bold 64px Arial",fg="#fff4c9",bg:string|null=null)=>{
 const c=document.createElement("canvas");c.width=w;c.height=h;const g=c.getContext("2d")!;
 if(bg){g.fillStyle=bg;g.fillRect(0,0,w,h);}
 g.font=font;g.textAlign="center";g.fillStyle=fg;g.strokeStyle="#20170f";g.lineWidth=10;
 const lh=parseInt(font.match(/(\d+)px/)?.[1]??"64",10)*1.15;
 const y0=(h-lh*(lines.length-1))/2+lh*0.36;
 lines.forEach((ln,i)=>{g.strokeText(ln,w/2,y0+i*lh);g.fillText(ln,w/2,y0+i*lh);});
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
};
export class World {
 root=new THREE.Group(); cast:Cast;
 private cameraPos=new THREE.Vector3();
 private look=new THREE.Vector3();
 private sun:THREE.DirectionalLight;
 private moon:THREE.DirectionalLight;
 private lamp:THREE.PointLight;
 private roomLamp:THREE.PointLight;
 private dayLight:THREE.AmbientLight;
 private stars:THREE.Points;
 private sky:THREE.Mesh;
 // suasana hidup: jendela berdenyut, kunang-kunang, awan, kabut, dedaunan
 private windowMats:THREE.MeshBasicMaterial[]=[];
 private crowns:{mesh:THREE.Mesh;baseX:number;phase:number}[]=[];
 private fireflies:THREE.Points;
 private ffBase:Float32Array;
 private clouds:THREE.Mesh[]=[];
 private mist:THREE.Mesh[]=[];
 // prop Kedutan
 private truck:THREE.Group;
 private eye:THREE.Group;
 private eyeLid:THREE.Mesh;
 private bukanText:THREE.Mesh;
 private tanyaText:THREE.Mesh;
 private myoText:THREE.Mesh;
 private glasses:THREE.Mesh[]=[];
 private hp:THREE.Group;
 private clockHands:THREE.Mesh[]=[];
 constructor(_kit:Kit){
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(180,180),mat("#26372b"));ground.rotation.x=-Math.PI/2;ground.position.y=-0.04;this.root.add(ground);
  // dirt road and distant paddy strips
  const road=new THREE.Mesh(new THREE.PlaneGeometry(5,90),mat("#66513b"));road.rotation.x=-Math.PI/2;road.position.set(0,0.005,-16);this.root.add(road);
  for(let i=0;i<7;i++){const p=new THREE.Mesh(new THREE.PlaneGeometry(16,5),mat(i%2?"#304b35":"#3b5838"));p.rotation.x=-Math.PI/2;p.position.set((i%2?1:-1)*13,0.01,-25-Math.floor(i/2)*9);this.root.add(p);}
  // houses on either side; windows are UNLIT (basic) so the lamp can never blow them white (bug Kentongan v1)
  for(let i=0;i<8;i++){const side=i%2?1:-1,z=-22+Math.floor(i/2)*10,x=side*(6.5+(i%3)*1.1);
   const house=new THREE.Group();house.position.set(x,0,z);
   const body=new THREE.Mesh(box(4,2.6,3.8,mat("#70533b")),mat("#70533b"));body.position.y=1.3;house.add(body);
   const roofGeo=new THREE.ConeGeometry(3.3,1.6,4);const roof=new THREE.Mesh(roofGeo,mat("#382b29"));roof.rotation.y=Math.PI/4;roof.position.y=3.35;house.add(roof);
   const door=new THREE.Mesh(box(.85,1.65,.08),mat("#30251f"));door.position.set(0,.85,1.95);house.add(door);
   for(const sx of [-1.1,1.1]){const wm=basic("#c98f3d");this.windowMats.push(wm);const win=new THREE.Mesh(box(.65,.6,.08,wm),wm);win.position.set(sx,1.7,1.96);house.add(win);}
   this.root.add(house);
  }
  // papan PUSKESMAS di rumah (7.6, 0, -2) — teks di dalam adegan, bukan panel
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(2.4,.55),new THREE.MeshBasicMaterial({map:makeTextTexture(["PUSKESMAS"],512,128,"bold 72px Arial","#1e6b3a","#f6f3e9")}));
  sign.position.set(7.6,2.4,-0.02);this.root.add(sign);
  // village trees and foreground silhouettes (crowns sway in update)
  for(let i=0;i<16;i++){const x=(i%2?1:-1)*(8+(i%4)*2),z=-30+Math.floor(i/2)*5;
   const trunk=new THREE.Mesh(cylinder(.18,2.4),mat("#443126"));trunk.position.set(x,1.2,z);this.root.add(trunk);
   const crown=new THREE.Mesh(sphere,mat("#203b2b"));crown.scale.set(1.35,1.2,1.25);crown.position.set(x,2.8,z);this.root.add(crown);
   this.crowns.push({mesh:crown,baseX:x,phase:i*1.1});
  }
  // sky dome and stars (twinkle in update)
  this.sky=new THREE.Mesh(new THREE.SphereGeometry(100,16,12),new THREE.MeshBasicMaterial({color:"#101d36",side:THREE.BackSide}));this.root.add(this.sky);
  const pts:THREE.Vector3[]=[];for(let i=0;i<180;i++){const a=i*2.399963229728653,y=8+((i*17)%35),r=55;pts.push(new THREE.Vector3(Math.cos(a)*r,y,-Math.abs(Math.sin(a)*r)-10));}
  const sg=new THREE.BufferGeometry().setFromPoints(pts);this.stars=new THREE.Points(sg,new THREE.PointsMaterial({color:"#dce8ff",size:.18,sizeAttenuation:true,transparent:true,opacity:.85}));this.root.add(this.stars);
  // --- kamar Jali (ruang terbuka gaya dollhouse, menghadap +x) di (-12, 0, 12) ---
  const roomFloor=new THREE.Mesh(new THREE.PlaneGeometry(5,4),mat("#5a4632"));roomFloor.rotation.x=-Math.PI/2;roomFloor.position.set(-12,0.01,12);this.root.add(roomFloor);
  const backWall=new THREE.Mesh(new THREE.PlaneGeometry(4,2.6),mat("#6b5138"));backWall.rotation.y=Math.PI/2;backWall.position.set(-14.45,1.3,12);this.root.add(backWall);
  const sideWall=new THREE.Mesh(new THREE.PlaneGeometry(5,2.6),mat("#63503a"));sideWall.rotation.y=Math.PI;sideWall.position.set(-12,1.3,14);this.root.add(sideWall);
  // bed: frame + kasur + bantal + selimut (semua menempel di lantai/dinding)
  const bedFrame=new THREE.Mesh(box(1.1,.35,2.0),mat("#4a3524"));bedFrame.position.set(-13.6,.22,12);this.root.add(bedFrame);
  const mattress=new THREE.Mesh(box(1.0,.18,1.9),mat("#d8cfc0"));mattress.position.set(-13.6,.48,12);this.root.add(mattress);
  const pillow=new THREE.Mesh(box(.8,.12,.4),mat("#f0ead8"));pillow.position.set(-13.6,.6,12.75);this.root.add(pillow);
  const blanket=new THREE.Mesh(box(1.0,.1,1.1),mat("#7a4a3a"));blanket.position.set(-13.6,.6,11.6);this.root.add(blanket);
  // jam dinding di dinding belakang (jarum menunjuk larut malam ~02.10)
  const clockFace=new THREE.Mesh(new THREE.CylinderGeometry(.28,.28,.05,20),mat("#f0ead8"));clockFace.rotation.z=Math.PI/2;clockFace.position.set(-14.4,2.0,12);this.root.add(clockFace);
  const handMat=mat("#252329");
  const hourHand=new THREE.Mesh(box(.02,.14,.01),handMat);hourHand.position.set(-14.36,2.02,12);hourHand.rotation.x=0;hourHand.rotation.z=-2.2;this.root.add(hourHand);this.clockHands.push(hourHand);
  const minHand=new THREE.Mesh(box(.02,.2,.01),handMat);minHand.position.set(-14.36,2.0,12);minHand.rotation.z=2.8;this.root.add(minHand);this.clockHands.push(minHand);
  // meja kecil di kamar: 3 gelas kopi + HP (layar menyala)
  const tableTop=new THREE.Mesh(box(.9,.06,.6),mat("#5a4632"));tableTop.position.set(-12.6,.7,13.2);this.root.add(tableTop);
  for(const [lx,lz] of [[-12.5,.05],[-12.75,.05],[-12.5,-.05],[-12.75,-.05]] as const){const leg=new THREE.Mesh(box(.06,.7,.06),mat("#4a3524"));leg.position.set(lx,.35,13.2+lz);this.root.add(leg);}
  for(let i=0;i<3;i++){const gl=new THREE.Mesh(cylinder(.05,.12),basic("#b8a06a"));gl.position.set(-12.8+i*.2,.79,13.1+(i%2)*.2);this.root.add(gl);this.glasses.push(gl);}
  this.hp=new THREE.Group();this.hp.position.set(-12.5,.74,13.35);
  const hpBody=new THREE.Mesh(box(.09,.015,.18),mat("#171b22"));this.hp.add(hpBody);
  const hpScreen=new THREE.Mesh(new THREE.PlaneGeometry(.08,.16),basic("#cfe4f2"));hpScreen.rotation.x=-Math.PI/2;hpScreen.position.y=.012;this.hp.add(hpScreen);
  this.root.add(this.hp);
  // --- truk panen (parkir di jalan, menghadap -z ke kota) ---
  this.truck=new THREE.Group();this.truck.position.set(.8,0,-6);this.root.add(this.truck);
  const cab=new THREE.Mesh(box(1.9,1.5,1.7),mat("#4a6b8a"));cab.position.set(0,1.0,-1.2);this.truck.add(cab);
  const windshield=new THREE.Mesh(box(1.6,.6,.06),basic("#bcd3e0"));windshield.position.set(0,1.35,-2.08);this.truck.add(windshield);
  const truckBed=new THREE.Mesh(box(2.0,.9,3.2),mat("#6b4a2f"));truckBed.position.set(0,.75,1.2);this.truck.add(truckBed);
  for(let i=0;i<5;i++){const sack=new THREE.Mesh(box(.65,.45,.5),mat("#b8a06a"));sack.position.set(i%2?-.6:.6,1.42,.2+Math.floor(i/2)*1.1);this.truck.add(sack);}
  for(const [wx,wz] of [[-1.0,-1.2],[1.0,-1.2],[-1.0,1.6],[1.0,1.6]] as const){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.35,.35,.2,12),mat("#1a1a1a"));wheel.rotation.z=Math.PI/2;wheel.position.set(wx,.35,wz);this.truck.add(wheel);}
  // --- cermin berdiri di halaman ---
  const mirrorFrame=new THREE.Mesh(box(.75,1.6,.06),mat("#3a2a1c"));mirrorFrame.position.set(-2.2,.8,4.5);this.root.add(mirrorFrame);
  const mirror=new THREE.Mesh(new THREE.PlaneGeometry(.62,1.48),basic("#c9d6de"));mirror.position.set(-2.2,.8,4.54);this.root.add(mirror);
  // --- mata ECU (hanya terlihat di shot ECU; kelopak berkedut di update) ---
  this.eye=new THREE.Group();this.eye.position.set(0,1.6,1.2);this.root.add(this.eye);
  const faceBg=new THREE.Mesh(new THREE.PlaneGeometry(2.2,1.6),basic("#c88f6c"));faceBg.position.set(0,0,-.35);this.eye.add(faceBg);
  const eyeball=new THREE.Mesh(sphere,basic("#e8e2d4"));eyeball.scale.set(.55,.34,.30);this.eye.add(eyeball);
  const iris=new THREE.Mesh(new THREE.CircleGeometry(.14,20),basic("#4a2f1d"));iris.position.set(0,0,.31);this.eye.add(iris);
  const pupil=new THREE.Mesh(new THREE.CircleGeometry(.065,16),basic("#1a1210"));pupil.position.set(0,0,.315);this.eye.add(pupil);
  this.eyeLid=new THREE.Mesh(box(.66,.30,.10),basic("#c88f6c"));this.eyeLid.position.set(0,.22,.26);this.eye.add(this.eyeLid);
  // --- teks di dalam adegan (hanya terlihat di shot-nya masing-masing) ---
  // "KEDUTAN" TIDAK di dunia 3D — jadi overlay React di Kedutan.tsx (ECU
  // terlalu sempit untuk teks in-world: plane 1,5 m selalu terpotong).
  this.bukanText=new THREE.Mesh(new THREE.PlaneGeometry(1.6,.4),new THREE.MeshBasicMaterial({map:makeTextTexture(["BUKAN KABAR DUKA"],640,160,"bold 56px Arial","#fff4c9"),transparent:true}));this.bukanText.position.set(-.4,2.9,.2);this.root.add(this.bukanText);
  this.tanyaText=new THREE.Mesh(new THREE.PlaneGeometry(1.3,.5),new THREE.MeshBasicMaterial({map:makeTextTexture(["MATAMU PERNAH","KEDUTAN JUGA?"],640,256,"bold 52px Arial","#fff4c9"),transparent:true}));this.tanyaText.position.set(0,2.45,.8);this.root.add(this.tanyaText);
  this.myoText=new THREE.Mesh(new THREE.PlaneGeometry(.45,.15),new THREE.MeshBasicMaterial({map:makeTextTexture(["MYOKYMIA"],360,120,"bold 44px Arial","#f6f3e9"),transparent:true}));this.myoText.position.set(.1,1.12,1.0);this.root.add(this.myoText);
  // fireflies (night only)
  this.ffBase=new Float32Array(36*3);
  for(let i=0;i<36;i++){this.ffBase[i*3]=-6+((i*2.399963)%12);this.ffBase[i*3+1]=0.6+((i*7)%20)/10;this.ffBase[i*3+2]=-8+((i*13)%12);}
  const ffGeo=new THREE.BufferGeometry();ffGeo.setAttribute("position",new THREE.BufferAttribute(this.ffBase.slice(),3));
  this.fireflies=new THREE.Points(ffGeo,new THREE.PointsMaterial({color:"#cfe89a",size:.14,transparent:true,opacity:.85,blending:THREE.AdditiveBlending,depthWrite:false}));this.root.add(this.fireflies);
  // slow clouds high up + thin ground mist drifting (awan kecil & redup:
  // plane 34x7 di y=20 terbaca seperti "plafon" gelap di atas frame)
  for(let i=0;i<2;i++){const cl=new THREE.Mesh(new THREE.PlaneGeometry(24,5),new THREE.MeshBasicMaterial({color:"#16233a",transparent:true,opacity:.35,depthWrite:false}));cl.position.set(-10+i*18,26+i*4,-45-i*10);this.root.add(cl);this.clouds.push(cl);}
  for(let i=0;i<2;i++){const m=new THREE.Mesh(new THREE.PlaneGeometry(26,1.4),new THREE.MeshBasicMaterial({color:"#93a8bd",transparent:true,opacity:.05,depthWrite:false}));m.position.set(0,0.7,-6+i*8);this.root.add(m);this.mist.push(m);}
  // lights (lamp 6: cukup terang, tidak sampai melewati ambang bloom)
  this.dayLight=new THREE.AmbientLight("#8ea0bd",.35);this.root.add(this.dayLight);
  this.moon=new THREE.DirectionalLight("#9bb8ee",1.5);this.moon.position.set(-8,12,5);this.root.add(this.moon);
  this.sun=new THREE.DirectionalLight("#fff0d3",2.2);this.sun.position.set(4,12,3);this.root.add(this.sun);
  this.lamp=new THREE.PointLight("#ffbf65",6,13,2);this.lamp.position.set(0,2.8,0);this.root.add(this.lamp);
  this.roomLamp=new THREE.PointLight("#ffb46a",2.5,9,2);this.roomLamp.position.set(-11,2.2,12);this.root.add(this.roomLamp);
  this.cast=new Cast(this.root);
 }
 update(id:number,f:number,camera:THREE.PerspectiveCamera,_scene?:THREE.Scene){
  const s=SHOTS[id-1];const local=Math.max(0,f-s.a);
  const pose=camAt(id,f);this.cameraPos.set(...pose.position);this.look.set(...pose.target);
  const kick=0;
  camera.position.set(this.cameraPos.x+kick,this.cameraPos.y,this.cameraPos.z);
  camera.lookAt(this.look);camera.fov=pose.fov;camera.updateProjectionMatrix();
  const day=s.light==="day"?1:0;
  this.sky.material=(this.sky.material as THREE.MeshBasicMaterial);(this.sky.material as THREE.MeshBasicMaterial).color.set("#101d36").lerp(new THREE.Color("#7db4dc"),day);
  this.stars.visible=day<.2;
  this.moon.intensity=1.5*(1-day);this.sun.intensity=2.2*day;
  // lamp flickers gently (flicker ~+-8%), instead of a dead-constant light
  this.lamp.intensity=6*(1-day)*(1+0.05*Math.sin(f*0.31)+0.03*Math.sin(f*0.117+1.3));
  this.roomLamp.intensity=2.5*(1-day);
  this.dayLight.intensity=.35+day*.7;
  // mata ECU: hanya terlihat di shot ECU; kelopak berkedut (cepat saat panik, pelan saat tenang)
  const eyeOn=(id===1&&local<70)||(id===5&&local>=110)||(id===10&&local<55);
  this.eye.visible=eyeOn;
  if(eyeOn){
   const rate=id===5?.7:id===10?.25:.55;
   const tw=Math.pow(Math.max(0,Math.sin(local*rate)),id===10?8:6)*(id===10?.7:1);
   this.eyeLid.position.y=.22-.16*tw;
  }
  // teks di dalam adegan: hanya di shot-nya masing-masing
  this.bukanText.visible=id===14&&local>=90;
  this.tanyaText.visible=id===16&&local>=80;
  this.myoText.visible=id===10&&local<55;
  // truk: diam kecuali shot 13 bagian B (jalan ke kota)
  if(id===13&&local>=70){this.truck.position.set(.8,Math.abs(Math.sin(local*.3))*.02,truckZAt(f));}
  else this.truck.position.set(.8,0,-6);
  // shot 12 bagian B: gelas kopi disingkirkan ke ujung meja, HP diletakkan jauh
  if(id===12&&local>=80){
   this.glasses.forEach((gl,i)=>gl.position.set(-12.95+i*.15,.79,13.35));
   this.hp.position.set(-12.95,.74,12.95);
  } else {
   this.glasses.forEach((gl,i)=>gl.position.set(-12.8+i*.2,.79,13.1+(i%2)*.2));
   this.hp.position.set(-12.5,.74,13.35);
  }
  this.cast.hideAll();
  const show=(n:"Jali"|"Nenek Sari"|"Pak Karto"|"Warga",x:number,z:number,sc=1,y=0)=>this.cast.show(n,x,z,sc,0,y);
  if(id===1&&local>=70)show("Jali",-2.2,5.3);
  if(id===2){show("Nenek Sari",-1.2,.7,1.08);show("Jali",-.4,.9);if(local>=100){show("Warga",-1.8,.2,.85);show("Warga",1.2,.3,.9);}}
  if(id===3)show("Jali",3.0,-2.0); // di samping truk (bukan di baknya!):
  // posisi lama (0.8,-4.3) ada DI DALAM jejak bak truk -> badan ketutup bak,
  // cuma kepala mengintip di antara karung (s03a/s14a).
  if(id===4&&local>=75)show("Jali",0,1.5);
  if(id===5&&local<110)show("Jali",-13.0,12);
  if(id===6)show("Jali",-12.2,12.6);
  if(id===7){show("Pak Karto",.4,.7,1.04);if(local>=90)show("Jali",-.5,1.0);}
  if(id===8){show("Pak Karto",2.3,1.1,1.04);show("Jali",-.8,1.0);}
  if(id===9&&local<60)show("Jali",-13.0,12);
  if(id===10)show("Jali",-2.2,5.3);
  if(id===11){show("Jali",0,1.0);if(local>=60){show("Warga",-1.5,1.4,.85);show("Warga",.6,1.6,.9);show("Warga",1.6,1.2,.88);}}
  if(id===12&&local<80)show("Jali",-13.6,11.2,1,0.95); // rebah DI ATAS kasur
  // (kaki di ujung selimut z=11.2, kepala ke arah bantal z=12.75; y=0.95
  // supaya badan tidak tenggelam ke kasur/selimut). Rebahnya via rotateZ
  // di applyGestures — BUKAN via posisi miring.
  if(id===13&&local<70)show("Jali",-13.0,12);
  if(id===14){show("Jali",3.0,-2.0);if(local>=90)show("Nenek Sari",-1.2,.5,1.08);}
  if(id===15)show("Jali",0,1.0);
  if(id===16)show("Jali",0,1.0);
  // ambient life: twinkling stars, drifting clouds + mist, swaying crowns, breathing windows, fireflies
  (this.stars.material as THREE.PointsMaterial).opacity=0.7+0.3*Math.sin(f*0.03);
  for(let i=0;i<this.clouds.length;i++){const cl=this.clouds[i];cl.position.x=-15+((((f*0.006+i*17)%30)+30)%30);}
  for(let i=0;i<this.mist.length;i++){const m=this.mist[i];m.position.x=((((f*0.008+i*13)%26)+26)%26)-13;}
  for(const c of this.crowns)c.mesh.position.x=c.baseX+Math.sin(f*0.028+c.phase)*0.12;
  for(let i=0;i<this.windowMats.length;i++)this.windowMats[i].color.setHex(0xc98f3d).multiplyScalar(0.9+0.1*Math.sin(f*0.02+i*1.7));
  const fp=this.fireflies.geometry.attributes.position as THREE.BufferAttribute;
  for(let i=0;i<36;i++)fp.setXYZ(i,
   this.ffBase[i*3]+Math.sin(f*0.021+i*1.3)*0.35,
   this.ffBase[i*3+1]+Math.sin(f*0.017+i*2.1)*0.25,
   this.ffBase[i*3+2]+Math.cos(f*0.019+i*0.7)*0.35);
  fp.needsUpdate=true;this.fireflies.visible=day<0.3;
  // billboards always face the current camera without modifying their world-space feet
  this.cast.faceCamera(camera);
  this.applyGestures(id,local);
  return this.look;
 }
 /** Minimal procedural gestures (rotate around the feet; lean caps from the
  *  channel rules: transient lean max ~4 deg = 0.07 rad). Applied AFTER
  *  faceCamera, so they read in screen space. */
 private applyGestures(id:number,local:number){
  const g=(n:"Jali"|"Nenek Sari"|"Pak Karto"|"Warga",rz=0,rx=0,dx=0,dy=0)=>this.cast.gesture(n,rz,rx,dx,dy);
  if(id===1&&local>=70){ // Jali kaget di depan cermin: recoil lalu pulih
   const env=local<78?0:local<100?Math.sin(Math.PI*(local-78)/22):0;g("Jali",0.06*env,0,-0.1*env,0);
  } else if(id===2){ // Nenek angguk pelan sambil memperingatkan; Jali cemas
   g("Nenek Sari",0,0.05*Math.sin(local*0.06),0,0);g("Jali",0.04,0,0,0);
  } else if(id===3){ // tangan Jali gemetar memegang kunci
   g("Jali",0,0,0.02*Math.sin(local*0.8),0);
  } else if(id===4&&local>=75){ // Jali menatap jauh ke jalan
   g("Jali",0,0.03,0,0);
  } else if(id===5){ // Jali terjaga, gelisah: kepala goyang pelan
   g("Jali",0.03*Math.sin(local*0.05),0,0,0);
  } else if(id===6){ // Jali menuang kopi: condong ke meja
   g("Jali",0,0.05,0,0);
  } else if(id===7){ // Karto condong memeriksa; Jali pasrah menunduk
   g("Pak Karto",-0.05,0,0,0);g("Jali",0,0.05,0,0);
  } else if(id===8){ // Karto menjelaskan; Jali mendengarkan, alis terangkat (condong + angguk)
   g("Pak Karto",-0.04,0,0,0);g("Jali",0.05,0.03*Math.sin(local*0.05),0,0);
  } else if(id===9){ // begadang lagi: gelisah seperti shot 5
   g("Jali",0.03*Math.sin(local*0.05),0,0,0);
  } else if(id===10){ // sentuh kelopak di cermin: condong ke depan; lalu angguk paham
   if(local>=55&&local<115)g("Jali",0,0.06,0,0);
   else if(local>=115)g("Jali",0,0.04*Math.sin((local-115)*0.06),0,0);
  } else if(id===11){ // Jali lega: bersandar santai; warga mengangguk
   g("Jali",0,-0.03,0,0);
   if(local>=60)this.cast.gestureEach("Warga",(m,i)=>{m.rotateX(0.04*Math.sin(local*0.07+i*1.3));});
  } else if(id===12){ // Jali tidur rebah di kasur: rotateZ 90° = badan
   // horizontal di ruang layar (kepala ke arah bantal +z, kaki ke selimut);
   // napas pelan via dy. rotateZ di sini SENGAJA 90° (bukan lean!) karena
   // pose-nya memang rebah — bedakan dari lean gerak yang maks 0.07 rad.
   g("Jali",Math.PI/2,0,0,0.02*Math.sin(local*0.06));
  } else if(id===13&&local<70){ // Jali bangun segar: tegak + angguk kecil
   g("Jali",0,0.03*Math.sin(local*0.05),0,0);
  } else if(id===14){ // Jali tersenyum: angguk; Nenek ikut mengangguk
   g("Jali",0,0.03*Math.sin(local*0.05),0,0);
   if(local>=90)g("Nenek Sari",0,0.04*Math.sin((local-90)*0.06),0,0);
  } else if(id===15){ // Jali menunjuk mata: condong ke depan
   g("Jali",0,0.04,0,0);
  } else if(id===16&&local>=80){ // senyum penutup: angguk pelan
   g("Jali",0,0.03*Math.sin((local-80)*0.05),0,0);
  }
 }
}
