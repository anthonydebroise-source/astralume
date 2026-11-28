// Décor spatial en vraie 3D (WebGL 2), rendu sur un canvas placé SOUS le canvas du jeu.
// Caméra en perspective, légèrement inclinée vers l'avant, qui avance sans cesse :
// nébuleuses étagées en profondeur, étoiles en volume, planète éclairée avec atmosphère et anneaux,
// astéroïdes 3D qui tournoient, poussières rapides, et léger décalage quand le vaisseau se déplace.
import { view } from './renderer.js';
import { makeCanvas } from './sprites.js';
import { Noise } from './noise.js';
import { RNG, hash32, hexToRgb, mixHex, lighten, darken } from './math.js';
import { nebulaTexture } from '../game/bgart.js';
import { Mesh, mat, tube, sphere, superq, lathe, rgb as lin } from './gl3d.js';

const P0 = 500;          // profondeur du plan de jeu (unités)
const TILT = 0.26;       // inclinaison de la caméra vers l'avant
let G = null, failed = false;

// ---------- Shaders ----------
const VS_SKY = `#version 300 es
in vec2 aQ; out vec2 vQ; void main() { vQ = aQ; gl_Position = vec4(aQ * 2.0 - 1.0, 0.9999, 1.0); }`;
const FS_SKY = `#version 300 es
precision highp float; in vec2 vQ; uniform vec3 uA; uniform vec3 uB; uniform vec3 uC; uniform float uT; out vec4 o;
void main() { float y = vQ.y; vec3 c = mix(uA, uB, smoothstep(0.0, 0.55, y)); c = mix(c, uC, smoothstep(0.55, 1.0, y));
  float v = length((vQ - 0.5) * vec2(1.0, 1.4)); c *= 1.0 - 0.35 * smoothstep(0.3, 0.9, v); o = vec4(c, 1.0); }`;
const VS_QUAD = `#version 300 es
in vec2 aQ; uniform mat4 uVP; uniform vec3 uO; uniform vec3 uU; uniform vec3 uV; uniform vec4 uUV; out vec2 vT; out float vD;
void main() { vec3 p = uO + uU * aQ.x + uV * aQ.y; vT = uUV.xy + aQ * uUV.zw; vec4 c = uVP * vec4(p, 1.0); vD = c.w; gl_Position = c; }`;
const FS_QUAD = `#version 300 es
precision highp float; in vec2 vT; in float vD; uniform sampler2D uTex; uniform vec4 uTint; uniform float uFog; out vec4 o;
void main() { vec4 t = texture(uTex, vT); float f = exp(-vD * uFog); o = vec4(t.rgb * uTint.rgb, t.a) * uTint.a * f; }`;
const VS_PTS = `#version 300 es
in vec4 aS; in vec3 aC; uniform mat4 uVP; uniform vec3 uCam; uniform float uPer; uniform float uPx; uniform float uT; out vec3 vC; out float vA;
void main() { vec3 p = aS.xyz; p.y = mod(p.y - uCam.y + uPer * 0.18, uPer) - uPer * 0.18 + uCam.y;
  vec4 c = uVP * vec4(p, 1.0); gl_Position = c; float tw = 0.75 + 0.25 * sin(uT * (1.5 + fract(aS.w * 7.3) * 3.0) + aS.w * 20.0);
  gl_PointSize = clamp(aS.w * uPx * 2600.0 / c.w, 1.2, 16.0); vC = aC; vA = tw * clamp(2600.0 / c.w, 0.25, 1.0); }`;
const FS_PTS = `#version 300 es
precision highp float; in vec3 vC; in float vA; out vec4 o;
void main() { vec2 q = gl_PointCoord * 2.0 - 1.0; float r = dot(q, q); float a = exp(-r * 5.0) + 0.5 * exp(-abs(q.x) * 14.0) * exp(-abs(q.y) * 3.0) + 0.5 * exp(-abs(q.y) * 14.0) * exp(-abs(q.x) * 3.0);
  a *= vA; o = vec4(vC * a, a); }`;
