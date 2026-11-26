export const FPS = 30;
export const TOTAL = 2476;
export const FLASH_AT = 18;
export type V3 = [number, number, number];
export type Light = "day" | "golden";
export type ShotDef = { id:number; a:number; b:number; light:Light; crowd:string; tau:(t:number)=>number };
// SHOTS dipetakan ulang ke timeline-ep10-v2.json (narasi Zephyr, 82,53 dtk).
// Batas tiap baris (frame = round(detik*30)):
//  L0 0-78 | L1 92-173 | L2 190-316 | L3 329-441 | L4 458-691 | L5 705-829
//  L6 829-1024 | L7 1033-1235 | L8 1255-1389 | L9 1399-1560 | L10 1583-1825
//  L11 1832-1976 | L12 1987-2122 | L13 2141-2476. TOTAL 2476.
export const SHOTS: ShotDef[] = [
 {id:1,a:0,b:78,light:"golden",crowd:"none",tau:t=>t/30},
 {id:2,a:92,b:173,light:"golden",crowd:"none",tau:t=>t/30},
 {id:3,a:190,b:316,light:"golden",crowd:"dani",tau:t=>t/30},
 {id:4,a:329,b:441,light:"golden",crowd:"dani",tau:t=>t/30},
 {id:5,a:458,b:691,light:"golden",crowd:"nenek",tau:t=>t/30},
 {id:6,a:705,b:829,light:"golden",crowd:"bolang",tau:t=>t/30},
 {id:7,a:829,b:1024,light:"golden",crowd:"karto",tau:t=>t/30},
 {id:8,a:1033,b:1235,light:"golden",crowd:"crowd",tau:t=>t/30},
 {id:9,a:1255,b:1389,light:"golden",crowd:"jali",tau:t=>t/30},
 {id:10,a:1399,b:1560,light:"golden",crowd:"jali",tau:t=>t/30},
 {id:11,a:1583,b:1825,light:"day",crowd:"none",tau:t=>t/30},
 {id:12,a:1832,b:1976,light:"golden",crowd:"crowd",tau:t=>t/30},
 {id:13,a:1987,b:2122,light:"golden",crowd:"crowd",tau:t=>t/30},
 {id:14,a:2141,b:2476,light:"golden",crowd:"dani",tau:t=>t/30},
];
export const shotAt=(f:number)=>SHOTS.find(s=>f>=s.a&&f<s.b)??SHOTS.filter(s=>s.a<=f).slice(-1)[0]??SHOTS[0];
export const layersAt=(f:number)=>[{id:shotAt(f).id,alpha:1}];
export const clamp01=(x:number)=>Math.max(0,Math.min(1,x));
export const smooth=(x:number)=>{const u=clamp01(x);return u*u*(3-2*u);};
export const easeOutBack=(x:number)=>{const c=1.70158;const u=clamp01(x)-1;return 1+(c+1)*u*u*u+c*u*u;};
export type CameraPose={position:V3;target:V3;fov:number};

/* ------------------------------------------------------------------ *
 * KAMERA v3 (ditulis ulang total 27 Nov 2026, Muse) — SHOT LEBAR.
 * Video v2 DITOLAK user (00.30): "gambarnya ngezoom bgt, kentongan
 * ngaco, gambar orang ngaco semua". Penyebabnya: kamera v2 menempel
 * ke tokoh (jarak 2,2-5,4 m, fov 30-42), tokoh memenuhi frame, latar
 * malam gelap tanpa kedalaman — wajah sprite datar terekspos.
 * Patokan v3 = video contoh jembatan yang user suka (check-f2/f3.jpg):
 * kamera RENDAH, bergerak menyusuri dunia (dolly sepanjang jalan),
 * tokoh KECIL di dalam frame, dunia yang jadi bintang: latar berlapis
 * (foreground + tokoh + rumah/pohon + langit), terang dan kebaca.
 * Aturan v3:
 *  - jarak kamera 7-16 m, fov 50-58; tokoh utama ~30-45% tinggi frame
 *    (diperiksa numerik lewat check-framing.mjs: rasio tinggi sudut
 *    tokoh vs FOV vertikal harus <= 0,55).
 *  - dolly: kamera bergerak dari cam ke end sepanjang shot (rasa
 *    "menyusuri dunia" seperti jembatan) + push-in kecil ke target.
 *  - close-up HANYA teks HP (harus terbaca) — ECU kentongan v2 diubah
 *    jadi medium shot (seluruh kentongan + balok gantungan muat).
 *  - lookAt tetap ke SUBJEK (bukan titik asal) — pelajaran v1.
 *  - cut = ganti sudut lebar di tengah baris; u dihitung ulang dari cut.
 * ------------------------------------------------------------------ */
