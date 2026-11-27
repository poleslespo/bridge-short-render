import * as THREE from "three";
import { Cast, type ActorName, type Expr } from "./cast";
import { SHOTS, camAt, smooth, bolangXAt } from "./story";

export type Kit = Record<string, never>;
export const loadKit=async():Promise<Kit>=>({}); // Kenney GLBs are optional; all set dressing is procedural.
const mat=(color:string,roughness=1)=>new THREE.MeshStandardMaterial({color,roughness});
const basic=(color:string)=>new THREE.MeshBasicMaterial({color});
const box=(w:number,h:number,d:number,_m?:THREE.Material)=>new THREE.BoxGeometry(w,h,d); // _m diabaikan dgn sengaja: material dipasang di Mesh, BUKAN di sini (jebakan v1: material yg diselipkan ke box() hilang, pintu jadi putih default)
const sphere=new THREE.SphereGeometry(1,12,8);
const cylinder=(r:number,h:number)=>new THREE.CylinderGeometry(r,r,h,12);
const makePhoneTexture=()=>{
 const c=document.createElement("canvas");c.width=512;c.height=800;const g=c.getContext("2d")!;
 g.fillStyle="#10151c";g.fillRect(0,0,512,800);g.fillStyle="#f6f3e9";g.fillRect(22,22,468,756);
 g.fillStyle="#1e3147";g.font="bold 34px Arial";g.fillText("Kabar Warga",48,90);
 g.fillStyle="#20242b";g.font="bold 30px Arial";g.fillText("Kentongan jadi",48,180);g.fillText("alarm banjir —",48,220);
 g.font="26px Arial";g.fillText("Bandung, 16 Nov 2026",48,285);
 g.fillStyle="#65717e";g.font="22px Arial";g.fillText("Warga bersiap setelah",48,360);g.fillText("kentongan dibunyikan.",48,395);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
};
// v3-fix: 4 warga latar JANGAN klon identik (cast.ts: Warga..Warga4)
const WARGA_NAMES:ActorName[]=["Warga","Warga2","Warga3","Warga4"];
/** Jalur jalan multi-titik (v4, 27 Nov 2026 — user: "jangan diem doang,
 *  ceritanya hidup, orang-orang dan suasananya seakan hidup dan real; ini
 *  tadi banyak diem doang kayak gambar"). pts = [[local, x, z], ...] —
 *  interpolasi smoothstep antar titik, bobbing langkah selama bergerak.
 *  Dipakai supaya tokoh UTAMA tiap shot BERGERAK dan bereaksi (berjalan,
 *  melangkah mendekat/menjauh, masuk frame), bukan berdiri diam.
 *  Posisi AKHIR tiap jalur = posisi diam v3 (yang diperiksa check-framing). */
