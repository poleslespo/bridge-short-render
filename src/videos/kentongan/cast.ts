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
/** BENTUK BADAN per tokoh — v6 RESET TOTAL (27 Nov 2026, dari riset channel
 *  animasi `research_notes/animation-character-design-channels-20261127-0010/
 *  report.md`). v5 DITOLAK user ("bentuknya bisa lain ga — jangan cuman beda
 *  ukuran kayak gitu"): v5 memang masih satu template yang di-scale.
 *  v6 dibangun dari SISTEM KONSTRUKSI laporan, bukan dari v5:
 *   tiap tokoh = 1 sel BERBEDA di matriks bentuk (kepala x torso) + 1 angka
 *   head-count BERBEDA + 1 landmark siluet + 1 postur BERBEDA.
 *   Tidak ada dua tokoh yang berbagi ketiganya.
 *  Matriks (kepala x torso) + head-count (target, diukur dari kanvas:
 *   head-count = (478 - topY) / (2*headRy)):
 *   Dani:      oval vertikal x trapesium terbalik, 4,05 kepala, spike segitiga
 *   Bolang:    lingkaran besar x pir kecil,     2,50 kepala, caping mini
 *   Jali:      squircle kecil x kapsul sempit,  3,69 kepala, ikat kepala+ember
 *   Nenek:     oval vertikal x lonceng/daster,  2,65 kepala, kerudung+tongkat
 *   Karto:     squircle lebar x tong/barel,     3,26 kepala, peci+kumis
 *   Warga:     segitiga terbalik x persegi,     3,41 kepala, caping kerucut
 *   Warga2:    oval horizontal x telur,         3,00 kepala, sanggul+celemek
 *   Warga3:    lingkaran (hijab oval) x A-line, 3,65 kepala, hijab+tas selempang
 *   Warga4:    oval vertikal panjang x kolom,   4,28 kepala, topi kerucut+tongkat
 *  Kanvas 256x512, pusat x=128, tanah y=478. w/h tiap tokoh SAMA dengan v4/v5
 *  (supaya skala dunia + check-framing 77/77 tidak berubah) — head-count
 *  yang beda dicapai lewat UKURAN KEPALA di dalam kanvas, bukan lewat w/h.
 *  Warna per tokoh DIPERTAHANKAN dari v5 (warna = lapis kedua, bukan pembeda
 *  utama — bentuk yang membedakan). */
