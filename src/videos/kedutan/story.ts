export const FPS = 30;
export const TOTAL = 2725;
export type V3 = [number, number, number];
export type Light = "day" | "golden";
export type ShotDef = { id:number; a:number; b:number; light:Light; crowd:string; tau:(t:number)=>number };
/* SHOTS mengikuti timeline-ep11.json (narasi Autonoe, FINAL — jangan diubah).
 * 16 baris -> 16 shot, total 2725 frame @30fps = 90,84 dtk. */
export const SHOTS: ShotDef[] = [
 {id:1,a:0,b:146,light:"day",crowd:"jali",tau:t=>t/30},
 {id:2,a:155,b:351,light:"day",crowd:"nenek",tau:t=>t/30},
 {id:3,a:360,b:489,light:"day",crowd:"jali",tau:t=>t/30},
 {id:4,a:498,b:650,light:"day",crowd:"jali",tau:t=>t/30},
 {id:5,a:659,b:813,light:"golden",crowd:"jali",tau:t=>t/30},
 {id:6,a:822,b:956,light:"golden",crowd:"jali",tau:t=>t/30},
 {id:7,a:965,b:1146,light:"day",crowd:"karto",tau:t=>t/30},
 {id:8,a:1155,b:1305,light:"day",crowd:"karto",tau:t=>t/30},
 {id:9,a:1314,b:1504,light:"golden",crowd:"jali",tau:t=>t/30},
 {id:10,a:1513,b:1665,light:"day",crowd:"jali",tau:t=>t/30},
 {id:11,a:1674,b:1796,light:"day",crowd:"crowd",tau:t=>t/30},
 {id:12,a:1805,b:1969,light:"golden",crowd:"jali",tau:t=>t/30},
 {id:13,a:1978,b:2181,light:"day",crowd:"jali",tau:t=>t/30},
 {id:14,a:2190,b:2375,light:"day",crowd:"crowd",tau:t=>t/30},
 {id:15,a:2384,b:2558,light:"day",crowd:"jali",tau:t=>t/30},
 {id:16,a:2567,b:2725,light:"day",crowd:"jali",tau:t=>t/30},
];
export const shotAt=(f:number)=>SHOTS.find(s=>f>=s.a&&f<s.b)??SHOTS.filter(s=>s.a<=f).slice(-1)[0]??SHOTS[0];
export const layersAt=(f:number)=>[{id:shotAt(f).id,alpha:1}];
export const clamp01=(x:number)=>Math.max(0,Math.min(1,x));
export const smooth=(x:number)=>{const u=clamp01(x);return u*u*(3-2*u);};
export const easeOutBack=(x:number)=>{const c=1.70158;const u=clamp01(x)-1;return 1+(c+1)*u*u*u+c*u*u;};
export type CameraPose={position:V3;target:V3;fov:number};

/* ------------------------------------------------------------------ *
 * KAMERA KedutanShort (ditulis Muse, meniru pola KentonganShort v2).
 * ATURAN KERAS (pelajaran verifikasi Kentongan — jangan dilanggar):
 *  - SETIAP pose lookAt ke SUBJEK-nya. JANGAN PERNAH menatap titik asal
 *    dunia (0,~,0): v1 ChatGPT begitu dan Dani/Jali/Nenek keluar frame.
 *  - subjek utama di tengah frame (off-axis < ~6 deg), elemen sekunder
 *    masuk frame dgn margin >= ~1 deg dari tepi, atau sengaja di luar
 *    frame (close-up). Diperiksa numerik lewat check-framing-kedutan.mjs.
 *  - push-in = dolly ke arah target (bukan geser x/z mentah).
 *  - cuts = ganti sudut kamera di tengah baris (2-3 sub-shot per baris);
 *    u dihitung ulang dari titik cut. Boleh beberapa cut per shot.
 *  - ARAH 27 Nov 00.33 (user menolak Kentongan v2 karena terlalu ngezoom):
 *    SHOT LEBAR seperti video jembatan — DUNIA yang jadi bintang, tokoh
 *    KECIL di dalam frame, kamera bergerak menyusuri adegan. Close-up HANYA
 *    seperlunya (ECU mata = hook; HP/papan teks yang harus terbaca).
 *    Semua pose di bawah sudah dilebarkan (fov 42-52, kamera mundur) dari
 *    rencana awal; jangan kembalikan ke close-up tanpa perintah user.
 *  - ARAH 27 Nov 01.58 (user: "jangan diem doang"): tokoh HARUS BERGERAK
 *    dan bereaksi di tiap shot — jalan pindah titik (bobbing langkah),
 *    condong/angguk BESAR saat kaget/takut, mendekat ke lawan bicara.
 *    Gerakan dipetakan di world.ts (walk + applyGestures); kalau satu shot
 *    tokohnya cuma berdiri diam tanpa gerakan yang kelihatan, itu gagal.
 *  - PERBAIKAN 27 Nov (QC video final): ECU mata JANGAN memenuhi frame —
 *    mata kini DI DALAM cermin (cermin + konteks ruangan kebaca); ujung
 *    atap rumah-1 yang terpotong di tepi kanan f75 dihindari dgn kamera
 *    cut shot 1/10 digeser ke kiri + fov 42.
 * ------------------------------------------------------------------ */
