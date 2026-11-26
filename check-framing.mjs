// Pemeriksa framing numerik KentonganShort v3 — tanpa render.
// Memakai camAt() ASLI dari story.ts: untuk tiap shot, hitung sudut off-axis
// tiap titik subjek vs setengah-FOV horizontal/vertikal (9:16, aspect 0.5625).
// "in"     = titik harus di dalam frame dgn margin >= 1 deg (h) / 1.5 deg (v).
// "center" = subjek utama, harus dekat tengah frame (|x|<=10 deg, |y|<=12 deg).
// "scale"  = tokoh TIDAK BOLEH memenuhi frame (pelajaran v3: user menolak v2
//            karena "gambarnya ngezoom bgt"). Rasio tinggi sudut tokoh
//            (kepala->kaki) vs FOV vertikal harus <= 0,55.
// Jalan:  node check-framing.mjs   (dari root repo gh-actions-render-kentongan)
import { SHOTS, camAt, bolangXAt } from "./src/videos/kentongan/story.ts";

const ASPECT = 1080 / 1920;
const D = Math.PI / 180;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

const angles = (pos, tgt, p) => {
  const d = norm(sub(tgt, pos));
  const right = norm(cross(d, [0, 1, 0]));
  const up2 = cross(right, d);
  const v = sub(p, pos);
  const vd = dot(v, d);
  return {
    x: Math.atan2(dot(v, right), vd) / D,
    y: Math.atan2(dot(v, up2), vd) / D,
    dist: Math.hypot(...v),
  };
};
const halfH = (fov) => Math.atan(Math.tan((fov / 2) * D) * ASPECT) / D;
const halfV = (fov) => fov / 2;

// Titik subjek mengikuti posisi tokoh di world.ts (v3) + geometri dunia.
const C = (label, p, mode) => ({ label, p, mode });
const S = (label, head, foot, max = 0.55) => ({ label, head, foot, mode: "scale", max });
const CHECKS = [
  { id: 1, f: 40, pts: [C("kentongan ujung kiri", [-0.325, 2.05, -0.05], "in"), C("kentongan ujung kanan", [1.225, 2.05, -0.05], "in"), C("kentongan tengah", [0.45, 2.05, -0.05], "center"), C("balok gantungan", [0.45, 3.14, -0.05], "in"), C("teks TOK!", [0, 2.7, 1.0], "in")] },
  { id: 2, f: 130, pts: [C("kentongan", [0.45, 2.05, -0.05], "in"), C("pos ronda", [0, 1.6, 0], "center")] },
  { id: 3, f: 230, pts: [C("Dani kepala", [-0.8, 1.95, 0.9], "in"), C("Dani kaki", [-0.8, 0, 0.9], "in"), C("Dani tengah", [-0.8, 1.0, 0.9], "center"), S("Dani skala", [-0.8, 1.95, 0.9], [-0.8, 0, 0.9])] },
  { id: 3, f: 290, pts: [C("Dani mata", [-0.8, 1.55, 0.9], "center"), C("Dani kepala atas", [-0.8, 1.95, 0.9], "in"), S("Dani skala (cut)", [-0.8, 1.95, 0.9], [-0.8, 0, 0.9])] },
  { id: 4, f: 380, pts: [C("kentongan kiri", [-0.325, 2.05, -0.05], "in"), C("kentongan kanan", [1.225, 2.05, -0.05], "in"), C("retak", [0.55, 2.18, 0.19], "center")] },
  { id: 5, f: 520, pts: [C("Nenek mata", [-0.9, 1.15, 1.0], "center"), C("Nenek kepala atas", [-0.9, 1.53, 1.0], "in"), S("Nenek skala", [-0.9, 1.53, 1.0], [-0.9, 0, 1.0])] },
  { id: 5, f: 620, pts: [C("pintu", [8.7, 1.2, -0.05], "center"), C("jendela kiri", [7.6, 1.7, -0.04], "in"), C("jendela kanan", [9.8, 1.7, -0.04], "in"), C("warga di pintu", [7.6, 1.0, 0.6], "in")] },
  { id: 6, f: 750, pts: "bolang" },
  { id: 6, f: 810, pts: "bolangEnd" },
  { id: 7, f: 900, pts: [C("Karto kepala", [2.3, 1.75, 1.1], "in"), C("Karto kaki", [2.3, 0, 1.1], "in"), C("Karto tengah", [2.3, 1.15, 1.1], "center"), S("Karto skala", [2.3, 1.75, 1.1], [2.3, 0, 1.1])] },
  { id: 7, f: 990, pts: [C("retak", [0.55, 2.18, 0.19], "center"), C("kentongan kiri", [-0.325, 2.05, -0.05], "in"), C("kentongan kanan", [1.225, 2.05, -0.05], "in")] },
  { id: 8, f: 1130, pts: [C("warga kiri", [-1.8, 1.0, 1.6], "in"), C("warga kanan", [1.8, 1.0, 2.2], "in"), C("Dani", [-0.8, 1.0, 0.4], "in"), C("rumah kiri", [-6.5, 1.3, -2], "in"), C("rumah kanan", [6.5, 1.3, -2], "in")] },
  { id: 9, f: 1300, pts: [C("Jali kepala", [-0.35, 1.81, 0.3], "in"), C("Jali tengah", [-0.35, 0.9, 0.3], "center"), C("kentongan tengah", [0.45, 2.05, -0.05], "in"), S("Jali skala", [-0.35, 1.81, 0.3], [-0.35, 0, 0.3])] },
  { id: 9, f: 1350, pts: [C("Jali wajah", [-0.18, 1.38, 0.34], "center"), C("Jali puncak rambut", [-0.18, 1.7, 0.34], "in"), C("kentongan", [0.45, 2.05, -0.05], "in"), S("Jali skala (cut)", [-0.18, 1.7, 0.34], [-0.18, 0, 0.34])] },
  { id: 10, f: 1460, pts: [C("retak", [0.55, 2.18, 0.19], "center"), C("kentongan tengah", [0.45, 2.05, -0.05], "center"), C("Jali", [-0.35, 0.9, 0.3], "in"), S("Jali skala", [-0.35, 1.81, 0.3], [-0.35, 0, 0.3])] },
  { id: 10, f: 1520, pts: [C("Jali mata", [-0.47, 1.38, 0.3], "center"), C("Jali kepala atas", [-0.47, 1.81, 0.3], "in"), S("Jali skala (cut)", [-0.47, 1.81, 0.3], [-0.47, 0, 0.3])] },
  { id: 11, f: 1650, pts: [C("kentongan", [0.45, 2.05, -0.05], "center"), C("pos ronda", [0, 1.5, 0], "in")] },
  { id: 11, f: 1780, pts: [C("kentongan", [0.45, 2.05, -0.05], "center"), C("pos ronda", [0, 1.5, 0], "in")] },
  { id: 12, f: 1880, pts: [C("rongga", [1.24, 2.05, -0.05], "center"), C("kentongan", [0.45, 2.05, -0.05], "in")] },
  { id: 12, f: 1940, pts: [C("warga kiri", [-1.6, 1.0, 1.4], "in"), C("warga kanan", [1.5, 1.0, 2.0], "in"), C("warga tengah", [0, 1.0, 1.7], "center")] },
  { id: 13, f: 2050, pts: [C("warga kiri", [-1.6, 1.0, 1.4], "in"), C("warga kanan", [1.5, 1.0, 2.0], "in"), C("Dani", [-0.8, 1.0, 0.4], "in")] },
  { id: 14, f: 2250, pts: [C("Dani kepala", [-0.8, 2.15, 0.9], "in"), C("Dani tengah", [-0.8, 1.1, 0.9], "center"), C("HP", [0.2, 1.5, 1.0], "in"), S("Dani skala", [-0.8, 2.15, 0.9], [-0.8, 0, 0.9], 0.6)] },
  { id: 14, f: 2400, pts: [C("Dani mata", [-0.8, 1.7, 0.9], "center"), C("Dani kepala atas", [-0.8, 2.15, 0.9], "in"), S("Dani skala (cut)", [-0.8, 2.15, 0.9], [-0.8, 0, 0.9], 0.6)] },
];

