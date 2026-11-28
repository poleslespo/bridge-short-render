import * as THREE from "three";
import { NOINK } from "../bridge/ink";

export const SU = 1;
/** BENTUK BEDA PER TOKOH — v3 (RESET TOTAL 27 Nov 2026, dari riset
 *  channel animasi 2024–2026: report.md §1/§4/§5/§6). Pemetaan bentuk
 *  per tokoh TIDAK BERUBAH di v5 — yang berubah hanya CARA tokohnya
 *  digambar (dari tekstur statis sekali-jadi menjadi gambar-ulang per
 *  frame, cara jembatan). Bentuk geometri, warna, head-count, landmark
 *  tiap tokoh dipertahankan persis dari v3/v4 (lineup + 5 uji §5.3
 *  tetap berlaku).
 *
 *  v5 "LIVING RIG" (28 Nov 2026 — user: "lanjutnya kamu ubah semuanya
 *  rombak total, aku minta three D jalan"; "karakternya loncat-loncat
 *  doang, nggak ada kedipan mata, nggak ada mulut berasa ngomong,
 *  kayak pocong"):
 *  Mekanisme JEMBATAN (contoh yang user suka — dibongkar dari
 *  gh-actions-render-bridge-source.zip, cast.ts + toon.ts):
 *  - Tokoh digambar ULANG tiap frame (canvas Pool, kunci = parameter
 *    gambar). Bukan 1 tekstur statis per (tokoh, ekspresi) seperti v1-v4.
 *  - JALAN = kaki digambar per fase (marchPhase 1 Hz = 2 langkah/dtk,
 *    kaki bergantian terangkat, lutut menekuk), lengan AYUN berlawanan
 *    dgn kaki (hang(side, ±sw)), kaki TETAP menapak tanah — TIDAK ADA
 *    lompatan vertikal badan. Bobbing jembatan hanya 2,5% tinggi dan
 *    TERENDAH saat kaki menapak (bukan |sin| yang mengangkat badan).
 *  - KEDIP = lidAt(): jadwal kedip acak-semu per tokoh (jeda 0,5-2,3 dtk),
 *    kedip 4 frame (setengah-tutup-tutup-setengah), LID=[0.5,1,1,0.5].
 *  - MULUT = bagian dari ekspresi yang digambar per frame (whistle "o",
 *    laugh terbuka, dll).
 *  Mekanisme KENTONGAN/KEDUTAN v1-v4 yang bikin kelihatan pocong:
 *  - walk()/path2() cuma translasi + bobbing vertikal |sin| (dy s.d.
 *    3,5-6 cm) dgn kaki STATIS menempel di tekstur — kaki terangkat
 *    dari tanah tanpa melangkah = loncat-loncat.
 *  - Wajah + lengan digambar SEKALI ke tekstur — tidak bisa kedip,
 *    mulut tidak bisa gerak, lengan tidak bisa ayun.
 *  v5 di sini (Kedutan):
 *  - drawSprite(g, d, expr, mode, anim): anim = {phase, blink, mouth,
 *    walking}. Kaki digambar menekuk per fase (kaki bergantian
 *    terangkat 14px, lutut menekuk), lengan AYUN (tangan naik-turun
 *    bergantian 9px, berlawanan dgn kaki sesisi), badan TIDAK
 *    memantul sama sekali (y=0 selalu — "meluncur", bukan mantul).
 *  - Kedip = lidAt() port dari jembatan (hash per tokoh).
 *  - Mulut = buka-tutup mengikuti narasi: tokoh FOKUS tiap shot
 *    ("pembicara") mulutnya bergetar saat baris narasinya berbunyi,
 *    tertutup di jeda antar baris (world.ts: SPEAKER + mouthAt).
 *  - Pool (port jembatan, disederhanakan): kunci = nama|ekspresi|mode|
 *    fase(16 langkah)|kedip(3)|mulut(5) — gambar ulang hanya saat
 *    kunci berubah; tokoh dgn pose sama berbagi kanvas.
 *  - Billboard tetap yaw-only; lean permanen 0; gestur transient
 *    maks ~8° dgn amplop kembali ke 0. */
export type ActorName = "Jali"|"JaliSehat"|"Nenek Sari"|"Pak Karto"|"Warga"|"Warga2"|"Warga3"|"Warga4";
export type Expr = "smile"|"shock"|"worry"|"serious"|"puzzled";
export type SpriteMode = "normal"|"bald"|"silhouette"|"swap";
/** Animasi per frame (diisi world.ts dari posisi + timeline narasi).
 *  phase 0..1 = posisi dalam siklus jalan (2 langkah per siklus);
 *  blink 0..1 = kelopak menutup (0 buka, 1 tutup); mouth 0..1 =
 *  mulut terbuka; walking = sedang melangkah (kalau false, kaki
 *  rapat + lengan diam); sleeping = tidur (mata tertutup terus). */
