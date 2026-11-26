import * as THREE from "three";
import { Cast } from "./cast";
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
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(180,180),mat("#26372b"));ground.rotation.x=-Math.PI/2;ground.position.y=-0.04;this.root.add(ground);
  // dirt road and distant paddy strips
  const road=new THREE.Mesh(new THREE.PlaneGeometry(5,90),mat("#66513b"));road.rotation.x=-Math.PI/2;road.position.set(0,0.005,-16);this.root.add(road);
  for(let i=0;i<7;i++){const p=new THREE.Mesh(new THREE.PlaneGeometry(16,5),mat(i%2?"#304b35":"#3b5838"));p.rotation.x=-Math.PI/2;p.position.set((i%2?1:-1)*13,0.01,-25-Math.floor(i/2)*9);this.root.add(p);}
  // houses on either side; windows are UNLIT (basic) so the lamp can never blow them white (v1 bug)
  for(let i=0;i<8;i++){const side=i%2?1:-1,z=-22+Math.floor(i/2)*10,x=side*(6.5+(i%3)*1.1);
   const house=new THREE.Group();house.position.set(x,0,z);
   const body=new THREE.Mesh(box(4,2.6,3.8,mat("#70533b")),mat("#70533b"));body.position.y=1.3;house.add(body);
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
  // sky dome and stars (twinkle in update)
  this.sky=new THREE.Mesh(new THREE.SphereGeometry(100,16,12),new THREE.MeshBasicMaterial({color:"#101d36",side:THREE.BackSide}));this.root.add(this.sky);
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
  // rope: unlit dark tan (v1: standard material under the lamp bloomed white)
  const rope=new THREE.Mesh(box(.045,.55,.045,basic("#7d6448")),basic("#7d6448"));rope.position.set(0,.93,0);this.kentongan.add(rope);
  // striker LEANS against the front-right post (v1: floated in mid-air at 1.15,.45,.15)
  const striker=new THREE.Mesh(box(.11,.72,.11,basic("#8a6a3f")),basic("#8a6a3f"));striker.position.set(1.95,.36,1.5);striker.rotation.z=-.35;striker.rotation.x=.08;this.root.add(striker);
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
  this.dayLight=new THREE.AmbientLight("#8ea0bd",.35);this.root.add(this.dayLight);
  this.moon=new THREE.DirectionalLight("#9bb8ee",1.5);this.moon.position.set(-8,12,5);this.root.add(this.moon);
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
  const day=id===11? 1-smooth(local/288):0;
  this.sky.material=(this.sky.material as THREE.MeshBasicMaterial);(this.sky.material as THREE.MeshBasicMaterial).color.set("#101d36").lerp(new THREE.Color("#7db4dc"),day);
  this.stars.visible=day<.2;
  this.moon.intensity=1.5*(1-day);this.sun.intensity=2.2*day;
  // lamp flickers gently (flicker ~+-8%), instead of a dead-constant light
  this.lamp.intensity=6*(1-day)*(1+0.05*Math.sin(f*0.31)+0.03*Math.sin(f*0.117+1.3));
  this.dayLight.intensity=.35+day*.7;
  // subtle thermal expansion/contraction in the single continuous daytime-to-night shot
  const thermal=id===11?Math.sin(local/38)*.018:0;
  this.wood.scale.set(1+thermal,1-thermal,1+thermal);
  const vibration=(id===1||id===4)?Math.sin(local*2.4)*.045*(1-smooth((local-60)/35)):id===10?Math.sin(local*.18)*.008:0;
  this.kentongan.rotation.z=vibration;
  this.crack.visible=id===7||id===10||id===11;
  this.cast.hideAll();
  this.hookText.visible=id===1&&local<22;
  const show=(n:"Dani"|"Bolang"|"Jali"|"Nenek Sari"|"Pak Karto"|"Warga",x:number,z:number,sc=1,y=0)=>this.cast.show(n,x,z,sc,0,y);
  if(id===3||id===4||id===14)show("Dani",-.8,.9,id===14?1.1:1);
  if(id===5)show("Nenek Sari",-.9,1.0,1.08);
  // shot 6: Bolang RUNS along the road (x -4.5 -> -0.5, bobbing); Jali + 2 warga join near the end
  if(id===6){const bx=bolangXAt(f);show("Bolang",bx,1.0,1.12,Math.abs(Math.sin(local*0.5))*0.07);show("Jali",0.6,1.3,.95);show("Warga",-1.5,0.2,.85);show("Warga",-0.2,-0.3,.9);}
  if(id===7)show("Pak Karto",2.3,1.1,1.04);
  // shot 8: warga clustered on the road (v1: spread +-3 m, outside the 9:16 frame)
  if(id===8){const wx=[-1.8,-0.6,0.6,1.8],wz=[1.6,2.2,1.6,2.2];for(let i=0;i<4;i++)show("Warga",wx[i],wz[i],.85+i*.08);show("Dani",-.8,.4);}
  // shot 9/10: Jali berdiri DI DEPAN ujung dekat kentongan (z=0.3, kayu di
  // z=-0.05) — dari kamera rendah yang menengadah, kepalanya menutupi celah
  // 0,12 m ke kayu sehingga "menempel" terbaca (v2: z=0.1, celah kelihatan)
  if(id===9||id===10)show("Jali",-.35,.3,1.05);
  // shot 12/13: warga clustered on the road; Dani only in 13 (lowers his flashlight)
  if(id===12||id===13){const wx=[-1.6,-0.5,0.6,1.5],wz=[1.4,2.0,1.4,2.0];for(let i=0;i<4;i++)show("Warga",wx[i],wz[i],.85+i*.08);if(id===13)show("Dani",-.8,.4);}
  // shot 5 part B: a warga steps out of the doorway
  if(id===5&&local>140)show("Warga",7.6,0.6,.95);
  // shot 14: Dani raises the phone (rises over the first 50 frames); frame follows it
  if(id===14){
   const phoneY=1.15+0.35*smooth(local/50);
   this.phone.visible=true;this.phone.position.set(.2,phoneY,1.0);this.phone.rotation.y=.12;
   this.phoneFrame.visible=true;this.phoneFrame.position.set(.2,phoneY,.96);this.phoneFrame.rotation.y=.12;
  } else {this.phone.visible=false;this.phoneFrame.visible=false;}
  // shot 12 part A: sound rings expand out of the hollow end
  const ringsOn=id===12&&local<100;
  for(let i=0;i<2;i++){const r=this.rings[i];r.visible=ringsOn;
   if(ringsOn){const ph=((local+i*22)%45)/45;r.scale.setScalar(1+ph*4.5);(r.material as THREE.MeshBasicMaterial).opacity=0.65*(1-ph);}}
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
  *  faceCamera, so they read in screen space. */
 private applyGestures(id:number,local:number){
  const g=(n:"Dani"|"Bolang"|"Jali"|"Nenek Sari"|"Pak Karto"|"Warga",rz=0,rx=0,dx=0,dy=0)=>this.cast.gesture(n,rz,rx,dx,dy);
  if(id===3){ // Dani recoils from the shock: lean back + step back, then recover
   const env=local<8?0:local<30?Math.sin(Math.PI*(local-8)/22):0;g("Dani",0.06*env,0,-0.1*env,0);
  } else if(id===5){ // Nenek nods slowly while she warns
   g("Nenek Sari",0,0.05*Math.sin(local*0.06),0,0);
  } else if(id===6){ // Bolang leans into his run
   g("Bolang",-0.06,0,0,0);
  } else if(id===7){ // Pak Karto stays UPRIGHT; only a slow nod
   g("Pak Karto",0,0.03*Math.sin(local*0.04),0,0);
  } else if(id===9){ // Jali leans his ear toward the wood, holds, then pulls back
   const env=smooth(local/40)*(1-smooth((local-170)/20));g("Jali",-0.07*env,0,0.08*env,0);
  } else if(id===10){ // Jali puzzled: slow head tilt + small step back
   g("Jali",0.05*Math.sin(local*0.05),0,-0.05*smooth(local/60),0);
  } else if(id===12&&local>=100){ // warga relieved: gentle nods, out of phase
   this.cast.gestureEach("Warga",(m,i)=>{m.rotateX(0.04*Math.sin(local*0.07+i*1.3));});
  } else if(id===13){ // warga calm: same gentle nods
   this.cast.gestureEach("Warga",(m,i)=>{m.rotateX(0.04*Math.sin(local*0.07+i*1.3));});
  } else if(id===14&&local>350){ // Dani's small closing nod
   g("Dani",0,0.03*Math.sin((local-350)*0.05),0,0);
  }
 }
}