const path2=(local:number,pts:[number,number,number][])=>{
 let i=0;while(i<pts.length-2&&local>pts[i+1][0])i++;
 const [t0,x0,z0]=pts[i],[t1,x1,z1]=pts[i+1];
 const u=smooth((local-t0)/Math.max(1,t1-t0));
 const moving=local>t0&&local<t1;
 return {x:x0+(x1-x0)*u,z:z0+(z1-z0)*u,y:moving?Math.abs(Math.sin(local*0.55))*0.06:0};
};
export class World {
 root=new THREE.Group(); cast:Cast;
 private cameraPos=new THREE.Vector3();
 private look=new THREE.Vector3();
 private sun:THREE.DirectionalLight;
 private moon:THREE.DirectionalLight;
 private lamp:THREE.PointLight;
 private flashlight:THREE.SpotLight;
 private kentongan:THREE.Group;
 private wood:THREE.Mesh;
 private crack:THREE.Mesh;
 private phone:THREE.Mesh;
 private phoneMat:THREE.MeshBasicMaterial;
 private phoneFrame:THREE.Mesh;
 private hookText:THREE.Mesh;
 private stars:THREE.Points;
 private sky:THREE.Mesh;
 private dayLight:THREE.AmbientLight;
 // suasana hidup (v2): jendela berdenyut, kunang-kunang, awan, kabut, dedaunan
 private windowMats:THREE.MeshBasicMaterial[]=[];
 private crowns:{mesh:THREE.Mesh;baseX:number;phase:number}[]=[];
 private fireflies:THREE.Points;
 private ffBase:Float32Array;
 private clouds:THREE.Mesh[]=[];
 private mist:THREE.Mesh[]=[];
 private rings:THREE.Mesh[]=[];
 constructor(_kit:Kit){
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(180,180),mat("#33473a"));ground.rotation.x=-Math.PI/2;ground.position.y=-0.04;this.root.add(ground);
  // dirt road and distant paddy strips
  const road=new THREE.Mesh(new THREE.PlaneGeometry(5,90),mat("#77603f"));road.rotation.x=-Math.PI/2;road.position.set(0,0.005,-16);this.root.add(road);
  for(let i=0;i<7;i++){const p=new THREE.Mesh(new THREE.PlaneGeometry(16,5),mat(i%2?"#304b35":"#3b5838"));p.rotation.x=-Math.PI/2;p.position.set((i%2?1:-1)*13,0.01,-25-Math.floor(i/2)*9);this.root.add(p);}
  // houses on either side; windows are UNLIT (basic) so the lamp can never blow them white (v1 bug)
  for(let i=0;i<8;i++){const side=i%2?1:-1,z=-22+Math.floor(i/2)*10,x=side*(6.5+(i%3)*1.1);
   const house=new THREE.Group();house.position.set(x,0,z);
   const body=new THREE.Mesh(box(4,2.6,3.8,mat("#7d6046")),mat("#7d6046"));body.position.y=1.3;house.add(body);
   const roofGeo=new THREE.ConeGeometry(3.3,1.6,4);const roof=new THREE.Mesh(roofGeo,mat("#382b29"));roof.rotation.y=Math.PI/4;roof.position.y=3.35;house.add(roof);
   const door=new THREE.Mesh(box(.85,1.65,.08),mat("#30251f"));door.position.set(0,.85,1.95);house.add(door);
   for(const sx of [-1.1,1.1]){const wm=basic("#c98f3d");this.windowMats.push(wm);const win=new THREE.Mesh(box(.65,.6,.08,wm),wm);win.position.set(sx,1.7,1.96);house.add(win);}
   this.root.add(house);
  }
  // village trees and foreground silhouettes (crowns sway in update)
  for(let i=0;i<16;i++){const x=(i%2?1:-1)*(8+(i%4)*2),z=-30+Math.floor(i/2)*5;
   const trunk=new THREE.Mesh(cylinder(.18,2.4),mat("#443126"));trunk.position.set(x,1.2,z);this.root.add(trunk);
   const crown=new THREE.Mesh(sphere,mat("#203b2b"));crown.scale.set(1.35,1.2,1.25);crown.position.set(x,2.8,z);this.root.add(crown);
   this.crowns.push({mesh:crown,baseX:x,phase:i*1.1});
  }
  // sky dome and stars (twinkle in update) — v3: langit malam sedikit
  // lebih terang supaya dunia kebaca (v2 terlalu gelap, latar jadi void)
  this.sky=new THREE.Mesh(new THREE.SphereGeometry(100,16,12),new THREE.MeshBasicMaterial({color:"#1a2c47",side:THREE.BackSide}));this.root.add(this.sky);
  const pts:THREE.Vector3[]=[];for(let i=0;i<180;i++){const a=i*2.399963229728653,y=8+((i*17)%35),r=55;pts.push(new THREE.Vector3(Math.cos(a)*r,y,-Math.abs(Math.sin(a)*r)-10));}
  const sg=new THREE.BufferGeometry().setFromPoints(pts);this.stars=new THREE.Points(sg,new THREE.PointsMaterial({color:"#dce8ff",size:.18,sizeAttenuation:true,transparent:true,opacity:.85}));this.root.add(this.stars);
  const tc=document.createElement("canvas");tc.width=512;tc.height=256;const tg=tc.getContext("2d")!;tg.font="bold 116px Arial";tg.textAlign="center";tg.fillStyle="#fff4c9";tg.strokeStyle="#20170f";tg.lineWidth=16;tg.strokeText("TOK!",256,155);tg.fillText("TOK!",256,155);const tt=new THREE.CanvasTexture(tc);tt.colorSpace=THREE.SRGBColorSpace;this.hookText=new THREE.Mesh(new THREE.PlaneGeometry(1.7,.85),new THREE.MeshBasicMaterial({map:tt,transparent:true,depthWrite:false}));this.hookText.position.set(0,2.7,1.0);this.root.add(this.hookText);
  // central wooden night-watch shelter
  const postMat=mat("#533a29"),roofMat=mat("#392b25");
  for(const x of [-2.1,2.1])for(const z of [-1.7,1.7]){const p=new THREE.Mesh(box(.18,3.2,.18,postMat),postMat);p.position.set(x,1.6,z);this.root.add(p);}
  const roof=new THREE.Mesh(box(5.1,.22,4.4,roofMat),roofMat);roof.position.y=3.25;this.root.add(roof);
  const roofTop=new THREE.Mesh(new THREE.ConeGeometry(3.2,1.25,4),roofMat);roofTop.rotation.y=Math.PI/4;roofTop.position.y=3.9;this.root.add(roofTop);
  // kentongan body hangs beneath beam
  this.kentongan=new THREE.Group();this.kentongan.position.set(.45,2.05,-.05);this.root.add(this.kentongan);
  this.wood=new THREE.Mesh(new THREE.CylinderGeometry(.23,.28,1.55,12),mat("#81502c"));this.wood.rotation.z=Math.PI/2;this.kentongan.add(this.wood);
  const hollow=new THREE.Mesh(new THREE.CircleGeometry(.18,16),mat("#24170f"));hollow.position.set(.79,0,0);hollow.rotation.y=Math.PI/2;this.kentongan.add(hollow);
  this.crack=new THREE.Mesh(box(.025,.34,.015),mat("#21170f"));this.crack.position.set(.1,.13,.24);this.kentongan.add(this.crack);
  // ropes: TWO ropes from the roof slab down to the kentongan body (v3-fix,
  // 27 Nov 2026 — user: "talinya ga nyambung, jd ngambang"). v3 had ONE
  // short rope (0.55 m) ending 0.37 m ABOVE the wood, so the log looked
  // like it was floating. Each rope runs from the wood top (y=2.28) up
  // into the roof slab (underside y=3.14, top embedded at 3.22) — connected
  // at BOTH ends. Ropes are children of the kentongan group so they sway
  // WITH the wood; the swing pivot is the log centre and the amplitude is
  // tiny (0.045 rad), so the embedded tops never expose a gap.
  const ropeMat=basic("#b08d5e"); // unlit tan, lighter than v3 so it reads at night (v1: standard material under the lamp bloomed white)
  for(const rx of [-0.55,0.55]){
   const rope=new THREE.Mesh(box(.06,.94,.06,ropeMat),ropeMat);rope.position.set(rx,.70,0);this.kentongan.add(rope);
   // wrap: the rope tied around the log at each hang point (sells the knot)
   const wrapR=rx<0?0.25:0.285; // log radius at that end: .237 (left) / .273 (right)
   const wrap=new THREE.Mesh(new THREE.TorusGeometry(wrapR,.035,8,20),ropeMat);
   wrap.rotation.y=Math.PI/2;wrap.position.set(rx,0,0);this.kentongan.add(wrap);
  }
  // striker LEANS against the front-right post (v1: floated in mid-air at
  // 1.15,.45,.15; v3-fix: z moved 1.5->1.62 so the top actually TOUCHES the
  // post face (post z 1.61-1.79) instead of floating 0.08 m in front of it,
  // and lean steepened so the top clearly presses the post)
  const striker=new THREE.Mesh(box(.11,.72,.11,basic("#8a6a3f")),basic("#8a6a3f"));striker.position.set(1.97,.36,1.62);striker.rotation.z=-.42;striker.rotation.x=.08;this.root.add(striker);
  // sound rings from the hollow end (shot 12): expanding, fading
  for(let i=0;i<2;i++){const r=new THREE.Mesh(new THREE.RingGeometry(.16,.22,24),new THREE.MeshBasicMaterial({color:"#ffd98a",transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}));r.position.set(1.28,2.05,-.05);r.rotation.y=Math.PI/2;r.visible=false;this.root.add(r);this.rings.push(r);}
  // fireflies (night only)
  this.ffBase=new Float32Array(36*3);
  for(let i=0;i<36;i++){this.ffBase[i*3]=-6+((i*2.399963)%12);this.ffBase[i*3+1]=0.6+((i*7)%20)/10;this.ffBase[i*3+2]=-8+((i*13)%12);}
  const ffGeo=new THREE.BufferGeometry();ffGeo.setAttribute("position",new THREE.BufferAttribute(this.ffBase.slice(),3));
  this.fireflies=new THREE.Points(ffGeo,new THREE.PointsMaterial({color:"#cfe89a",size:.14,transparent:true,opacity:.85,blending:THREE.AdditiveBlending,depthWrite:false}));this.root.add(this.fireflies);
  // slow clouds high up + thin ground mist drifting
  for(let i=0;i<2;i++){const cl=new THREE.Mesh(new THREE.PlaneGeometry(34,7),new THREE.MeshBasicMaterial({color:"#16233a",transparent:true,opacity:.5,depthWrite:false}));cl.position.set(-10+i*18,20+i*4,-45-i*10);this.root.add(cl);this.clouds.push(cl);}
  for(let i=0;i<2;i++){const m=new THREE.Mesh(new THREE.PlaneGeometry(26,1.4),new THREE.MeshBasicMaterial({color:"#93a8bd",transparent:true,opacity:.05,depthWrite:false}));m.position.set(0,0.7,-6+i*8);this.root.add(m);this.mist.push(m);}
  // lights (lamp 6, not 8: v1 lamp at 8 pushed rope/striker/windows past the bloom threshold)
  // v3: malam diterangkan (ambient .35->.6, bulan 1.5->2.2) supaya dunia
  // kebaca seperti contoh jembatan — bukan void hitam
  this.dayLight=new THREE.AmbientLight("#8ea0bd",.6);this.root.add(this.dayLight);
  this.moon=new THREE.DirectionalLight("#9bb8ee",2.2);this.moon.position.set(-8,12,5);this.root.add(this.moon);
  this.sun=new THREE.DirectionalLight("#fff0d3",2.2);this.sun.position.set(4,12,3);this.root.add(this.sun);
  this.lamp=new THREE.PointLight("#ffbf65",6,13,2);this.lamp.position.set(0,2.8,0);this.root.add(this.lamp);
  this.flashlight=new THREE.SpotLight("#f5f5ff",0,18,Math.PI/8,.35,1.5);this.flashlight.position.set(0,1.55,1);this.root.add(this.flashlight);this.root.add(this.flashlight.target);
  this.cast=new Cast(this.root);
  const frame=new THREE.Mesh(box(.58,.92,.055,mat("#171b22")),mat("#171b22"));frame.position.set(0,1.35,.0);
  this.phoneFrame=frame;
  this.phoneMat=new THREE.MeshBasicMaterial({map:makePhoneTexture()});this.phone=new THREE.Mesh(new THREE.PlaneGeometry(.48,.78),this.phoneMat);this.phone.position.set(0,1.35,.04);this.phone.visible=false;this.root.add(this.phone);this.root.add(frame);frame.visible=false;
 }
 update(id:number,f:number,camera:THREE.PerspectiveCamera,_scene?:THREE.Scene){
  const s=SHOTS[id-1];const local=Math.max(0,f-s.a);
  const pose=camAt(id,f);this.cameraPos.set(...pose.position);this.look.set(...pose.target);
  // continuous, restrained push-in; 7-frame impact kick alternates direction at the first kentongan strike
  const kick=(id===1||id===4)?(local<7?(.035*(1-local/7)*(local%2?1:-1)):0):0;
  camera.position.set(this.cameraPos.x+kick,this.cameraPos.y,this.cameraPos.z);
  camera.lookAt(this.look);camera.fov=pose.fov;camera.updateProjectionMatrix();
  // v3: transisi siang->malam relatif durasi shot (v2: /288 hardcoded dari
  // durasi shot lama 288 frame; shot 11 kini 242 frame)
  const day=id===11? 1-smooth(local/Math.max(1,s.b-s.a)):0;
  this.sky.material=(this.sky.material as THREE.MeshBasicMaterial);(this.sky.material as THREE.MeshBasicMaterial).color.set("#1a2c47").lerp(new THREE.Color("#7db4dc"),day);
  this.stars.visible=day<.2;
  this.moon.intensity=2.2*(1-day);this.sun.intensity=2.2*day;
  // lamp flickers gently (flicker ~+-8%), instead of a dead-constant light
  this.lamp.intensity=6*(1-day)*(1+0.05*Math.sin(f*0.31)+0.03*Math.sin(f*0.117+1.3));
  this.dayLight.intensity=.6+day*.55;
  // subtle thermal expansion/contraction in the single continuous daytime-to-night shot
  const thermal=id===11?Math.sin(local/38)*.018:0;
  this.wood.scale.set(1+thermal,1-thermal,1+thermal);
  const vibration=(id===1||id===4)?Math.sin(local*2.4)*.045*(1-smooth((local-60)/35)):id===10?Math.sin(local*.18)*.008:0;
  this.kentongan.rotation.z=vibration;
  this.crack.visible=id===7||id===10||id===11;
  this.cast.hideAll();
  this.hookText.visible=id===1&&local<22;
  const show=(n:ActorName,x:number,z:number,sc=1,y=0,expr:Expr="smile")=>this.cast.show(n,x,z,sc,0,y,expr);
  // v3: ekspresi wajah per adegan (bukan senyum terus) — lihat cast.ts
  // v4 (27 Nov 2026 — user: "jangan diem doang"): tiap shot tokoh UTAMA
  // BERGERAK — berjalan, melangkah mendekat/menjauh, masuk frame — via
  // path2(). Posisi AKHIR tiap jalur = posisi diam v3 (check-framing).
  if(id===3){ // Dani terkejut: mundur tersentak, lalu merangkak mendekat lagi
   const p=path2(local,[[0,-0.8,0.9],[30,-1.15,1.35],[110,-0.8,0.9],[126,-0.8,0.9]]);show("Dani",p.x,p.z,1,p.y,"shock");
  }
  if(id===4){ // Dani menghindar: geser menjauh, lalu menatap kentongan
   const p=path2(local,[[0,-0.8,0.9],[55,-1.05,1.2],[112,-0.9,1.0]]);show("Dani",p.x,p.z,1,p.y,"shock");
  }
  if(id===14){ // Dani melangkah maju pelan sambil mengangkat HP
   const p=path2(local,[[0,-0.8,0.9],[150,-0.5,0.7],[335,-0.5,0.7]]);show("Dani",p.x,p.z,1.1,p.y,"smile");
  }
  if(id===5){ // Nenek berjalan dari pintu ke jalan sambil memperingatkan
   const p=path2(local,[[0,-2.2,1.7],[120,-0.9,1.0],[233,-0.9,1.0]]);show("Nenek Sari",p.x,p.z,1.08,p.y,"worry");
  }
  // shot 6: Bolang RUNS along the road (x -4.5 -> -0.5, bobbing); Jali + 2 warga MASUK frame berjalan (bukan muncul tiba-tiba)
  if(id===6){const bx=bolangXAt(f);show("Bolang",bx,1.0,1.12,Math.abs(Math.sin(local*0.5))*0.07);if(local>=85){const j=path2(local,[[85,2.4,1.7],[124,0.6,1.3]]);show("Jali",j.x,j.z,.95,j.y);const w2=path2(local,[[85,-3.4,0.8],[124,-1.5,0.2]]);show("Warga2",w2.x,w2.z,.85,w2.y);const w3=path2(local,[[85,-2.0,-1.0],[124,-0.2,-0.3]]);show("Warga3",w3.x,w3.z,.9,w3.y);}}
  if(id===7){ // Pak Karto berjalan berat mendekati kentongan, lalu membungkuk memeriksa retak
   const p=path2(local,[[0,3.8,1.7],[90,2.3,1.1],[195,2.3,1.1]]);show("Pak Karto",p.x,p.z,1.04,p.y,"serious");
  }
  // shot 8: warga MASUK frame berjalan dari tepi jalan ke kelompok (v1: spread +-3 m, outside the 9:16 frame)
  if(id===8){const ends:[ActorName,number,number,number,number][]=[["Warga",-1.8,1.6,-3.6,1.8],["Warga2",-0.6,2.2,-2.4,2.8],["Warga3",0.6,1.6,2.4,1.8],["Warga4",1.8,2.2,3.6,2.8]];for(let i=0;i<4;i++){const [n,ex,ez,sx,sz]=ends[i];const p=path2(local,[[0,sx,sz],[70,ex,ez],[202,ex-0.15,ez-0.25]]);show(n,p.x,p.z,.85+i*.08,p.y);}const dp=path2(local,[[0,-1.8,0.6],[70,-0.8,0.4],[202,-0.8,0.4]]);show("Dani",dp.x,dp.z,1,dp.y,"worry");}
  // shot 9/10: Jali melangkah MENDEKAT ke kentongan (z 1.5 -> 0.3, kayu di
  // z=-0.05, bawah kayu ~1,77 m, puncak kepala Jali ~1,81 m) — dari kamera
  // medium-wide, kepalanya menutupi celah ke kayu sehingga "menempel"
  // terbaca (v2: kamera ECU rendah; v3: medium-wide, sama-sama menempel)
  if(id===9){const p=path2(local,[[0,-0.35,1.5],[55,-0.35,0.3],[134,-0.35,0.3]]);show("Jali",p.x,p.z,1.05,p.y,"puzzled");}
  if(id===10){const p=path2(local,[[0,-0.35,0.3],[50,-0.35,1.0],[120,-0.7,1.0],[161,-0.55,0.7]]);show("Jali",p.x,p.z,1.05,p.y,"puzzled");}
  // shot 12/13: warga MASUK frame berjalan (shot 12 dari local 80); Dani hanya di 13 (menurunkan senter)
  if(id===12&&local>=80){const ends:[ActorName,number,number,number,number][]=[["Warga",-1.6,1.4,-3.2,1.6],["Warga2",-0.5,2.0,-2.2,2.6],["Warga3",0.6,1.4,2.2,1.6],["Warga4",1.5,2.0,3.0,2.6]];for(let i=0;i<4;i++){const [n,ex,ez,sx,sz]=ends[i];const p=path2(local,[[80,sx,sz],[144,ex,ez]]);show(n,p.x,p.z,.85+i*.08,p.y);}}
  if(id===13){const ends:[ActorName,number,number,number,number][]=[["Warga",-1.6,1.4,-3.2,1.6],["Warga2",-0.5,2.0,-2.2,2.6],["Warga3",0.6,1.4,2.2,1.6],["Warga4",1.5,2.0,3.0,2.6]];for(let i=0;i<4;i++){const [n,ex,ez,sx,sz]=ends[i];const p=path2(local,[[0,sx,sz],[60,ex,ez],[135,ex,ez]]);show(n,p.x,p.z,.85+i*.08,p.y);}const dp=path2(local,[[0,-1.6,0.6],[60,-0.8,0.4],[135,-0.8,0.4]]);show("Dani",dp.x,dp.z,1,dp.y);}
  // shot 5 part B: warga KELUAR dari pintu berjalan (cut di local 115, v3)
  if(id===5&&local>115){const p=path2(local,[[115,7.6,-0.8],[165,7.6,0.6],[233,7.6,0.6]]);show("Warga4",p.x,p.z,.95,p.y);}
  // shot 14: Dani raises the phone (rises over the first 50 frames); frame follows it
  if(id===14){
   const phoneY=1.15+0.35*smooth(local/50);
   this.phone.visible=true;this.phone.position.set(.2,phoneY,1.0);this.phone.rotation.y=.12;
   this.phoneFrame.visible=true;this.phoneFrame.position.set(.2,phoneY,.96);this.phoneFrame.rotation.y=.12;
  } else {this.phone.visible=false;this.phoneFrame.visible=false;}
  // shot 12 part A: sound rings expand out of the hollow end
  const ringsOn=id===12&&local<100;
  for(let i=0;i<2;i++){const r=this.rings[i];r.visible=ringsOn;
   if(ringsOn){const ph=((local+i*22)%45)/45;r.scale.setScalar(1+ph*1.5);r.position.x=1.28+ph*1.0;(r.material as THREE.MeshBasicMaterial).opacity=0.65*(1-ph);}} // v3.2: cincin MERAMBAT menjauhi ujung (+x) sambil membesar+memudar (dulu menempel di ujung = kelihatan kayak target/bullseye)
  // Dani's flashlight jitters on shock, otherwise points down and fades when lowered.
  const dani=id===3||id===4||id===14;this.flashlight.intensity=dani?(id===3?42+Math.sin(local*2.7)*12:id===4?30:8):0;
  this.flashlight.position.set(-.8,1.45,1.2);this.flashlight.target.position.set(Math.sin(local*.12)*.7,.3,-3);
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
  *  faceCamera, so they read in screen space.
  *  v4 (27 Nov 2026 — user: "jangan diem doang"): condong/angguk BESAR
  *  SESAAAT saat kaget/takut (sampai ~0.14 rad) — lean 4° tidak kelihatan,
  *  itu yang dikeluhkan user ("banyak diem doang kayak gambar"). SEMUA
  *  lean di sini memakai amplop yang KEMBALI KE 0 (tidak ada lean permanen
  *  — aturan menara Pisa ep.9 tetap berlaku). */
 private applyGestures(id:number,local:number){
  const g=(n:ActorName,rz=0,rx=0,dx=0,dy=0)=>this.cast.gesture(n,rz,rx,dx,dy);
  // angguk warga beramai-ramai, fase beda per tokoh (v3-fix: 4 varian, bukan 1 nama)
  const wargaNod=(amp=0.05)=>{let off=0;for(const n of WARGA_NAMES){this.cast.gestureEach(n,(m,i)=>{m.rotateX(amp*Math.sin(local*0.07+(i+off)*1.3));});off++;}};
  // amplop naik-turun (0 -> 1 -> 0) selama local a..b — untuk condong BESAR sesaat
  const env=(a:number,b:number)=>smooth((local-a)/10)*(1-smooth((local-b)/10));
  if(id===3){ // Dani terkejut BESAR: condong ke belakang + menyusut, lalu pulih
   const e=local<35?Math.sin(Math.PI*Math.max(0,local-8)/27):0;g("Dani",0.14*e,0,0,-0.05*e);
  } else if(id===4){ // Dani flinch: menyusut ke bawah, lalu condong maju menatap kentongan
   const fl=local<18?Math.sin(Math.PI*local/18):0;g("Dani",0.12*fl,0,0,-0.12*fl);
   g("Dani",0,0.08*env(60,112),0,0);
  } else if(id===5){ // Nenek: angguk BESAR + condong ke depan sambil memperingatkan
   g("Nenek Sari",0,0.08*Math.sin(local*0.06)+0.06*env(130,200),0,0);
  } else if(id===6){ // Bolang leans into his run
   g("Bolang",-0.06,0,0,0);
  } else if(id===7){ // Pak Karto membungkuk memeriksa retak (cut, local>=100) + angguk pelan
   g("Pak Karto",0,0.09*env(100,195)+0.03*Math.sin(local*0.04),0,0);
  } else if(id===8&&local>=70){ // warga + Dani menoleh ke kentongan: condong ke tengah + angguk
   wargaNod(0.06);
  } else if(id===9){ // Jali menempelkan telinga BESAR: condong ke kayu, tahan, lepas
   const e=env(55,110);g("Jali",-0.12*e,0,0.1*e,0);
  } else if(id===10){ // Jali heran: miring kepala + mundur (jalan sudah di update)
   g("Jali",0.08*Math.sin(local*0.05),0,0,0);
  } else if(id===12&&local>=100){ // warga relieved: gentle nods, out of phase
   wargaNod(0.05);
  } else if(id===13){ // warga calm: same gentle nods
   wargaNod(0.05);
  } else if(id===14&&local>260){ // Dani's small closing nod (shot 14 kini 335 frame, v3)
   g("Dani",0,0.03*Math.sin((local-260)*0.05),0,0);
  }
 }
}