const VS_LINE = `#version 300 es
in vec4 aS; uniform mat4 uVP; uniform vec3 uCam; uniform float uPer; uniform float uLen; out float vA;
void main() { vec3 p = aS.xyz; p.y = mod(p.y - uCam.y + uPer * 0.3, uPer) - uPer * 0.3 + uCam.y; p.y -= aS.w * uLen; vA = 1.0 - aS.w; gl_Position = uVP * vec4(p, 1.0); }`;
const FS_LINE = `#version 300 es
precision highp float; in float vA; uniform vec4 uCol; out vec4 o; void main() { o = vec4(uCol.rgb, 1.0) * uCol.a * vA; }`;
const VS_TRI = `#version 300 es
in vec3 aP; in vec3 aT; uniform mat4 uVP; out vec3 vT; void main() { vT = aT; gl_Position = uVP * vec4(aP, 1.0); }`;
const FS_TRI = `#version 300 es
precision highp float; in vec3 vT; uniform sampler2D uTex; uniform float uA; out vec4 o; void main() { vec4 t = texture(uTex, vT.xy); o = t * uA * vT.z; }`;
const VS_MESH = `#version 300 es
in vec3 aP; in vec3 aN; in vec4 aC; uniform mat4 uVP; uniform mat4 uM; out vec3 vN; out vec3 vO; out vec3 vW; out vec2 vT; out vec4 vC;
void main() { vec4 w = uM * vec4(aP, 1.0); vW = w.xyz; vO = aP; vN = mat3(uM) * aN; vC = aC; vT = vec2(atan(aP.y, aP.x) / 6.2831853 + 0.5, acos(clamp(aP.z / length(aP), -1.0, 1.0)) / 3.14159); gl_Position = uVP * w; }`;
const FS_MESH = `#version 300 es
precision highp float; in vec3 vN; in vec3 vO; in vec3 vW; in vec2 vT; in vec4 vC;
uniform int uKind; uniform sampler2D uTex; uniform vec3 uSun; uniform vec3 uCamP; uniform vec3 uA; uniform vec3 uB; uniform vec3 uAtm; uniform vec3 uEmi; uniform float uAmb; uniform float uFog; out vec4 o;
float h(vec3 p) { p = fract(p * 0.3183 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float n3(vec3 x) { vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h(i), h(i + vec3(1,0,0)), f.x), mix(h(i + vec3(0,1,0)), h(i + vec3(1,1,0)), f.x), f.y), mix(mix(h(i + vec3(0,0,1)), h(i + vec3(1,0,1)), f.x), mix(h(i + vec3(0,1,1)), h(i + vec3(1,1,1)), f.x), f.y), f.z); }
void main() {
  vec3 N = normalize(vN), L = normalize(uSun), V = normalize(uCamP - vW);
  float nd = dot(N, L), dif = max(nd, 0.0);
  vec3 col; float spec = 0.0;
  if (uKind == 0) { // planète texturée + atmosphère
    vec3 t = texture(uTex, vT).rgb;
    float term = smoothstep(-0.12, 0.25, nd);
    col = t * (dif * 1.25 + 0.03) + t * 0.05;
    float fr = pow(1.0 - max(dot(N, V), 0.0), 3.0);
    col += uAtm * fr * (0.25 + 1.2 * term);
    col += uAtm * 0.25 * pow(max(dot(reflect(-L, N), V), 0.0), 18.0) * term;
  } else if (uKind == 2) { // décor planétaire (couleur par sommet + émission)
    vec3 H = normalize(L + V); spec = pow(max(dot(N, H), 0.0), 30.0) * 0.25;
    float wrap = max((nd + 0.12) / 1.12, 0.0);
    col = vC.rgb * (wrap * 1.55 + uAmb) + vec3(spec) + vC.rgb * vC.a * 2.2;
    col *= 0.75 + 0.25 * smoothstep(-500.0, -440.0, vW.z); // pied des reliefs plus sombre (occlusion au sol)
    col += uAtm * pow(1.0 - max(dot(N, V), 0.0), 2.5) * 0.5;
  } else { // roche / chair / cristal
    float e = 0.05; vec3 q = vO * 3.2;
    float b0 = n3(q) + 0.5 * n3(q * 2.3);
    vec3 gr = vec3(n3(q + vec3(e,0,0)) + 0.5 * n3((q + vec3(e,0,0)) * 2.3) - b0, n3(q + vec3(0,e,0)) + 0.5 * n3((q + vec3(0,e,0)) * 2.3) - b0, n3(q + vec3(0,0,e)) + 0.5 * n3((q + vec3(0,0,e)) * 2.3) - b0) / e;
    N = normalize(N - mat3(1.0) * gr * 0.05); dif = max(dot(N, L), 0.0);
    float n = n3(vO * 1.6) * 0.6 + n3(vO * 4.5) * 0.3 + n3(vO * 13.0) * 0.1;
    vec3 base = mix(uA, uB, smoothstep(0.3, 0.75, n));
    float cav = smoothstep(0.62, 0.42, n3(vO * 3.3));
    base *= 0.6 + 0.4 * cav;
    vec3 H = normalize(L + V); spec = pow(max(dot(N, H), 0.0), 24.0) * 0.35;
    col = base * (dif * 1.5 + uAmb) + vec3(spec);
    col += uEmi * smoothstep(0.66, 0.8, n) * 1.6;
    col += uAtm * pow(1.0 - max(dot(N, V), 0.0), 2.5) * 1.1;
  }
  float f = exp(-length(uCamP - vW) * uFog);
  o = vec4(col * f, 1.0);
}`;