type HeadShape = "round" | "ovalV" | "ovalH" | "squircle" | "triInv";
type BodyShape = "trapInv" | "pear" | "capsule" | "bell" | "barrel" | "rect" | "egg" | "aline" | "column";
type SpriteDef = {
 name:ActorName; w:number; h:number;
 shirt:string; head:string; hair:string; kind:string;
 headCx:number; headCy:number; headRx:number; headRy:number; headShape:HeadShape;
 shape:BodyShape;
 shoulderY:number; shoulderW:number; // untuk lengan
 eyeS?:number; // pengali ukuran mata (teknik #7 laporan: mata besar vs titik)
 eyeGap?:number; // pengali jarak mata
 handR?:{x:number; y:number}; // posisi tangan kanan (ember Jali)
};
const defs:SpriteDef[]=[
 // Dani: oval vertikal panjang + trapesium terbalik (bahu lebar, pinggang sempit), 4,05 kepala
 {name:"Dani",w:0.64,h:1.95,shirt:"#344d65",head:"#d79b72",hair:"#252329",kind:"spike",
  headCx:128,headCy:118,headRx:40,headRy:55,headShape:"ovalV",shape:"trapInv",shoulderY:186,shoulderW:72,eyeS:1,eyeGap:1},
 // Bolang: lingkaran BESAR (lebih lebar dari torso) + pir kecil, 2,50 kepala
 {name:"Bolang",w:0.92,h:1.48,shirt:"#e6a83e",head:"#c98762",hair:"#34251e",kind:"capingMini",
  headCx:128,headCy:142,headRx:88,headRy:90,headShape:"round",shape:"pear",shoulderY:236,shoulderW:44,eyeS:1.35,eyeGap:1.15},
 // Jali: squircle kecil + kapsul vertikal panjang sempit, 3,69 kepala
 {name:"Jali",w:0.58,h:1.72,shirt:"#527d58",head:"#b87958",hair:"#241f1c",kind:"headband",
  headCx:128,headCy:108,headRx:45,headRy:57,headShape:"squircle",shape:"capsule",shoulderY:192,shoulderW:56,eyeS:1,eyeGap:1,handR:{x:190,y:352}},
 // Nenek Sari: oval vertikal + daster LONCENG melebar ke tanah, 2,65 kepala.
 // BUNGKUK = geometri BENTUK BADAN (kepala rendah di depan + daster
 // lonceng + tongkat), BUKAN lean/rotasi (pelajaran ep.9) dan BUKAN
 // tonjolan di belakang kepala. Kaki tertutup daster.
 // v6-fix2 (27 Nov 08.11) sempat coba punuk asimetris di belakang kepala —
 // GAGAL: user 08.20 "kayak tutup jaket bukan kayak bongkok".
 // v6-fix3 (27 Nov 08.22, user: "bumbu itu dari bentuk tubuhnya bukan
 // tonjolan", "visualnya dari depan pun kayak normal-normal aja"): punuk
 // DIHAPUS TOTAL. Dari depan Nenek normal-normal saja — bungkuk kebaca
 // dari kepala rendah (cy 165) + daster lonceng + tongkat kayu.
 {name:"Nenek Sari",w:0.72,h:1.42,shirt:"#8d5b76",head:"#c99578",hair:"#eee6d7",kind:"scarf",
  headCx:128,headCy:165,headRx:52,headRy:77,headShape:"ovalV",shape:"bell",shoulderY:220,shoulderW:60,eyeS:0.9,eyeGap:0.95},
 // Pak Karto: squircle LEBAR rahang kotak + tong/barel bahu sangat lebar, 3,26 kepala
 {name:"Pak Karto",w:0.76,h:1.68,shirt:"#806b4c",head:"#c28b69",hair:"#28242a",kind:"peci",
  headCx:128,headCy:115,headRx:76,headRy:69,headShape:"squircle",shape:"barrel",shoulderY:198,shoulderW:84,eyeS:0.85,eyeGap:0.9},
 // Warga: kepala SEGITIGA TERBALIK (dahi lebar, dagu kecil) + persegi lurus, 3,41 kepala
 {name:"Warga",w:0.58,h:1.55,shirt:"#647b8a",head:"#c88f6c",hair:"#30251f",kind:"caping",
  headCx:128,headCy:120,headRx:52,headRy:67,headShape:"triInv",shape:"rect",shoulderY:192,shoulderW:54,eyeS:0.7,eyeGap:0.9},
 // Warga2: oval HORIZONTAL lebar + torso TELUR, 3,00 kepala, sanggul besar + celemek
 {name:"Warga2",w:0.66,h:1.68,shirt:"#7a4a3a",head:"#b87958",hair:"#1f1a16",kind:"sanggul",
  headCx:128,headCy:140,headRx:88,headRy:76,headShape:"ovalH",shape:"egg",shoulderY:214,shoulderW:70,eyeS:1.05,eyeGap:1},
 // Warga3: lingkaran dalam HIJAB OVAL BESAR + gaun A-line panjang, 3,65 kepala, tas selempang
 {name:"Warga3",w:0.54,h:1.45,shirt:"#4a6b52",head:"#d9a06f",hair:"#7a5a8a",kind:"hijab",
  headCx:128,headCy:138,headRx:48,headRy:60,headShape:"round",shape:"aline",shoulderY:214,shoulderW:52,eyeS:1,eyeGap:1},
 // Warga4: oval vertikal SANGAT PANJANG + jubah KOLOM (kaki tidak terlihat), 4,28 kepala
 {name:"Warga4",w:0.70,h:1.60,shirt:"#8a7a3a",head:"#a87a5e",hair:"#2a2426",kind:"cone",
  headCx:128,headCy:111,headRx:42,headRy:53,headShape:"ovalV",shape:"column",shoulderY:172,shoulderW:56,eyeS:0.55,eyeGap:0.9},
];
/** Opsi debug KHUSUS untuk lima uji §5.3 laporan — default mati, produksi
 *  tidak terpengaruh: silhouette = isi hitam pekat (uji siluet),
 *  bald = hapus semua rambut/tutup kepala (uji botak),
 *  swapShirts = tukar warna baju dua tokoh (uji ganti warna). */
