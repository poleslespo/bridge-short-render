import * as THREE from "three";
import { Cast, lidAt, CHAR_IDX } from "./cast";
import type { Expr, ActorName, Anim } from "./cast";
import { SHOTS, camAt, truckZAt, clamp01, smooth } from "./story";

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
 // lineJoin ROUND (perbaikan 27 Nov): join "miter" bawaan membuat duri
 // hitam runcing di atas huruf kapital (M/A/T/K) — kelihatan di kartu
 // penutup "MATAMU PERNAH KEDUTAN JUGA?" video final.
 g.lineJoin="round";g.lineCap="round";
 const lh=parseInt(font.match(/(\d+)px/)?.[1]??"64",10)*1.15;
 const y0=(h-lh*(lines.length-1))/2+lh*0.36;
 lines.forEach((ln,i)=>{g.strokeText(ln,w/2,y0+i*lh);g.fillText(ln,w/2,y0+i*lh);});
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
};
/** Jalan dari (x0,z0) ke (x1,z1) selama local t0..t1 — TANPA bobbing
 *  vertikal (v5 living rig, 28 Nov 2026). v1-v4: dy = 0,035·|sin| bikin
 *  tokoh MANTUL/loncat kayak pocong (kaki statis di tekstur, badan
 *  terangkat dari tanah). Kini tokoh MELUNCUR: y=0 selalu, langkah
 *  dibaca dari KAKI yang digambar per fase (cast.ts) — dist = jarak
 *  tempuh sepanjang jalur, dipakai menghitung fase langkah
 *  (phase = dist / STRIDE). Mengembalikan {x,z,dist,moving}. */
const STRIDE=1.1; // 1 siklus jalan (2 langkah) = 1,1 m -> langkah ±0,55 m
const walk=(x0:number,z0:number,x1:number,z1:number,local:number,t0:number,t1:number)=>{
 const u=clamp01((local-t0)/(t1-t0));const s=smooth(u);
 const len=Math.hypot(x1-x0,z1-z0);
 return {x:x0+(x1-x0)*s,z:z0+(z1-z0)*s,dist:s*len,moving:local>t0&&local<t1};
};
/** Pembicara tiap shot = tokoh FOKUS shot itu ("yang bercerita").
 *  Narasi Kedutan adalah narator — mulut tokoh fokus bergetar saat
 *  baris narasinya berbunyi (shot = satu baris; batas SHOTS a/b =
 *  batas baris timeline-ep11.json), tertutup di jeda antar baris. */