function initGL() {
  if (G || failed) return G;
  try {
    const stage = document.getElementById('stage'), game = document.getElementById('game');
    if (!stage || !game) { failed = true; return null; }
    const cv = document.createElement('canvas');
    cv.id = 'bg3d';
    cv.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;z-index:0';
    stage.insertBefore(cv, game);
    const gl = cv.getContext('webgl2', { alpha: false, antialias: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
    if (!gl) { cv.remove(); failed = true; return null; }
    const mk = (vs, fs) => {
      const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
      const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
      const U = new Proxy({}, { get: (o, k) => (k in o ? o[k] : (o[k] = gl.getUniformLocation(p, k))) });
      return { p, U, a: (n) => gl.getAttribLocation(p, n) };
    };
    const quadBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
    G = { cv, gl, sky: mk(VS_SKY, FS_SKY), quad: mk(VS_QUAD, FS_QUAD), pts: mk(VS_PTS, FS_PTS), line: mk(VS_LINE, FS_LINE), mesh: mk(VS_MESH, FS_MESH), tri: mk(VS_TRI, FS_TRI), quadBuf, scenes: new Map(), shown: false, lost: false };
    cv.addEventListener('webglcontextlost', (e) => { e.preventDefault(); G.lost = true; G.scenes.clear(); });
    cv.addEventListener('webglcontextrestored', () => { G = null; failed = false; cv.remove(); });
    resize3D();
    window.addEventListener('resize', () => setTimeout(resize3D, 60));
  } catch (e) { console.warn('Décor 3D indisponible', e); failed = true; G = null; }
  return G;
}
function resize3D() {
  if (!G) return;
  const css = view.cssW, cssH = view.cssH, k = Math.min(2, view.dpr) * 0.8;
  G.cv.style.width = css + 'px'; G.cv.style.height = cssH + 'px';
  G.cv.width = Math.round(css * k); G.cv.height = Math.round(cssH * k);
}
export function bg3dAvailable() { const g = initGL(); return !!g && !g.lost; }
export function bg3dShow(on) { if (!G) return; if (G.shown !== on) { G.cv.style.display = on ? 'block' : 'none'; G.shown = on; } }

// ---------- Ressources ----------
function texFrom(canvas, repeat = true) {
  const gl = G.gl, t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE);
  return t;
}
function meshBuf(P, N, Cc) {
  const gl = G.gl, vao = gl.createVertexArray(); gl.bindVertexArray(vao);
  const M = G.mesh;
  for (const [n, arr, sz] of [['aP', P, 3], ['aN', N, 3], ['aC', Cc, 4]]) {
    const l = M.a(n); if (l < 0) continue;
    if (!arr) { gl.disableVertexAttribArray(l); gl.vertexAttrib4f(l, 1, 1, 1, 0); continue; }
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr), gl.STATIC_DRAW); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, sz, gl.FLOAT, false, 0, 0);
  }
  gl.bindVertexArray(null);
  return { vao, n: P.length / 3 };
}
// sphère UV (planètes) et icosphère déformée (astéroïdes)
function uvSphere(nu, nv) {
  const P = [], N = [];
  const pt = (i, j) => { const u = (i / nu) * Math.PI * 2, v = (j / nv) * Math.PI; return [Math.sin(v) * Math.cos(u), Math.sin(v) * Math.sin(u), Math.cos(v)]; };
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = pt(i, j), b = pt(i + 1, j), c = pt(i + 1, j + 1), d = pt(i, j + 1);
    for (const q of [a, b, c, a, c, d]) { P.push(...q); N.push(...q); }
  }
  return { P, N };
}
function rockMesh(seed, kind) {
  // icosaèdre subdivisé
  const t = (1 + Math.sqrt(5)) / 2;
  let V = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map((v) => { const l = Math.hypot(...v); return v.map((x) => x / l); });
  let F = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  for (let s = 0; s < (kind === 'cube' ? 1 : 3); s++) {
    const cache = new Map(), mid = (a, b) => { const k = a < b ? a + '_' + b : b + '_' + a; if (cache.has(k)) return cache.get(k); const m = V[a].map((x, i) => (x + V[b][i]) / 2), l = Math.hypot(...m); V.push(m.map((x) => x / l)); cache.set(k, V.length - 1); return V.length - 1; };
    const NF = []; for (const [a, b, c] of F) { const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a); NF.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]); }
    F = NF;
  }
  const N1 = new Noise(seed), cube = kind === 'cube';
  const D = V.map((v) => {
    if (cube) { const m = Math.max(Math.abs(v[0]), Math.abs(v[1]), Math.abs(v[2])); return v.map((x) => x / m * 0.8); }
    const k = 1 + 0.32 * N1.fbm(v[0] * 1.4 + 3, v[1] * 1.4 + v[2] * 0.7, 4) - 0.12 * Math.max(0, N1.fbm(v[0] * 3 + 9, v[1] * 3 - v[2] * 2, 2) - 0.2);
    return [v[0] * k * (kind === 'blob' ? 1.1 : 1), v[1] * k * (kind === 'shard' ? 0.55 : 1), v[2] * k * (kind === 'shard' ? 1.6 : 1)];
  });
  // normales lissées (moyenne des faces) : roche arrondie, relief fin ajouté au rendu
  const VN = D.map(() => [0, 0, 0]), FN = [];
  for (const [a, b, c] of F) {
    const A = D[a], B = D[b], C = D[c];
    const u = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], w = [C[0] - A[0], C[1] - A[1], C[2] - A[2]];
    const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
    FN.push(n); for (const vi of [a, b, c]) for (let k = 0; k < 3; k++) VN[vi][k] += n[k];
  }
  const P = [], N = [];
  F.forEach(([a, b, c], fi) => {
    const fl = FN[fi], fl2 = Math.hypot(...fl) || 1;
    for (const vi of [a, b, c]) { P.push(...D[vi]); const n = cube ? fl.map((x) => x / fl2) : VN[vi].map((x) => x / (Math.hypot(...VN[vi]) || 1)); N.push(...n); }
  });
  return { P, N };
}
// texture de planète (équirectangulaire)
function planetTexture(pal, seed, kind) {
  const W = 512, H = 256, cv = makeCanvas(W, H), g = cv.getContext('2d'), img = g.createImageData(W, H), Dd = img.data;
  const N1 = new Noise(seed), N2 = new Noise(seed + 77);
  const a = hexToRgb(kind === 'gas' ? lighten(pal.neb2, 0.25) : mixHex('#8a8098', pal.neb1, 0.25)), b = hexToRgb(kind === 'gas' ? darken(pal.neb1, 0.35) : '#3a3448'), c = hexToRgb(kind === 'gas' ? mixHex(pal.accent, '#ffffff', 0.4) : '#c8c0d8');
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const u = (x / W) * Math.PI * 2, v = (y / H) * Math.PI, sx = Math.sin(v) * Math.cos(u), sy = Math.sin(v) * Math.sin(u), sz = Math.cos(v);
    let k, col;
    if (kind === 'gas') {
      const turb = N1.fbm(sx * 2.5, sy * 2.5 + sz * 6, 4) * 0.35;
      const band = 0.5 + 0.5 * Math.sin(sz * 18 + turb * 6 + N2.fbm(sx * 1.2, sy * 1.2, 2) * 2);
      k = band; const t2 = Math.max(0, N2.fbm(sx * 4 + 5, sz * 9, 3) - 0.25) * 1.4;
      col = [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k].map((q, i) => q + (c[i] - q) * Math.min(1, t2));
    } else {
      const n = N1.fbm(sx * 3, sy * 3 + sz * 2, 5), cr = Math.abs(N2.fbm(sx * 7, sy * 7 + sz * 5, 3));
      k = Math.min(1, Math.max(0, n * 0.9 + 0.4 - (cr < 0.06 ? 0.25 : 0)));
      col = [b[0] + (a[0] - b[0]) * k, b[1] + (a[1] - b[1]) * k, b[2] + (a[2] - b[2]) * k];
      if (cr > 0.06 && cr < 0.09) col = col.map((q, i) => q + (c[i] - q) * 0.4);
    }
    const i = (y * W + x) * 4; Dd[i] = col[0]; Dd[i + 1] = col[1]; Dd[i + 2] = col[2]; Dd[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return cv;
}
function ringTexture(pal, seed) {
  const W = 256, cv = makeCanvas(W, 4), g = cv.getContext('2d'), r = new RNG(seed);
  for (let x = 0; x < W; x++) { const a = Math.max(0, Math.sin(x * 0.11 + r.range(0, 0.4)) * 0.5 + 0.5) * (x > 20 && x < W - 10 ? 1 : 0) * (0.35 + 0.65 * r.next()); const cc = hexToRgb(x % 40 < 20 ? lighten(pal.neb2, 0.4) : '#e8e0f0'); g.fillStyle = `rgba(${cc[0]},${cc[1]},${cc[2]},${a * 0.8})`; g.fillRect(x, 0, 1, 4); }
  return cv;
}
function glowTexture() { const c = makeCanvas(64, 64), g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return c; }

const rgbF = (hex) => hexToRgb(hex).map((x) => x / 255);
const ROCKS = { nebula: { kind: 'rock', n: 30, a: '#5a5068', b: '#b8a8c8', emi: null }, amber: { kind: 'rock', n: 60, a: '#6a3c18', b: '#f0b860', emi: '#ffb43a' }, reef: { kind: 'rock', n: 34, a: '#4a2a5a', b: '#f08ac0', emi: '#7dfcff' },
  hive: { kind: 'blob', n: 30, a: '#5a1428', b: '#d04a68', emi: '#ff4f8a' }, heart: { kind: 'blob', n: 40, a: '#5a0c20', b: '#e03050', emi: '#ff3a5a' }, quantum: { kind: 'cube', n: 40, a: '#2a2058', b: '#7a6ac8', emi: '#7dfcff' } };

// Construit (et garde en cache) la scène d'un monde
export function bg3dScene(def) {
  if (!bg3dAvailable()) return null;
  const P = def.pal, th = def.world.theme.id, seed = def.seed || 1, key = th + '|' + P.hue + '|' + (seed % 7) + '|' + view.w + 'x' + Math.round(view.h);
  if (G.scenes.has(key)) return G.scenes.get(key);
  const gl = G.gl, rng = new RNG(hash32(seed, 91));
  const S = { key, th, pal: P, t: 0, camY: 0, camX: 0 };
  // ciel
  S.sky = [rgbF(P.bg0).map((x) => x * 0.8), rgbF(P.bg1), rgbF(mixHex(P.bg0, P.neb1, 0.12))];
  // nébuleuses : 3 plans à des profondeurs différentes
  const n1 = nebulaTexture(P, hash32(seed, 17), 390, 1200, 0.42), n2 = nebulaTexture(P, hash32(seed, 29), 390, 1200, 0.3), n3 = nebulaTexture(P, hash32(seed, 53), 390, 1200, 0.26);
  S.layers = [{ tex: texFrom(n1), depth: 3400, a: 0.95, w: 6000, h: 6000 * 1200 / 390 * 0.4, tint: [1, 1, 1] }, { tex: texFrom(n2), depth: 1700, a: 0.55, w: 2800, h: 2800 * 1200 / 390 * 0.45, tint: [1, 1, 1] }, { tex: texFrom(n3), depth: 900, a: 0.32, w: 1500, h: 1500 * 1200 / 390 * 0.5, tint: rgbF(lighten(P.neb2, 0.3)) }];
  // étoiles en volume
  const NS = 1600, st = [], sc = [];
  const sp = [rgbF('#ffffff'), rgbF(lighten(P.neb2, 0.5)), rgbF('#ffd8a8'), rgbF('#a8c8ff')];
  for (let i = 0; i < NS; i++) { const z = -(700 + Math.pow(rng.next(), 1.4) * 6000), sz = rng.next() < 0.06 ? rng.range(2.2, 3.4) : rng.range(0.6, 1.6); st.push(rng.range(-1, 1) * (-z) * 0.9, rng.range(0, 14000), z, sz); sc.push(...sp[rng.next() < 0.6 ? 0 : Math.floor(rng.range(1, 4))]); }
  S.stars = vaoOf(G.pts, [['aS', st, 4], ['aC', sc, 3]], NS);
  // poussières rapides (traînées)
  const ND = 70, du = [];
  for (let i = 0; i < ND; i++) { const x = rng.range(-520, 520), y = rng.range(0, 2200), z = -rng.range(140, 460); du.push(x, y, z, 0, x, y, z, 1); }
  S.dust = vaoOf(G.line, [['aS', du, 4]], ND * 2);
  // planète + lune
  const ps = hash32(seed, 23), gas = rng.next() < 0.65;
  S.sphere = meshBuf(...Object.values(uvSphere(64, 32)));
  S.planet = { tex: texFrom(planetTexture(P, ps, gas ? 'gas' : 'rock'), true), r: gas ? rng.range(520, 760) : rng.range(360, 520), x: (rng.next() < 0.5 ? -1 : 1) * rng.range(500, 1100), y: rng.range(1400, 3600), z: -rng.range(2800, 3600), spin: rng.range(0.01, 0.03), tilt: rng.range(-0.5, 0.5), atm: rgbF(lighten(P.neb2, 0.35)), ring: gas && rng.next() < 0.7 ? { tex: texFrom(ringTexture(P, ps), false), r0: 1.3, r1: 1.95, tilt: rng.range(1.15, 1.35) } : null, period: 14000 };
  S.moon = { tex: texFrom(planetTexture(P, ps + 5, 'rock'), true), r: rng.range(90, 150), x: -S.planet.x * 0.6, y: S.planet.y + rng.range(2500, 5000), z: -rng.range(1500, 2000), spin: 0.03, tilt: 0.2, atm: rgbF('#b8c8ff'), period: 11000 };
  // astéroïdes / blocs / chair flottante selon le monde
  const R = ROCKS[th] || ROCKS.nebula;
  S.rockDef = R;
  S.rockMeshes = [0, 1, 2, 3].map((k) => meshBuf(...Object.values(rockMesh(hash32(seed, 61 + k), R.kind))));
  S.rocks = [];
  for (let i = 0; i < R.n; i++) {
    const z = -rng.range(560, 1700), spread = (-z) * 0.75;
    const side = rng.next() < 0.75 ? (rng.next() < 0.5 ? -1 : 1) * rng.range(0.35, 1) : rng.range(-1, 1);
    S.rocks.push({ m: i % 4, x: side * spread, y: rng.range(0, 4200), z, s: rng.range(14, 40) * (-z / 700) * (R.kind === 'cube' ? 0.8 : 1), r: [rng.range(0, 6), rng.range(0, 6), rng.range(0, 6)], v: [rng.range(-0.5, 0.5), rng.range(-0.5, 0.5), rng.range(-0.5, 0.5)] });
  }
  S.rockPer = 4200;
  S.glowTex = texFrom(glowTexture(), false);
  S.sun = [-0.55, 0.45, 0.7];
  S.dustCol = [...rgbF(lighten(P.neb2, 0.6)), 0.35];
  G.scenes.set(key, S);
  if (G.scenes.size > 4) { const k0 = G.scenes.keys().next().value; G.scenes.delete(k0); }
  return S;
}
function vaoOf(prog, attrs, n) {
  const gl = G.gl, vao = gl.createVertexArray(); gl.bindVertexArray(vao);
  for (const [name, arr, size] of attrs) { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr), gl.STATIC_DRAW); const l = prog.a(name); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, size, gl.FLOAT, false, 0, 0); }
  gl.bindVertexArray(null);
  return { vao, n };
}