let fails = 0, total = 0;
for (const chk of CHECKS) {
  const shot = SHOTS[chk.id - 1];
  let pts = chk.pts;
  if (pts === "bolang") {
    const bx = bolangXAt(chk.f);
    pts = [C(`Bolang x=${bx.toFixed(2)}`, [bx, 1.0, 1.0], "center"), C("Bolang kepala", [bx, 1.66, 1.0], "in"), S("Bolang skala", [bx, 1.66, 1.0], [bx, 0, 1.0])];
  } else if (pts === "bolangEnd") {
    const bx = bolangXAt(chk.f);
    pts = [C(`Bolang x=${bx.toFixed(2)}`, [bx, 1.0, 1.0], "center"), C("Jali", [0.6, 1.0, 1.3], "in"), C("warga1", [-1.5, 1.0, 0.2], "in"), C("warga2", [-0.2, 1.0, -0.3], "in")];
  }
  const cam = camAt(chk.id, chk.f);
  const hh = halfH(cam.fov), hv = halfV(cam.fov);
  console.log(`\nshot ${chk.id} f${chk.f} (a=${shot.a} b=${shot.b}) cam=[${cam.position.map((v) => v.toFixed(2)).join(",")}] tgt=[${cam.target.map((v) => v.toFixed(2)).join(",")}] fov=${cam.fov} halfH=${hh.toFixed(1)} halfV=${hv.toFixed(1)}`);
  for (const pt of pts) {
    total++;
    if (pt.mode === "scale") {
      const ah = angles(cam.position, cam.target, pt.head);
      const af = angles(cam.position, cam.target, pt.foot);
      const span = ah.y - af.y;
      const ratio = span / cam.fov;
      const ok = ratio <= pt.max;
      if (!ok) fails++;
      console.log(`  ${ok ? "PASS" : "FAIL"} ${pt.label.padEnd(22)} span=${span.toFixed(1)}deg ratio=${ratio.toFixed(2)} (max ${pt.max})`);
      continue;
    }
    const a = angles(cam.position, cam.target, pt.p);
    let ok, why;
    if (pt.mode === "in") { ok = Math.abs(a.x) <= hh - 1.0 && Math.abs(a.y) <= hv - 1.5; why = `|x|<=${(hh - 1).toFixed(1)} |y|<=${(hv - 1.5).toFixed(1)}`; }
    else { ok = Math.abs(a.x) <= 10 && Math.abs(a.y) <= 12; why = `|x|<=10 |y|<=12`; }
    if (!ok) fails++;
    console.log(`  ${ok ? "PASS" : "FAIL"} ${pt.label.padEnd(22)} x=${a.x.toFixed(1).padStart(6)} y=${a.y.toFixed(1).padStart(6)} dist=${a.dist.toFixed(1)} (${why})`);
  }
}
console.log(`\n${total - fails}/${total} titik lolos. ${fails === 0 ? "SEMUA LOLOS." : `${fails} GAGAL — perbaiki pose dulu.`}`);
process.exit(fails === 0 ? 0 : 1);
