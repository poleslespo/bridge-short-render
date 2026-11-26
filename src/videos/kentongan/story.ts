export const FPS = 30;
export const TOTAL = 3207;
export const FLASH_AT = 18;
export type V3 = [number, number, number];
export type Light = "day" | "golden";
export type ShotDef = { id:number; a:number; b:number; light:Light; crowd:string; tau:(t:number)=>number };
export const SHOTS: ShotDef[] = [
 {id:1,a:0,b:107,light:"golden",crowd:"none",tau:t=>t/30},
 {id:2,a:128,b:212,light:"golden",crowd:"none",tau:t=>t/30},
 {id:3,a:241,b:394,light:"golden",crowd:"dani",tau:t=>t/30},
 {id:4,a:407,b:530,light:"golden",crowd:"dani",tau:t=>t/30},
 {id:5,a:548,b:829,light:"golden",crowd:"nenek",tau:t=>t/30},
 {id:6,a:829,b:1017,light:"golden",crowd:"bolang",tau:t=>t/30},
 {id:7,a:1039,b:1308,light:"golden",crowd:"karto",tau:t=>t/30},
 {id:8,a:1328,b:1589,light:"golden",crowd:"crowd",tau:t=>t/30},
 {id:9,a:1610,b:1802,light:"golden",crowd:"jali",tau:t=>t/30},
 {id:10,a:1815,b:2024,light:"golden",crowd:"jali",tau:t=>t/30},
 {id:11,a:2045,b:2333,light:"day",crowd:"none",tau:t=>t/30},
 {id:12,a:2347,b:2546,light:"golden",crowd:"crowd",tau:t=>t/30},
 {id:13,a:2561,b:2726,light:"golden",crowd:"crowd",tau:t=>t/30},
 {id:14,a:2752,b:3207,light:"golden",crowd:"dani",tau:t=>t/30},
];
export const shotAt=(f:number)=>SHOTS.find(s=>f>=s.a&&f<s.b)??SHOTS.filter(s=>s.a<=f).slice(-1)[0]??SHOTS[0];
export const layersAt=(f:number)=>[{id:shotAt(f).id,alpha:1}];
export const clamp01=(x:number)=>Math.max(0,Math.min(1,x));
export const smooth=(x:number)=>{const u=clamp01(x);return u*u*(3-2*u);};
export const easeOutBack=(x:number)=>{const c=1.70158;const u=clamp01(x)-1;return 1+(c+1)*u*u*u+c*u*u;};
export type CameraPose={position:V3;target:V3;fov:number};

/* ------------------------------------------------------------------ *
 * KAMERA v2 (ditulis ulang total 26 Nov 2026, Muse).
 * Logika kamera v1 (ChatGPT) DIBUANG: semua pose v1 menatap titik asal
 * dunia (0,~,0), sementara tokoh berdiri 1-3 m menyamping, dan fov
 * sempit 25-42 deg memotong mereka keluar frame 9:16 (Dani shot 3,
 * Jali shot 9, Nenek shot 5, HP shot 14 — terverifikasi dari render).
 * Setiap pose v2 mengarah (lookAt) ke SUBJEK-nya, dan framing tiap shot
 * diperiksa numerik (sudut off-axis vs setengah-FOV) lewat
 * check-framing.mjs sebelum render. Aturan yang dipakai:
 *  - subjek utama di tengah frame (off-axis < ~6 deg),
 *  - elemen sekunder (kentongan / tokoh kedua) masuk frame dgn margin
 *    >= ~1 deg dari tepi, atau sengaja di luar frame (close-up).
 *  - push-in = dolly ke arah target (bukan geser x/z mentah spt v1).
 *  - cut = ganti sudut kamera di tengah baris (reframe = cut, sesuai
 *    bahasa kamera ep.8); u dihitung ulang dari titik cut.
 * Shot 11 (siang->malam) dipertahankan persis seperti v1 (terverifikasi).
 * ------------------------------------------------------------------ */