// ---------- Matrices ----------
function persp(fy, asp, n, f) { const t = 1 / Math.tan(fy / 2); return [t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, (2 * f * n) / (n - f), 0]; }
function mul(a, b) { const o = new Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; }
function viewM(cx, cy, cz, tilt) {
  // repère : x à droite, y en avant (haut de l'écran), z vers la caméra ; la caméra regarde vers -z, inclinée vers +y
  const f = [0, Math.sin(tilt), -Math.cos(tilt)], u = [0, Math.cos(tilt), Math.sin(tilt)], r = [1, 0, 0];
  const e = [cx, cy, cz];
  const d = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  return [r[0], u[0], -f[0], 0, r[1], u[1], -f[1], 0, r[2], u[2], -f[2], 0, -d(r, e), -d(u, e), d(f, e), 1];
}
function rot3(rx, ry, rz) { // R = Rz * Ry * Rx (colonnes)
  const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
  return [cz * cy, sz * cy, -sy, cz * sy * sx - sz * cx, sz * sy * sx + cz * cx, cy * sx, cz * sy * cx + sz * sx, sz * sy * cx - cz * sx, cy * cx];
}
function m3mul(A, B) { const o = new Array(9); for (let c = 0; c < 3; c++) for (let r = 0; r < 3; r++) o[c * 3 + r] = A[r] * B[c * 3] + A[3 + r] * B[c * 3 + 1] + A[6 + r] * B[c * 3 + 2]; return o; }
function bodyM(x, y, z, s, tilt, roll, spin) {
  const R = m3mul(rot3(Math.PI / 2 - 0.35 + tilt, 0, roll), rot3(0, 0, spin));
  return [R[0] * s, R[1] * s, R[2] * s, 0, R[3] * s, R[4] * s, R[5] * s, 0, R[6] * s, R[7] * s, R[8] * s, 0, x, y, z, 1];
}
function modelM(x, y, z, s, rx, ry, rz) {
  const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
  const R = [cz * cy, sz * cy, -sy, cz * sy * sx - sz * cx, sz * sy * sx + cz * cx, cy * sx, cz * sy * cx + sz * sx, sz * sy * cx - cz * sx, cy * cx];
  return [R[0] * s, R[1] * s, R[2] * s, 0, R[3] * s, R[4] * s, R[5] * s, 0, R[6] * s, R[7] * s, R[8] * s, 0, x, y, z, 1];
}