const SPEAKER:Record<number,ActorName>={1:"Jali",2:"Nenek Sari",3:"Jali",4:"Jali",5:"Jali",6:"Jali",7:"Pak Karto",8:"Pak Karto",9:"Jali",10:"Jali",11:"Jali",12:"JaliSehat",13:"JaliSehat",14:"JaliSehat",15:"JaliSehat",16:"JaliSehat"};
const mouthAt=(id:number,f:number,name:ActorName)=>{
 const s=SHOTS[id-1];
 if(name!==SPEAKER[id])return 0;
 if(f<s.a||f>=s.b)return 0; // jeda antar baris: mulut tertutup
 if(id===12)return 0; // Jali TIDUR di shot 12: mulut tertutup
 const t=f/30;
 return 0.3+0.7*Math.abs(Math.sin(2*Math.PI*4.3*t)); // getar bicara ±4,3 Hz
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
 private shot15Trees:THREE.Mesh[]=[]; // pohon dpn PUSKESMAS — disembunyikan shot 15
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
  // FIX 27 Nov (kotak putih): papan putih polos tanpa bingkai di dinding gelap
  // terbaca sbg kotak putih ngambang — papan belakang hijau gelap sbg bingkai
  // (15 cm sisi, 10 cm atas/bawah; ujung atas 2.775 msh di bawah lereng atap 2.81).
  const signBack=new THREE.Mesh(new THREE.PlaneGeometry(2.7,.75),basic("#14532d"));
  signBack.position.set(7.6,2.4,-0.045);this.root.add(signBack);
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(2.4,.55),new THREE.MeshBasicMaterial({map:makeTextTexture(["PUSKESMAS"],512,128,"bold 72px Arial","#1e6b3a","#f6f3e9")}));
  sign.position.set(7.6,2.4,-0.02);this.root.add(sign);
  // village trees and foreground silhouettes (crowns sway in update)
  for(let i=0;i<16;i++){const x=(i%2?1:-1)*(8+(i%4)*2),z=-30+Math.floor(i/2)*5;
   const trunk=new THREE.Mesh(cylinder(.18,2.4),mat("#443126"));trunk.position.set(x,1.2,z);this.root.add(trunk);
   const crown=new THREE.Mesh(sphere,mat("#203b2b"));crown.scale.set(1.35,1.2,1.25);crown.position.set(x,2.8,z);this.root.add(crown);
   this.crowns.push({mesh:crown,baseX:x,phase:i*1.1});
   if(i===11||i===13)this.shot15Trees.push(trunk,crown);
   // FIX pohon 27 Nov: i=13 (10,0) berdiri 2 m di depan dinding PUSKESMAS,
   // tajuknya menutup ~20% kanan frame cut shot 15; i=11 (14,-5) selip di
   // tepi kanan. Keduanya tak terlihat di bagian A shot 15 (di luar FOV).
  }
  // sky dome and stars (twinkle in update)
  this.sky=new THREE.Mesh(new THREE.SphereGeometry(100,16,12),new THREE.MeshBasicMaterial({color:"#101d36",side:THREE.BackSide}));this.root.add(this.sky);
  const pts:THREE.Vector3[]=[];for(let i=0;i<180;i++){const a=i*2.399963229728653,y=8+((i*17)%35),r=55;pts.push(new THREE.Vector3(Math.cos(a)*r,y,-Math.abs(Math.sin(a)*r)-10));}
  const sg=new THREE.BufferGeometry().setFromPoints(pts);this.stars=new THREE.Points(sg,new THREE.PointsMaterial({color:"#dce8ff",size:.18,sizeAttenuation:true,transparent:true,opacity:.85}));this.root.add(this.stars);
  // --- kamar Jali (ruang terbuka gaya dollhouse, menghadap +x) di (-12, 0, 12) ---
  // kamar diterangkan (perbaikan 27 Nov — video final terlalu gelap/murky):
  // warna dinding/lantai dinaikkan + lampu kamar diperkuat (lihat update).
  const roomFloor=new THREE.Mesh(new THREE.PlaneGeometry(5,4),mat("#6b5540"));roomFloor.rotation.x=-Math.PI/2;roomFloor.position.set(-12,0.01,12);this.root.add(roomFloor);
  const backWall=new THREE.Mesh(new THREE.PlaneGeometry(4,2.6),mat("#7d6244"));backWall.rotation.y=Math.PI/2;backWall.position.set(-14.45,1.3,12);this.root.add(backWall);
  const sideWall=new THREE.Mesh(new THREE.PlaneGeometry(5,2.6),mat("#74604a"));sideWall.rotation.y=Math.PI;sideWall.position.set(-12,1.3,14);this.root.add(sideWall);
  // bed: frame + kasur + bantal + selimut (semua menempel di lantai/dinding)
  const bedFrame=new THREE.Mesh(box(1.1,.35,2.0),mat("#4a3524"));bedFrame.position.set(-13.6,.22,12);this.root.add(bedFrame);
  const mattress=new THREE.Mesh(box(1.0,.18,1.9),mat("#d8cfc0"));mattress.position.set(-13.6,.48,12);this.root.add(mattress);
  const pillow=new THREE.Mesh(box(.8,.12,.4),mat("#f0ead8"));pillow.position.set(-13.6,.6,12.75);this.root.add(pillow);
  const blanket=new THREE.Mesh(box(1.0,.1,1.1),mat("#7a4a3a"));blanket.position.set(-13.6,.6,11.6);this.root.add(blanket);
  // jam dinding di dinding belakang (jarum menunjuk larut malam ~02.10)
  const clockFace=new THREE.Mesh(new THREE.CylinderGeometry(.28,.28,.05,20),mat("#f0ead8"));clockFace.rotation.z=Math.PI/2;clockFace.position.set(-14.4,2.25,12);this.root.add(clockFace);
  const handMat=mat("#252329");
  const hourHand=new THREE.Mesh(box(.02,.14,.01),handMat);hourHand.position.set(-14.36,2.27,12);hourHand.rotation.x=0;hourHand.rotation.z=-2.2;this.root.add(hourHand);this.clockHands.push(hourHand);
  const minHand=new THREE.Mesh(box(.02,.2,.01),handMat);minHand.position.set(-14.36,2.25,12);minHand.rotation.z=2.8;this.root.add(minHand);this.clockHands.push(minHand);
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
  // --- wajah DI DALAM cermin berdiri (perbaikan 27 Nov): mata lama di
  // (0,1.6,1.2) memenuhi SELURUH frame di hook (user: "terlalu ngezoom").
  // Kini WAJAH KECIL di dalam kaca cermin (-2.2, 4.5) — kepala elips +
  // rambut + bahu, bola mata di tengahnya; shot lebar menampilkan wajah +
  // cermin + halaman sekaligus. JANGAN pakai persegi kulit besar sebagai
  // "wajah" — percobaan pertama (faceBg 0.58x1.4) jadi monolit kulit
  // raksasa yang menutupi kaca (s01a gagal). Kelopak berkedut di update.
  this.eye=new THREE.Group();this.eye.position.set(-2.2,1.15,4.62);this.root.add(this.eye);
  const face=new THREE.Mesh(new THREE.CircleGeometry(1,24),basic("#c88f6c"));face.scale.set(.18,.22,1);face.position.set(0,0.10,-0.05);this.eye.add(face);
  // rambut: KUBAH setengah lingkaran di atas kepala (bukan elips penuh —
  // elips penuh jadi "topi hitam raksasa", s01a gagal)
  const hair=new THREE.Mesh(new THREE.CircleGeometry(1,24,0,Math.PI),basic("#241f1c"));hair.scale.set(.18,.12,1);hair.position.set(0,0.28,-0.04);this.eye.add(hair);
  // bahu: oval hijau di bawah wajah (bukan persegi — persegi jadi "kotak hijau")
  const shoulders=new THREE.Mesh(new THREE.CircleGeometry(1,24),basic("#527d58"));shoulders.scale.set(.28,.14,1);shoulders.position.set(0,-0.30,-0.06);this.eye.add(shoulders);
  const eyeball=new THREE.Mesh(sphere,basic("#e8e2d4"));eyeball.scale.set(.10,.055,.05);eyeball.position.set(0,0.12,0);this.eye.add(eyeball);
  const iris=new THREE.Mesh(new THREE.CircleGeometry(.045,20),basic("#4a2f1d"));iris.position.set(0,0.12,.055);this.eye.add(iris);
  const pupil=new THREE.Mesh(new THREE.CircleGeometry(.022,16),basic("#1a1210"));pupil.position.set(0,0.12,.06);this.eye.add(pupil);
  // kelopak: KUBAH kulit di atas bola mata (bukan kotak/elips penuh —
  // kotak terbaca sebagai tempelan persegi, elips penuh menutupi setengah
  // mata terus; s01a gagal). Diam di y=0.19 (tepat di atas bola mata),
  // turun menutupi iris saat berkedut.
  this.eyeLid=new THREE.Mesh(new THREE.CircleGeometry(1,24,0,Math.PI),basic("#c88f6c"));this.eyeLid.scale.set(.10,.05,1);this.eyeLid.position.set(0,.19,.05);this.eye.add(this.eyeLid);
  // --- teks di dalam adegan (hanya terlihat di shot-nya masing-masing) ---
  // "KEDUTAN" TIDAK di dunia 3D — jadi overlay React di Kedutan.tsx (ECU
  // terlalu sempit untuk teks in-world: plane 1,5 m selalu terpotong).
  this.bukanText=new THREE.Mesh(new THREE.PlaneGeometry(1.6,.4),new THREE.MeshBasicMaterial({map:makeTextTexture(["BUKAN KABAR DUKA"],640,160,"bold 56px Arial","#fff4c9"),transparent:true}));this.bukanText.position.set(-.4,2.9,.2);this.root.add(this.bukanText);
  this.tanyaText=new THREE.Mesh(new THREE.PlaneGeometry(1.3,.5),new THREE.MeshBasicMaterial({map:makeTextTexture(["MATAMU PERNAH","KEDUTAN JUGA?"],640,256,"bold 52px Arial","#fff4c9"),transparent:true}));this.tanyaText.position.set(0,2.45,.8);this.root.add(this.tanyaText);
  this.myoText=new THREE.Mesh(new THREE.PlaneGeometry(.7,.23),new THREE.MeshBasicMaterial({map:makeTextTexture(["MYOKYMIA"],360,120,"bold 44px Arial","#f6f3e9"),transparent:true}));this.myoText.position.set(-2.2,2.5,4.6);this.root.add(this.myoText);
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
  this.dayLight=new THREE.AmbientLight("#8ea0bd",.5);this.root.add(this.dayLight);
  this.moon=new THREE.DirectionalLight("#9bb8ee",1.5);this.moon.position.set(-8,12,5);this.root.add(this.moon);
  this.sun=new THREE.DirectionalLight("#fff0d3",2.2);this.sun.position.set(4,12,3);this.root.add(this.sun);
  this.lamp=new THREE.PointLight("#ffbf65",6,13,2);this.lamp.position.set(0,2.8,0);this.root.add(this.lamp);
  this.roomLamp=new THREE.PointLight("#ffb46a",4.5,9,2);this.roomLamp.position.set(-11,2.2,12);this.root.add(this.roomLamp);
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
  this.roomLamp.intensity=4.5*(1-day);
  this.dayLight.intensity=.5+day*.55;
  // mata di cermin: hanya terlihat di segmen ECU shot 1 & 10 (bukan lagi
  // shot 5 cut 3 — itu kini medium shot kamar, BUKAN ECU melayang);
  // kelopak berkedut (cepat saat panik, pelan saat tenang)
  const eyeOn=(id===1&&local<70)||(id===10&&local<55);
  this.eye.visible=eyeOn;
  if(eyeOn){
   const rate=id===10?.25:.55;
   const tw=Math.pow(Math.max(0,Math.sin(local*rate)),id===10?8:6)*(id===10?.7:1);
   this.eyeLid.position.y=.19-.05*tw;
  }
  // teks di dalam adegan: hanya di shot-nya masing-masing
  this.bukanText.visible=id===14&&local>=90;
  this.tanyaText.visible=id===16&&local>=80;
  this.myoText.visible=id===10&&local<55;
  // truk: diam kecuali shot 13 bagian B (jalan ke kota)
  if(id===13&&local>=70){this.truck.position.set(.8,Math.abs(Math.sin(local*.3))*.02,truckZAt(f));}
  else this.truck.position.set(.8,0,-6);
  // FIX kotak-di-jalan (27 Nov): muka depan bak truk (#6b4a2f) kena bayangan
  // jadi ~#241407, jauh lbh gelap dr jalan (#66513b) — di shot 15 yg kameranya
  // lurus menyusuri jalan, bak itu terbaca sbg bayangan kotak di jalan.
  // Truk tak berperan di shot 15 (Jali menunjuk mata -> cut PUSKESMAS),
  // jadi disembunyikan khusus shot 15 saja; shot 13/14 tak berubah.
  this.truck.visible=id!==15;
  // FIX pita hitam/pohon (27 Nov): pohon i=13 di (10,0) berdiri 2 m di depan
  // dinding PUSKESMAS, tepat di garis pandang cut shot 15 — tajuk gelapnya
  // menutup ~20% kanan frame (terukur: ax=21.3 deg, rH=12.3 deg, dari kamera
  // cut baru); i=11 (14,-5) selip di tepi kanan. Kamera tak bisa menghindar
  // dgn geser sudut (pohon tepat di garis pandang), jadi disembunyikan
  // khusus shot 15 saja, spt truk. KOREKSI: percobaan pertama sembunyikan
  // i=12 SALAH — i=12 ada di (-8,0), sisi kiri, tak pernah masuk frame.
  this.shot15Trees.forEach(m=>{m.visible=id!==15;});
  // shot 12 bagian B: gelas kopi disingkirkan ke ujung meja, HP diletakkan jauh
  if(id===12&&local>=80){
   this.glasses.forEach((gl,i)=>gl.position.set(-12.95+i*.15,.79,13.35));
   this.hp.position.set(-12.95,.74,12.95);
  } else {
   this.glasses.forEach((gl,i)=>gl.position.set(-12.8+i*.2,.79,13.1+(i%2)*.2));
   this.hp.position.set(-12.5,.74,13.35);
  }
  this.cast.hideAll();
  // Animasi per frame (v5 living rig): fase jalan dari jarak tempuh,
  // kedip dari jadwal lidAt, mulut dari pembicara + baris narasi.
  const animFor=(name:ActorName,w:{dist:number;moving:boolean},opts?:{sleeping?:boolean}):Anim=>{
   const sleeping=!!opts?.sleeping;
   return {phase:(w.dist/STRIDE)%1,blink:sleeping?1:lidAt(f/30,CHAR_IDX[name]),mouth:mouthAt(id,f,name),walking:w.moving,sleeping};
  };
  const S=(name:ActorName,opts?:{sleeping?:boolean}):Anim=>animFor(name,{dist:0,moving:false},opts);
  const show=(n:ActorName,x:number,z:number,sc=1,y=0,expr:Expr="smile",anim:Anim={})=>this.cast.show(n,x,z,sc,0,y,expr,anim);
  // W = jalan pindah titik (meluncur, tanpa bobbing). Waktu jalan dipilih
  // supaya tokoh SUDAH sampai di posisi akhir saat frame cek framing.
  const W=(x0:number,z0:number,x1:number,z1:number,t0:number,t1:number)=>walk(x0,z0,x1,z1,local,t0,t1);
  if(id===1&&local>=70){const p=W(-3.2,6.0,-2.2,5.3,72,100);show("Jali",p.x,p.z,1,0,"shock",animFor("Jali",p));}
  if(id===2){
   const n=W(-2.2,.7,-1.2,.7,0,45);show("Nenek Sari",n.x,n.z,1.08,0,"worry",animFor("Nenek Sari",n));
   const j=W(-.4,.9,-.1,1.0,20,65);show("Jali",j.x,j.z,1,0,"worry",animFor("Jali",j));
   if(local>=100){const a=W(-3.0,.2,-1.8,.2,100,145);show("Warga2",a.x,a.z,.85,0,"smile",animFor("Warga2",a));
    const b=W(2.5,.3,1.2,.3,100,145);show("Warga3",b.x,b.z,.9,0,"smile",animFor("Warga3",b));}
  }
  if(id===3){const p=W(4.5,-2.0,3.0,-2.0,0,45);show("Jali",p.x,p.z,1,0,"worry",animFor("Jali",p));} // di samping truk (bukan di baknya!):
  // posisi lama (0.8,-4.3) ada DI DALAM jejak bak truk -> badan ketutup bak,
  // cuma kepala mengintip di antara karung (s03a/s14a).
  if(id===4&&local>=75){const p=W(0,3.5,0,1.5,75,120);show("Jali",p.x,p.z,1,0,"worry",animFor("Jali",p));}
  if(id===5)show("Jali",-13.0,12,1,0,"worry",S("Jali")); // SEMUA cut (dulu local<110
  // karena cut 3 itu ECU mata melayang — kini cut 3 medium shot kamar,
  // Jali WAJIB kelihatan duduk tegak di kasur; s05c gagal karena ini)
  if(id===6)show("Jali",-12.2,12.6,1,0,"worry",S("Jali"));
  if(id===7){const k=W(2.2,.7,.4,.7,0,40);show("Pak Karto",k.x,k.z,1.04,0,"serious",animFor("Pak Karto",k));
   if(local>=90){const j=W(-.2,1.0,-.5,1.0,90,125);show("Jali",j.x,j.z,1,0,"worry",animFor("Jali",j));}}
  if(id===8){const k=W(3.5,1.1,2.3,1.1,0,40);show("Pak Karto",k.x,k.z,1.04,0,"serious",animFor("Pak Karto",k));
   show("Jali",-.8,1.0,1,0,"puzzled",S("Jali"));}
  if(id===9&&local<60)show("Jali",-13.0+0.4*Math.sin(local*0.06),12,1,0,"worry",animFor("Jali",{dist:Math.abs(0.4*Math.sin(local*0.06)),moving:true})); // mondar-mandir gelisah (y=0, tanpa bobbing)
  if(id===10&&local>=55){const p=W(-3.2,6.0,-2.2,5.3,57,92);show("Jali",p.x,p.z,1,0,local<115?"puzzled":"smile",animFor("Jali",p));}
  if(id===11){show("Jali",0,1.0,1,0,"smile",S("Jali"));
   if(local>=60){const a=W(-2.8,1.4,-1.5,1.4,60,90);show("Warga",a.x,a.z,.85,0,"smile",animFor("Warga",a));
    const b=W(2.0,1.6,.6,1.6,60,90);show("Warga2",b.x,b.z,.9,0,"smile",animFor("Warga2",b));
    const c=W(3.0,1.2,1.6,1.2,60,90);show("Warga3",c.x,c.z,.88,0,"smile",animFor("Warga3",c));}}
  // shot 12-16: JaliSehat (TANPA cangkir kopi — kopinya dikurangi, alur pemulihan)
  if(id===12&&local<80)show("JaliSehat",-13.6,11.2,1,0.95,"smile",S("JaliSehat",{sleeping:true})); // rebah DI ATAS kasur
  // (kaki di ujung selimut z=11.2, kepala ke arah bantal z=12.75; y=0.95
  // supaya badan tidak tenggelam ke kasur/selimut). Rebahnya via rotateZ
  // di applyGestures — BUKAN via posisi miring.
  if(id===13&&local<70)show("JaliSehat",-13.0,12,1,0,"smile",S("JaliSehat"));
  if(id===14){const p=W(4.5,-2.0,3.0,-2.0,0,45);show("JaliSehat",p.x,p.z,1,0,"smile",animFor("JaliSehat",p));
   if(local>=90){const n=W(-2.2,.5,-1.2,.5,90,130);show("Nenek Sari",n.x,n.z,1.08,0,"smile",animFor("Nenek Sari",n));}}
  if(id===15){const p=W(0,2.2,0,1.0,0,50);show("JaliSehat",p.x,p.z,1,0,"smile",animFor("JaliSehat",p));}
  if(id===16){const p=W(0,1.8,0,1.0,0,45);show("JaliSehat",p.x,p.z,1,0,"smile",animFor("JaliSehat",p));}
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
 /** Gestur + reaksi (rotate di sekitar kaki). ARAH user 27 Nov 01.58:
  *  "jangan diem doang" — condong/angguk di sini SENGAJA BESAR (sampai
  *  ~0.14 rad ≈ 8° transient saat kaget) supaya reaksinya TERBACA, bukan
  *  angguk 3° yang tak kelihatan. Ini lean TRANSIENT (naik-turun lalu
  *  pulih), BUKAN lean permanen — aturan cap 4° berlaku untuk lean
  *  permanen (jebakan Mbah Sarno ep.9), bukan reaksi sesaat.
  *  "Menoleh/menunjuk" tidak bisa diartikulasikan dgn sprite billboard
  *  (lengan bagian dari tekstur, kepala selalu hadap kamera): yang
  *  terbaca adalah tokoh BERJALAN mendekati lawan bicara + condong
  *  besar ke arahnya + angguk besar. Arah condong (rz): positif =
  *  condong ke KIRI layar, negatif = ke KANAN layar. Diterapkan
  *  SETELAH faceCamera. */
 private applyGestures(id:number,local:number){
  const g=(n:ActorName,rz=0,rx=0,dx=0,dy=0)=>this.cast.gesture(n,rz,rx,dx,dy);
  if(id===1&&local>=70){ // Jali mendekat ke cermin lalu KAGET: recoil besar
   const env=local<78?0:local<100?Math.sin(Math.PI*(local-78)/22):0;
   g("Jali",0.06*env,-0.14*env,0,0);
   if(local>=100)g("Jali",0.03*Math.sin(local*0.06),0,0,0);
  } else if(id===2){ // Nenek mendekat + condong besar ke Jali (kanan layar) memperingatkan; Jali mundur cemas
   g("Nenek Sari",-0.10,0.08*Math.sin(local*0.08),0,0);
   g("Jali",0.06,0,0.02*Math.sin(local*0.8),0);
  } else if(id===3){ // tangan Jali gemetar memegang kunci
   g("Jali",0.04*Math.sin(local*0.5),0,0.02*Math.sin(local*0.8),0);
  } else if(id===4&&local>=75){ // Jali menatap jauh ke jalan
   g("Jali",0.05*Math.sin(local*0.05),0.08,0,0);
  } else if(id===5){ // Jali terbangun: duduk tegak (condong depan besar) lalu gelisah; cut 3 menoleh ke sekeliling
   const up=local<30?0.12*(1-local/30):0;
   g("Jali",local>=110?0.08*Math.sin(local*0.07):0.06*Math.sin(local*0.06),up,0,0);
  } else if(id===6){ // Jali menuang kopi: condong besar ke meja
   g("Jali",0,local<100?0.12:0.06,0,0);
  } else if(id===7){ // Karto condong besar memeriksa (Jali di kiri layar); Jali mundur menunduk
   if(local>=70)g("Pak Karto",0.12,0,0,0);
   if(local>=90)g("Jali",-0.05,0.05,0,0);
  } else if(id===8){ // Karto menunjuk/menjelaskan (condong + angguk besar ke Jali di kiri); Jali mendengarkan (condong ke Karto di kanan)
   if(local>=40)g("Pak Karto",0.12,0.10*Math.sin(local*0.1),0,0);
   g("Jali",-0.08,0.05*Math.sin(local*0.06),0,0);
  } else if(id===9){ // begadang lagi: mondar-mandir (posisi) + gelisah
   g("Jali",0.05*Math.sin(local*0.06),0,0,0);
  } else if(id===10){ // sentuh kelopak di cermin: condong ke depan; lalu angguk paham BESAR
   if(local>=55&&local<115)g("Jali",0,0.10,0,0);
   else if(local>=115)g("Jali",0,0.10*Math.sin((local-115)*0.08),0,0);
  } else if(id===11){ // Jali lega: bersandar + napas; warga mengangguk
   g("Jali",0,-0.08,0,0.04*Math.sin(local*0.05));
   if(local>=60){
    this.cast.gestureEach("Warga",(m,i)=>{m.rotateX(0.08*Math.sin(local*0.07+i*1.3));});
    this.cast.gestureEach("Warga2",(m,i)=>{m.rotateX(0.08*Math.sin(local*0.07+i*1.3+2));});
    this.cast.gestureEach("Warga3",(m,i)=>{m.rotateX(0.08*Math.sin(local*0.07+i*1.3+4));});
   }
  } else if(id===12){ // Jali tidur rebah di kasur: rotateZ 90° = badan
   // horizontal di ruang layar (kepala ke arah bantal +z, kaki ke selimut);
   // napas pelan via dy. rotateZ di sini SENGAJA 90° (bukan lean!) karena
   // pose-nya memang rebah — bedakan dari lean gerak yang maks 0.07 rad.
   g("JaliSehat",Math.PI/2,0,0,0.02*Math.sin(local*0.06));
  } else if(id===13&&local<70){ // Jali bangun segar: regang (condong belakang) lalu angguk
   g("JaliSehat",0,local<40?-0.10*(1-local/40):0.05*Math.sin((local-40)*0.06),0,0);
  } else if(id===14){ // Jali tersenyum: angguk; Nenek ikut mengangguk
   g("JaliSehat",0,0.08*Math.sin(local*0.05),0,0);
   if(local>=90)g("Nenek Sari",0,0.08*Math.sin((local-90)*0.06),0,0);
  } else if(id===15){ // Jali menunjuk mata: condong besar ke depan
   g("JaliSehat",0,0.12,0,0);
  } else if(id===16&&local>=80){ // senyum penutup: angguk besar
   g("JaliSehat",0,0.10*Math.sin((local-80)*0.08),0,0);
  }
 }
}