export type Pose={cam:V3;tgt:V3;fov:number;y2?:number;cuts?:{at:number;pose:Pose}[]};
const POSES:Record<number,Pose>={
 // 1: wajah berkedut DI DALAM cermin (LEBAR — wajah + cermin + halaman kebaca,
 //    BUKAN mata memenuhi frame) -> (cut) Jali kaget mendekat ke cermin
 1:{cam:[-2.2,1.7,8.0],tgt:[-2.2,1.25,4.6],fov:46,
    cuts:[{at:70,pose:{cam:[-2.7,1.8,10.0],tgt:[-2.7,1.3,4.9],fov:42}}]},
 // 2: Nenek menunjuk mata Jali, wajah serius -> (cut) warga berkumpul (LEBAR)
 2:{cam:[-0.9,1.9,6.5],tgt:[-0.9,1.1,0.8],fov:44,
    cuts:[{at:100,pose:{cam:[0,2.0,8.5],tgt:[0,1.1,0.8],fov:52}}]},
 // 3: Jali pegang kunci truk, tangan gemetar -> (cut) wide truk penuh karung
 3:{cam:[4.5,2.0,3.5],tgt:[2.6,1.0,-2.5],fov:48,
    cuts:[{at:65,pose:{cam:[4.5,2.2,3.5],tgt:[0.8,1.0,-6],fov:48}}]},
 // 4: karung panen di bak truk -> (cut) jalan panjang, Jali menatap jauh
 4:{cam:[1.5,2.6,0.5],tgt:[0.8,1.3,-5.5],fov:44,
    cuts:[{at:75,pose:{cam:[0,1.5,8],tgt:[1.5,1.0,-4],fov:52}}]},
 // 5: Jali duduk di tempat tidur, mata terbuka (malam) -> kamar + jam dinding
 // -> Jali duduk tegak melihat sekeliling (LEBAR, kamar utuh — BUKAN ECU
 // mata melayang; mata ECU lama di (0,1.6,1.2) sudah dipindah ke cermin)
 5:{cam:[-5.0,1.8,12],tgt:[-12.8,0.9,12],fov:48,
    cuts:[{at:55,pose:{cam:[-6.0,2.0,12],tgt:[-14.0,1.8,12],fov:46}},
          {at:110,pose:{cam:[-8.5,1.9,13.0],tgt:[-13.0,1.0,12.0],fov:46}}]},
 // 6: Jali menuang kopi di meja -> (cut) layar HP menyala di gelap (LEBAR,
 // Jali ikut masuk frame PENUH di kanan — kamera lama (-9.0,1.6,14.5)
 // memotong setengah wajahnya di tepi frame. Kamera HARUS di z<=13.5
 // (di dalam kamar, di depan dinding samping z=14): kalau z>14, tepi
 // dinding samping yang backface-culled tetap kena garis tinta dan
 // memotong wajah Jali di tengah frame.)
 6:{cam:[-7.0,1.7,13.2],tgt:[-12.3,1.0,12.6],fov:46,
    cuts:[{at:65,pose:{cam:[-8.5,1.6,13.5],tgt:[-12.3,0.9,13.0],fov:44}}]},
 // 7: Pak Karto masuk halaman -> (cut) memeriksa mata Jali dari dekat (LEBAR)
 7:{cam:[3.5,1.9,6.5],tgt:[0.4,1.1,0.7],fov:48,
    cuts:[{at:90,pose:{cam:[0,1.9,6.5],tgt:[-0.1,1.3,0.85],fov:48}}]},
 // 8: Pak Karto menunjuk matanya sendiri -> (cut) Jali mendengarkan (LEBAR)
 8:{cam:[2.3,1.9,6.0],tgt:[2.3,1.3,1.1],fov:44,
    cuts:[{at:75,pose:{cam:[-0.8,1.8,5.2],tgt:[-0.8,1.4,1.0],fov:42}}]},
 // 9: tiga sub-shot cepat penyebab: begadang -> gelas kopi bertumpuk -> layar HP (LEBAR)
 9:{cam:[-5.0,1.8,12],tgt:[-12.8,0.9,12],fov:48,
    cuts:[{at:60,pose:{cam:[-9.0,1.6,14.0],tgt:[-12.6,0.85,13.2],fov:42}},
          {at:125,pose:{cam:[-10.5,1.0,14.8],tgt:[-12.6,0.8,13.2],fov:42}}]},
 // 10: wajah berkedut pelan DI DALAM cermin -> Jali sentuh kelopak di cermin -> angguk paham (LEBAR)
 10:{cam:[-2.2,1.7,8.0],tgt:[-2.2,1.25,4.6],fov:46,
    cuts:[{at:55,pose:{cam:[-2.7,1.8,10.0],tgt:[-2.7,1.3,5.0],fov:42}},
          {at:115,pose:{cam:[-0.5,1.8,9.0],tgt:[-2.2,1.4,5.0],fov:44}}]},
 // 11: Jali mengembuskan napas lega -> (cut) warga mengangguk, halaman tenang (LEBAR)
 11:{cam:[0,1.9,6.5],tgt:[0,1.2,1.0],fov:44,
    cuts:[{at:60,pose:{cam:[0,2.0,8.5],tgt:[0,1.1,1.5],fov:52}}]},
 // 12: Jali tidur nyenyak di bawah selimut -> (cut) gelas kopi disingkirkan, HP jauh (LEBAR)
 12:{cam:[-5.0,1.8,12],tgt:[-13,0.8,12],fov:48,
    cuts:[{at:80,pose:{cam:[-8.0,1.7,14.0],tgt:[-12.6,0.8,13.2],fov:44}}]},
 // 13: Jali bangun segar (LEBAR) -> (cut) truk jalan di jalan desa pagi
 13:{cam:[-6.0,1.7,12],tgt:[-13.2,1.1,12],fov:46,
    cuts:[{at:70,pose:{cam:[5.5,2.2,2.5],tgt:[0.8,1.0,-10],fov:44}}]},
 // 14: Jali tersenyum di depan truk -> (cut) Nenek mengangguk + teks "BUKAN KABAR DUKA"
 14:{cam:[4.0,2.0,4.0],tgt:[2.4,1.0,-3.0],fov:50,
    cuts:[{at:90,pose:{cam:[0,2.0,7.5],tgt:[-0.8,1.4,0.5],fov:48}}]},
 // 15: Jali menunjuk matanya -> (cut) pintu puskesmas + papan nama
 15:{cam:[0,1.9,6.0],tgt:[0,1.3,1.0],fov:44,
    cuts:[{at:85,pose:{cam:[7.6,2.2,8.0],tgt:[7.6,2.0,-1.0],fov:44}}]},
 // 16: Jali menatap kamera -> (cut) teks pertanyaan + senyum penutup (LEBAR)
 16:{cam:[0,1.9,5.8],tgt:[0,1.5,1.0],fov:42,
    cuts:[{at:80,pose:{cam:[0,2.0,6.5],tgt:[0,1.6,1.0],fov:44}}]},
};
/** Truk panen jalan di shot 13 bagian B: dari z=-2 ke z=-16 selama
 *  local 70..190, dgn goyangan kecil. Dipakai story (tidak ada) dan
 *  world (posisi truk) supaya keduanya sinkron. */