export type Anim = {phase?:number; blink?:number; mouth?:number; walking?:boolean; sleeping?:boolean};
type Shape = "mbah"|"kades"|"ronda"|"tani"|"pemuda"|"hijab"|"dukun";
type SpriteDef={name:ActorName;w:number;h:number;shirt:string;head:string;hair:string;shape:Shape;cup?:boolean};
const defs:SpriteDef[]=[
 {name:"Jali",w:0.925,h:1.85,shirt:"#527d58",head:"#b87958",hair:"#241f1c",shape:"ronda",cup:true},
 {name:"JaliSehat",w:0.925,h:1.85,shirt:"#527d58",head:"#b87958",hair:"#241f1c",shape:"ronda"},
 {name:"Nenek Sari",w:0.725,h:1.45,shirt:"#8d5b76",head:"#c99578",hair:"#eee6d7",shape:"mbah"},
 {name:"Pak Karto",w:0.775,h:1.55,shirt:"#806b4c",head:"#c28b69",hair:"#eee2cf",shape:"kades"},
 {name:"Warga",w:0.775,h:1.55,shirt:"#647b8a",head:"#c88f6c",hair:"#30251f",shape:"tani"},
 {name:"Warga2",w:0.84,h:1.68,shirt:"#7a4a3a",head:"#b87958",hair:"#1f1a16",shape:"pemuda"},
 {name:"Warga3",w:0.725,h:1.45,shirt:"#3e6e7e",head:"#d9a06f",hair:"#3a2a1a",shape:"hijab"},
 {name:"Warga4",w:0.80,h:1.60,shirt:"#8a7a3a",head:"#a87a5e",hair:"#6a6a6a",shape:"dukun"},
];
/** Indeks tokoh untuk jadwal kedip (hash per tokoh — tiap tokoh punya
 *  ritme kedip sendiri, seperti jembatan). */
export const CHAR_IDX:Record<ActorName,number>={Jali:0,JaliSehat:0,"Nenek Sari":1,"Pak Karto":2,Warga:3,Warga2:4,Warga3:5,Warga4:6};
/** Kedip ala jembatan (cast.ts): jeda acak-semu 0,5-2,3 dtk, kedip 4 frame
 *  (setengah-tutup-tutup-setengah). t dalam DETIK, f = frame. */
const FPS = 30;
const hh=(i:number,s=0)=>{const v=Math.sin(i*127.1+s*311.7)*43758.5453;return v-Math.floor(v);};
const LID=[0.5,1,1,0.5];
export const lidAt=(t:number,i:number)=>{
 const f=Math.round(t*FPS);
 let s=Math.round(-60*hh(i,9));
 for(let n=0;s<=f&&n<400;n++){
  const k=f-s;
  if(k>=0&&k<4)return LID[k];
  s+=Math.round(15+54*hh(i*31+n,13)); // kedip berikut 0,5-2,3 dtk lagi
 }
 return 0;
};
// ---------------- canvas pool (port jembatan, disederhanakan) ----------------
// Tiap frame tiap tokoh minta gambar dgn kunci = parameternya; pool hanya
// menggambar ulang kunci yang BERUBAH (tokoh dgn pose sama berbagi kanvas).
type Entry={cv:HTMLCanvasElement;tex:THREE.CanvasTexture};
export type Req={key:string;draw:(g:CanvasRenderingContext2D)=>void;tex?:THREE.CanvasTexture};
class Pool{
 private live=new Map<string,Entry>();
 private free:Entry[]=[];
 private reqs:Req[]=[];
 req(key:string,draw:(g:CanvasRenderingContext2D)=>void):Req{
  const r:Req={key,draw};this.reqs.push(r);return r;
 }
 flush(){
  const want=new Map<string,Req[]>();
  for(const r of this.reqs){const l=want.get(r.key);if(l)l.push(r);else want.set(r.key,[r]);}
  for(const [key,e] of this.live)if(!want.has(key)){this.live.delete(key);this.free.push(e);}
  for(const [key,rs] of want){
   let e=this.live.get(key);
   if(!e){
    e=this.free.pop()??(()=>{const cv=document.createElement("canvas");cv.width=256;cv.height=512;const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;return {cv,tex};})();
    const g=e.cv.getContext("2d")!;
    g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,256,512);
    rs[0].draw(g);
    e.tex.needsUpdate=true;
    this.live.set(key,e);
   }
   for(const r of rs)r.tex=e.tex;
  }
  this.reqs=[];
 }
 dispose(){for(const e of [...this.live.values(),...this.free])e.tex.dispose();this.live.clear();this.free=[];}
}
const blank=(()=>{const c=document.createElement("canvas");c.width=c.height=2;return new THREE.CanvasTexture(c);})();