export type CastDebug = {silhouette?:boolean; bald?:boolean; swapShirts?:[ActorName,ActorName]};
const makeSprite=(d:SpriteDef,expr:Expr="smile",debug:CastDebug={})=>{
 const c=document.createElement("canvas");c.width=256;c.height=512;
 const g=c.getContext("2d")!;g.lineWidth=8;g.lineJoin="round";g.strokeStyle="#252329";
 const cx=128;
 const path=(fn:()=>void,fill:string)=>{g.beginPath();fn();g.fillStyle=fill;g.fill();g.stroke();};
 // satu kaki: trapesium (x0 = sisi kiri atas, top/bot = y atas/bawah, w = lebar)
 const leg=(x0:number,top:number,bot:number,w:number)=>{path(()=>{g.moveTo(x0,top);g.lineTo(x0+w,top);g.lineTo(x0+w+4,bot);g.lineTo(x0-4,bot);g.closePath();},"#34343b");};
 // satu lengan miring ke bawah (side -1 kiri, +1 kanan); shY/shW = bahu
 const arm=(side:-1|1,shY:number,shW:number,out:number,len:number,wd:number,color?:string)=>{
  const s=side;
  path(()=>{g.moveTo(cx+s*(shW-4),shY+12);g.lineTo(cx+s*(shW+out),shY+42);g.lineTo(cx+s*(shW+out+4),shY+len);g.lineTo(cx+s*(shW+out-wd),shY+len+4);g.lineTo(cx+s*(shW-22),shY+72);g.closePath();},color??d.shirt);
 };
 // leher (persegi kulit, digambar sebelum torso supaya torso menutupi bawahnya)
 const neck=(top:number,bot:number,half:number)=>{g.fillStyle=d.head;g.fillRect(cx-half,top,half*2,bot-top);};
 // --- BADAN per bentuk geometri (v6: satu sel matriks per tokoh) ---
 const torsoTrapInv=()=>{ // Dani: bahu LEBAR meruncing ke pinggang sempit (V tegas)
  neck(163,190,12);
  path(()=>{g.moveTo(cx-72,186);g.quadraticCurveTo(cx,172,cx+72,186);g.lineTo(cx+34,330);g.lineTo(cx+42,372);g.quadraticCurveTo(cx,388,cx-42,372);g.lineTo(cx-34,330);g.closePath();},d.shirt);
  leg(cx-34,368,478,26);leg(cx+8,368,478,26);
  arm(-1,186,72,14,155,20);arm(1,186,72,14,155,20);
 };
 const torsoPear=()=>{ // Bolang: PIR kecil — bahu sempit, melebar ke bawah
  neck(222,242,14);
  path(()=>{g.moveTo(cx-44,236);g.quadraticCurveTo(cx,222,cx+44,236);g.lineTo(cx+72,320);g.quadraticCurveTo(cx+78,352,cx+60,360);g.lineTo(cx-60,360);g.quadraticCurveTo(cx-78,352,cx-72,320);g.closePath();},d.shirt);
  leg(cx-54,356,478,44);leg(cx+10,356,478,44);
  arm(-1,236,44,16,100,26);arm(1,236,44,16,100,26);
  // tangan BESAR (laporan: tangan anak hampir 1/4 kepala)
  path(()=>{g.arc(cx-49,348,15,0,Math.PI*2);},d.head);
  path(()=>{g.arc(cx+49,348,15,0,Math.PI*2);},d.head);
 };
 const torsoCapsule=()=>{ // Jali: KAPSUL vertikal panjang sempit (ujung membulat)
  neck(150,192,12); // v6-fix: leher lebih lebar + naik ke dalam kepala (dulu tipis, kepala kelihatan melayang)
  path(()=>{g.moveTo(cx-56,208);g.quadraticCurveTo(cx-56,186,cx-34,186);g.lineTo(cx+34,186);g.quadraticCurveTo(cx+56,186,cx+56,208);g.lineTo(cx+56,358);g.quadraticCurveTo(cx+56,380,cx+34,380);g.lineTo(cx-34,380);g.quadraticCurveTo(cx-56,380,cx-56,358);g.closePath();},d.shirt);
  leg(cx-36,376,478,20);leg(cx+16,376,478,20);
  arm(-1,192,56,8,165,14);arm(1,192,56,8,165,14);
  // ember di tangan kanan (di luar torso sempit) — v6-fix: lebih BESAR + lebih
  // gelap (dulu kecil pucat, nyaris tidak kebaca di lineup)
  if(d.handR){const handX=d.handR.x,handY=d.handR.y;g.strokeStyle="#b6a27c";g.lineWidth=9;g.beginPath();g.arc(handX,handY,36,Math.PI,Math.PI*2);g.stroke();g.fillStyle="#6e7f7a";g.fillRect(handX-28,handY,56,60);g.strokeStyle="#252329";g.lineWidth=8;}
 };
 const torsoBell=()=>{ // Nenek: daster LONCENG ke tanah — TANPA punuk (v6-fix3:
  // tonjolan di belakang kepala DIHAPUS TOTAL; bungkuk hanya dari bentuk
  // badan: kepala rendah + daster lonceng + tongkat)
  path(()=>{g.moveTo(cx-60,215);g.quadraticCurveTo(cx,200,cx+60,215);g.lineTo(cx+96,478);g.lineTo(cx-96,478);g.closePath();},d.shirt); // daster
  arm(-1,220,60,10,110,20);arm(1,220,60,10,110,20);
  // tongkat kayu di kanan badan (tangan memegangnya)
  g.strokeStyle="#5a3a20";g.lineWidth=11;g.lineCap="round";
  g.beginPath();g.moveTo(cx+72,478);g.lineTo(cx+72,310);g.quadraticCurveTo(cx+72,296,cx+58,298);g.stroke();
  g.strokeStyle="#252329";g.lineWidth=8;g.lineCap="butt";
  path(()=>{g.arc(cx+72,332,11,0,Math.PI*2);},d.head); // tangan di tongkat
 };
 const torsoBarrel=()=>{ // Karto: TONG/barel — bahu sangat lebar, perut membulat
  neck(178,198,14);
  path(()=>{g.moveTo(cx-84,200);g.quadraticCurveTo(cx,186,cx+84,200);g.quadraticCurveTo(cx+112,250,cx+110,310);g.quadraticCurveTo(cx+108,352,cx+92,372);g.lineTo(cx-92,372);g.quadraticCurveTo(cx-108,352,cx-110,310);g.quadraticCurveTo(cx-112,250,cx-84,200);g.closePath();},d.shirt);
  leg(cx-50,368,478,42);leg(cx+8,368,478,42);
  arm(-1,198,84,16,130,26);arm(1,198,84,16,130,26);
  // saku kotak di dada kiri (seragam profesi ala Konon Loh)
  g.fillStyle="#6b5a3e";g.fillRect(cx-78,240,26,30);g.strokeStyle="#252329";g.lineWidth=4;g.strokeRect(cx-78,240,26,30);g.lineWidth=8;
 };
 const torsoRect=()=>{ // Warga: PERSEGI lurus — sisi vertikal, bahu siku
  neck(180,200,11);
  path(()=>{g.moveTo(cx-54,192);g.lineTo(cx+54,192);g.lineTo(cx+54,368);g.lineTo(cx-54,368);g.closePath();},d.shirt);
  leg(cx-36,364,478,26);leg(cx+10,364,478,26);
  // sepatu bot persegi (ujung kotak, bukan oval — laporan §5.2 #6)
  g.fillStyle="#34343b";g.fillRect(cx-40,458,36,20);g.fillRect(cx+4,458,36,20);
  arm(-1,192,54,12,150,18);arm(1,192,54,12,150,18);
  path(()=>{g.arc(cx-58,348,12,0,Math.PI*2);},d.head);
  path(()=>{g.arc(cx+58,348,12,0,Math.PI*2);},d.head);
 };
 const torsoEgg=()=>{ // Warga2: TELUR horizontal — lebar, bulat; celemek trapesium di depan
  neck(198,216,12);
  path(()=>{g.moveTo(cx-70,212);g.quadraticCurveTo(cx,198,cx+70,212);g.quadraticCurveTo(cx+118,280,cx+116,330);g.quadraticCurveTo(cx+112,370,cx+96,382);g.lineTo(cx-96,382);g.quadraticCurveTo(cx-112,370,cx-116,330);g.quadraticCurveTo(cx-118,280,cx-70,212);g.closePath();},d.shirt);
  // celemek trapesium (mengubah outline depan) + tali leher
  path(()=>{g.moveTo(cx-58,240);g.lineTo(cx+58,240);g.lineTo(cx+74,378);g.lineTo(cx-74,378);g.closePath();},"#d8c9a8");
  g.strokeStyle="#d8c9a8";g.lineWidth=6;g.beginPath();g.moveTo(cx-52,240);g.lineTo(cx-30,212);g.moveTo(cx+52,240);g.lineTo(cx+30,212);g.stroke();g.strokeStyle="#252329";g.lineWidth=8;
  leg(cx-32,378,478,24);leg(cx+8,378,478,24);
  // sandal oval datar
  path(()=>{g.ellipse(cx-20,472,16,6,0,0,Math.PI*2);},"#34343b");
  path(()=>{g.ellipse(cx+20,472,16,6,0,0,Math.PI*2);},"#34343b");
  arm(-1,214,70,12,140,20);
  // lengan kanan TERTEKUK di pinggang (siku keluar = pemecah siluet)
  // v6-fix: siku HARUS keluar dari outline torso (dulu di dalam, tidak kebaca)
  path(()=>{g.moveTo(cx+62,222);g.lineTo(cx+122,296);g.lineTo(cx+66,352);g.lineTo(cx+48,344);g.lineTo(cx+70,300);g.lineTo(cx+50,236);g.closePath();},d.shirt);
  path(()=>{g.arc(cx+60,350,12,0,Math.PI*2);},d.head); // tangan di pinggang
 };
 const torsoALine=()=>{ // Warga3: gaun A-LINE panjang sampai mata kaki (kaki tertutup)
  path(()=>{g.moveTo(cx-52,214);g.quadraticCurveTo(cx,202,cx+52,214);g.lineTo(cx+88,478);g.lineTo(cx-88,478);g.closePath();},d.shirt);
  // ujung sepatu saja yang kelihatan di bawah gaun
  path(()=>{g.ellipse(cx-28,470,12,6,0,0,Math.PI*2);},"#34343b");
  path(()=>{g.ellipse(cx+28,470,12,6,0,0,Math.PI*2);},"#34343b");
  arm(-1,214,52,10,150,16,d.hair);arm(1,214,52,10,150,16,d.hair); // lengan sewarna hijab
  // tas selempang (asimetri): tali diagonal + tas persegi di pinggul kiri
  g.strokeStyle="#5a3a2a";g.lineWidth=7;g.beginPath();g.moveTo(cx+44,222);g.lineTo(cx-40,352);g.stroke();g.strokeStyle="#252329";g.lineWidth=8;
  path(()=>{g.moveTo(cx-56,340);g.lineTo(cx-22,340);g.lineTo(cx-22,380);g.lineTo(cx-56,380);g.closePath();},"#6a4a2a");
 };
 const torsoColumn=()=>{ // Warga4: KOLOM jubah lurus dari bahu ke tanah (kaki tidak terlihat)
  path(()=>{g.moveTo(cx-56,170);g.lineTo(cx+56,170);g.lineTo(cx+56,478);g.lineTo(cx-56,478);g.closePath();},d.shirt);
  arm(-1,172,56,6,190,14);arm(1,172,56,6,190,14); // lengan panjang menjuntai
  path(()=>{g.arc(cx-62,366,8,0,Math.PI*2);},d.head);
  path(()=>{g.arc(cx+62,366,8,0,Math.PI*2);},d.head);
  // tongkat BENGKOK di kanan badan
  g.strokeStyle="#5a3a20";g.lineWidth=10;g.lineCap="round";
  g.beginPath();g.moveTo(cx+72,478);g.lineTo(cx+72,320);g.quadraticCurveTo(cx+72,302,cx+56,304);g.stroke();
  g.strokeStyle="#252329";g.lineWidth=8;g.lineCap="butt";
 };
 switch(d.shape){
  case "trapInv":torsoTrapInv();break;
  case "pear":torsoPear();break;
  case "capsule":torsoCapsule();break;
  case "bell":torsoBell();break;
  case "barrel":torsoBarrel();break;
  case "rect":torsoRect();break;
  case "egg":torsoEgg();break;
  case "aline":torsoALine();break;
  case "column":torsoColumn();break;
 }
 // --- KEPALA ---
 const hx=d.headCx,hy=d.headCy,rx=d.headRx,ry=d.headRy;
 const bald=!!debug.bald;
 // pra-kepala: sanggul (di belakang kepala) / hijab oval (membingkai wajah)
 // v6-fix: sanggul Warga2 DIPINDAH ke samping atas (dulu di tengah atas,
 // tertutup kepala + rambut, tidak kebaca sama sekali)
 if(!bald&&d.kind==="sanggul"){path(()=>{g.arc(hx+62,hy-ry-10,30,0,Math.PI*2);},d.hair);}
 if(!bald&&d.kind==="hijab"){path(()=>{g.ellipse(hx,hy-6,78,92,0,0,Math.PI*2);},d.hair);}
 // bentuk kepala (v6: 5 bentuk — bulat / oval vertikal / oval horizontal /
 // squircle / segitiga terbalik; oval & bulat sama-sama elips, beda rasio)
 if(d.headShape==="squircle"){
  const r=14;
  path(()=>{g.moveTo(hx-rx+r,hy-ry);g.lineTo(hx+rx-r,hy-ry);g.quadraticCurveTo(hx+rx,hy-ry,hx+rx,hy-ry+r);g.lineTo(hx+rx,hy+ry-r);g.quadraticCurveTo(hx+rx,hy+ry,hx+rx-r,hy+ry);g.lineTo(hx-rx+r,hy+ry);g.quadraticCurveTo(hx-rx,hy+ry,hx-rx,hy+ry-r);g.lineTo(hx-rx,hy-ry+r);g.quadraticCurveTo(hx-rx,hy-ry,hx-rx+r,hy-ry);g.closePath();},d.head);
 } else if(d.headShape==="triInv"){ // dahi lebar, dagu kecil runcing
  path(()=>{g.moveTo(hx-rx,hy-ry*0.55);g.quadraticCurveTo(hx,hy-ry-8,hx+rx,hy-ry*0.55);g.quadraticCurveTo(hx+rx*0.55,hy+ry*0.75,hx,hy+ry);g.quadraticCurveTo(hx-rx*0.55,hy+ry*0.75,hx-rx,hy-ry*0.55);g.closePath();},d.head);
 } else {
  path(()=>{g.ellipse(hx,hy,rx,ry,0,0,Math.PI*2);},d.head);
 }
 // rambut/tutup kepala — relatif terhadap kepala (bukan koordinat tetap)
 const hairlineY=hy-ry*0.42;
 const plainHair=()=>{path(()=>{g.moveTo(hx-rx-2,hairlineY+8);g.quadraticCurveTo(hx-rx-6,hy-ry-14,hx,hy-ry-16);g.quadraticCurveTo(hx+rx+6,hy-ry-14,hx+rx+2,hairlineY+8);g.quadraticCurveTo(hx+rx*0.5,hairlineY-6,hx,hairlineY-8);g.quadraticCurveTo(hx-rx*0.5,hairlineY-6,hx-rx-2,hairlineY+8);g.closePath();},d.hair);};
 if(!bald){
  if(d.kind==="spike"){ // Dani: rambut SPIKE segitiga (3 runcing ke atas)
   plainHair();
   path(()=>{g.moveTo(hx-42,hairlineY);g.lineTo(hx-30,hy-ry-28);g.lineTo(hx-16,hairlineY);g.closePath();},d.hair);
   path(()=>{g.moveTo(hx-14,hairlineY);g.lineTo(hx,hy-ry-36);g.lineTo(hx+14,hairlineY);g.closePath();},d.hair);
   path(()=>{g.moveTo(hx+16,hairlineY);g.lineTo(hx+30,hy-ry-24);g.lineTo(hx+42,hairlineY);g.closePath();},d.hair);
  }
  else if(d.kind==="capingMini"){ // Bolang: caping mini (kerucut kecil di atas kepala)
   plainHair();
   path(()=>{g.moveTo(hx-52,hy-ry+6);g.lineTo(hx,hy-ry-24);g.lineTo(hx+52,hy-ry+6);g.closePath();},"#b08d5e");
  }
  else if(d.kind==="headband"){ // Jali: ikat kepala merah + ekor menjuntai (asimetri)
   plainHair();
   g.fillStyle="#c94f3d";g.fillRect(hx-rx,hy-ry*0.55,2*rx,13);
   g.fillRect(hx+rx-10,hy-ry*0.55+13,10,34);
   path(()=>{g.arc(hx+rx,hy-ry*0.55+6,6,0,Math.PI*2);},"#c94f3d");
  }
  else if(d.kind==="peci"){ // Karto: peci DATAR lebar (melebihi kepala sedikit)
   path(()=>{g.moveTo(hx-rx-8,hy-ry*0.1);g.lineTo(hx-rx+2,hy-ry-14);g.quadraticCurveTo(hx,hy-ry-18,hx+rx-2,hy-ry-14);g.lineTo(hx+rx+8,hy-ry*0.1);g.closePath();},"#28242a");
  }
  else if(d.kind==="caping"){ // Warga: caping KERUCUT BESAR (lebar 1,8x kepala)
   path(()=>{g.moveTo(hx-95,hy-ry*0.35);g.lineTo(hx,hy-ry-32);g.lineTo(hx+95,hy-ry*0.35);g.closePath();},"#b08d5e");
   g.strokeStyle="#8a6a3f";g.lineWidth=3;g.beginPath();g.moveTo(hx-95,hy-ry*0.35);g.lineTo(hx+95,hy-ry*0.35);g.stroke();g.strokeStyle="#252329";g.lineWidth=8;
  }
  else if(d.kind==="sanggul"){plainHair();} // sanggul sudah digambar di pra-kepala
  else if(d.kind==="scarf"){ // Nenek: kerudung kubah menutupi kepala (v5: ekor segitiga di dada DIHAPUS)
   // v6-fix: kubah MERAPAT ke kepala (dulu terlalu besar/bulat, kebaca topi renang)
   path(()=>{g.moveTo(hx-rx-10,hy+ry*0.1);g.quadraticCurveTo(hx-rx-12,hy-ry-16,hx,hy-ry-18);g.quadraticCurveTo(hx+rx+12,hy-ry-16,hx+rx+10,hy+ry*0.1);g.lineTo(hx+rx*0.45,hy-ry*0.2);g.quadraticCurveTo(hx,hy-ry*0.5,hx-rx*0.45,hy-ry*0.2);g.closePath();},"#eee7db");
  }
  else if(d.kind==="cone"){ // Warga4: topi KERUCUT gelap tinggi
   path(()=>{g.moveTo(hx-46,hy-ry+4);g.lineTo(hx,hy-ry-34);g.lineTo(hx+46,hy-ry+4);g.closePath();},"#2a2426");
  }
  else {plainHair();}
 }
 // wajah — relatif terhadap kepala (v3-fix: mata dirapatkan, hidung garis
 // kecil, alis untuk semua ekspresi; dipertahankan di v4/v5/v6)
 // v6: eyeS/eyeGap per tokoh (teknik #7 laporan — mata besar vs titik)
 const eyeS=d.eyeS??1, eyeGap=d.eyeGap??1;
 const ex=rx*0.36*eyeGap,eyeY=hy,browY=hy-ry*0.38,mouthY=hy+ry*0.55;
 const nose=()=>{g.strokeStyle="#8a5f52";g.lineWidth=3;g.beginPath();g.moveTo(hx,hy+ry*0.08);g.lineTo(hx-2,hy+ry*0.32);g.lineTo(hx+3,hy+ry*0.32);g.stroke();};
 const eyeDot=(x:number,y:number,r:number)=>{g.fillStyle="#252329";g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fill();};
 const eyeSlit=(x:number,y:number)=>{g.strokeStyle="#252329";g.lineWidth=5;g.beginPath();g.moveTo(x-8*eyeS,y);g.lineTo(x+8*eyeS,y);g.stroke();};
 if(expr==="shock"){ // mata melotot + mulut "o" terbuka (Dani kaget)
  g.strokeStyle="#252329";g.lineWidth=4;g.beginPath();g.moveTo(hx-ex-10,browY+4);g.lineTo(hx-ex+8,browY);g.moveTo(hx+ex-8,browY);g.lineTo(hx+ex+10,browY+4);g.stroke();
  g.fillStyle="#fff";g.beginPath();g.arc(hx-ex,eyeY,8*eyeS,0,Math.PI*2);g.arc(hx+ex,eyeY,8*eyeS,0,Math.PI*2);g.fill();
  g.fillStyle="#252329";g.beginPath();g.arc(hx-ex,eyeY,4*eyeS,0,Math.PI*2);g.arc(hx+ex,eyeY,4*eyeS,0,Math.PI*2);g.fill();
  nose();
  g.fillStyle="#7a2e2e";g.beginPath();g.ellipse(hx,mouthY,6,8,0,0,Math.PI*2);g.fill();
 } else if(expr==="worry"){ // alis naik ke tengah + mulut cemberut (Nenek khawatir)
  g.strokeStyle="#252329";g.lineWidth=4;g.beginPath();g.moveTo(hx-ex-12,browY+6);g.lineTo(hx-ex+6,browY-2);g.moveTo(hx+ex-6,browY-2);g.lineTo(hx+ex+12,browY+6);g.stroke();
  eyeDot(hx-ex,eyeY,5*eyeS);eyeDot(hx+ex,eyeY,5*eyeS);
  nose();
  g.strokeStyle="#754b42";g.lineWidth=4;g.beginPath();g.arc(hx,mouthY+8,10,Math.PI+0.25,Math.PI*2-0.25);g.stroke();
 } else if(expr==="serious"){ // mata garis datar + mulut lurus (Pak Karto tegas)
  g.strokeStyle="#252329";g.lineWidth=4;g.beginPath();g.moveTo(hx-ex-10,browY);g.lineTo(hx-ex+10,browY);g.moveTo(hx+ex-10,browY);g.moveTo(hx+ex+10,browY);g.stroke();
  g.strokeStyle="#252329";g.lineWidth=6;g.beginPath();g.moveTo(hx-ex-12,eyeY);g.lineTo(hx-ex+12,eyeY);g.moveTo(hx+ex-12,eyeY);g.lineTo(hx+ex+12,eyeY);g.stroke();
  nose();
  g.strokeStyle="#754b42";g.lineWidth=4;g.beginPath();g.moveTo(hx-14,mouthY);g.lineTo(hx+14,mouthY);g.stroke();
 } else if(expr==="puzzled"){ // satu alis naik + mulut "o" kecil (Jali heran)
  g.strokeStyle="#252329";g.lineWidth=4;g.beginPath();g.moveTo(hx+ex-10,browY+2);g.lineTo(hx+ex+10,browY-6);g.stroke();
  eyeDot(hx-ex,eyeY,5*eyeS);eyeDot(hx+ex,eyeY,5*eyeS);
  nose();
  g.strokeStyle="#754b42";g.lineWidth=4;g.beginPath();g.arc(hx,mouthY,5,0,Math.PI*2);g.stroke();
 } else { // smile (default): mata titik/celah + alis + senyum
  g.strokeStyle="#252329";g.lineWidth=4;g.beginPath();g.moveTo(hx-ex-10,browY+2);g.lineTo(hx-ex+8,browY-2);g.moveTo(hx+ex-8,browY-2);g.lineTo(hx+ex+10,browY+2);g.stroke();
  if(eyeS<0.7){eyeSlit(hx-ex,eyeY);eyeSlit(hx+ex,eyeY);} // Warga4: mata celah tipis
  else {eyeDot(hx-ex,eyeY,5*eyeS);eyeDot(hx+ex,eyeY,5*eyeS);}
  nose();
  g.strokeStyle="#754b42";g.lineWidth=4;g.beginPath();g.arc(hx,mouthY-2,12,0.15,Math.PI-0.15);g.stroke();
 }
 // kumis Pak Karto — HORIZONTAL lebar (ciri khasnya)
 if(d.name==="Pak Karto"){g.fillStyle="#28242a";g.beginPath();g.ellipse(hx,hy+ry*0.42,22,5,0,0,Math.PI*2);g.fill();}
 // lekuk kerudung Nenek di dada (v5, dipertahankan)
 if(d.kind==="scarf"){g.strokeStyle="#8d5b76";g.lineWidth=12;g.beginPath();g.moveTo(cx-d.shoulderW+8,d.shoulderY+22);g.quadraticCurveTo(cx,d.shoulderY+68,cx+d.shoulderW-8,d.shoulderY+22);g.stroke();}
 // kerutan untuk tokoh tua (relatif terhadap kepala)
 if(d.name==="Nenek Sari"){g.strokeStyle="#8a5f52";g.lineWidth=2;for(const wy of [hy-ry*0.2,hy,hy+ry*0.2]){g.beginPath();g.moveTo(hx-rx*0.9,wy);g.lineTo(hx-rx*0.55,wy+3);g.moveTo(hx+rx*0.55,wy+3);g.lineTo(hx+rx*0.9,wy);g.stroke();}}
 // uji siluet (§5.3 #1): isi hitam pekat semua yang tergambar
 if(debug.silhouette){g.globalCompositeOperation="source-in";g.fillStyle="#000";g.fillRect(0,0,256,512);g.globalCompositeOperation="source-over";}
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
 constructor(parent:THREE.Object3D,debug:CastDebug={}){
  parent.add(this.root);
  // uji ganti warna (§5.3 #5): tukar warna baju dua tokoh di defs salinan
  const useDefs=debug.swapShirts?defs.map((dd)=>{
   if(dd.name===debug.swapShirts![0])return {...dd,shirt:defs.find((x)=>x.name===debug.swapShirts![1])!.shirt};
   if(dd.name===debug.swapShirts![1])return {...dd,shirt:defs.find((x)=>x.name===debug.swapShirts![0])!.shirt};
   return dd;
  }):defs;
  for(const d of useDefs){
   // v2: alphaTest (bukan transparent+depthWrite:false). v1: karakter tidak
   // menulis depth -> depth buffer utama di pixel wajah = latar belakang,
   // jadi proteksi "no ink over characters" di ink.ts gagal dan garis tinta
   // tepi jalan/rumah tergambar MENEMBUS wajah tokoh. Dengan alphaTest 0.5
   // (cara bridge) karakter menulis depth dan garis latar tertutup wajah.
   for(const expr of EXPRS){
    const {tex}=makeSprite(d,expr,debug);
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