export type Pose={cam:V3;tgt:V3;fov:number;end?:V3;cut?:{at:number;pose:Pose}};
const POSES:Record<number,Pose>={
 // 1: wide hook — pos ronda utuh + rumah + langit malam; dolly pelan masuk
 1:{cam:[3.5,1.6,11.0],tgt:[0,2.0,0],fov:54,end:[2.8,1.7,9.0]},
 // 2: wide pos kosong dari samping, rumah + pohon di latar
 2:{cam:[8.5,2.2,6.0],tgt:[0,1.8,-0.5],fov:52,end:[7.0,2.0,4.5]},
 // 3: medium-wide Dani + pos di latar -> (cut) wide dari sisi lain
 3:{cam:[2.5,1.9,8.0],tgt:[-0.6,1.2,0.5],fov:52,end:[2.0,1.9,7.0],
    cut:{at:60,pose:{cam:[-5.0,2.2,6.5],tgt:[-0.8,1.2,0.9],fov:52,end:[-4.2,2.1,5.5]}}},
 // 4: medium-wide kentongan low angle — seluruh kentongan + balok + tiang muat
 4:{cam:[3.0,1.5,7.5],tgt:[0.45,2.0,-0.05],fov:50,end:[2.6,1.6,6.5]},
 // 5: medium-wide Nenek + jalan + pos -> (cut) wide rumah + warga
 5:{cam:[3.5,2.0,7.0],tgt:[-0.9,1.1,1.0],fov:52,end:[3.0,2.0,6.0],
    cut:{at:115,pose:{cam:[2.0,3.0,10.0],tgt:[7.6,1.2,-1.0],fov:54,end:[2.5,2.9,9.0]}}}, // v3.1: dari jalan, mundur + naik (dulu [10.5,2.2,6.0] = dinding coklat datar + tajuk pohon; [6.0,2.6,8.0] jendela kanan keluar frame; [5.0,2.6,9.0] nyaris masuk atap rumah i=7)
 // 6: tracking Bolang lari (lihat camAt, dihitung dari bolangXAt)
 6:{cam:[0,2.0,6.5],tgt:[0,1.0,1.0],fov:52},
 // 7: medium-wide Pak Karto + kentongan di latar -> (cut) medium-wide retak
 7:{cam:[5.5,2.0,8.0],tgt:[1.8,1.3,0.5],fov:52,end:[4.8,2.0,7.0],
    cut:{at:100,pose:{cam:[3.5,2.2,5.0],tgt:[0.45,2.1,-0.05],fov:50,end:[3.0,2.2,4.5]}}},
 // 8: high wide desa sepi, kamera naik pelan
 8:{cam:[0,10,26],tgt:[0,1.0,-4],fov:58,end:[0,12,24]},
 // 9: medium-wide Jali + kentongan di atas -> (cut) medium dari bawah
 9:{cam:[2.5,1.9,7.5],tgt:[0,1.6,0.1],fov:52,end:[2.0,1.9,6.5],
    cut:{at:70,pose:{cam:[-1.5,1.3,4.5],tgt:[-0.2,1.5,0.1],fov:50,end:[-1.3,1.4,4.0]}}},
 // 10: medium-wide kayu bergerak -> (cut) reverse wide
 10:{cam:[4.0,2.0,8.0],tgt:[0.1,1.8,0.1],fov:52,end:[3.4,2.0,7.0],
    cut:{at:80,pose:{cam:[-4.5,2.0,6.0],tgt:[-0.2,1.5,0.2],fov:52,end:[-3.8,2.0,5.2]}}},
 // 11: wide siang->malam (dipertahankan lebar, kamera sedikit mundur dari v2)
 11:{cam:[5.5,3.4,9.5],tgt:[0,1.5,0],fov:50,end:[5.0,3.3,8.5]},
 // 12: medium-wide rongga kentongan -> (cut) wide warga
 12:{cam:[5.0,2.2,4.5],tgt:[1.0,2.0,-0.05],fov:50,end:[4.5,2.2,4.0],
    cut:{at:70,pose:{cam:[0,2.4,10.0],tgt:[0,1.1,1.7],fov:54,end:[0,2.3,9.0]}}},
 // 13: wide warga + Dani, dolly masuk pelan
 13:{cam:[0,2.4,10.5],tgt:[0,1.1,1.5],fov:54,end:[0,2.3,9.0]},
 // 14: medium Dani + HP (satu-satunya shot yang agak dekat — teks harus terbaca)
 14:{cam:[2.0,2.0,7.0],tgt:[-0.3,1.4,0.95],fov:50,end:[1.6,2.0,6.2],
    cut:{at:180,pose:{cam:[-3.5,2.0,6.0],tgt:[-0.5,1.4,0.95],fov:50,end:[-3.0,2.0,5.4]}}},
};
/** Bolang berlari dari x=-4.5 ke x=-0.5 di sepanjang jalan selama shot 6.
 *  Dipakai bersama oleh story.ts (kamera tracking) dan world.ts (posisi
 *  tokoh) supaya keduanya selalu sinkron. */