// ---------------- gambar sprite per frame ----------------
// Ruang desain 256x512; kaki di y~488. anim.walking=false -> pose diam
// persis v3/v4 (kaki rapat, lengan di sisi, mata buka, mulut sesuai
// ekspresi) — lineup + uji §5.3 tidak berubah.
const LIFT=14; // kaki terangkat maks 14px saat melangkah (ala jembatan: lift)
const PUMP=9; // tangan naik-turun maks 9px saat mengayun (ala jembatan: |sw|)
const drawSprite=(g:CanvasRenderingContext2D,d:SpriteDef,expr:Expr="smile",mode:SpriteMode="normal",anim:Anim={})=>{
 const cx=128;
 const bald=mode==="bald";
 const walking=!!anim.walking;
 const ph=anim.phase??0;
 const blink=anim.sleeping?1:(anim.blink??0);
 const mouth=anim.mouth??0;
 // kaki kiri terangkat saat sin(2π·phase)>0, kanan saat sin(2π·(phase+0,5))>0;
 // lengan mengayun BERLAWANAN dgn kaki sesisi (kaki kiri maju = lengan
 // kanan maju) — persis pola jembatan hang(side, ±sw).
 const liftL=walking?LIFT*Math.max(0,Math.sin(2*Math.PI*ph)):0;
 const liftR=walking?LIFT*Math.max(0,Math.sin(2*Math.PI*(ph+0.5))):0;
 const pumpL=walking?PUMP*Math.abs(Math.sin(2*Math.PI*(ph+0.5))):0;
 const pumpR=walking?PUMP*Math.abs(Math.sin(2*Math.PI*ph)):0;
 const path=(fn:()=>void,fill:string)=>{g.beginPath();fn();g.fillStyle=fill;g.fill();g.lineWidth=8;g.lineJoin="round";g.strokeStyle="#252329";g.stroke();};
 /** Kaki berjalan: trapesium dgn lutut menekuk (knee offset ke samping
  *  sebanding dgn lift) + sepatu mengikuti kaki yang terangkat. Saat
  *  diam (lift=0) bentuknya = trapesium lurus v3 (lutut offset 3px,
  *  tidak kelihatan) + sepatu di tempat semula. */
 const legWalk=(hipX:number,hipY:number,footX:number,footY:number,w:number,lift:number,side:-1|1,shoe:"ellipse"|"square",shoeW:number)=>{
  const fy=footY-lift;
  const kx=(hipX+footX)/2+side*(3+lift*0.25),ky=(hipY+fy)/2-lift*0.08;
  path(()=>{
   g.moveTo(hipX-w/2,hipY);g.lineTo(kx-w/2,ky);g.lineTo(footX-w/2-2,fy);
   g.lineTo(footX+w/2+2,fy);g.lineTo(kx+w/2,ky);g.lineTo(hipX+w/2,hipY);g.closePath();
  },"#34343b");
  g.fillStyle="#34343b";
  if(shoe==="ellipse"){g.beginPath();g.ellipse(footX,fy-4,shoeW/2,6,0,0,Math.PI*2);g.fill();}
  else g.fillRect(footX-shoeW/2,fy-2,shoeW,14);
 };
 const arm=(x1:number,y1:number,x2:number,y2:number,ow:number,iw:number,color:string)=>{g.lineCap="round";g.strokeStyle="#252329";g.lineWidth=ow;g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke();g.strokeStyle=color;g.lineWidth=iw;g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke();};
 // BAN RAMBUT TIPIS mengikuti lekuk atas kepala (bukan kubah penuh —
 // kubah penuh terbaca seperti topi/bola gelap, bug rambut Jali v1).
 const hairBand=(hx:number,hy:number,rx:number,ry:number)=>{path(()=>{g.moveTo(hx-rx+4,hy-ry*0.45);g.quadraticCurveTo(hx-rx+2,hy-ry-2,hx,hy-ry-2);g.quadraticCurveTo(hx+rx-2,hy-ry-2,hx+rx-4,hy-ry*0.45);g.quadraticCurveTo(hx+rx*0.55,hy-ry*0.62,hx,hy-ry*0.60);g.quadraticCurveTo(hx-rx*0.55,hy-ry*0.62,hx-rx+4,hy-ry*0.45);g.closePath();},d.hair);};
 // Wajah v3 (koordinat lokal sekitar (128,118)) ditransformasi ke
 // pusat+ukuran kepala tiap bentuk — ekspresi tetap sama persis.
 // v5: blink (0 buka .. 1 tutup) mengecilkan mata jadi garis kelopak;
 // mouth (0 tutup .. 1 buka) membuka mulut mengikuti narasi.
 const drawFace=(hx:number,hy:number,rx:number,ry:number)=>{
  g.save();g.translate(hx,hy);g.scale(rx/44,ry/60);g.translate(-128,-118);
  const nose=()=>{g.strokeStyle="#8a5f52";g.lineWidth=3;g.beginPath();g.moveTo(128,124);g.lineTo(126,134);g.lineTo(131,134);g.stroke();};
  // mata: titik/lingkaran mengecil dgn blink; blink>=0,75 -> garis kelopak
  const eyeDot=(x:number,y:number,r:number)=>{
   if(blink>=0.75){g.strokeStyle="#252329";g.lineWidth=4;g.beginPath();g.moveTo(x-8,y);g.lineTo(x+8,y);g.stroke();}
   else{g.fillStyle="#252329";g.beginPath();g.arc(x,y,Math.max(0.5,r*(1-blink)),0,Math.PI*2);g.fill();}
  };
  const eyeWide=(x:number,y:number)=>{
   if(blink>=0.75){g.strokeStyle="#252329";g.lineWidth=4;g.beginPath();g.moveTo(x-10,y);g.lineTo(x+10,y);g.stroke();}
   else{
    g.fillStyle="#fff";g.beginPath();g.ellipse(x,y,8,Math.max(0.5,8*(1-blink)),0,0,Math.PI*2);g.fill();
    g.fillStyle="#252329";g.beginPath();g.arc(x,y,Math.max(0.5,4*(1-blink)),0,Math.PI*2);g.fill();
   }
  };
  // mulut terbuka: elips gelap (ry tumbuh dgn mouth); tertutup: bentuk ekspresi v3
  const mouthOpen=(mx:number,my:number,mr:number)=>{
   if(mouth<=0.05)return false;
   g.fillStyle="#7a2e2e";g.beginPath();g.ellipse(mx,my,mr,2+9*mouth,0,0,Math.PI*2);g.fill();
   return true;
  };
  if(expr==="shock"){ // mata melotot + mulut "o" terbuka
   g.strokeStyle="#252329";g.lineWidth=4;g.beginPath();g.moveTo(102,100);g.lineTo(120,96);g.moveTo(136,96);g.lineTo(154,100);g.stroke();
   eyeWide(112,118);eyeWide(144,118);
   nose();
   g.fillStyle="#7a2e2e";g.beginPath();g.ellipse(128,152,7,9*(0.5+0.7*mouth),0,0,Math.PI*2);g.fill();
  } else if(expr==="worry"){ // alis naik ke tengah + mulut cemberut
   g.strokeStyle="#252329";g.lineWidth=4;g.beginPath();g.moveTo(100,102);g.lineTo(118,96);g.moveTo(138,96);g.lineTo(156,102);g.stroke();
   eyeDot(112,118,5);eyeDot(144,118,5);
   nose();
   if(!mouthOpen(128,158,6)){g.strokeStyle="#754b42";g.lineWidth=4;g.beginPath();g.arc(128,160,10,Math.PI+0.25,Math.PI*2-0.25);g.stroke();}
  } else if(expr==="serious"){ // mata garis datar + mulut lurus
   g.strokeStyle="#252329";g.lineWidth=4;g.beginPath();g.moveTo(102,106);g.lineTo(122,106);g.moveTo(134,106);g.lineTo(154,106);g.stroke();
   const sl=12*(1-blink*0.4);
   g.strokeStyle="#252329";g.lineWidth=6;g.beginPath();g.moveTo(112-sl,118);g.lineTo(112+sl,118);g.moveTo(144-sl,118);g.lineTo(144+sl,118);g.stroke();
   nose();
   if(!mouthOpen(128,152,7)){g.strokeStyle="#754b42";g.lineWidth=4;g.beginPath();g.moveTo(114,152);g.lineTo(142,152);g.stroke();}
  } else if(expr==="puzzled"){ // satu alis naik + mulut "o" kecil
   g.strokeStyle="#252329";g.lineWidth=4;g.beginPath();g.moveTo(138,102);g.lineTo(158,96);g.stroke();
   eyeDot(112,118,5);eyeDot(144,118,5);
   nose();
   if(mouth>0.4){g.fillStyle="#7a2e2e";g.beginPath();g.ellipse(128,150,5,3+6*mouth,0,0,Math.PI*2);g.fill();}
   else{g.strokeStyle="#754b42";g.lineWidth=4;g.beginPath();g.arc(128,150,5*(0.6+0.8*mouth),0,Math.PI*2);g.stroke();}
  } else { // smile (default): mata titik + alis + senyum
   g.strokeStyle="#252329";g.lineWidth=4;g.beginPath();g.moveTo(102,106);g.lineTo(120,103);g.moveTo(136,103);g.lineTo(154,106);g.stroke();
   eyeDot(112,118,5);eyeDot(144,118,5);
   nose();
   if(!mouthOpen(128,150,7)){g.strokeStyle="#754b42";g.lineWidth=4;g.beginPath();g.arc(128,148,12,0.15,Math.PI-0.15);g.stroke();}
  }
  if(d.name==="Pak Karto"){g.fillStyle="#28242a";g.beginPath();g.ellipse(128,141,13,4.5,0,0,Math.PI*2);g.fill();
   g.strokeStyle="#eee2cf";g.lineWidth=5;g.beginPath();g.moveTo(104,158);g.quadraticCurveTo(128,180,153,158);g.stroke();}
  if(d.name==="Nenek Sari"){g.strokeStyle="#8a5f52";g.lineWidth=2;for(let y of [106,128,150]){g.beginPath();g.moveTo(85,y);g.lineTo(101,y+3);g.moveTo(155,y+3);g.lineTo(171,y);g.stroke();}}
  g.restore();
 };
 // ---- BENTUK PER TOKOH v3 (ruang desain 256x512; kaki di y~488) ----
 // v5: kaki + lengan digambar per fase saat walking; saat diam hasilnya
 // sama dgn v3 (lift=0, pump=0) — lineup tidak berubah.
 if(d.shape==="mbah"){ // NENEK SARI: lonceng/daster + kerudung + tongkat, 2,75 kepala — TANPA punuk (v4)
  // ekor kerudung menempel di PUNGGUNG (kiri), digambar SEBELUM daster
  if(!bald) path(()=>{g.moveTo(96,168);g.quadraticCurveTo(56,210,54,310);g.lineTo(70,312);g.quadraticCurveTo(74,225,104,178);g.closePath();},"#eee7db");
  // v4 (27 Nov 2026): PUNUK DIHAPUS TOTAL atas perintah user ("bumbu itu dari
  // bentuk tubuhnya bukan tonjolan"). Bungkuk Nenek HANYA dari bentuk badan:
  // kepala rendah di depan + daster lonceng + tongkat + postur S. Dari depan
  // visualnya normal-normal aja — tanpa tonjolan apa pun di belakang kepala.
  // daster: LONCENG/trapezoid melebar ke tanah, kaki tertutup
  path(()=>{g.moveTo(72,210);g.lineTo(184,210);g.lineTo(214,482);g.lineTo(42,482);g.closePath();},d.shirt);
  g.strokeStyle="#6e4358";g.lineWidth=4;g.beginPath();g.moveTo(54,470);g.lineTo(202,470);g.stroke();
  g.strokeStyle="#6e4358";g.lineWidth=3;g.beginPath();g.moveTo(128,216);g.lineTo(128,468);g.stroke();
  // lengan pendek menekuk ke depan — ayun kecil saat berjalan (5px)
  const pumpN=walking?5*Math.abs(Math.sin(2*Math.PI*ph)):0;
  const pumpN2=walking?5*Math.abs(Math.sin(2*Math.PI*(ph+0.5))):0;
  arm(82,228,102,308-pumpN,30,22,d.shirt);arm(174,228,154,308-pumpN2,30,22,d.shirt);
  // sepatu mengintip di bawah daster
  g.fillStyle="#34343b";g.beginPath();g.ellipse(84,486,14,6,0,0,Math.PI*2);g.ellipse(172,486,14,6,0,0,Math.PI*2);g.fill();
  // kerudung: tudung membingkai wajah (kepala maju + rendah: cx 140, cy 124)
  if(!bald){
   path(()=>{g.ellipse(134,116,60,86,0,0,Math.PI*2);},"#eee7db");
   path(()=>{g.ellipse(140,124,40,56,0,0,Math.PI*2);},d.head);
  } else {
   path(()=>{g.ellipse(140,124,40,56,0,0,Math.PI*2);},d.head);
   hairBand(140,124,40,56);
   g.fillStyle=d.hair;g.beginPath();g.arc(140,64,12,0,Math.PI*2);g.fill(); // sanggul kecil
  }
  drawFace(140,124,40,56);
  // tongkat kayu di tangan kanan (x≈224), gagang melengkung
  g.lineCap="round";g.strokeStyle="#4a3524";g.lineWidth=10;g.beginPath();g.moveTo(224,216);g.lineTo(224,490);g.stroke();
  g.strokeStyle="#4a3524";g.lineWidth=8;g.beginPath();g.arc(218,212,10,Math.PI*0.5,Math.PI*1.5);g.stroke();
 } else if(d.shape==="kades"){ // PAK KARTO: squircle lebar + torso TONG/barel, 3,25 kepala
  legWalk(96,352,96,472,44,liftL,-1,"square",52);legWalk(160,352,160,472,44,liftR,1,"square",52);
  // torso TONG: bahu datar sangat lebar, sisi menggembung
  path(()=>{g.moveTo(30,196);g.lineTo(226,196);g.quadraticCurveTo(236,280,226,352);g.lineTo(30,352);g.quadraticCurveTo(20,280,30,196);g.closePath();},d.shirt);
  g.fillStyle="#5a4632";g.fillRect(30,344,196,8); // ikat pinggang
  g.strokeStyle="#5a4632";g.lineWidth=3;g.strokeRect(58,238,26,28); // saku kotak batik
  // lengan pendek tebal, tangan besar — ayun saat berjalan
  arm(36,222,26,330-pumpL,40,32,d.shirt);arm(220,222,230,330-pumpR,40,32,d.shirt);
  g.fillStyle=d.head;g.beginPath();g.arc(26,336-pumpL,13,0,Math.PI*2);g.arc(230,336-pumpR,13,0,Math.PI*2);g.fill();
  // leher (tanpa ini kepala melayang di atas torso)
  path(()=>{g.moveTo(114,172);g.lineTo(142,172);g.lineTo(142,198);g.lineTo(114,198);g.closePath();},d.head);
  // kepala SQUIRCLE lebar (sudut membulat besar, rahang kotak)
  path(()=>{g.moveTo(76,46);g.lineTo(180,46);g.quadraticCurveTo(198,46,198,64);g.lineTo(198,160);g.quadraticCurveTo(198,178,180,178);g.lineTo(76,178);g.quadraticCurveTo(58,178,58,160);g.lineTo(58,64);g.quadraticCurveTo(58,46,76,46);g.closePath();},d.head);
  // peci datar lebar (sedikit lebih lebar dari kepala)
  if(!bald) path(()=>{g.moveTo(52,64);g.lineTo(56,46);g.quadraticCurveTo(128,38,200,46);g.lineTo(204,64);g.closePath();},"#28242a");
  else hairBand(128,111,70,67);
  drawFace(128,111,70,67);
 } else if(d.shape==="ronda"){ // JALI/JaliSehat: kotak membulat kecil + KAPSUL sempit panjang, 3,75 kepala
  legWalk(108,356,108,488,20,liftL,-1,"ellipse",32);legWalk(148,356,148,488,20,liftR,1,"ellipse",32);
  // torso KAPSUL vertikal sempit (ujung atas-bawah setengah lingkaran)
  path(()=>{g.moveTo(100,188);g.lineTo(156,188);g.quadraticCurveTo(168,188,168,200);g.lineTo(168,344);g.quadraticCurveTo(168,356,156,356);g.lineTo(100,356);g.quadraticCurveTo(88,356,88,344);g.lineTo(88,200);g.quadraticCurveTo(88,188,100,188);g.closePath();},d.shirt);
  // lengan kiri AYUN; lengan kanan PEGANG CANGKIR (tetap — orang jalan
  // sambil bawa kopi tidak mengayunkan tangan itu)
  arm(92,212,78,348-pumpL,22,15,d.shirt);arm(164,212,178,348,22,15,d.shirt);
  g.fillStyle=d.head;g.beginPath();g.arc(78,352-pumpL,7,0,Math.PI*2);g.arc(178,352,7,0,Math.PI*2);g.fill();
  // leher pendek
  path(()=>{g.moveTo(118,158);g.lineTo(138,158);g.lineTo(138,190);g.lineTo(118,190);g.closePath();},d.head);
  // kepala KOTAK MEMBULAT kecil
  path(()=>{g.moveTo(100,48);g.lineTo(156,48);g.quadraticCurveTo(172,48,172,64);g.lineTo(172,146);g.quadraticCurveTo(172,162,156,162);g.lineTo(100,162);g.quadraticCurveTo(84,162,84,146);g.lineTo(84,64);g.quadraticCurveTo(84,48,100,48);g.closePath();},d.head);
  // ikat kepala + ujung kain menjuntai ke kiri (asimetri)
  if(!bald){
   path(()=>{g.moveTo(86,66);g.quadraticCurveTo(128,56,170,66);g.lineTo(170,80);g.quadraticCurveTo(128,70,86,80);g.closePath();},"#7a2e2e");
   path(()=>{g.moveTo(88,78);g.lineTo(76,112);g.lineTo(88,114);g.lineTo(98,80);g.closePath();},"#7a2e2e");
  } else hairBand(128,104,44,58);
  drawFace(128,104,44,58);
  if(d.cup){g.fillStyle="#f6f3e9";g.fillRect(180,322,30,26);g.strokeStyle="#252329";g.lineWidth=4;g.strokeRect(180,322,30,26);g.beginPath();g.arc(212,335,8,0,Math.PI*2);g.stroke();g.fillStyle="#5a3a22";g.fillRect(184,326,22,7);}
 }
 else if(d.shape==="tani"){ // WARGA: kepala SEGITIGA TERBALIK + torso PERSEGI lurus + caping, 3,5 kepala
  legWalk(104,352,104,470,26,liftL,-1,"square",34);legWalk(152,352,152,470,26,liftR,1,"square",34);
  // torso PERSEGI LURUS (sisi vertikal lurus; atas miring sedikit = membungkuk)
  path(()=>{g.moveTo(74,250);g.lineTo(182,242);g.lineTo(182,352);g.lineTo(74,352);g.closePath();},d.shirt);
  // lengan sedang, tangan besar (lengan digulung) — ayun saat berjalan
  arm(78,262,64,340-pumpL,28,20,d.shirt);arm(178,262,192,340-pumpR,28,20,d.shirt);
  g.fillStyle=d.head;g.beginPath();g.arc(64,344-pumpL,10,0,Math.PI*2);g.arc(192,344-pumpR,10,0,Math.PI*2);g.fill();
  // leher
  path(()=>{g.moveTo(118,228);g.lineTo(138,228);g.lineTo(138,246);g.lineTo(118,246);g.closePath();},d.head);
  // kepala SEGITIGA TERBALIK (dahi lebar, dagu runcing)
  path(()=>{g.moveTo(80,110);g.lineTo(176,110);g.quadraticCurveTo(170,182,128,236);g.quadraticCurveTo(86,182,80,110);g.closePath();},d.head);
  // caping KERUCUT BESAR (lebar ±1,8× kepala)
  if(!bald){
   path(()=>{g.moveTo(128,28);g.lineTo(224,104);g.quadraticCurveTo(128,118,32,104);g.closePath();},"#c9a86a");
   g.strokeStyle="#8a6f3a";g.lineWidth=4;g.beginPath();g.moveTo(34,104);g.quadraticCurveTo(128,118,222,104);g.stroke();
  } else hairBand(128,158,36,50);
  // wajah ditaruh di bagian ATAS kepala (yang lebar) + kecil, supaya muat
  drawFace(128,158,36,50);
 } else if(d.shape==="pemuda"){ // WARGA2: oval vertikal panjang + TRAPESIUM TERBALIK + spike, 4 kepala
  // kaki kiri tegak, kaki kanan melangkah (v3: pose melangkah statis —
  // v5: pose itu jadi fase jalan, kaki bergantian terangkat)
  legWalk(102,352,102,488,22,liftL,-1,"ellipse",36);
  legWalk(157,352,165,486,22,liftR,1,"ellipse",36);
  // torso TRAPESIUM TERBALIK (bahu lebar, pinggang sempit)
  path(()=>{g.moveTo(52,204);g.lineTo(204,204);g.lineTo(174,352);g.lineTo(82,352);g.closePath();},d.shirt);
  g.strokeStyle="#5a3428";g.lineWidth=3;g.beginPath();g.moveTo(96,210);g.lineTo(160,210);g.stroke(); // garis kerah
  // lengan panjang tipis — ayun saat berjalan
  arm(56,224,44,352-pumpL,24,16,d.shirt);arm(200,224,212,352-pumpR,24,16,d.shirt);
  g.fillStyle=d.head;g.beginPath();g.ellipse(44,356-pumpL,7,10,0,0,Math.PI*2);g.ellipse(212,356-pumpR,7,10,0,0,Math.PI*2);g.fill();
  // leher
  path(()=>{g.moveTo(118,192);g.lineTo(138,192);g.lineTo(138,206);g.lineTo(118,206);g.closePath();},d.head);
  // rambut SPIKE segitiga (3 runcing ke atas) — digambar SEBELUM kepala
  if(!bald){
   path(()=>{g.moveTo(96,86);g.lineTo(104,36);g.lineTo(116,82);g.closePath();},d.hair);
   path(()=>{g.moveTo(120,84);g.lineTo(130,30);g.lineTo(140,82);g.closePath();},d.hair);
   path(()=>{g.moveTo(144,86);g.lineTo(154,40);g.lineTo(162,84);g.closePath();},d.hair);
  }
  // kepala OVAL VERTIKAL PANJANG
  path(()=>{g.ellipse(cx,140,40,56,0,0,Math.PI*2);},d.head);
  if(bald) hairBand(128,140,40,56);
  drawFace(128,140,40,56);
 } else if(d.shape==="hijab"){ // WARGA3: hijab OVAL BESAR + gaun A-LINE + tas selempang, 3,5 kepala
  g.fillStyle="#34343b";g.beginPath();g.ellipse(84,480,13,6,0,0,Math.PI*2);g.ellipse(172,480,13,6,0,0,Math.PI*2);g.fill();
  // gaun A-LINE panjang (hampir sampai mata kaki)
  path(()=>{g.moveTo(78,176);g.lineTo(178,176);g.lineTo(214,470);g.lineTo(42,470);g.closePath();},d.shirt);
  // lengan sewarna hijab — ayun saat berjalan
  arm(78,200,64,330-pumpL,26,18,"#b06a7a");arm(178,200,192,330-pumpR,26,18,"#b06a7a");
  g.fillStyle=d.head;g.beginPath();g.arc(64,334-pumpL,7,0,Math.PI*2);g.arc(192,334-pumpR,7,0,Math.PI*2);g.fill();
  // tas selempang (asimetri, satu sisi) + tali diagonal
  g.lineCap="round";g.strokeStyle="#6b4a2f";g.lineWidth=10;g.beginPath();g.moveTo(170,196);g.lineTo(90,326);g.stroke();
  path(()=>{g.moveTo(72,318);g.lineTo(108,318);g.lineTo(108,356);g.lineTo(72,356);g.closePath();},"#6b4a2f");
  // hijab OVAL BESAR membingkai wajah (menyatu dgn gaun di bahu)
  if(!bald){
   path(()=>{g.ellipse(cx,106,62,64,0,0,Math.PI*2);},"#b06a7a");
   path(()=>{g.ellipse(cx,104,42,46,0,0,Math.PI*2);},d.head);
  } else {
   path(()=>{g.ellipse(cx,104,42,46,0,0,Math.PI*2);},d.head);
   hairBand(128,104,42,46);
  }
  drawFace(128,104,42,46);
 } else { // WARGA4 "dukun": oval SANGAT PANJANG + dagu runcing + JUBAH KOLOM, 4,25 kepala
  // jubah KOLOM lurus (tanpa kaki terlihat — siluet satu tiang)
  path(()=>{g.moveTo(80,206);g.lineTo(176,206);g.lineTo(182,488);g.lineTo(74,488);g.closePath();},d.shirt);
  g.strokeStyle="#6b5a28";g.lineWidth=3;g.beginPath();g.moveTo(128,212);g.lineTo(128,486);g.stroke(); // belahan jubah
  // lengan panjang menjuntai, tangan kurus panjang — ayun saat berjalan
  arm(84,224,72,380-pumpL,26,18,d.shirt);arm(172,224,184,380-pumpR,26,18,d.shirt);
  g.fillStyle=d.head;g.beginPath();g.ellipse(72,386-pumpL,6,12,0,0,Math.PI*2);g.ellipse(184,386-pumpR,6,12,0,0,Math.PI*2);g.fill();
  // tongkat BENGKOK di tangan kanan
  g.lineCap="round";g.strokeStyle="#4a3524";g.lineWidth=9;g.beginPath();g.moveTo(196,290);g.quadraticCurveTo(210,380,198,490);g.stroke();
  g.strokeStyle="#4a3524";g.lineWidth=8;g.beginPath();g.arc(190,286,10,Math.PI*0.5,Math.PI*1.5);g.stroke();
  // topi KERUCUT gelap
  if(!bald) path(()=>{g.moveTo(128,26);g.lineTo(170,100);g.quadraticCurveTo(128,108,86,100);g.closePath();},"#2a2430");
  // kepala OVAL SANGAT PANJANG + dagu runcing
  path(()=>{g.ellipse(cx,154,34,54,0,0,Math.PI*2);},d.head);
  path(()=>{g.moveTo(112,196);g.lineTo(144,196);g.lineTo(128,224);g.closePath();},d.head);
  if(bald) hairBand(128,154,34,54);
  drawFace(128,154,34,54);
 }
 // UJI SILUET (§5.3): ratakan semua jadi hitam pekat, alpha dipertahankan
 if(mode==="silhouette"){
  g.globalCompositeOperation="source-in";
  g.fillStyle="#14141a";g.fillRect(0,0,256,512);
  g.globalCompositeOperation="source-over";
 }
};
export class Cast {
 root=new THREE.Group();
 // Pool 4 mesh per nama (pelajaran Kentongan v1: SATU mesh per nama membuat
 // show("Warga") 4x hanya menampilkan warga TERAKHIR).
 sprites=new Map<ActorName,THREE.Mesh[]>();
 private pool=new Pool();
 private mode:SpriteMode;
 private mats=new Map<THREE.Mesh,THREE.MeshBasicMaterial>();
 private pending=new Map<THREE.Mesh,Req>();
 private next=new Map<ActorName,number>();
 constructor(parent:THREE.Object3D,opts?:{mode?:SpriteMode}){
  this.mode=opts?.mode??"normal";
  // UJI GANTI WARNA (§5.3): tukar PALET PENUH Jali <-> Pak Karto.
  // Kalau bentuknya bekerja, keduanya tetap bisa dibedakan.
  const useDefs = this.mode==="swap" ? defs.map(d=>{
   if(d.name==="Jali"||d.name==="JaliSehat"){const k=defs.find(x=>x.name==="Pak Karto")!;return {...d,shirt:k.shirt,head:k.head,hair:k.hair};}
   if(d.name==="Pak Karto"){const j=defs.find(x=>x.name==="Jali")!;return {...d,shirt:j.shirt,head:j.head,hair:j.hair};}
   return d;
  }) : defs;
  parent.add(this.root);
  for(const d of useDefs){
   const arr:THREE.Mesh[]=[];
   for(let k=0;k<4;k++){
    const geo=new THREE.PlaneGeometry(d.w,d.h);
    // Geometri digeser ke atas setengah tinggi, jadi kaki tepat di y=0
    // (cara bridge; v1 Kentongan tokoh tenggelam setengah ke tanah).
    geo.translate(0,d.h/2,0);
    const mat=new THREE.MeshBasicMaterial({map:blank,alphaTest:0.5,side:THREE.DoubleSide});
    const mesh=new THREE.Mesh(geo,mat);mesh.visible=false;mesh.renderOrder=5;mesh.layers.set(NOINK);this.root.add(mesh);arr.push(mesh);
    this.mats.set(mesh,mat);
   }
   this.sprites.set(d.name,arr);this.next.set(d.name,0);
  }
  this.defsByName=new Map(useDefs.map(d=>[d.name,d]));
 }
 private defsByName:Map<ActorName,SpriteDef>;
 /** Kunci pool: nama|ekspresi|mode|fase jalan(16 langkah)|kedip(3)|mulut(5).
  *  Fase dikuantisasi supaya kanvas yang digambar ulang sedikit. */
 private keyFor(name:ActorName,expr:Expr,anim:Anim){
  const w=!!anim.walking;
  const ph=w?Math.round(((anim.phase??0)%1)*15):0;
  const bl=Math.round((anim.sleeping?1:(anim.blink??0))*2);
  const mo=Math.round((anim.mouth??0)*4);
  return `${name}|${expr}|${this.mode}|${w?`w${ph}`:"s"}|b${bl}|m${mo}`;
 }
 show(name:ActorName,x:number,z:number,scale=1,rotation=0,y=0,expr:Expr="smile",anim:Anim={}){
  const arr=this.sprites.get(name)!;const i=this.next.get(name)!;
  const m=arr[i%arr.length];this.next.set(name,i+1);
  m.visible=true;m.position.set(x,y,z);m.scale.setScalar(scale);m.rotation.y=rotation;
  const d=this.defsByName.get(name)!;
  const key=this.keyFor(name,expr,anim);
  const req=this.pool.req(key,(g)=>drawSprite(g,d,expr,this.mode,anim));
  this.pending.set(m,req);
 }
 /** Gambar ulang kunci yang berubah + pasang tekstur ke mesh. Dipanggil
  *  otomatis di faceCamera() (yang selalu jalan tiap frame sesudah semua
  *  show()), jadi Lineup/world tidak perlu memanggilnya sendiri. */
 flush(){
  this.pool.flush();
  for(const [m,req] of this.pending){
   const mat=this.mats.get(m)!;
   if(req.tex&&mat.map!==req.tex){mat.map=req.tex;mat.needsUpdate=true;}
  }
  this.pending.clear();
 }
 hideAll(){for(const arr of this.sprites.values())for(const m of arr)m.visible=false;for(const k of this.next.keys())this.next.set(k,0);this.pending.clear();}
 // BILLBOARD YAW-ONLY (perbaikan 27 Nov): JANGAN salin quaternion kamera
 // lalu "perbaiki" dgn rotation.z=0 — itu jebakan gimbal lock. Saat kamera
 // menatap sepanjang sumbu ±x (yaw ≈ ±90°, mis. semua shot kamar yang
 // kameranya di x=-5..-9,5 menatap ke -x), dekomposisi Euler XYZ dari
 // quaternion kamera menghasilkan x≈±90° dan z=0 TIDAK menghapus roll-nya:
 // tokoh jadi rebah/miring 40-90° di layar (s05a/s06a/s09a/s12a/s13a).
 // Billboard yang benar untuk tokoh di tanah: putar HANYA sekitar sumbu Y
 // (yaw = arah kamera dari posisi tokoh), x=z=0 selalu — tokoh selalu tegak.
 faceCamera(camera:THREE.Camera){
  this.flush();
  for(const arr of this.sprites.values())for(const m of arr)if(m.visible){const dx=camera.position.x-m.position.x,dz=camera.position.z-m.position.z;m.rotation.set(0,Math.atan2(dx,dz),0);}
 }
 /** Gestur prosedural pada mesh pertama yang terlihat dgn nama itu (tokoh
  *  tunggal). Dipanggil SETELAH faceCamera, jadi rotasi terbaca di ruang
  *  layar: rz = condong kiri/kanan, rx = angguk. */
 gesture(name:ActorName,rz=0,rx=0,dx=0,dy=0){const m=this.sprites.get(name)!.find((mm)=>mm.visible);if(!m)return;m.rotateZ(rz);m.rotateX(rx);m.position.x+=dx;m.position.y+=dy;}
 /** Gestur per mesh terlihat (mis. warga beramai-ramai, fase beda per indeks). */
 gestureEach(name:ActorName,fn:(m:THREE.Mesh,i:number)=>void){let i=0;for(const m of this.sprites.get(name)!)if(m.visible)fn(m,i++);}
 dispose(){this.pool.dispose();for(const m of this.mats.values())m.dispose();}
}