// ---------- Rendu d'une image ----------
export function bg3dRender(S, st) {
  if (!S || !G || G.lost) return false;
  const gl = G.gl;
  if (G.cv.width !== Math.round(view.cssW * Math.min(2, view.dpr) * 0.8)) resize3D();
  bg3dShow(true);
  S.t = st.t; S.camY = st.camY;
  S.camX += ((st.camX || 0) - S.camX) * Math.min(1, (st.dt || 0.016) * 3);
  const W = G.cv.width, H = G.cv.height;
  gl.viewport(0, 0, W, H);
  const fy = 2 * Math.atan((view.h / 2) / P0), asp = view.w / view.h;
  // la caméra est placée pour que le plan de jeu (profondeur P0) corresponde à l'écran malgré l'inclinaison
  const cz = 0, cyOff = -P0 * Math.tan(TILT);
  const V = viewM(S.camX, S.camY + cyOff, cz, TILT), Pm = persp(fy, asp, 20, 30000), VP = mul(Pm, V);
  gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
  // ciel
  const sky = G.sky; gl.useProgram(sky.p);
  gl.uniform3fv(sky.U.uA, S.sky[0]); gl.uniform3fv(sky.U.uB, S.sky[1]); gl.uniform3fv(sky.U.uC, S.sky[2]);
  bindQuad(sky); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  // nébuleuses (de la plus lointaine à la plus proche) + étoiles intercalées
  const Q = G.quad; gl.useProgram(Q.p); gl.uniformMatrix4fv(Q.U.uVP, false, VP); bindQuad(Q);
  const drawPlane = (L, add) => {
    gl.blendFunc(gl.ONE, add ? gl.ONE : gl.ONE_MINUS_SRC_ALPHA);
    gl.bindTexture(gl.TEXTURE_2D, L.tex); gl.uniform1i(Q.U.uTex, 0);
    gl.uniform4f(Q.U.uTint, L.tint[0], L.tint[1], L.tint[2], L.a); gl.uniform1f(Q.U.uFog, 0);
    const y0 = S.camY - 1500, k0 = Math.floor(y0 / L.h);
    for (let k = k0; k < k0 + 4; k++) {
      gl.uniform3f(Q.U.uO, S.camX * 0 - L.w / 2, k * L.h, -L.depth); gl.uniform3f(Q.U.uU, L.w, 0, 0); gl.uniform3f(Q.U.uV, 0, L.h, 0); gl.uniform4f(Q.U.uUV, 0, 1, 1, -1);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
  };
  drawPlane(S.layers[0], false);
  // étoiles
  const Pt = G.pts; gl.useProgram(Pt.p); gl.uniformMatrix4fv(Pt.U.uVP, false, VP); gl.uniform3f(Pt.U.uCam, S.camX, S.camY, 0); gl.uniform1f(Pt.U.uPer, 14000); gl.uniform1f(Pt.U.uPx, W / view.w); gl.uniform1f(Pt.U.uT, S.t);
  gl.blendFunc(gl.ONE, gl.ONE); gl.bindVertexArray(S.stars.vao); gl.drawArrays(gl.POINTS, 0, S.stars.n); gl.bindVertexArray(null);
  // planète et lune (éclairées, avec profondeur)
  gl.enable(gl.DEPTH_TEST); gl.clear(gl.DEPTH_BUFFER_BIT); gl.depthFunc(gl.LEQUAL);
  gl.disable(gl.BLEND);
  for (const B of [S.planet, S.moon]) drawBody(S, B, VP);
  gl.enable(gl.BLEND);
  if (S.planet.ring) drawRing(S, S.planet, VP);
  gl.disable(gl.DEPTH_TEST);
  gl.useProgram(Q.p); bindQuad(Q);
  drawPlane(S.layers[1], true);
  // astéroïdes
  gl.enable(gl.DEPTH_TEST); gl.clear(gl.DEPTH_BUFFER_BIT); gl.disable(gl.BLEND);
  drawRocks(S, VP);
  gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND);
  gl.useProgram(Q.p); bindQuad(Q);
  drawPlane(S.layers[2], true);
  // poussières en traînées (vitesse)
  const Ln = G.line; gl.useProgram(Ln.p); gl.uniformMatrix4fv(Ln.U.uVP, false, VP); gl.uniform3f(Ln.U.uCam, S.camX, S.camY, 0); gl.uniform1f(Ln.U.uPer, 2200); gl.uniform1f(Ln.U.uLen, 26 + (st.speed || 1) * 24); gl.uniform4fv(Ln.U.uCol, S.dustCol);
  gl.blendFunc(gl.ONE, gl.ONE); gl.bindVertexArray(S.dust.vao); gl.drawArrays(gl.LINES, 0, S.dust.n); gl.bindVertexArray(null);
  gl.disable(gl.BLEND);
  return true;
}
function bindQuad(prog) { const gl = G.gl; gl.bindBuffer(gl.ARRAY_BUFFER, G.quadBuf); const l = prog.a('aQ'); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 2, gl.FLOAT, false, 0, 0); }
function wrapY(S, y, per) { const rel = ((y - S.camY + per * 0.3) % per + per) % per - per * 0.3; return S.camY + rel; }
function drawBody(S, B, VP) {
  const gl = G.gl, M = G.mesh; gl.useProgram(M.p);
  gl.uniformMatrix4fv(M.U.uVP, false, VP);
  const y = wrapY(S, B.y, B.period);
  gl.uniformMatrix4fv(M.U.uM, false, bodyM(B.x, y, B.z, B.r, B.tilt * 0.4, B.tilt, S.t * B.spin));
  gl.uniform1i(M.U.uKind, 0); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, B.tex); gl.uniform1i(M.U.uTex, 0);
  gl.uniform3fv(M.U.uSun, S.sun); gl.uniform3f(M.U.uCamP, S.camX, S.camY - P0 * Math.tan(TILT), 0); gl.uniform3fv(M.U.uAtm, B.atm); gl.uniform1f(M.U.uFog, 0);
  gl.bindVertexArray(S.sphere.vao); gl.drawArrays(gl.TRIANGLES, 0, S.sphere.n); gl.bindVertexArray(null);
}
function ringMesh(B) { // anneau incliné : bande continue (triangles), face éclairée / face dans l'ombre
  const R = B.ring, n = 120, ct = Math.cos(R.tilt), stt = Math.sin(R.tilt), P = [], T = [];
  const p = (a, r) => [Math.cos(a) * r, Math.sin(a) * r * ct, Math.sin(a) * r * stt];
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2, sh0 = 0.55 + 0.45 * Math.max(0, Math.sin(a0) + 0.3), sh1 = 0.55 + 0.45 * Math.max(0, Math.sin(a1) + 0.3);
    const q = [[p(a0, R.r0), 0, sh0], [p(a0, R.r1), 1, sh0], [p(a1, R.r1), 1, sh1], [p(a0, R.r0), 0, sh0], [p(a1, R.r1), 1, sh1], [p(a1, R.r0), 0, sh1]];
    for (const [pp, u, sh] of q) { P.push(...pp); T.push(u, 0.5, sh); }
  }
  return vaoOf(G.tri, [['aP', P, 3], ['aT', T, 3]], P.length / 3);
}
function drawRing(S, B, VP) {
  const gl = G.gl, Tp = G.tri, R = B.ring, y = wrapY(S, B.y, B.period);
  if (!R.vao) R.vao = ringMesh(B);
  gl.useProgram(Tp.p);
  // place l'anneau autour de la planète (translation + échelle par la matrice de vue-projection)
  const M = [B.r, 0, 0, 0, 0, B.r, 0, 0, 0, 0, B.r, 0, B.x, y, B.z, 1];
  gl.uniformMatrix4fv(Tp.U.uVP, false, mul(VP, M));
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, R.tex); gl.uniform1i(Tp.U.uTex, 0); gl.uniform1f(Tp.U.uA, 0.9);
  gl.bindVertexArray(R.vao.vao); gl.drawArrays(gl.TRIANGLES, 0, R.vao.n); gl.bindVertexArray(null);
}
function drawRocks(S, VP) {
  const gl = G.gl, M = G.mesh, R = S.rockDef; gl.useProgram(M.p);
  gl.uniformMatrix4fv(M.U.uVP, false, VP);
  gl.uniform1i(M.U.uKind, 1); gl.uniform3fv(M.U.uSun, S.sun); gl.uniform3f(M.U.uCamP, S.camX, S.camY - P0 * Math.tan(TILT), 0);
  gl.uniform3fv(M.U.uA, rgbF(R.a)); gl.uniform3fv(M.U.uB, rgbF(R.b)); gl.uniform3fv(M.U.uAtm, rgbF(lighten(S.pal.neb2, 0.2)).map((x) => x * 0.5)); gl.uniform3fv(M.U.uEmi, R.emi ? rgbF(R.emi) : [0, 0, 0]); gl.uniform1f(M.U.uAmb, 0.22); gl.uniform1f(M.U.uFog, 0.00028);
  for (const k of S.rocks) {
    const y = wrapY(S, k.y, S.rockPer), t = S.t;
    gl.uniformMatrix4fv(M.U.uM, false, modelM(k.x, y, k.z, k.s, k.r[0] + t * k.v[0], k.r[1] + t * k.v[1], k.r[2] + t * k.v[2]));
    const mb = S.rockMeshes[k.m]; gl.bindVertexArray(mb.vao); gl.drawArrays(gl.TRIANGLES, 0, mb.n);
  }
  gl.bindVertexArray(null);
}