export type Pose={cam:V3;tgt:V3;fov:number;y2?:number;cut?:{at:number;pose:Pose}};
const POSES:Record<number,Pose>={
 // 1: ECU kentongan — kamera mundur sampai seluruh kentongan (1,55 m) + balok gantungan muat
 1:{cam:[0.45,2.05,5.4],tgt:[0.45,2.05,-0.05],fov:38},
 // 2: wide pos ronda, kamera turun pelan (y 3.6 -> 2.8)
 2:{cam:[5.5,3.6,9.5],tgt:[0.3,1.6,-0.5],fov:40,y2:2.8},
 // 3: medium Dani -> (cut) close-up wajah kaget
 3:{cam:[-0.8,1.7,4.8],tgt:[-0.8,1.0,0.9],fov:36,
    cut:{at:60,pose:{cam:[-0.8,1.55,3.0],tgt:[-0.8,1.55,0.9],fov:32}}},
 // 4: ECU kentongan low angle (kamera di bawah, menengadah)
 4:{cam:[0.45,1.35,5.0],tgt:[0.45,2.05,-0.05],fov:38},
 // 5: close-up wajah Nenek -> (cut) pintu rumah + warga keluar
 5:{cam:[-0.9,1.2,3.4],tgt:[-0.9,1.05,1.0],fov:32,
    cut:{at:140,pose:{cam:[7.6,1.7,5.6],tgt:[7.6,1.15,-0.05],fov:52}}},
 // 6: tracking Bolang lari (lihat camAt, dihitung dari bolangXAt)
 6:{cam:[0,1.9,5.2],tgt:[0,1.0,1.0],fov:44},
 // 7: medium Pak Karto (tegak) -> (cut) ECU retak kayu
 7:{cam:[2.3,1.7,4.9],tgt:[2.3,1.15,1.1],fov:36,
    cut:{at:130,pose:{cam:[0.55,2.1,2.6],tgt:[0.55,2.18,0.19],fov:30}}},
 // 8: wide desa sepi dari atas, kamera naik pelan (y 9 -> 11)
 8:{cam:[0,9,22],tgt:[0,1.0,-2],fov:60,y2:11},
 // 9: medium Jali mendekat (kentongan di tepi frame) -> (cut) ECU telinga menempel:
 // kamera RENDAH menengadah, Jali di depan kayu — kepala menutupi celah ke kayu
 9:{cam:[-0.05,1.8,5.2],tgt:[-0.05,1.3,0.15],fov:42,
    cut:{at:90,pose:{cam:[-0.7,1.1,2.3],tgt:[-0.2,1.6,0.1],fov:34}}},
 // 10: ECU serat/retak kayu -> (cut) close-up Jali heran
 10:{cam:[0.45,2.05,2.2],tgt:[0.45,2.05,-0.05],fov:30,
    cut:{at:100,pose:{cam:[-0.35,1.55,2.8],tgt:[-0.45,1.5,0.3],fov:30}}},
 // 11: SATU shot siang->malam (dipertahankan dari v1, terverifikasi jalan)
 11:{cam:[4,3.1,7],tgt:[0,1.5,0],fov:42},
 // 12: ECU rongga kentongan (dari sisi +x, tempat bunyi keluar) -> (cut) warga lega
 12:{cam:[3.0,2.1,0.8],tgt:[1.24,2.05,-0.05],fov:30,
    cut:{at:100,pose:{cam:[0,2.0,9.2],tgt:[0,1.1,1.7],fov:48}}},
 // 13: medium warga berkumpul + Dani menurunkan senter
 13:{cam:[0,2.0,9.0],tgt:[0,1.1,1.5],fov:48},
 // 14: medium Dani + HP -> (cut) close-up Dani senyum
 14:{cam:[-0.35,1.7,5.0],tgt:[-0.35,1.25,0.95],fov:40,
    cut:{at:280,pose:{cam:[-0.6,1.7,3.4],tgt:[-0.6,1.7,0.95],fov:34}}},
};
/** Bolang berlari dari x=-4.5 ke x=-0.5 di sepanjang jalan selama shot 6.
 *  Dipakai bersama oleh story.ts (kamera tracking) dan world.ts (posisi
 *  tokoh) supaya keduanya selalu sinkron. */
export const bolangXAt=(f:number)=>{const s=SHOTS[5];return -4.5+4.0*clamp01((f-s.a)/(s.b-s.a));};
export const camAt=(id:number,f:number):CameraPose=>{
 const shot=SHOTS[id-1];
 const local=Math.max(0,f-shot.a), dur=Math.max(1,shot.b-shot.a);
 // shot 6: kamera tracking — mengikuti Bolang dari depan-samping,
 // lalu cut ke wide kelompok di 38 frame terakhir (Bolang sampai + Jali masuk frame)
 if(id===6){
  const bx=bolangXAt(f);
  if(local>=150){
   const u2=clamp01((local-150)/(dur-150));
   const cam:V3=[0.5,2.0,7.5], tgt:V3=[-0.2,1.0,0.8];
   const dx=tgt[0]-cam[0],dy=tgt[1]-cam[1],dz=tgt[2]-cam[2];const k=0.02+0.05*smooth(u2);
   return {position:[cam[0]+dx*k,cam[1]+dy*k,cam[2]+dz*k],target:tgt,fov:50};
  }
  const u=clamp01(local/dur);
  const cam:V3=[bx+2.2,1.9,5.2], tgt:V3=[bx,1.0,1.0];
  const dx=tgt[0]-cam[0],dy=tgt[1]-cam[1],dz=tgt[2]-cam[2];
  const k=0.02+0.05*smooth(u);
  return {position:[cam[0]+dx*k,cam[1]+dy*k,cam[2]+dz*k],target:tgt,fov:44};
 }
 let p=POSES[id]??POSES[14];
 let u=clamp01(local/dur);
 if(p.cut&&local>=p.cut.at){u=clamp01((local-p.cut.at)/(dur-p.cut.at));p=p.cut.pose;}
 // push-in: dolly ke arah target (maks ~9% jarak), plus drift y bila ada y2
 const dx=p.tgt[0]-p.cam[0],dy=p.tgt[1]-p.cam[1],dz=p.tgt[2]-p.cam[2];
 const k=0.02+0.07*smooth(u);
 const y=p.y2!==undefined?p.cam[1]+(p.y2-p.cam[1])*u:p.cam[1];
 return {position:[p.cam[0]+dx*k,y+dy*k,p.cam[2]+dz*k],target:p.tgt,fov:p.fov};
};
/** DOF: fokus selalu = jarak kamera->subjek (dihitung di Kentongan.tsx dari
 *  target yang dikembalikan world.update); cInf kecil = DOF nyaris off. */
export const dofAt=(_f:number)=>({cInf:0.018});