export const truckZAt=(f:number)=>{const s=SHOTS[12];const local=Math.max(0,f-s.a);return -6-10*smooth((local-70)/120);};
export const camAt=(id:number,f:number):CameraPose=>{
 const shot=SHOTS[id-1];
 const local=Math.max(0,f-shot.a), dur=Math.max(1,shot.b-shot.a);
 let p=POSES[id]??POSES[16];
 let segStart=0;
 if(p.cuts){
  for(const c of p.cuts){if(local>=c.at){p=c.pose;segStart=c.at;}}
 }
 const u=clamp01((local-segStart)/(dur-segStart));
 // push-in: dolly ke arah target (maks ~9% jarak), plus drift y bila ada y2
 const dx=p.tgt[0]-p.cam[0],dy=p.tgt[1]-p.cam[1],dz=p.tgt[2]-p.cam[2];
 const k=0.02+0.07*smooth(u);
 const y=p.y2!==undefined?p.cam[1]+(p.y2-p.cam[1])*u:p.cam[1];
 return {position:[p.cam[0]+dx*k,y+dy*k,p.cam[2]+dz*k],target:p.tgt,fov:p.fov};
};
/** DOF: fokus selalu = jarak kamera->subjek (dihitung di Kedutan.tsx dari
 *  target yang dikembalikan world.update); cInf kecil = DOF nyaris off. */
export const dofAt=(_f:number)=>({cInf:0.018});
