// China: five-tier pagoda, karst mountains, moon bridge, floating lanterns.
import { v3, lerp, rng, cylinder, cone, torus, ellipsoid, lathe, disc, alongY, lookMat } from '../core/geo.js';

const WALL = '#ff5a5a', ROOF = '#ffc34f', GOLD = '#ffe08a', STONE = '#8fd9e8', MOUNTAIN = '#3f8fb3', CLOUD = '#bfeeff', LANTERN = '#ff7a4a', MOON = '#fff1c2';

function pagoda(parts, { pos, tiers, base, height }) {
  const P = v3(...pos);
  parts.add(cylinder(base + 0.9, 0.3, 8), { color: STONE, pos: P });
  let y = 0.3;
  for (let i = 0; i < tiers; i++) {
    const r = base - i * ((base * 0.55) / tiers);
    parts.add(cylinder(r, height, 8), { color: WALL, pos: [P.x, P.y + y, P.z] });
    parts.add(torus(r + 0.25, 0.03, 6, 32), { color: GOLD, pos: [P.x, P.y + y + 0.08, P.z], rot: [Math.PI / 2, 0, 0] });
    y += height;
    const roofR = r + 0.75;
    parts.add(cone(roofR, 0.55, 8), { color: ROOF, pos: [P.x, P.y + y - 0.05, P.z], rot: [0, Math.PI / 8, 0] });
    parts.add(torus(roofR, 0.035, 6, 8), { color: GOLD, pos: [P.x, P.y + y + 0.02, P.z], rot: [Math.PI / 2, 0, Math.PI / 8] });
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4 + Math.PI / 8;
      parts.add(cone(0.05, 0.3, 5), { color: GOLD, quat: alongY(v3(Math.cos(a) * 0.5, 1, Math.sin(a) * 0.5).normalize()), pos: [P.x + Math.cos(a) * roofR, P.y + y, P.z + Math.sin(a) * roofR] });
    }
    y += 0.45;
  }
  parts.add(cone(0.35, 1.4, 8), { color: ROOF, pos: [P.x, P.y + y - 0.1, P.z] });
  for (let k = 0; k < 4; k++) parts.add(torus(0.22 - k * 0.04, 0.03, 6, 16), { color: GOLD, pos: [P.x, P.y + y + 0.45 + k * 0.3, P.z], rot: [Math.PI / 2, 0, 0] });
  parts.add(ellipsoid(0.12, 0.12, 0.12), { color: GOLD, glow: 1, pos: [P.x, P.y + y + 1.75, P.z] });
}

export default {
  key: 'china', country: 'China',
  palette: { floor: '#1e6a63', accent: '#ffb547', skyTop: '#07071f', skyHorizon: '#3b0f2c', skyBottom: '#04020a', stars: 1, nebula: 0.5 },
  ambient: { color: '#ffb060', vel: [0.15, 0.35, 0], size: 2.4, flutter: 0.5, intensity: 0.5 },
  material: { tint: '#c9d6e0', edge: '#ffd27a', fill: 0.22, fresnelStr: 0.7, scan: 0.15 },
  build(parts) {
    const rand = rng(21);
    pagoda(parts, { pos: [0, 0, -11.5], tiers: 5, base: 1.7, height: 1.15 });
    pagoda(parts, { pos: [-8, 0, -6.5], tiers: 3, base: 1.1, height: 0.95 });
    pagoda(parts, { pos: [8.5, 0, -5.5], tiers: 2, base: 1.0, height: 0.9 });
    // karst mountains in a back arc
    for (let i = 0; i < 11; i++) {
      const a = lerp(-1.25, 1.25, i / 10) + (rand() - 0.5) * 0.12 + Math.PI;
      const d = 30 + rand() * 12, h = 9 + rand() * 10, w = 2.5 + rand() * 3;
      const g = lathe([[0, h], [w * 0.35, h * 0.9], [w * 0.6, h * 0.6], [w * 0.85, h * 0.25], [w, 0]], 14);
      parts.add(g, { color: MOUNTAIN, pos: [Math.sin(a) * d, 0, Math.cos(a) * d] });
      if (rand() > 0.5) parts.add(lathe([[0, h * 0.55], [w * 0.3, h * 0.45], [w * 0.5, h * 0.2], [w * 0.6, 0]], 10), { color: MOUNTAIN, pos: [Math.sin(a) * d + w * 1.1, 0, Math.cos(a) * d + 1] });
    }
    // moon
    parts.add(disc(3.2, 48), { color: MOON, glow: 0.3, matrix: lookMat([15, 17, -36], [0, 2, 0]) });
    // auspicious clouds
    for (let i = 0; i < 7; i++) {
      const x = (rand() - 0.5) * 50, z = -14 - rand() * 18, y = 5 + rand() * 7, s = 0.8 + rand() * 1.2;
      for (let k = 0; k < 3; k++) parts.add(ellipsoid(s * (1.2 - k * 0.2), s * 0.45, s * 0.6, 14, 8), { color: CLOUD, pos: [x + (k - 1) * s * 1.3, y + (k === 1 ? s * 0.3 : 0), z] });
    }
    // moon bridge
    parts.add(torus(2.6, 0.32, 8, 48, Math.PI), { color: STONE, pos: [7, 0, 2.5], rot: [0, Math.PI / 2, 0] });
    for (let k = 0; k <= 8; k++) {
      const a = (k / 8) * Math.PI;
      parts.add(cylinder(0.06, 0.55, 6), { color: GOLD, pos: [7, Math.sin(a) * 2.6 + 0.2, 2.5 + Math.cos(a) * 2.6] });
    }
    parts.add(torus(2.95, 0.04, 6, 48, Math.PI), { color: GOLD, pos: [7, 0.7, 2.5], rot: [0, Math.PI / 2, 0] });
    // floating lanterns
    for (let i = 0; i < 16; i++) {
      const a = Math.PI * 0.55 + rand() * Math.PI * 0.9, d = 7.5 + rand() * 10, y = 1.5 + rand() * 6;
      const p = v3(Math.sin(a) * d, y, Math.cos(a) * d);
      parts.add(ellipsoid(0.22, 0.28, 0.22, 12, 10), { color: LANTERN, glow: 0.45, pos: p });
      parts.add(cylinder(0.14, 0.06, 8), { color: GOLD, pos: [p.x, p.y + 0.27, p.z] });
      parts.add(cylinder(0.04, 0.3, 5), { color: GOLD, pos: [p.x, p.y - 0.58, p.z] });
    }
  },
};
