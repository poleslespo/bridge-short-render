import * as THREE from "three";
import { NOINK } from "../bridge/ink";

export const SU = 1;
export type ActorName = "Dani"|"Bolang"|"Jali"|"Nenek Sari"|"Pak Karto"|"Warga"|"Warga2"|"Warga3"|"Warga4";
/** Ekspresi wajah (v3, 27 Nov 2026): v2 semua tokoh senyum terus — user
 *  bilang "gambar orang ngaco". Tiap tokoh kini punya varian wajah yang
 *  dipakai sesuai adegan (Dani kaget, Nenek khawatir, Karto serius,
 *  Jali heran). Digambar di canvas yang sama, jadi murah. */
export type Expr = "smile"|"shock"|"worry"|"serious"|"puzzled";
const EXPRS:Expr[]=["smile","shock","worry","serious","puzzled"];
type SpriteDef={name:ActorName;w:number;h:number;shirt:string;head:string;hair:string;kind:string};
const defs:SpriteDef[]=[
 {name:"Dani",w:0.64,h:1.95,shirt:"#344d65",head:"#d79b72",hair:"#252329",kind:"slim"},
 {name:"Bolang",w:0.92,h:1.48,shirt:"#e6a83e",head:"#c98762",hair:"#34251e",kind:"round"},
 {name:"Jali",w:0.58,h:1.72,shirt:"#527d58",head:"#b87958",hair:"#241f1c",kind:"bucket"},
 {name:"Nenek Sari",w:0.72,h:1.42,shirt:"#8d5b76",head:"#c99578",hair:"#eee6d7",kind:"scarf"},
 {name:"Pak Karto",w:0.76,h:1.68,shirt:"#806b4c",head:"#c28b69",hair:"#eee2cf",kind:"peci"},
 {name:"Warga",w:0.58,h:1.55,shirt:"#647b8a",head:"#c88f6c",hair:"#30251f",kind:"plain"},
 // v3-fix (27 Nov 2026, user: "bentuknya sama semua"): 4 warga latar
 // JANGAN klon identik — tiap varian beda tinggi/lebar, warna baju,
 // kulit, rambut/tutup kepala. Dipakai bergantian di world.ts (shot 6/8/12/13).
 {name:"Warga2",w:0.66,h:1.68,shirt:"#7a4a3a",head:"#b87958",hair:"#1f1a16",kind:"cap"},
 {name:"Warga3",w:0.54,h:1.45,shirt:"#4a6b52",head:"#d9a06f",hair:"#3a2a1a",kind:"headband"},
 {name:"Warga4",w:0.70,h:1.60,shirt:"#8a7a3a",head:"#a87a5e",hair:"#6a6a6a",kind:"plain"},
];
const makeSprite=(d:SpriteDef,expr:Expr="smile")=>{
 const c=document.createElement("canvas");c.width=256;c.height=512;
 const g=c.getContext("2d")!;g.lineWidth=8;g.lineJoin="round";g.strokeStyle="#252329";
 const path=(fn:()=>void,fill:string)=>{g.beginPath();fn();g.fillStyle=fill;g.fill();g.stroke();};
 // legs deliberately separated to make the silhouette readable
 path(()=>{g.moveTo(82,365);g.lineTo(120,365);g.lineTo(112,475);g.lineTo(70,475);g.closePath();},"#34343b");
 path(()=>{g.moveTo(139,365);g.lineTo(178,365);g.lineTo(194,475);g.lineTo(151,475);g.closePath();},"#34343b");
 path(()=>{g.moveTo(66,180);g.quadraticCurveTo(128,150,190,180);g.lineTo(205,360);g.quadraticCurveTo(128,390,51,360);g.closePath();},d.shirt);
 // arms and sleeves
 path(()=>{g.moveTo(65,195);g.lineTo(34,225);g.lineTo(24,330);g.lineTo(52,337);g.lineTo(89,250);g.closePath();},d.shirt);
 path(()=>{g.moveTo(190,195);g.lineTo(221,225);g.lineTo(231,330);g.lineTo(203,337);g.lineTo(166,250);g.closePath();},d.shirt);
 path(()=>{g.ellipse(128,118,d.kind==="round"?56:46,58,0,0,Math.PI*2);},d.head);
 // hair/headwear makes each profile distinct (v3-fix: hairline is a curve,
 // not a straight bar across the forehead — the straight edge read as a mask)
 const plainHair=()=>{path(()=>{g.moveTo(80,82);g.quadraticCurveTo(76,30,128,32);g.quadraticCurveTo(180,30,177,82);g.quadraticCurveTo(152,94,128,92);g.quadraticCurveTo(104,94,80,82);g.closePath();},d.hair);};
 if(d.kind==="peci"){path(()=>{g.moveTo(75,72);g.lineTo(78,43);g.quadraticCurveTo(128,20,178,43);g.lineTo(181,75);g.closePath();},"#28242a");}
 else if(d.kind==="scarf"){path(()=>{g.moveTo(62,93);g.quadraticCurveTo(60,28,128,28);g.quadraticCurveTo(196,28,194,93);g.lineTo(173,75);g.quadraticCurveTo(128,53,82,82);g.closePath();},"#eee7db");path(()=>{g.moveTo(64,154);g.lineTo(37,240);g.lineTo(83,265);g.lineTo(111,165);g.closePath();},"#a77c91");}
 else if(d.kind==="cap"){path(()=>{g.moveTo(78,84);g.quadraticCurveTo(76,34,128,34);g.quadraticCurveTo(180,34,178,84);g.quadraticCurveTo(150,96,128,94);g.quadraticCurveTo(106,96,78,84);g.closePath();},"#33502f");g.fillStyle="#2a4026";g.fillRect(70,76,116,11);}
 else if(d.kind==="headband"){plainHair();g.fillStyle="#c94f3d";g.fillRect(80,72,96,13);}
 else {plainHair();}
 // face details — ekspresi per adegan (v3). v3-fix (27 Nov 2026, user:
 // "bentuk orangnya jelek"): mata v3 terlalu renggang (40 px di kepala
 // 96 px) + tanpa hidung + tanpa alis = muka kelihatan seperti topeng.
 // Kini: mata di (112,118)/(144,118) (32 px), hidung garis kecil di
 // tengah, alis untuk semua ekspresi, mulut "o" kaget lebih kecil.
 // Kepala sedikit lebih kecil (rx 46, ry 58) supaya proporsi wajar.
 const nose=()=>{g.strokeStyle="#8a5f52";g.lineWidth=3;g.beginPath();g.moveTo(128,124);g.lineTo(126,134);g.lineTo(131,134);g.stroke();};
 if(expr==="shock"){ // mata melotot + mulut "o" terbuka (Dani kaget)
  g.strokeStyle="#252329";g.lineWidth=4;g.beginPath();g.moveTo(102,100);g.lineTo(120,96);g.moveTo(136,96);g.lineTo(154,100);g.stroke();
  g.fillStyle="#fff";g.beginPath();g.arc(112,118,8,0,Math.PI*2);g.arc(144,118,8,0,Math.PI*2);g.fill();
  g.fillStyle="#252329";g.beginPath();g.arc(112,118,4,0,Math.PI*2);g.arc(144,118,4,0,Math.PI*2);g.fill();
  nose();
  g.fillStyle="#7a2e2e";g.beginPath();g.ellipse(128,152,7,9,0,0,Math.PI*2);g.fill();
 } else if(expr==="worry"){ // alis naik ke tengah + mulut cemberut (Nenek khawatir)
  g.strokeStyle="#252329";g.lineWidth=4;g.beginPath();g.moveTo(100,102);g.lineTo(118,96);g.moveTo(138,96);g.lineTo(156,102);g.stroke();
  g.fillStyle="#252329";g.beginPath();g.arc(112,118,5,0,Math.PI*2);g.arc(144,118,5,0,Math.PI*2);g.fill();
  nose();
  g.strokeStyle="#754b42";g.lineWidth=4;g.beginPath();g.arc(128,160,10,Math.PI+0.25,Math.PI*2-0.25);g.stroke();
 } else if(expr==="serious"){ // mata garis datar + mulut lurus (Pak Karto tegas)
  g.strokeStyle="#252329";g.lineWidth=4;g.beginPath();g.moveTo(102,106);g.lineTo(122,106);g.moveTo(134,106);g.lineTo(154,106);g.stroke();
  g.strokeStyle="#252329";g.lineWidth=6;g.beginPath();g.moveTo(100,118);g.lineTo(124,118);g.moveTo(132,118);g.lineTo(156,118);g.stroke();
  nose();
  g.strokeStyle="#754b42";g.lineWidth=4;g.beginPath();g.moveTo(114,152);g.lineTo(142,152);g.stroke();
 } else if(expr==="puzzled"){ // satu alis naik + mulut "o" kecil (Jali heran)
  g.strokeStyle="#252329";g.lineWidth=4;g.beginPath();g.moveTo(138,102);g.lineTo(158,96);g.stroke();
  g.fillStyle="#252329";g.beginPath();g.arc(112,118,5,0,Math.PI*2);g.arc(144,118,5,0,Math.PI*2);g.fill();
  nose();
  g.strokeStyle="#754b42";g.lineWidth=4;g.beginPath();g.arc(128,150,5,0,Math.PI*2);g.stroke();
 } else { // smile (default): mata titik + alis + senyum
  g.strokeStyle="#252329";g.lineWidth=4;g.beginPath();g.moveTo(102,106);g.lineTo(120,103);g.moveTo(136,103);g.lineTo(154,106);g.stroke();
  g.fillStyle="#252329";g.beginPath();g.arc(112,118,5,0,Math.PI*2);g.arc(144,118,5,0,Math.PI*2);g.fill();
  nose();
  g.strokeStyle="#754b42";g.lineWidth=4;g.beginPath();g.arc(128,148,12,0.15,Math.PI-0.15);g.stroke();
 }
 // kumis Pak Karto (di bawah hidung, di atas mulut) — ciri khasnya
 if(d.name==="Pak Karto"){g.fillStyle="#28242a";g.beginPath();g.ellipse(128,141,13,4.5,0,0,Math.PI*2);g.fill();}
 if(d.kind==="peci"){g.strokeStyle="#eee2cf";g.lineWidth=5;g.beginPath();g.moveTo(104,158);g.quadraticCurveTo(128,180,153,158);g.stroke();}
 if(d.kind==="round"){g.fillStyle="#eee2cf";g.fillRect(70,190,116,22);}
 if(d.kind==="bucket"){g.strokeStyle="#b6a27c";g.lineWidth=9;g.beginPath();g.arc(214,335,35,Math.PI,Math.PI*2);g.stroke();g.fillStyle="#9ca6a2";g.fillRect(190,335,48,55);}
 if(d.kind==="scarf"){g.strokeStyle="#8d5b76";g.lineWidth=12;g.beginPath();g.moveTo(75,190);g.quadraticCurveTo(125,240,181,190);g.stroke();}
 // small wrinkle marks for the elder
 if(d.name==="Nenek Sari"){g.strokeStyle="#8a5f52";g.lineWidth=2;for(let y of [106,128,150]){g.beginPath();g.moveTo(85,y);g.lineTo(101,y+3);g.moveTo(155,y+3);g.lineTo(171,y);g.stroke();}}
 const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.needsUpdate=true;
 return {tex,aspect:d.w/d.h};
};
export class Cast {
 root=new THREE.Group();
 // v1 bug: SATU mesh per nama — show("Warga") 4x hanya menampilkan warga
 // TERAKHIR (sisanya tertimpa). v2: pool 4 mesh per nama, show() memakai
 // mesh berikutnya yang masih tersembunyi.
 sprites=new Map<ActorName,THREE.Mesh[]>();
 // v3: material per (nama, ekspresi). show() memasang material yang tepat
 // di mesh setiap kali tampil — mesh pool dipakai bersama semua ekspresi.
 materials=new Map<string,THREE.MeshBasicMaterial>();
 private next=new Map<ActorName,number>();
 constructor(parent:THREE.Object3D){
  parent.add(this.root);
  for(const d of defs){
   // v2: alphaTest (bukan transparent+depthWrite:false). v1: karakter tidak
   // menulis depth -> depth buffer utama di pixel wajah = latar belakang,
   // jadi proteksi "no ink over characters" di ink.ts gagal dan garis tinta
   // tepi jalan/rumah tergambar MENEMBUS wajah tokoh. Dengan alphaTest 0.5
   // (cara bridge) karakter menulis depth dan garis latar tertutup wajah.
   for(const expr of EXPRS){
    const {tex}=makeSprite(d,expr);
    const mat=new THREE.MeshBasicMaterial({map:tex,alphaTest:0.5,side:THREE.DoubleSide});
    this.materials.set(`${d.name}:${expr}`,mat);
   }
   const arr:THREE.Mesh[]=[];
   for(let k=0;k<4;k++){
    const geo=new THREE.PlaneGeometry(d.w,d.h);
    // v1 bug: bidang berpusat di y=0 lalu show() set y=0 -> tokoh tenggelam
    // setengah ke tanah (kepala Dani di ~0,5 m, bukan 1,5 m). v2: geser
    // geometri ke atas setengah tinggi, jadi kaki tepat di y=0 (cara bridge).
    geo.translate(0,d.h/2,0);
    const mesh=new THREE.Mesh(geo,this.materials.get(`${d.name}:smile`)!);mesh.visible=false;mesh.renderOrder=5;mesh.layers.set(NOINK);this.root.add(mesh);arr.push(mesh);
   }
   this.sprites.set(d.name,arr);this.next.set(d.name,0);
  }
 }
 show(name:ActorName,x:number,z:number,scale=1,rotation=0,y=0,expr:Expr="smile"){
  const arr=this.sprites.get(name)!;const i=this.next.get(name)!;
  const m=arr[i%arr.length];this.next.set(name,i+1);
  m.visible=true;m.position.set(x,y,z);m.scale.setScalar(scale);m.rotation.y=rotation;
  m.material=this.materials.get(`${name}:${expr}`)!;
 }
 hideAll(){for(const arr of this.sprites.values())for(const m of arr)m.visible=false;for(const k of this.next.keys())this.next.set(k,0);}
 /** Billboard YAW-ONLY (aturan ep.11 Kedutan, 27 Nov 2026): trik lama salin
  *  quaternion kamera + rotation.z=0 PECAH jadi roll 40-90 deg (tokoh rebah/
  *  miring) kalau kamera menatap sepanjang sumbu ±x — shot lebar v3 yang
  *  kameranya menyusuri adegan BISA menatap ±x. Yaw-only: tokoh selalu tegak,
  *  hanya berputar di bidang horizontal menghadap kamera. */
 faceCamera(camera:THREE.Camera){for(const arr of this.sprites.values())for(const m of arr)if(m.visible){const dx=camera.position.x-m.position.x,dz=camera.position.z-m.position.z;m.rotation.set(0,Math.atan2(dx,dz),0);}}
 /** Gestur prosedural pada mesh pertama yang terlihat dgn nama itu (tokoh
  *  tunggal). Dipanggil SETELAH faceCamera, jadi rotasi terbaca di ruang
  *  layar: rz = condong kiri/kanan, rx = angguk. */
 gesture(name:ActorName,rz=0,rx=0,dx=0,dy=0){const m=this.sprites.get(name)!.find((mm)=>mm.visible);if(!m)return;m.rotateZ(rz);m.rotateX(rx);m.position.x+=dx;m.position.y+=dy;}
 /** Gestur per mesh terlihat (mis. warga beramai-ramai, fase beda per indeks). */
 gestureEach(name:ActorName,fn:(m:THREE.Mesh,i:number)=>void){let i=0;for(const m of this.sprites.get(name)!)if(m.visible)fn(m,i++);}
 dispose(){for(const m of this.materials.values()){m.map?.dispose();m.dispose();}}
}