// ================= Mondes planétaires : sol en vraie 3D + reliefs propres au biome =================
// Le sol (textures du terrain procédural) reste calé sur le défilement des ennemis au sol ;
// les reliefs qui s'élèvent vers la caméra se décalent en profondeur (parallaxe, perspective).
function toBuf(M) { // maillage gl3d -> tampons (couleur sRGB approchée + émission)
  const P = M.P, N = M.N, C = [];
  for (let i = 0; i < M.n; i++) C.push(Math.pow(M.C[i * 3], 1 / 2.2), Math.pow(M.C[i * 3 + 1], 1 / 2.2), Math.pow(M.C[i * 3 + 2], 1 / 2.2), Math.min(1, M.A[i * 4 + 2]));
  return meshBuf(P, N, C);
}
function propMesh(kind, pal, seed) {
  let s0 = seed * 9301 + 17; const R = () => ((s0 = (s0 * 16807) % 2147483647) / 2147483647);
  const M = new Mesh(), deco = pal.deco, deco2 = pal.deco2;
  const m = (hex, emi = 0) => mat('plastic', hex, { emi });
  if (kind === 'coral') {
    const br = (x, y, z, ax, ay, L, r, d) => {
      if (d <= 0) return;
      const ex = x + ax * L, ey = y + ay * L, ez = z + L;
      M.add(tube((t) => [x + (ex - x) * t, y + (ey - y) * t, z + (ez - z) * t], (t) => r * (1 - t * 0.35), m(d > 1 ? lightenH(deco, -0.2) : deco), { nA: 6, nR: 8 }));
      if (d === 1) M.add(sphere(r * 1.2, m(deco2, 0.9), { nu: 8, nv: 6 }), { t: [ex, ey, ez] });
      for (let k = 0; k < 2; k++) br(ex, ey, ez, ax + (R() - 0.5) * 1.2, ay + (R() - 0.5) * 1.2, L * 0.72, r * 0.68, d - 1);
    };
    br(0, 0, 0, 0, 0, 34 + R() * 20, 7 + R() * 3, 4);
  } else if (kind === 'swamp') {
    const H = 60 + R() * 50;
    M.add(tube((t) => [Math.sin(t * 3) * 4, 0, t * H], (t) => 5 * (1 - t * 0.5), m('#3a2a1e'), { nA: 10, nR: 8 }));
    for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI * 2 + R(); M.add(tube((t) => [Math.cos(a) * (14 - t * 14), Math.sin(a) * (14 - t * 14), t * 18], (t) => 2 + t, m('#2e2218'), { nA: 6, nR: 6 })); }
    for (let k = 0; k < 5; k++) M.add(superq(16 + R() * 10, 16 + R() * 10, 9, 1, 1, m(k % 2 ? '#1f4a34' : '#28563a')), { t: [(R() - 0.5) * 26, (R() - 0.5) * 26, H + R() * 10] });
    for (let k = 0; k < 6; k++) M.add(sphere(1.6, m(deco2, 1), { nu: 6, nv: 4 }), { t: [(R() - 0.5) * 40, (R() - 0.5) * 40, H + 8 + R() * 6] });
  } else if (kind === 'ice') {
    const n = 3 + Math.floor(R() * 4);
    for (let k = 0; k < n; k++) { const h = 30 + R() * 80, r = 5 + R() * 7; M.add(lathe([[r, 0], [r * 0.8, h * 0.7], [0, h]], mat('plastic', k % 2 ? '#bfe8ff' : '#8fd0ff', { emi: 0.12, flat: true }), { seg: 6, nv: 3 }), { t: [(R() - 0.5) * 24, (R() - 0.5) * 24, 0], r: [(R() - 0.5) * 0.5, (R() - 0.5) * 0.5, R() * 6] }); }
  } else if (kind === 'lava') {
    const n = 4 + Math.floor(R() * 4);
    for (let k = 0; k < n; k++) { const h = 20 + R() * 70, r = 6 + R() * 5, x = (R() - 0.5) * 30, y = (R() - 0.5) * 30; M.add(lathe([[r, 0], [r, h], [r * 0.85, h + 2], [0, h + 2]], mat('plastic', '#2a2426', { flat: true }), { seg: 6, nv: 4 }), { t: [x, y, 0] }); M.add(lathe([[r * 0.6, 0], [0, 0.6]], m('#ff6a1a', 1), { seg: 6 }), { t: [x, y, h + 2.2] }); }
  } else if (kind === 'dunes') {
    const lay = 5 + Math.floor(R() * 4); let r = 26 + R() * 14;
    for (let k = 0; k < lay; k++) { M.add(superq(r, r * (0.7 + R() * 0.3), 6, 0.5, 1, m(k % 2 ? '#d8a868' : '#b8804a')), { t: [0, 0, k * 10 + 5] }); r *= 0.86; }
  } else if (kind === 'mushroom') {
    const H = 50 + R() * 60, cr = 22 + R() * 14;
    M.add(tube((t) => [Math.sin(t * 2.5) * 5, 0, t * H], (t) => 5 + 2 * (1 - t), m('#efe6dc'), { nA: 10, nR: 10 }));
    M.add(superq(cr, cr, cr * 0.42, 1, 1, m(deco)), { t: [Math.sin(2.5) * 5, 0, H] });
    for (let k = 0; k < 9; k++) { const a = R() * 6.28, d = R() * cr * 0.8; M.add(sphere(2.2, m(deco2, 1), { nu: 6, nv: 4 }), { t: [Math.sin(2.5) * 5 + Math.cos(a) * d, Math.sin(a) * d, H + cr * 0.42 * Math.sqrt(Math.max(0, 1 - (d / cr) ** 2))] }); }
  } else {
    const n = 3 + Math.floor(R() * 3);
    for (let k = 0; k < n; k++) { const h = 30 + R() * 60, r = 8 + R() * 8; M.add(lathe([[r, 0], [r * 0.6, h * 0.6], [0, h]], m(k % 2 ? '#4a4458' : '#5c5470'), { seg: 7, nv: 3 }), { t: [(R() - 0.5) * 30, (R() - 0.5) * 30, 0] }); }
  }
  return toBuf(M);
}
function lightenH(hex, k) { const c = hexToRgb(hex); const f = (v) => Math.max(0, Math.min(255, Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k)))); return '#' + [f(c[0]), f(c[1]), f(c[2])].map((v) => v.toString(16).padStart(2, '0')).join(''); }
export function bg3dPlanetScene(def, bg) {
  if (!bg3dAvailable()) return null;
  const P = def.pal, kind = bg.groundKind || 'rock';
  const S = { planet: true, bg, pal: P, kind, tex: new Map(), t: 0, camX: 0, props: [], glowTex: texFrom(glowTexture(), false) };
  S.propMeshes = [0, 1, 2, 3, 4, 5].map((k) => propMesh(kind, P, hash32(def.seed || 1, 300 + k)));
  S.sun = [-0.55, 0.45, 0.8];
  return S;
}
function chunkProps(S, k) {
  const r = new RNG(hash32(k, 777, S.kind.length)), out = [], CHh = 640, n = 4 + Math.floor(r.next() * 4);
  for (let i = 0; i < n; i++) {
    const side = r.next() < 0.85 ? (r.next() < 0.5 ? -1 : 1) : 0;
    const x = side ? side * (view.w * 0.5 - r.range(8, 70)) : r.range(-60, 60);
    out.push({ m: Math.floor(r.next() * 6), x, y: (k + r.next()) * CHh - view.h / 2, s: side ? r.range(1.0, 1.9) : r.range(0.6, 1.0), rz: r.range(0, 6.28) });
  }
  return out;
}
export function bg3dRenderPlanet(S, st) {
  if (!S || !G || G.lost) return false;
  const gl = G.gl, bg = S.bg, CHh = 640;
  if (G.cv.width !== Math.round(view.cssW * Math.min(2, view.dpr) * 0.8)) resize3D();
  bg3dShow(true);
  S.t = st.t; S.camX += ((st.camX || 0) * 0.6 - S.camX) * Math.min(1, (st.dt || 0.016) * 3);
  const W = G.cv.width, H = G.cv.height; gl.viewport(0, 0, W, H);
  const fy = 2 * Math.atan((view.h / 2) / P0), asp = view.w / view.h, camY = bg.scroll;
  const VP = mul(persp(fy, asp, 20, 30000), viewM(S.camX, camY, 0, 0));
  gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  // sol : morceaux de terrain (texturés), calés sur le défilement du jeu
  const Q = G.quad; gl.useProgram(Q.p); gl.uniformMatrix4fv(Q.U.uVP, false, VP); bindQuad(Q); gl.uniform1f(Q.U.uFog, 0); gl.uniform1i(Q.U.uTex, 0);
  for (const [k, tx] of S.tex) if (!bg.chunks.has(k)) { gl.deleteTexture(tx); S.tex.delete(k); }
  const ox = S.camX - view.w / 2;
  for (const [k, ch] of bg.chunks) {
    if (!ch.done || !ch.feat) continue;
    let tx = S.tex.get(k); if (!tx) { tx = texFrom(ch.cv, false); S.tex.set(k, tx); }
    const yb = k * CHh - view.h / 2;
    gl.bindTexture(gl.TEXTURE_2D, tx);
    gl.uniform3f(Q.U.uO, ox, yb, -P0); gl.uniform3f(Q.U.uU, view.w, 0, 0); gl.uniform3f(Q.U.uV, 0, CHh + 1, 0); gl.uniform4f(Q.U.uUV, 0, 1, 1, -1); gl.uniform4f(Q.U.uTint, 1, 1, 1, 1);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  // lueurs du sol
  gl.blendFunc(gl.ONE, gl.ONE); gl.bindTexture(gl.TEXTURE_2D, S.glowTex);
  for (const [k, ch] of bg.chunks) { if (!ch.done) continue; const yt = (k + 1) * CHh - view.h / 2; for (const L of ch.lights) { const c = hexToRgb(L.c).map((v) => v / 255), r = L.r * (1 + 0.2 * Math.sin(S.t * 2 + L.x)); gl.uniform3f(Q.U.uO, ox + L.x - r, yt - L.y - r, -P0 + 1); gl.uniform3f(Q.U.uU, r * 2, 0, 0); gl.uniform3f(Q.U.uV, 0, r * 2, 0); gl.uniform4f(Q.U.uUV, 0, 0, 1, 1); gl.uniform4f(Q.U.uTint, c[0], c[1], c[2], 0.35); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); } }
  // ombres des reliefs (vers le bas à droite : soleil en haut à gauche)
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  const vis = [];
  const k0 = Math.floor((camY - view.h) / CHh), k1 = Math.floor((camY + view.h * 1.5) / CHh) + 1;
  for (let k = k0; k <= k1; k++) for (const pr of chunkProps(S, k)) vis.push(pr);
  for (const pr of vis) { const r = 34 * pr.s; gl.uniform3f(Q.U.uO, S.camX + pr.x - r + 14 * pr.s, pr.y - r - 14 * pr.s, -P0 + 0.5); gl.uniform3f(Q.U.uU, r * 2.2, 0, 0); gl.uniform3f(Q.U.uV, 0, r * 1.6, 0); gl.uniform4f(Q.U.uUV, 0, 0, 1, 1); gl.uniform4f(Q.U.uTint, 0, 0, 0, 0.5); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); }
  // reliefs 3D
  gl.disable(gl.BLEND); gl.enable(gl.DEPTH_TEST); gl.clear(gl.DEPTH_BUFFER_BIT);
  const Mp = G.mesh; gl.useProgram(Mp.p); gl.uniformMatrix4fv(Mp.U.uVP, false, VP);
  gl.uniform1i(Mp.U.uKind, 2); gl.uniform3fv(Mp.U.uSun, S.sun); gl.uniform3f(Mp.U.uCamP, S.camX, camY, 0); gl.uniform3fv(Mp.U.uAtm, rgbF(lightenH(S.pal.deco, 0.3)).map((x) => x * 0.6)); gl.uniform1f(Mp.U.uAmb, 0.16); gl.uniform1f(Mp.U.uFog, 0);
  for (const pr of vis) { gl.uniformMatrix4fv(Mp.U.uM, false, modelM(S.camX + pr.x, pr.y, -P0, pr.s, 0, 0, pr.rz)); const mb = S.propMeshes[pr.m]; gl.bindVertexArray(mb.vao); gl.drawArrays(gl.TRIANGLES, 0, mb.n); }
  gl.bindVertexArray(null); gl.disable(gl.DEPTH_TEST);
  return true;
}