export const bolangXAt=(f:number)=>{const s=SHOTS[5];return -4.5+4.0*clamp01((f-s.a)/(s.b-s.a));};
export const camAt=(id:number,f:number):CameraPose=>{
 const shot=SHOTS[id-1];
 const local=Math.max(0,f-shot.a), dur=Math.max(1,shot.b-shot.a);
 // shot 6: kamera tracking — mengikuti Bolang dari depan-samping,
 // lalu cut ke wide kelompok di 39 frame terakhir (Bolang sampai + Jali masuk frame)
 if(id===6){
  const bx=bolangXAt(f);
  if(local>=85){
   const u2=clamp01((local-85)/(dur-85));
   const cam:V3=[1.0,2.4,10.0], tgt:V3=[0,1.1,1.0];
   const dx=tgt[0]-cam[0],dy=tgt[1]-cam[1],dz=tgt[2]-cam[2];const k=0.02+0.05*smooth(u2);
   return {position:[cam[0]+dx*k,cam[1]+dy*k,cam[2]+dz*k],target:tgt,fov:54};
  }
  const u=clamp01(local/dur);
  const cam:V3=[bx+1.5,2.2,8.5], tgt:V3=[bx,1.0,1.0]; // v3.1: dari jalan di depan Bolang (dulu [bx+3.0,2.0,6.5] = tiang pos menutupi Bolang + warga terpotong di tepi)
  const dx=tgt[0]-cam[0],dy=tgt[1]-cam[1],dz=tgt[2]-cam[2];
  const k=0.02+0.05*smooth(u);
  return {position:[cam[0]+dx*k,cam[1]+dy*k,cam[2]+dz*k],target:tgt,fov:52};
 }
 let p=POSES[id]??POSES[14];
 let u=clamp01(local/dur);
 if(p.cut&&local>=p.cut.at){u=clamp01((local-p.cut.at)/(dur-p.cut.at));p=p.cut.pose;}
 // dolly: kamera bergerak dari cam ke end sepanjang shot (rasa "menyusuri
 // dunia" seperti video jembatan), lalu push-in kecil ke arah target
 const e=p.end??p.cam;
 const bx=p.cam[0]+(e[0]-p.cam[0])*smooth(u);
 const by=p.cam[1]+(e[1]-p.cam[1])*smooth(u);
 const bz=p.cam[2]+(e[2]-p.cam[2])*smooth(u);
 const dx=p.tgt[0]-bx,dy=p.tgt[1]-by,dz=p.tgt[2]-bz;
 const k=0.02+0.05*smooth(u);
 return {position:[bx+dx*k,by+dy*k,bz+dz*k],target:p.tgt,fov:p.fov};
};
/** DOF: fokus selalu = jarak kamera->subjek (dihitung di Kentongan.tsx dari
 *  target yang dikembalikan world.update); cInf kecil = DOF nyaris off. */
export const dofAt=(_f:number)=>({cInf:0.018});
