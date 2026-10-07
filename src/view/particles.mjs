// Particles in pooled InstancedMeshes: one draw per pool, nothing allocated per frame. The juice package keeps two
// pools, 300 particles in all: effects drawn on top of what made them (leaves, stars, coins) and effects that sit in the
// scene and hide behind buildings (dust, rings on the ground, smoke).
// Shapes are drawn in the fragment shader (soft dot, leaf, ring, sparkle star, coin), so no texture is loaded.
// Billboards face the camera; `flat` particles (rings, dust rings, tap marks) lie on the ground.
// After lightweight-game-objects' ParticlePool (swap-remove, fixed max, idle frames skip the upload).
import * as THREE from 'three';

export const SHAPE = { dot: 0, leaf: 1, ring: 2, star: 3, coin: 4 };
export const MAX_PARTICLES = 300;
const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), flatQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2), v = new THREE.Vector3(), s3 = new THREE.Vector3(), c = new THREE.Color();
// per particle: x y z | vx vy vz | age life | size0 size1 | gravity drag | shape flat | rot spin | alpha fadeIn
const F = 18;

export class Particles {
  constructor(scene, max = MAX_PARTICLES, { onTop = true } = {}) {
    this.max = max; this.n = 0; this.d = new Float32Array(max * F); this.col = new Float32Array(max * 3); this.budget = 1;
    const geo = new THREE.PlaneGeometry(1, 1);
    this.look = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4); this.look.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aLook', this.look);
    const mat = new THREE.ShaderMaterial({
      vertexShader: `attribute vec4 aLook; varying vec2 vUv; varying vec4 vLook; varying vec3 vCol;
        void main() {
          vUv = uv * 2.0 - 1.0; vLook = aLook;
          #ifdef USE_INSTANCING_COLOR
            vCol = instanceColor;
          #else
            vCol = vec3(1.0);
          #endif
          vec4 mv;
          if (aLook.w > 0.5) mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
          else {
            float s = length(instanceMatrix[0].xyz), r = aLook.z;
            vec2 p = mat2(cos(r), sin(r), -sin(r), cos(r)) * position.xy * s;
            mv = modelViewMatrix * vec4(instanceMatrix[3].xyz, 1.0); mv.xy += p;
          }
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `varying vec2 vUv; varying vec4 vLook; varying vec3 vCol;
        void main() {
          int shape = int(vLook.x + 0.5); float a; vec3 col = vCol; float r = length(vUv);
          if (shape == 0) { a = 1.0 - smoothstep(0.3, 1.0, r); a *= 0.6 + 0.4 * a; }
          else if (shape == 1) { vec2 p = vUv; float w = 0.42 * (1.0 - p.y * p.y); a = 1.0 - smoothstep(w - 0.08, w, abs(p.x)); a *= step(abs(p.y), 0.98);
            col *= 0.82 + 0.3 * (1.0 - abs(p.x) / max(w, 0.01)); }
          else if (shape == 2) { a = 1.0 - smoothstep(0.0, 0.16, abs(r - 0.78)); }
          else if (shape == 3) { vec2 p = abs(vUv); float st = min(p.x * 3.2 + p.y, p.y * 3.2 + p.x); a = 1.0 - smoothstep(0.55, 0.85, st); col = mix(col, vec3(1.0), (1.0 - smoothstep(0.0, 0.35, r)) * 0.8); }
          else { a = 1.0 - smoothstep(0.86, 0.96, r); float rim = smoothstep(0.62, 0.74, r); col *= mix(1.0, 0.72, rim) * (1.05 - 0.25 * vUv.y); col = mix(col, vec3(1.0, 0.98, 0.8), (1.0 - smoothstep(0.0, 0.25, length(vUv - vec2(-0.28, 0.3)))) * 0.85); }
          a *= vLook.y;
          if (a < 0.01) discard;
          gl_FragColor = vec4(col, a);
        }`,
      // effects read best on top of what made them (a pop inside a crop, smoke over a roof), as in Hay Day
      transparent: true, depthWrite: false, depthTest: !onTop,
    });
    this.mesh = new THREE.InstancedMesh(geo, mat, max);
    this.mesh.setColorAt(0, c.set('#ffffff'));                     // defines the instance colour now, not mid-game
    this.mesh.count = 0; this.mesh.frustumCulled = false; this.mesh.renderOrder = onTop ? 20 : 3; this.mesh.userData.particles = true;
    scene.add(this.mesh);
    this.idle = true;
  }
  get alive() { return this.n; }
  /**
   * Spawn one particle. o: { x, y, z, vx, vy, vz, life (s), size, size1, gravity, drag, shape, flat, rot, spin, color, alpha, fadeIn }.
   * Returns false when the pool is full (a big sweep simply shows fewer).
   */
  spawn(o) {
    if (this.n >= Math.floor(this.max * this.budget)) return false;
    const i = this.n++, d = this.d, b = i * F;
    d[b] = o.x; d[b + 1] = o.y ?? 0; d[b + 2] = o.z;
    d[b + 3] = o.vx ?? 0; d[b + 4] = o.vy ?? 0; d[b + 5] = o.vz ?? 0;
    d[b + 6] = 0; d[b + 7] = o.life ?? 0.6;
    d[b + 8] = o.size ?? 0.3; d[b + 9] = o.size1 ?? o.size ?? 0.3;
    d[b + 10] = o.gravity ?? 0; d[b + 11] = o.drag ?? 0;
    d[b + 12] = o.shape ?? 0; d[b + 13] = o.flat ? 1 : 0;
    d[b + 14] = o.rot ?? 0; d[b + 15] = o.spin ?? 0;
    d[b + 16] = o.alpha ?? 1; d[b + 17] = o.fadeIn ?? 0;
    c.set(o.color ?? '#ffffff'); this.col[i * 3] = c.r; this.col[i * 3 + 1] = c.g; this.col[i * 3 + 2] = c.b;
    this.idle = false;
    return true;
  }
  clear() { this.n = 0; this.mesh.count = 0; }
  update(dt) {
    if (this.idle) return;
    dt = Math.min(dt, 0.05);
    const d = this.d;
    for (let i = this.n - 1; i >= 0; i--) {
      const b = i * F;
      d[b + 6] += dt;
      if (d[b + 6] >= d[b + 7]) {               // dead: move the last one into this slot
        const last = --this.n;
        if (i !== last) { d.copyWithin(b, last * F, last * F + F); this.col.copyWithin(i * 3, last * 3, last * 3 + 3); }
        continue;
      }
      const drag = Math.max(0, 1 - d[b + 11] * dt);
      d[b + 4] -= d[b + 10] * dt;
      d[b + 3] *= drag; d[b + 4] *= drag; d[b + 5] *= drag;
      d[b] += d[b + 3] * dt; d[b + 1] += d[b + 4] * dt; d[b + 2] += d[b + 5] * dt;
      if (d[b + 10] > 0 && d[b + 1] < 0.05) { d[b + 1] = 0.05; d[b + 4] *= -0.3; d[b + 3] *= 0.6; d[b + 5] *= 0.6; }   // settle on the ground
      d[b + 14] += d[b + 15] * dt;
    }
    const look = this.look.array, ic = this.mesh.instanceColor.array;
    for (let i = 0; i < this.n; i++) {
      const b = i * F, k = d[b + 6] / d[b + 7], size = d[b + 8] + (d[b + 9] - d[b + 8]) * k;
      const fadeIn = d[b + 17] > 0 ? Math.min(1, k / d[b + 17]) : 1, fadeOut = k > 0.6 ? 1 - (k - 0.6) / 0.4 : 1;
      if (d[b + 13]) m4.compose(v.set(d[b], d[b + 1], d[b + 2]), q.copy(flatQ), s3.set(size, size, size));
      else m4.makeScale(size, size, size).setPosition(d[b], d[b + 1], d[b + 2]);
      this.mesh.setMatrixAt(i, m4);
      look[i * 4] = d[b + 12]; look[i * 4 + 1] = d[b + 16] * fadeIn * fadeOut; look[i * 4 + 2] = d[b + 14]; look[i * 4 + 3] = d[b + 13];
      ic[i * 3] = this.col[i * 3]; ic[i * 3 + 1] = this.col[i * 3 + 1]; ic[i * 3 + 2] = this.col[i * 3 + 2];
    }
    this.mesh.count = this.n;
    this.mesh.instanceMatrix.needsUpdate = true; this.look.needsUpdate = true; this.mesh.instanceColor.needsUpdate = true;
    if (!this.n) this.idle = true;
  }
}
