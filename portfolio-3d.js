/* ==========================================================================
   NELSON KUADJO — 3D INTERACTIVE PORTFOLIO ENGINE
   1. Three.js 3D Physics Lanyard Badge (Verlet Rope, RigidBody, Holographic Foil)
   2. WebGL2 3D Starfield & Interactive Particles + Meteors
   3. WebGL2 Paper Shaders Liquid Metal Animated Borders
   4. Conic Gradient BorderGlow Cards
   5. SVG Chromatic Refraction Liquid Glass Navbar
   6. Zenitsu Thunder Breathing (1st Form: Thunderclap & Flash) Interactive Portrait
   7. WebAudio SFX Synthesizer (Hover, Click, Thunder Flash, Warp, Success)
   ========================================================================== */

(function () {
  'use strict';

  // ==========================================================================
  // 1. WEBAUDIO SYNTHESIZER SFX ENGINE (+ ZENITSU THUNDER SFX)
  // ==========================================================================
  let audioCtx = null;
  let soundEnabled = localStorage.getItem('portfolio-sound') !== 'disabled';

  function getAudioContext() {
    if (!audioCtx && typeof window !== 'undefined') {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) audioCtx = new Ctx();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  }

  const SFX = {
    hover() {
      if (!soundEnabled) return;
      try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.04);
        gain.gain.setValueAtTime(0.035, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.04);
      } catch (e) {}
    },
    click() {
      if (!soundEnabled) return;
      try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.07, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } catch (e) {}
    },
    thunder() {
      if (!soundEnabled) return;
      try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        // High-speed electric crackle + thunder unsheathe sweep
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(240, now);
        osc.frequency.exponentialRampToValueAtTime(2200, now + 0.09);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.28);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.28);
      } catch (e) {}
    },
    success() {
      if (!soundEnabled) return;
      try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.08);
          gain.gain.setValueAtTime(0.06, now + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 0.25);
        });
      } catch (e) {}
    }
  };

  window.PortfolioSFX = {
    play: (name) => SFX[name] && SFX[name](),
    toggle: () => {
      soundEnabled = !soundEnabled;
      localStorage.setItem('portfolio-sound', soundEnabled ? 'enabled' : 'disabled');
      if (soundEnabled) SFX.click();
      return soundEnabled;
    },
    isEnabled: () => soundEnabled
  };

  // Global click SFX listener
  document.addEventListener('click', (e) => {
    if (!soundEnabled || !(e.target instanceof Element)) return;
    const btn = e.target.closest('button, a, [role="button"]');
    if (btn && !btn.disabled && btn.getAttribute('aria-disabled') !== 'true') {
      SFX.click();
    }
  }, true);

  // ==========================================================================
  // 2. WEBGL2 3D STARFIELD & PARTICLES ENGINE
  // ==========================================================================
  const PARTICLE_VS = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aCorner;
layout(location = 1) in vec3 aPosition;
layout(location = 2) in vec4 aRandom;
layout(location = 3) in vec3 aColor;
uniform mat3 uRotation;
uniform vec3 uOffset;
uniform float uSpread;
uniform float uTime;
uniform float uCamera;
uniform float uAspect;
uniform vec2 uView;
uniform float uRatio;
uniform float uSize;
uniform float uRandomness;
uniform float uGlow;
uniform float uTwinkle;
uniform float uTravel;
uniform float uReveal;
out vec2 vLocal;
out float vRadius;
out float vAlpha;
out float vHalo;
out float vSeed;
out vec3 vColor;

vec3 bob(vec4 r, float t) {
  return vec3(
    sin(t * r.z + 6.28 * r.w) * mix(0.1, 1.5, r.x),
    sin(t * r.y + 6.28 * r.x) * mix(0.1, 1.5, r.w),
    sin(t * r.w + 6.28 * r.y) * mix(0.1, 1.5, r.z)
  );
}

void main() {
  vec3 pos = aPosition * uSpread;
  pos.z *= 10.0;
  vec3 wobble = bob(aRandom, uTime);
  vec3 world = uRotation * pos + uOffset + wobble;
  float span = uSpread * 2.0 + 3.0;
  float k = mod(aRandom.w * span + uOffset.y + wobble.y + uTravel, span);
  world.y = k - span * 0.5;
  float edge = smoothstep(0.0, span * 0.12, k) * smoothstep(span, span * 0.88, k);

  vec3 view = world - vec3(0.0, 0.0, uCamera);
  float dist = length(view);
  float ahead = -view.z;
  if (ahead < 0.10 || ahead > 100.0) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    return;
  }
  edge *= smoothstep(1.0, 4.0, ahead);
  vec2 ndc = vec2(view.x * 7.595754 / uAspect, view.y * 7.595754) / ahead;
  vec2 screen = (ndc * 0.5 + 0.5) * uView;

  float diameter = (uRandomness <= 0.0 ? uSize : uSize * (1.0 + uRandomness * (aRandom.x - 0.5)) / dist);
  float device = diameter * uRatio;
  float radius = max(diameter, 1.0 / uRatio) * 0.5;
  float coverage = min(1.0, device * device);
  float halo = uGlow > 0.0 ? radius * 2.5 + 2.0 : 0.0;
  float extent = radius + halo + 1.5;

  float twinkle = 1.0 - uTwinkle * 0.6 * (0.5 + 0.5 * sin(uTime * (6.0 + aRandom.y * 14.0) + aRandom.w * 40.0));
  float far = smoothstep(100.0, 90.0, ahead);
  float reveal = clamp(uReveal * 1.6 - aRandom.z * 0.6, 0.0, 1.0);

  vLocal = aCorner * extent;
  vRadius = radius;
  vHalo = halo;
  vSeed = aRandom.y;
  vAlpha = min(1.0, coverage * twinkle) * far * edge * reveal * reveal;
  vColor = aColor;
  gl_Position = vec4((screen + aCorner * extent) / uView * 2.0 - 1.0, 0.0, 1.0);
}`;

  const PARTICLE_FS = `#version 300 es
precision highp float;
uniform float uGlow;
uniform float uRatio;
uniform float uTime;
uniform float uSoft;
uniform float uOpacity;
in vec2 vLocal;
in float vRadius;
in float vAlpha;
in float vHalo;
in float vSeed;
in vec3 vColor;
out vec4 outColor;

void main() {
  float soft = 0.7 / uRatio + vRadius * uSoft;
  float d = length(vLocal);
  float shape = 1.0 - smoothstep(vRadius - soft, vRadius + soft, d);
  float halo = vHalo > 0.0 ? exp(-d / (vHalo * 0.35)) * uGlow * 0.4 : 0.0;
  float alpha = clamp(shape + halo * (1.0 - shape), 0.0, 1.0) * vAlpha * uOpacity * (1.0 - uSoft);
  if (alpha < 0.002) discard;
  vec2 uv = vLocal / max(vRadius * 2.0, 0.0001) + 0.5;
  vec3 color = clamp(vColor + 0.2 * sin(uv.yxx + uTime + vSeed * 6.28), 0.0, 1.0);
  outColor = vec4(color * alpha, alpha);
}`;

  function compileProgram(gl, vsSrc, fsSrc) {
    const compile = (type, src) => {
      const sh = gl.createShader(type);
      if (!sh) return null;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        gl.deleteShader(sh);
        return null;
      }
      return sh;
    };
    const vs = compile(gl.VERTEX_SHADER, vsSrc);
    const fs = compile(gl.FRAGMENT_SHADER, fsSrc);
    if (!vs || !fs) return null;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      gl.deleteProgram(prog);
      return null;
    }
    const uniforms = {};
    const count = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < count; i++) {
      const info = gl.getActiveUniform(prog, i);
      if (info) uniforms[info.name.replace('[0]', '')] = gl.getUniformLocation(prog, info.name);
    }
    return { program: prog, uniforms };
  }

  function createPRNG(seed) {
    let t = seed >>> 0;
    return () => {
      t = (t + 1831565813) >>> 0;
      let e = t;
      e = Math.imul(e ^ (e >>> 15), e | 1);
      e ^= e + Math.imul(e ^ (e >>> 7), e | 61);
      return ((e ^ (e >>> 14)) >>> 0) / 4294967296;
    };
  }

  function initParticles(canvas) {
    if (!canvas) return;
    const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
    if (!gl) return;
    const progInfo = compileProgram(gl, PARTICLE_VS, PARTICLE_FS);
    if (!progInfo) return;

    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    const count = isMobile ? 280 : 660;
    const rand = createPRNG(1);

    const positions = new Float32Array(count * 3);
    const randoms = new Float32Array(count * 4);
    const colors = new Float32Array(count * 3);
    const palette = [
      [1.0, 1.0, 1.0],
      [0.95, 0.95, 0.98],
      [0.98, 0.45, 0.09],
      [1.0, 0.65, 0.30]
    ];

    for (let i = 0; i < count; i++) {
      let x, y, z, r2;
      do {
        x = rand() * 2 - 1;
        y = rand() * 2 - 1;
        z = rand() * 2 - 1;
        r2 = x * x + y * y + z * z;
      } while (r2 > 1 || r2 === 0);
      const s = Math.cbrt(rand());
      positions.set([x * s, y * s, z * s], i * 3);
      randoms.set([rand(), rand(), rand(), rand()], i * 4);
      colors.set(palette[Math.floor(rand() * palette.length)], i * 3);
    }

    const quadBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const rndBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, rndBuf);
    gl.bufferData(gl.ARRAY_BUFFER, randoms, gl.STATIC_DRAW);

    const colBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colBuf);
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const bindInstanced = (buf, loc, size) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
      gl.vertexAttribDivisor(loc, 1);
    };
    bindInstanced(posBuf, 1, 3);
    bindInstanced(rndBuf, 2, 4);
    bindInstanced(colBuf, 3, 3);
    gl.bindVertexArray(null);

    let viewW = 1, viewH = 1, ratio = 1;
    let clock = 0, travel = 0, lastT = 0;

    function resize() {
      viewW = Math.max(1, window.innerWidth);
      viewH = Math.max(1, window.innerHeight);
      const dpr = isMobile ? 1 : Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(viewW * dpr);
      canvas.height = Math.round(viewH * dpr);
      ratio = canvas.width / viewW;
    }
    window.addEventListener('resize', resize);
    resize();

    function render(now) {
      requestAnimationFrame(render);
      if (document.hidden) return;
      const dt = lastT ? Math.min(0.05, Math.max(0.0005, (now - lastT) / 1000)) : 1 / 60;
      lastT = now;
      clock += dt * 0.01;
      travel += dt * 0.54;

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

      const u = progInfo.uniforms;
      gl.useProgram(progInfo.program);
      gl.bindVertexArray(vao);
      gl.uniformMatrix3fv(u.uRotation, false, [1, 0, 0, 0, 1, 0, 0, 0, 1]);
      gl.uniform3f(u.uOffset, 0, 0, 0);
      gl.uniform1f(u.uSpread, 10.0);
      gl.uniform1f(u.uTime, clock);
      gl.uniform1f(u.uCamera, 20.0);
      gl.uniform1f(u.uAspect, viewW / viewH);
      gl.uniform2f(u.uView, viewW, viewH);
      gl.uniform1f(u.uRatio, ratio);
      gl.uniform1f(u.uSize, 40.0);
      gl.uniform1f(u.uRandomness, 2.0);
      gl.uniform1f(u.uGlow, 0.05);
      gl.uniform1f(u.uTwinkle, 0.25);
      gl.uniform1f(u.uTravel, travel);
      gl.uniform1f(u.uReveal, 1.0);
      gl.uniform1f(u.uSoft, 0.2);
      gl.uniform1f(u.uOpacity, 0.95);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
      gl.bindVertexArray(null);
    }
    requestAnimationFrame(render);
  }

  // ==========================================================================
  // 3. WEBGL2 PAPER SHADERS LIQUID METAL BORDERS
  // ==========================================================================
  const LIQUID_VS = `#version 300 es
precision mediump float;
layout(location = 0) in vec4 a_position;
uniform vec2 u_resolution;
uniform float u_pixelRatio;
uniform float u_scale;
uniform float u_rotation;
uniform float u_offsetX;
uniform float u_offsetY;
out vec2 v_objectUV;
out vec2 v_responsiveUV;
out vec2 v_responsiveBoxGivenSize;

vec3 getBoxSize(float boxRatio, vec2 givenBoxSize) {
  vec2 box = vec2(0.);
  box.x = boxRatio * min(givenBoxSize.x / boxRatio, givenBoxSize.y);
  float noFitBoxWidth = box.x;
  box.y = box.x / boxRatio;
  return vec3(box, noFitBoxWidth);
}

void main() {
  gl_Position = a_position;
  vec2 uv = gl_Position.xy * .5;
  vec2 boxOrigin = vec2(0.);
  vec2 givenBoxSize = max(u_resolution, vec2(1.)) * u_pixelRatio;
  float r = u_rotation * 3.14159265358979323846 / 180.;
  mat2 graphicRotation = mat2(cos(r), sin(r), -sin(r), cos(r));
  vec2 graphicOffset = vec2(-u_offsetX, u_offsetY);

  vec2 v_objectBoxSize = getBoxSize(1., u_resolution).xy;
  vec2 objectWorldScale = u_resolution.xy / v_objectBoxSize;
  v_objectUV = uv * objectWorldScale + graphicOffset;
  v_objectUV /= u_scale;
  v_objectUV = graphicRotation * v_objectUV;

  v_responsiveBoxGivenSize = u_resolution;
  float responsiveRatio = u_resolution.x / max(u_resolution.y, 1.0);
  vec2 responsiveBoxSize = getBoxSize(responsiveRatio, v_responsiveBoxGivenSize).xy;
  vec2 responsiveBoxScale = u_resolution.xy / responsiveBoxSize;
  v_responsiveUV = uv * responsiveBoxScale + graphicOffset;
  v_responsiveUV /= u_scale;
  v_responsiveUV.x *= responsiveRatio;
  v_responsiveUV = graphicRotation * v_responsiveUV;
  v_responsiveUV.x /= responsiveRatio;
}`;

  const LIQUID_FS = `#version 300 es
precision mediump float;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_softness;
uniform float u_repetition;
uniform float u_shiftRed;
uniform float u_shiftBlue;
uniform float u_distortion;
uniform float u_contour;
uniform float u_angle;
in vec2 v_objectUV;
in vec2 v_responsiveUV;
in vec2 v_responsiveBoxGivenSize;
out vec4 fragColor;

#define PI 3.14159265358979323846

vec2 rotate(vec2 uv, float th) {
  return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv;
}

vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float getColorChanges(float c1, float c2, float stripe_p, vec3 w, float blur, float bump) {
  float ch = mix(c2, c1, smoothstep(.0, 2. * blur, stripe_p));
  float border = w[0];
  ch = mix(ch, c2, smoothstep(border, border + 2. * blur, stripe_p));
  border = w[0] + .4 * (1. - bump) * w[1];
  ch = mix(ch, c1, smoothstep(border, border + 2. * blur, stripe_p));
  border = w[0] + .5 * (1. - bump) * w[1];
  ch = mix(ch, c2, smoothstep(border, border + 2. * blur, stripe_p));
  border = w[0] + w[1];
  ch = mix(ch, c1, smoothstep(border, border + 2. * blur, stripe_p));
  float gradient_t = (stripe_p - w[0] - w[1]) / w[2];
  float gradient = mix(c1, c2, smoothstep(0., 1., gradient_t));
  ch = mix(ch, gradient, smoothstep(border, border + .5 * blur, stripe_p));
  return ch;
}

void main() {
  float t = .3 * (u_time + 2.8);
  vec2 uv = v_objectUV + .5;
  uv.y = 1. - uv.y;
  float cycleWidth = u_repetition * 2.;

  vec2 rotatedUV = uv - vec2(.5);
  float angle = (-u_angle + 70.) * PI / 180.;
  rotatedUV = vec2(rotatedUV.x * cos(angle) - rotatedUV.y * sin(angle), rotatedUV.x * sin(angle) + rotatedUV.y * cos(angle)) + vec2(.5);

  vec2 borderUV = v_responsiveUV + .5;
  float ratio = v_responsiveBoxGivenSize.x / max(v_responsiveBoxGivenSize.y, 1.0);
  vec2 mask = min(borderUV, 1. - borderUV);
  vec2 pixel_thickness = min(250. / max(v_responsiveBoxGivenSize, vec2(1.0)), vec2(.5));
  float maskX = pow(smoothstep(0.0, pixel_thickness.x, mask.x), .25);
  float maskY = pow(smoothstep(0.0, pixel_thickness.y, mask.y), .25);
  float edge = clamp(1. - maskX * maskY, 0., 1.);
  edge = mix(smoothstep(.9 - 2. * fwidth(edge), .9, edge), edge, smoothstep(0.0, 0.4, u_contour));

  uv = v_responsiveUV;
  if (ratio > 1.) uv.y /= ratio; else uv.x *= ratio;
  uv += .5;
  uv.y = 1. - uv.y;

  float opacity = 1. - smoothstep(.9 - 2. * fwidth(edge), .9, edge);
  edge = 1.2 * edge;

  float diagBLtoTR = rotatedUV.x - rotatedUV.y;
  float diagTLtoBR = rotatedUV.x + rotatedUV.y;
  vec3 color1 = vec3(0.99, 0.96, 0.94);
  vec3 color2 = vec3(0.75, 0.26, 0.04 + 0.06 * smoothstep(.7, 1.3, diagTLtoBR));

  vec2 grad_uv = uv - .5;
  float dist = length(grad_uv + vec2(0., .2 * diagBLtoTR));
  grad_uv = rotate(grad_uv, (.25 - .2 * diagBLtoTR) * PI);
  float direction = grad_uv.x;

  float bump = (1. - pow(1.8 * dist, 1.2)) * pow(uv.y, .3);
  float thin_strip_1_ratio = .12 / cycleWidth * (1. - .4 * bump);
  float thin_strip_2_ratio = .07 / cycleWidth * (1. + .4 * bump);
  float wide_strip_ratio = (1. - thin_strip_1_ratio - thin_strip_2_ratio);

  float noise = snoise(uv - t);
  edge += (1. - edge) * u_distortion * noise;
  direction += diagBLtoTR - 2. * noise * diagBLtoTR * (smoothstep(0., 1., edge) * (1.0 - smoothstep(0., 1., edge)));
  bump *= clamp(pow(uv.y, .1), .3, 1.);
  direction *= (.1 + (1.1 - edge) * bump) * (.4 + .6 * (1.0 - smoothstep(.5, 1., edge)));
  direction += .18 * (smoothstep(.1, .2, uv.y) * (1.0 - smoothstep(.2, .4, uv.y)));
  direction *= (.5 + .5 * pow(uv.y, 2.)) * cycleWidth;
  direction -= t;

  float colorDispersion = clamp(1. - bump, 0., 1.);
  float dispersionRed = (colorDispersion + .03 * bump * noise - diagBLtoTR) * (u_shiftRed / 20.);
  float dispersionBlue = (colorDispersion * 1.3 - .2 * edge) * (u_shiftBlue / 20.);
  float blur = u_softness / 15.;

  vec3 w = vec3(cycleWidth * thin_strip_1_ratio, cycleWidth * thin_strip_2_ratio - .02 * smoothstep(.0, 1., edge + bump), wide_strip_ratio);
  float stripe_r = fract(direction + dispersionRed);
  float r = getColorChanges(color1.r, color2.r, stripe_r, w, blur + fwidth(stripe_r), bump);
  float stripe_g = fract(direction);
  float g = getColorChanges(color1.g, color2.g, stripe_g, w, blur + fwidth(stripe_g), bump);
  float stripe_b = fract(direction - dispersionBlue);
  float b = getColorChanges(color1.b, color2.b, stripe_b, w, blur + fwidth(stripe_b), bump);

  vec3 color = vec3(r, g, b) * opacity;
  fragColor = vec4(color, opacity);
}`;

  function initLiquidMetalBorders() {
    const borders = document.querySelectorAll('.liquid-metal-border');
    borders.forEach((el) => {
      if (el.dataset.initialized) return;
      el.dataset.initialized = 'true';
      const canvas = document.createElement('canvas');
      el.appendChild(canvas);
      const gl = canvas.getContext('webgl2', { alpha: true, antialias: false });
      if (!gl) return;
      const progInfo = compileProgram(gl, LIQUID_VS, LIQUID_FS);
      if (!progInfo) return;

      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
      const posLoc = gl.getAttribLocation(progInfo.program, 'a_position');
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

      let isVisible = false;
      let frame = 0, lastT = performance.now();

      const updateSize = () => {
        const rect = el.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.max(1, Math.round(rect.width * dpr));
        canvas.height = Math.max(1, Math.round(rect.height * dpr));
      };
      new ResizeObserver(updateSize).observe(el);
      updateSize();

      const loop = (now) => {
        if (!isVisible || document.hidden) return;
        requestAnimationFrame(loop);
        const dt = now - lastT;
        lastT = now;
        frame += dt * 0.6;

        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(progInfo.program);
        const u = progInfo.uniforms;
        gl.uniform1f(u.u_time, frame * 0.001);
        gl.uniform2f(u.u_resolution, canvas.width, canvas.height);
        gl.uniform1f(u.u_pixelRatio, Math.min(window.devicePixelRatio || 1, 2));
        gl.uniform1f(u.u_repetition, 4.0);
        gl.uniform1f(u.u_softness, 0.5);
        gl.uniform1f(u.u_shiftRed, 0.3);
        gl.uniform1f(u.u_shiftBlue, 0.3);
        gl.uniform1f(u.u_distortion, 0.0);
        gl.uniform1f(u.u_contour, 0.0);
        gl.uniform1f(u.u_angle, 45.0);
        gl.uniform1f(u.u_scale, 8.0);
        gl.uniform1f(u.u_rotation, 0.0);
        gl.uniform1f(u.u_offsetX, 0.1);
        gl.uniform1f(u.u_offsetY, -0.1);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      };

      new IntersectionObserver(([entry]) => {
        isVisible = entry.isIntersecting;
        if (isVisible) {
          lastT = performance.now();
          requestAnimationFrame(loop);
        }
      }).observe(el);
    });
  }
  window.initLiquidMetalBorders = initLiquidMetalBorders;

  // ==========================================================================
  // 4. BORDER-GLOW CARDS ENGINE (Tech Stack & Preview Cards)
  // ==========================================================================
  const GRAD_POS = ['80% 55%', '69% 34%', '8% 6%', '41% 38%', '86% 85%', '82% 18%', '51% 4%'];
  const GRAD_VARS = ['--gradient-one', '--gradient-two', '--gradient-three', '--gradient-four', '--gradient-five', '--gradient-six', '--gradient-seven'];
  const GRAD_IDX = [0, 1, 2, 0, 1, 2, 1];

  function setupBorderGlowCards() {
    document.querySelectorAll('.border-glow-card').forEach((card) => {
      if (card.dataset.glowReady) return;
      card.dataset.glowReady = 'true';
      const colors = (card.dataset.colors || '#ea580c,#f97316,#fb923c').split(',');
      GRAD_VARS.forEach((v, i) => {
        const c = colors[Math.min(GRAD_IDX[i], colors.length - 1)];
        card.style.setProperty(v, `radial-gradient(at ${GRAD_POS[i]}, ${c} 0px, transparent 50%)`);
      });
      card.style.setProperty('--gradient-base', `linear-gradient(${colors[0]} 0 100%)`);

      card.addEventListener('pointermove', (e) => {
        const rect = card.getBoundingClientRect();
        const rx = e.clientX - rect.left;
        const ry = e.clientY - rect.top;
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const dx = rx - cx;
        const dy = ry - cy;
        const lx = dx === 0 ? Infinity : cx / Math.abs(dx);
        const ly = dy === 0 ? Infinity : cy / Math.abs(dy);
        const prox = Math.min(Math.max(1 / Math.min(lx, ly), 0), 1);
        const angle = dx === 0 && dy === 0 ? 0 : ((180 / Math.PI) * Math.atan2(dy, dx) + 450) % 360;
        card.style.setProperty('--edge-proximity', (prox * 100).toFixed(3));
        card.style.setProperty('--cursor-angle', `${angle.toFixed(3)}deg`);
      });
    });
  }
  window.setupBorderGlowCards = setupBorderGlowCards;

  // ==========================================================================
  // 5. THREE.JS 3D INTERACTIVE LANYARD BADGE (Exact Physics + Foil Shader)
  // ==========================================================================
  const FOIL_VERT_COMMON = `
varying vec2 vFoilUv;
varying vec3 vFoilX;
varying vec3 vFoilY;
`;
  const FOIL_VERT_PROJECT = `
vFoilUv = uv;
vFoilX = normalize((modelViewMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz);
vFoilY = normalize((modelViewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
`;
  const FOIL_FRAG_COMMON = `
uniform float foilStrength;
uniform float foilAspect;
uniform vec3 foilKey;
uniform vec3 foilFill;
uniform vec3 foilTop;
varying vec2 vFoilUv;
varying vec3 vFoilX;
varying vec3 vFoilY;

float foilHash(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}
float foilBump(float t, float center, float width) {
  float x = (t - center) / width;
  return max(0.0, 1.0 - x * x);
}
vec3 foilSpectrum(float t) {
  return vec3(
    foilBump(t, 0.82, 0.32) + 0.4 * foilBump(t, 0.02, 0.12),
    foilBump(t, 0.5, 0.26),
    foilBump(t, 0.18, 0.24)
  );
}
vec3 foilGrating(float u, float spacing) {
  vec3 color = vec3(0.0);
  for (int m = 1; m <= 2; m++) {
    float order = float(m);
    float t = (spacing * abs(u) / order - 0.38) / 0.32;
    color += foilSpectrum(t) / order;
  }
  return color;
}
vec3 foilShard(vec2 p) {
  vec2 base = floor(p);
  float best = 9.0;
  float edge = 9.0;
  vec2 id = base;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 cell = base + vec2(float(i), float(j));
      vec2 site = cell + vec2(foilHash(cell), foilHash(cell + 7.31)) * 0.9 + 0.05;
      float d = length(site - p);
      if (d < best) { edge = best; best = d; id = cell; }
      else if (d < edge) { edge = d; }
    }
  }
  return vec3(foilHash(id + 3.17), foilHash(id + 11.73), edge - best);
}
`;
  const FOIL_FRAG_OPAQUE = `
if (foilStrength > 0.0) {
  vec3 foilView = normalize(vViewPosition);
  vec3 foilNormal = normalize(normal);
  vec2 foilP = vec2(vFoilUv.x, vFoilUv.y * foilAspect);
  vec3 shard = foilShard(foilP * 26.0);
  vec2 ray = foilP - vec2(-1.6, 2.6 * foilAspect);
  float angle = atan(ray.y, ray.x) + (shard.x - 0.5) * 0.16;
  vec3 grating = normalize(vFoilX * cos(angle) + vFoilY * sin(angle));
  float spacing = 1.7 * (0.95 + shard.y * 0.1);
  vec3 rainbow = foilGrating(dot(foilKey + foilView, grating), spacing);
  rainbow += 0.6 * foilGrating(dot(foilTop + foilView, grating), spacing);
  rainbow *= 0.8 + 0.2 * smoothstep(0.0, 0.04, shard.z);
  rainbow = max(rainbow - 0.35 * min(rainbow.r, min(rainbow.g, rainbow.b)), 0.0);
  vec2 grid = foilP * 64.0;
  vec2 cell = floor(grid);
  vec2 jitter = vec2(foilHash(cell + 1.7), foilHash(cell + 9.2));
  float flake = smoothstep(0.32, 0.06, length(fract(grid) - jitter * 0.6 - 0.2)) * step(0.45, foilHash(cell + 4.4));
  vec3 facet = normalize(foilNormal + (vFoilX * (jitter.x - 0.5) + vFoilY * (jitter.y - 0.5)) * 0.8);
  float glint = pow(max(dot(reflect(-foilKey, facet), foilView), 0.0), 28.0);
  glint += 0.7 * pow(max(dot(reflect(-foilTop, facet), foilView), 0.0), 28.0);
  float fine = 1.0 - smoothstep(0.35, 0.9, max(fwidth(grid.x), fwidth(grid.y)));
  vec3 sparkle = flake * glint * fine * (vec3(0.7) + foilGrating(dot(foilKey + foilView, grating) + jitter.x * 0.4, spacing));
  float ink = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
  float foil = foilStrength * (0.08 + 0.92 * smoothstep(0.04, 0.7, ink));
  float facing = clamp(dot(foilNormal, foilView), 0.0, 1.0);
  float tint = clamp(dot(rainbow, vec3(0.4)), 0.0, 1.0);
  outgoingLight = outgoingLight * (1.0 - foil * (0.3 + 0.32 * tint)) + (rainbow * 0.62 * (0.4 + 0.6 * facing) + sparkle * 1.6) * foil;
}
`;

  function initLanyard3D(container, THREE) {
    if (!container || !THREE) return;

    const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
    const lerp = (a, b, t) => a + (b - a) * t;

    const NODES = 4;
    const NODE_MASS_INV = 20;
    const SUBSTEP_DT = 1 / 960;
    const SOLVER_ITERS = 2;
    const STRAP_SEGS = 72;
    const FOV = 24;
    const STRAP_BASE_W = 0.36;
    const RING_R = 0.095;
    const RING_TUBE = 0.0135;
    const CLIP_R = 0.036;
    const TEX_RES = 1024;
    const STRAP_U = [0, 0.07, 0.93, 1];
    const STRAP_ANGLES = [-0.95, -0.28, 0.28, 0.95];

    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    const config = {
      frontImage: 'images/lanyard_front.webp',
      backImage: 'images/lanyard_back.webp',
      strapImage: 'images/lanyard_strap.webp',
      imageFit: 'cover',
      imagePadding: 0.035,
      cardColor: '#0b0d14',
      strapColor: '#11141e',
      orientation: 'portrait',
      finish: 'glossy',
      cornerRadius: 0.25,
      size: 0.62,
      anchor: isMobile ? 'center' : 'right',
      strapLength: 0.59,
      strapWidth: 0.62,
      metal: 'silver',
      gravity: 1.2,
      damping: 0.35,
      elasticity: 0.7,
      breeze: 0.1,
      interactive: true,
      autoFlip: true,
      intro: true
    };

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (e) {
      return;
    }
    renderer.setClearColor(0, 0);
    if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace || 'srgb';
    renderer.toneMapping = THREE.CustomToneMapping || 4;
    renderer.toneMappingExposure = 1;

    const canvas = renderer.domElement;
    canvas.className = 'lanyard-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    container.appendChild(canvas);

    const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const scene = new THREE.Scene();

    // Build Studio Lightbox Environment with PMREMGenerator
    const buildEnvironment = () => {
      const envScene = new THREE.Scene();
      envScene.background = new THREE.Color(0.035, 0.035, 0.045);
      const planeGeo = new THREE.PlaneGeometry(1, 1);
      const addLightPanel = (color, pos, scale, rotZ = 0) => {
        const col = Array.isArray(color)
          ? new THREE.Color(color[0], color[1], color[2])
          : new THREE.Color(color, color, color);
        const mat = new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide });
        const mesh = new THREE.Mesh(planeGeo, mat);
        mesh.position.set(...pos);
        mesh.scale.set(scale[0], scale[1], 1);
        mesh.lookAt(0, 0, 0);
        mesh.rotateZ(rotZ);
        envScene.add(mesh);
      };
      addLightPanel(2.6, [0, 4.5, 8], [9, 4]);
      addLightPanel(6.0, [-5.5, 0.5, 7], [0.9, 14]);
      addLightPanel([4.6, 3.2, 2.4], [5, -0.5, 8], [0.6, 14]);
      addLightPanel(3.5, [0, -1, 9], [24, 0.35], Math.PI / 3);
      addLightPanel(2.5, [1, 2.5, 9], [24, 0.2], Math.PI / 3);
      addLightPanel(1.4, [0, 6, -6], [12, 4]);
      addLightPanel(0.5, [0, -7, 1], [16, 6]);
      addLightPanel([1.3, 0.92, 0.72], [8, 0, -2], [4, 10]);
      const pmrem = new THREE.PMREMGenerator(renderer);
      const rt = pmrem.fromScene(envScene, 0.035);
      pmrem.dispose();
      return rt;
    };
    const envRT = buildEnvironment();
    scene.environment = envRT.texture;

    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 200);
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
    keyLight.position.set(-2.5, 4, 6);
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.35);
    fillLight.position.set(3, -1, 4);
    scene.add(keyLight, fillLight);

    // Procedural Normal Maps for Card Micro-grain & Woven Fabric Strap
    const createCardNormalMap = () => {
      const c = document.createElement('canvas');
      c.width = 128; c.height = 128;
      const ctx = c.getContext('2d');
      const rng = createPRNG(7);
      const noise = Float32Array.from({ length: 16384 }, () => rng());
      const sample = (x, y) => {
        let sum = 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++)
            sum += noise[((y + dy + 128) % 128) * 128 + ((x + dx + 128) % 128)];
        return (sum / 9) * 1.6;
      };
      const imgData = ctx.createImageData(128, 128);
      for (let y = 0; y < 128; y++) {
        for (let x = 0; x < 128; x++) {
          const nx = sample((x - 1 + 128) % 128, y) - sample((x + 1) % 128, y);
          const ny = sample(x, (y - 1 + 128) % 128) - sample(x, (y + 1) % 128);
          const len = Math.hypot(nx, ny, 1);
          const idx = (y * 128 + x) * 4;
          imgData.data[idx] = ((nx / len) * 0.5 + 0.5) * 255;
          imgData.data[idx + 1] = ((ny / len) * 0.5 + 0.5) * 255;
          imgData.data[idx + 2] = ((1 / len) * 0.5 + 0.5) * 255;
          imgData.data[idx + 3] = 255;
        }
      }
      ctx.putImageData(imgData, 0, 0);
      const tex = new THREE.CanvasTexture(c);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(5, 7);
      return tex;
    };

    const createStrapNormalMap = () => {
      const rng = createPRNG(19);
      const noise = Float32Array.from({ length: 16384 }, () => rng());
      const arch = (v) => Math.sqrt(Math.max(0, 1 - 4 * v * v));
      const weave = (x, y) => {
        const ix = (x % 128 + 128) % 128;
        const iy = (y % 128 + 128) % 128;
        const gx = (ix / 128) * 8;
        const gy = (iy / 128) * 8;
        const cx = Math.floor(gx), cy = Math.floor(gy);
        const ux = gx - cx - 0.5, uy = gy - cy - 0.5;
        const even = (cx + cy) % 2 === 0;
        const px = arch(ux) * (0.55 + 0.45 * Math.cos(uy * Math.PI * (even ? 1 : 0.6)));
        const py = arch(uy) * (0.55 + 0.45 * Math.cos(ux * Math.PI * (even ? 0.6 : 1)));
        return (even ? Math.max(px, py * 0.7) : Math.max(py, px * 0.7)) + noise[iy * 128 + ix] * 0.08;
      };
      const data = new Uint8Array(65536);
      for (let y = 0; y < 128; y++) {
        for (let x = 0; x < 128; x++) {
          const nx = (weave(x - 1, y) - weave(x + 1, y)) * 1.6;
          const ny = (weave(x, y - 1) - weave(x, y + 1)) * 1.6;
          const len = Math.hypot(nx, ny, 1);
          const idx = (y * 128 + x) * 4;
          data[idx] = ((nx / len) * 0.5 + 0.5) * 255;
          data[idx + 1] = ((ny / len) * 0.5 + 0.5) * 255;
          data[idx + 2] = ((1 / len) * 0.5 + 0.5) * 255;
          data[idx + 3] = 255;
        }
      }
      const tex = new THREE.DataTexture(data, 128, 128);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.generateMipmaps = true;
      tex.needsUpdate = true;
      return tex;
    };

    const frontCanvas = document.createElement('canvas');
    const backCanvas = document.createElement('canvas');
    const strapCanvas = document.createElement('canvas');
    const createCanvasTex = (cvs, isStrap = false) => {
      const tex = new THREE.CanvasTexture(cvs);
      if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace || 'srgb';
      tex.anisotropy = maxAniso;
      if (isStrap) {
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.RepeatWrapping;
      }
      return tex;
    };
    let frontTex = createCanvasTex(frontCanvas, false);
    let backTex = createCanvasTex(backCanvas, false);
    let strapTex = createCanvasTex(strapCanvas, true);

    const cardNormal = createCardNormalMap();
    const strapNormal = createStrapNormalMap();

    const foilUniforms = {
      foilStrength: { value: 0.18 }, // Subtle holographic foil shimmer!
      foilAspect: { value: 1.5 },
      foilKey: { value: new THREE.Vector3() },
      foilFill: { value: new THREE.Vector3() },
      foilTop: { value: new THREE.Vector3() }
    };

    const applyFoilShader = (shader) => {
      Object.assign(shader.uniforms, foilUniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${FOIL_VERT_COMMON}`)
        .replace('#include <project_vertex>', `#include <project_vertex>\n${FOIL_VERT_PROJECT}`);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\n${FOIL_FRAG_COMMON}`)
        .replace('#include <opaque_fragment>', `${FOIL_FRAG_OPAQUE}\n#include <opaque_fragment>`);
    };

    const frontMat = new THREE.MeshPhysicalMaterial({
      map: frontTex,
      normalMap: cardNormal,
      normalScale: new THREE.Vector2(0.06, 0.06),
      roughness: 0.42,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.06
    });
    const backMat = new THREE.MeshPhysicalMaterial({
      map: backTex,
      normalMap: cardNormal,
      normalScale: new THREE.Vector2(0.06, 0.06),
      roughness: 0.42,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.06
    });
    frontMat.onBeforeCompile = applyFoilShader;
    backMat.onBeforeCompile = applyFoilShader;

    const bodyMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0.05, 0.05, 0.07),
      roughness: 0.32,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.08
    });
    const metalMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#d9dce2'),
      metalness: 1,
      roughness: 0.16
    });
    const strapMat = new THREE.MeshPhysicalMaterial({
      map: strapTex,
      normalMap: strapNormal,
      normalScale: new THREE.Vector2(0.7, 0.7),
      roughness: 0.68,
      sheen: 1,
      sheenRoughness: 0.42,
      sheenColor: new THREE.Color(0.32, 0.32, 0.34),
      side: THREE.DoubleSide
    });

    // Helper: draw rounded rect path
    const drawRoundedRect = (path, x, y, w, h, r) => {
      const cr = Math.max(0, Math.min(r, w / 2, h / 2));
      const c = cr * 0.4477;
      path.moveTo(x + cr, y);
      path.lineTo(x + w - cr, y);
      path.bezierCurveTo(x + w - c, y, x + w, y + c, x + w, y + cr);
      path.lineTo(x + w, y + h - cr);
      path.bezierCurveTo(x + w, y + h - c, x + w - c, y + h, x + w - cr, y + h);
      path.lineTo(x + cr, y + h);
      path.bezierCurveTo(x + c, y + h, x, y + h - c, x, y + h - cr);
      path.lineTo(x, y + cr);
      path.bezierCurveTo(x, y + c, x + c, y, x + cr, y);
    };

    const cardSpecs = {
      width: 1.6,
      height: 2.4,
      radius: lerp(0.03, 1.6 * 0.2, config.cornerRadius),
      slot: { width: 0.34, height: 0.07, y: 1.2 - 0.13 },
      ringY: 1.2 - 0.055,
      hangY: 1.2 - 0.055 + RING_R
    };

    const buildCardGeometries = (spec) => {
      const { width: w, height: h, radius: r, slot } = spec;
      const b = 0.007;
      const shape = new THREE.Shape();
      drawRoundedRect(shape, -w / 2 + b, -h / 2 + b, w - b * 2, h - b * 2, Math.max(r - b, 0.005));
      const hole = new THREE.Path();
      drawRoundedRect(hole, -slot.width / 2 - b, slot.y - slot.height / 2 - b, slot.width + b * 2, slot.height + b * 2, slot.height / 2 + b);
      shape.holes.push(hole);

      const bodyGeo = new THREE.ExtrudeGeometry(shape, {
        depth: 0.018,
        bevelEnabled: true,
        bevelThickness: b,
        bevelSize: b,
        bevelSegments: 5,
        curveSegments: 24
      });
      bodyGeo.translate(0, 0, -0.009);

      const faceGeo = new THREE.ShapeGeometry(shape, 24);
      const pos = faceGeo.getAttribute('position');
      const uv = faceGeo.getAttribute('uv');
      for (let i = 0; i < pos.count; i++) {
        uv.setXY(i, (pos.getX(i) + w / 2) / w, (pos.getY(i) + h / 2) / h);
      }
      uv.needsUpdate = true;
      return { body: bodyGeo, face: faceGeo };
    };

    const buildClampGeo = (sw) => {
      const shape = new THREE.Shape();
      const w = sw * 1.16;
      drawRoundedRect(shape, -w / 2 + 0.014, -0.061, w - 0.028, 0.122, 0.024);
      const geo = new THREE.ExtrudeGeometry(shape, {
        depth: 0.02,
        bevelEnabled: true,
        bevelThickness: 0.014,
        bevelSize: 0.014,
        bevelSegments: 6,
        curveSegments: 10
      });
      geo.translate(0, 0, -0.01);
      return geo;
    };

    const buildStrapGeo = (segs) => {
      const cols = STRAP_U.length;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(segs * cols * 3), 3));
      geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(segs * cols * 3), 3));
      geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(segs * cols * 2), 2));
      const indices = [];
      for (let r = 0; r < segs - 1; r++) {
        for (let c = 0; c < cols - 1; c++) {
          const i = r * cols + c;
          indices.push(i, i + cols, i + 1, i + 1, i + cols, i + cols + 1);
        }
      }
      geo.setIndex(indices);
      return geo;
    };

    const cardGeos = buildCardGeometries(cardSpecs);
    const cardGroup = new THREE.Group();
    const bodyMesh = new THREE.Mesh(cardGeos.body, bodyMat);
    const frontMesh = new THREE.Mesh(cardGeos.face, frontMat);
    const backMesh = new THREE.Mesh(cardGeos.face.clone(), backMat);
    frontMesh.position.z = 0.0166;
    backMesh.rotation.y = Math.PI;
    backMesh.position.z = -0.0166;

    const ringMesh = new THREE.Mesh(new THREE.TorusGeometry(RING_R, RING_TUBE, 18, 72), metalMat);
    ringMesh.rotation.y = Math.PI / 2 - 0.7;
    ringMesh.position.set(0, cardSpecs.ringY, 0);
    cardGroup.add(bodyMesh, frontMesh, backMesh, ringMesh);
    rootGroup.add(cardGroup);

    const strapWidthScaled = STRAP_BASE_W * config.strapWidth;
    const strapGeo = buildStrapGeo(STRAP_SEGS);
    const strapMesh = new THREE.Mesh(strapGeo, strapMat);
    strapMesh.frustumCulled = false;
    rootGroup.add(strapMesh);

    const clipGroup = new THREE.Group();
    const clampMesh = new THREE.Mesh(buildClampGeo(strapWidthScaled), metalMat);
    clampMesh.position.y = 0.107;
    const hookMesh = new THREE.Mesh(new THREE.TorusGeometry(CLIP_R, 0.0105, 14, 40), metalMat);
    clipGroup.add(clampMesh, hookMesh);
    rootGroup.add(clipGroup);

    // Paint textures onto canvases
    const paintFace = (cvs, img, pad) => {
      cvs.width = TEX_RES;
      cvs.height = Math.round(TEX_RES * (cardSpecs.height / cardSpecs.width));
      const ctx = cvs.getContext('2d');
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, cvs.width, cvs.height);
      if (img) {
        const px = cvs.width * pad;
        const py = cvs.height * pad;
        const iw = cvs.width - px * 2;
        const ih = cvs.height - py * 2;
        ctx.save();
        ctx.beginPath();
        ctx.rect(px, py, iw, ih);
        ctx.clip();
        ctx.translate(px, py);
        const scale = Math.max(iw / img.width, ih / img.height);
        const dw = img.width * scale;
        const dh = img.height * scale;
        ctx.drawImage(img, (iw - dw) / 2, (ih - dh) / 2, dw, dh);
        ctx.restore();
      }
    };

    let strapRepeatRatio = 2;
    const paintStrap = (cvs, img) => {
      const h = img ? Math.max(64, Math.round((img.width / img.height) * 192)) : 384;
      cvs.width = 192;
      cvs.height = h;
      const ctx = cvs.getContext('2d');
      ctx.fillStyle = '#0c0f18';
      ctx.fillRect(0, 0, 192, h);
      if (img) {
        ctx.save();
        ctx.translate(192, 0);
        ctx.rotate(Math.PI / 2);
        ctx.drawImage(img, 0, 0, h, 192);
        ctx.restore();
      }
      strapRepeatRatio = h / 192;
      strapNormal.repeat.set(2, 2 * strapRepeatRatio);
    };

    const loadImg = (url) => new Promise((res) => {
      const i = new Image();
      if (/^https?:\/\//i.test(url)) i.crossOrigin = 'anonymous';
      i.onload = () => res(i);
      i.onerror = () => res(null);
      i.src = url;
    });

    const replaceCanvasTex = (oldTex, cvs, mat, isStrap = false) => {
      if (oldTex) oldTex.dispose();
      const nextTex = createCanvasTex(cvs, isStrap);
      nextTex.needsUpdate = true;
      mat.map = nextTex;
      mat.needsUpdate = true;
      return nextTex;
    };

    Promise.all([loadImg(config.frontImage), loadImg(config.backImage), loadImg(config.strapImage)]).then(([fImg, bImg, sImg]) => {
      paintFace(frontCanvas, fImg, config.imagePadding);
      paintFace(backCanvas, bImg || fImg, config.imagePadding);
      paintStrap(strapCanvas, sImg);
      frontTex = replaceCanvasTex(frontTex, frontCanvas, frontMat, false);
      backTex = replaceCanvasTex(backTex, backCanvas, backMat, false);
      strapTex = replaceCanvasTex(strapTex, strapCanvas, strapMat, true);
    });

    // Physics State
    const makeVecs = () => Array.from({ length: 5 }, () => new THREE.Vector3());
    const sim = {
      nodes: makeVecs(),
      previous: makeVecs(),
      velocities: makeVecs(),
      lengths: new Float64Array(NODES),
      impulses: new Float64Array(NODES),
      rest: 1,
      anchor: new THREE.Vector3(),
      body: {
        position: new THREE.Vector3(),
        previous: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        quaternion: new THREE.Quaternion(),
        previousQuaternion: new THREE.Quaternion(),
        angular: new THREE.Vector3(),
        mass: 1,
        inverseInertia: new THREE.Vector3(1, 1, 1),
        hang: new THREE.Vector3()
      },
      grab: null,
      turn: 0,
      twist: 0,
      twistRaw: 0,
      calm: 0
    };

    const scratch = {
      a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3(),
      d: new THREE.Vector3(), e: new THREE.Vector3(), f: new THREE.Vector3(),
      g: new THREE.Vector3(), pin: new THREE.Vector3(),
      q: new THREE.Quaternion(), r: new THREE.Quaternion()
    };

    const applyWorldInertia = (body, vec, out) => {
      scratch.r.copy(body.quaternion).invert();
      out.copy(vec).applyQuaternion(scratch.r);
      out.set(out.x * body.inverseInertia.x, out.y * body.inverseInertia.y, out.z * body.inverseInertia.z);
      return out.applyQuaternion(body.quaternion);
    };

    const integrateQuat = (q, omegaDt) => {
      const { x, y, z, w } = q;
      q.x += 0.5 * (omegaDt.x * w + omegaDt.y * z - omegaDt.z * y);
      q.y += 0.5 * (omegaDt.y * w + omegaDt.z * x - omegaDt.x * z);
      q.z += 0.5 * (omegaDt.z * w + omegaDt.x * y - omegaDt.y * x);
      q.w += 0.5 * (-omegaDt.x * x - omegaDt.y * y - omegaDt.z * z);
      q.normalize();
    };

    const effectiveInvMass = (body, arm, dir) => {
      const cross = scratch.c.crossVectors(arm, dir);
      return 1 / body.mass + cross.dot(applyWorldInertia(body, cross, scratch.d));
    };

    const applyBodyImpulse = (body, arm, impulse) => {
      body.position.addScaledVector(impulse, 1 / body.mass);
      integrateQuat(body.quaternion, applyWorldInertia(body, scratch.e.crossVectors(arm, impulse), scratch.f));
    };

    const solveSegment = (s, idx, dt, params) => {
      const { nodes, body } = s;
      const p0 = nodes[idx];
      const w0 = idx === 0 ? 0 : NODE_MASS_INV;
      const isLast = idx === 3;
      const arm = scratch.g;
      let p1 = nodes[idx + 1];
      if (isLast) {
        arm.copy(body.hang).applyQuaternion(body.quaternion);
        p1 = scratch.b.copy(body.position).add(arm);
      }
      const delta = scratch.a.subVectors(p1, p0);
      const dist = delta.length();
      const stretch = dist - s.rest;
      if (stretch <= 0 || dist < 1e-9) return;
      const dir = delta.divideScalar(dist);
      const w1 = isLast ? effectiveInvMass(body, arm, dir) : NODE_MASS_INV;
      const relVel = (dist - s.lengths[idx]) / dt;
      const force = (params.hold * Math.tanh((params.stiffness * stretch) / params.hold) + params.spring * stretch + params.bandDamping * Math.max(0, relVel)) * dt * dt - s.impulses[idx];
      if (force <= 0) return;
      const imp = Math.min(stretch / (w0 + w1), force);
      s.impulses[idx] += imp;
      if (w0) p0.addScaledVector(dir, imp * w0);
      if (isLast) applyBodyImpulse(body, arm, dir.multiplyScalar(-imp));
      else p1.addScaledVector(dir, -imp * w1);
    };

    const solveGrab = (body, grab, targetPin) => {
      const arm = scratch.g.copy(grab.local).applyQuaternion(body.quaternion);
      const err = scratch.a.copy(targetPin).sub(body.position).sub(arm);
      const dist = err.length();
      if (dist < 1e-9) return;
      const dir = err.divideScalar(dist);
      const mag = dist / effectiveInvMass(body, arm, dir);
      applyBodyImpulse(body, arm, dir.multiplyScalar(mag));
    };

    const resetSim = (withIntroDrop) => {
      const { nodes, previous, velocities, body, anchor } = sim;
      nodes[0].copy(anchor);
      for (let i = 1; i <= NODES; i++) {
        nodes[i].copy(nodes[i - 1]);
        if (withIntroDrop) nodes[i].x += sim.rest;
        else nodes[i].y -= sim.rest;
      }
      body.quaternion.identity();
      if (withIntroDrop) body.quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2);
      body.hang.set(0, cardSpecs.hangY, 0);
      const arm = scratch.a.copy(body.hang).applyQuaternion(body.quaternion);
      body.position.copy(nodes[NODES]).sub(arm);
      body.previous.copy(body.position);
      body.previousQuaternion.copy(body.quaternion);
      body.velocity.set(0, 0, 0);
      body.angular.set(0, 0, 0);
      if (withIntroDrop) {
        body.velocity.set(-4.5, -1.5, 0);
        body.angular.z = -5.5;
      }
      for (let i = 0; i <= NODES; i++) {
        previous[i].copy(nodes[i]);
        velocities[i].set(0, 0, 0);
      }
      sim.lengths.fill(sim.rest);
      sim.turn = 0;
      sim.twist = 0;
      sim.twistRaw = 0;
      sim.calm = 0;
    };

    const stepPhysics = (dt, params, elapsed) => {
      const steps = Math.max(1, Math.ceil(dt / SUBSTEP_DT - 1e-6));
      const h = dt / steps;
      const { nodes, previous, velocities, body } = sim;
      const windX = params.breeze * (Math.sin(elapsed * 0.53) * 0.7 + Math.sin(elapsed * 1.31 + 1.7) * 0.3) * 3;
      const windZ = params.breeze * Math.sin(elapsed * 0.37 + 0.6) * 2;
      const grab = sim.grab;
      const pin = scratch.pin;
      const nodeDecay = Math.exp(-params.nodeDrag * h);
      const linDecay = Math.exp(-params.linearDrag * h);
      const angDecay = Math.exp(-params.angularDrag * h);

      for (let s = 0; s < steps; s++) {
        for (let i = 1; i < NODES; i++) {
          const v = velocities[i];
          v.y -= params.gravity * h;
          v.x += windX * h;
          v.z += windZ * h;
          previous[i].copy(nodes[i]);
          nodes[i].addScaledVector(v, h);
        }
        body.previous.copy(body.position);
        body.previousQuaternion.copy(body.quaternion);
        const q = body.quaternion;
        if (grab) {
          const dq = scratch.q.copy(grab.rotation).multiply(scratch.r.copy(q).invert());
          if (dq.w < 0) dq.set(-dq.x, -dq.y, -dq.z, -dq.w);
          const torque = scratch.a.set(dq.x, dq.y, dq.z).multiplyScalar(2 * params.grip);
          torque.addScaledVector(body.angular, -params.gripDamping);
          body.angular.addScaledVector(applyWorldInertia(body, torque, scratch.b), h);
        }
        const upAxis = scratch.a.set(0, 1, 0).applyQuaternion(q);
        const proj = scratch.b.set(-upAxis.x * upAxis.z, -upAxis.y * upAxis.z, 1 - upAxis.z * upAxis.z);
        if (proj.lengthSq() > 0.001) {
          const fwd = scratch.d.set(0, 0, 1).applyQuaternion(q);
          const angle = Math.atan2(scratch.e.crossVectors(proj, fwd).dot(upAxis), proj.dot(fwd));
          let diff = angle - sim.twistRaw;
          if (diff > Math.PI) diff -= Math.PI * 2;
          else if (diff < -Math.PI) diff += Math.PI * 2;
          sim.twist += diff;
          sim.twistRaw = angle;
        }
        if (!grab) {
          const spin = body.angular.dot(upAxis);
          body.angular.addScaledVector(upAxis, (params.twist * (sim.turn - sim.twist) - params.twistDamping * spin) * h);
        }
        body.velocity.y -= params.gravity * h;
        body.velocity.x += windX * 0.35 * h;
        body.velocity.z += windZ * 0.35 * h;
        body.position.addScaledVector(body.velocity, h);
        integrateQuat(body.quaternion, scratch.f.copy(body.angular).multiplyScalar(h));
        sim.impulses.fill(0);
        if (grab) pin.lerpVectors(grab.from, grab.target, (s + 1) / steps);
        for (let it = 0; it < SOLVER_ITERS; it++) {
          for (let i = 0; i < NODES; i++) solveSegment(sim, i, h, params);
          if (grab) solveGrab(body, grab, pin);
        }
        for (let i = 1; i < NODES; i++) {
          const v = velocities[i].subVectors(nodes[i], previous[i]).divideScalar(h).multiplyScalar(nodeDecay);
          v.multiplyScalar(1 / (1 + params.nodeAir * v.length() * h));
        }
        body.velocity.subVectors(body.position, body.previous).divideScalar(h);
        const dq = scratch.q.copy(body.previousQuaternion).invert().premultiply(body.quaternion);
        body.angular.set(dq.x, dq.y, dq.z).multiplyScalar((2 / h) * (dq.w < 0 ? -1 : 1));
        const normal = scratch.a.set(0, 0, 1).applyQuaternion(body.quaternion);
        const vNorm = body.velocity.dot(normal);
        const vTang = scratch.b.copy(body.velocity).addScaledVector(normal, -vNorm);
        vTang.multiplyScalar(1 / (1 + params.air * vTang.length() * h));
        body.velocity.copy(vTang).addScaledVector(normal, vNorm / (1 + params.broadside * Math.abs(vNorm) * h)).multiplyScalar(linDecay);
        body.angular.multiplyScalar(angDecay / (1 + params.spinAir * body.angular.length() * h));
        if (body.velocity.lengthSq() > 3600) body.velocity.setLength(60);
        if (body.angular.lengthSq() > 1600) body.angular.setLength(40);
        nodes[NODES].copy(body.hang).applyQuaternion(body.quaternion).add(body.position);
        for (let i = 0; i < NODES; i++) sim.lengths[i] = nodes[i].distanceTo(nodes[i + 1]);
      }
      if (grab) grab.from.copy(grab.target);
    };

    const curvePoints = Array.from({ length: STRAP_SEGS }, () => new THREE.Vector3());
    const curveNormals = Array.from({ length: STRAP_SEGS }, () => new THREE.Vector3());
    const profileTrig = STRAP_ANGLES.map((a) => [Math.cos(a), Math.sin(a)]);
    const curveControl = [];
    const ptR = new THREE.Vector3(), ptZ = new THREE.Vector3();
    const spline = new THREE.CatmullRomCurve3(curveControl, false, 'centripetal');
    const basisHelper = {
      tangent: new THREE.Vector3(),
      toCamera: new THREE.Vector3(),
      basis: new THREE.Matrix4(),
      up: new THREE.Vector3(),
      across: new THREE.Vector3(),
      facing: new THREE.Vector3(),
      end: new THREE.Vector3()
    };

    const updateStrapMesh = () => {
      const endNode = sim.nodes[NODES];
      const offsetTop = 0.236;
      let idx = 3;
      while (idx > 0 && sim.nodes[idx].distanceTo(endNode) < offsetTop * 1.1) idx--;
      const upDir = basisHelper.up.subVectors(sim.nodes[idx], endNode);
      if (upDir.lengthSq() < 1e-8) upDir.set(0, 1, 0).applyQuaternion(sim.body.quaternion);
      upDir.normalize();
      ptR.copy(endNode).addScaledVector(upDir, offsetTop);
      ptZ.copy(endNode).addScaledVector(upDir, 0.0885);
      curveControl.length = 0;
      for (let i = 0; i <= idx; i++) curveControl.push(sim.nodes[i]);
      curveControl.push(ptR, ptZ);
      spline.updateArcLengths();
      for (let i = 0; i < STRAP_SEGS; i++) spline.getPointAt(i / 71, curvePoints[i]);

      const totalLen = spline.getLength();
      const twistRatio = 1 - ptR.distanceTo(ptZ) / Math.max(totalLen, 0.001);
      const posAttr = strapGeo.getAttribute('position');
      const normAttr = strapGeo.getAttribute('normal');
      const uvAttr = strapGeo.getAttribute('uv');
      const cols = STRAP_U.length;
      const restTotal = sim.rest * NODES;
      const vMax = restTotal / (strapWidthScaled * strapRepeatRatio);
      const widthPinch = strapWidthScaled / Math.pow(Math.max(1, totalLen / Math.max(restTotal, 0.001)), 0.35);
      const { tangent, toCamera, across, facing } = basisHelper;

      for (let i = 0; i < STRAP_SEGS; i++) {
        tangent.subVectors(curvePoints[Math.min(71, i + 1)], curvePoints[Math.max(0, i - 1)]);
        if (tangent.lengthSq() < 1e-12) tangent.set(0, -1, 0);
        tangent.normalize();
        toCamera.subVectors(camera.position, curvePoints[i]).normalize();
        const binorm = curveNormals[i].crossVectors(toCamera, tangent);
        if (binorm.lengthSq() < 1e-10) binorm.copy(i > 0 ? curveNormals[i - 1] : scratch.a.set(1, 0, 0));
        binorm.normalize();
        if (i > 0 && binorm.dot(curveNormals[i - 1]) < 0) binorm.negate();
        const tw = -sim.twist * Math.pow(Math.min(1, i / 71 / twistRatio), 1.3);
        facing.crossVectors(tangent, binorm);
        across.copy(binorm).multiplyScalar(Math.cos(tw)).addScaledVector(facing, Math.sin(tw));
        facing.crossVectors(tangent, across);
        const pt = curvePoints[i];
        const vCoord = (1 - i / 71) * vMax;
        for (let c = 0; c < cols; c++) {
          const vIdx = i * cols + c;
          const off = (STRAP_U[c] - 0.5) * widthPinch;
          const [cs, sn] = profileTrig[c];
          posAttr.setXYZ(vIdx, pt.x + across.x * off, pt.y + across.y * off, pt.z + across.z * off);
          normAttr.setXYZ(vIdx, facing.x * cs + across.x * sn, facing.y * cs + across.y * sn, facing.z * cs + across.z * sn);
          uvAttr.setXY(vIdx, STRAP_U[c], vCoord);
        }
      }
      basisHelper.end.copy(across);
      posAttr.needsUpdate = true;
      normAttr.needsUpdate = true;
      uvAttr.needsUpdate = true;
      across.copy(basisHelper.end).addScaledVector(upDir, -basisHelper.end.dot(upDir)).normalize();
      facing.crossVectors(across, upDir).normalize();
      basisHelper.basis.makeBasis(across, upDir, facing);
      clipGroup.quaternion.setFromRotationMatrix(basisHelper.basis);
      clipGroup.position.copy(endNode);
    };

    let initialized = false;
    let introSlideX = 0, introStartT = null;

    const updateFraming = () => {
      const w = Math.max(1, container.clientWidth);
      const h = Math.max(1, container.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(w, h, false);

      const aspect = w / h;
      const mobileNow = window.matchMedia('(max-width: 767px)').matches;
      config.anchor = mobileNow ? 'center' : 'right';

      let frustumH = cardSpecs.height / config.size;
      const minW = cardSpecs.width / 0.72;
      if (frustumH * aspect < minW) frustumH = minW / aspect;
      const frustumW = frustumH * aspect;

      camera.aspect = aspect;
      camera.position.set(0, 0, frustumH / 2 / Math.tan((FOV * Math.PI) / 360));
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();

      foilUniforms.foilKey.value.set(-2.5, 4, 6).normalize().transformDirection(camera.matrixWorldInverse);
      foilUniforms.foilFill.value.set(3, -1, 4).normalize().transformDirection(camera.matrixWorldInverse);
      foilUniforms.foilTop.value.set(0.5, 4.5, 8).normalize().transformDirection(camera.matrixWorldInverse);

      const anchorMap = { left: 0.27, center: 0.5, right: 0.73 };
      const anchorX = ((anchorMap[config.anchor] ?? 0.5) - 0.5) * frustumW;
      const topY = frustumH / 2 + 0.05;
      const restY = frustumH / 2 - frustumH * lerp(0.12, 0.42, config.strapLength) + (cardSpecs.hangY - cardSpecs.height / 2);

      sim.anchor.set(anchorX, topY, 0);
      sim.rest = (topY - restY) / NODES;
      const cw = cardSpecs.width, ch = cardSpecs.height, cd = 0.032;
      sim.body.mass = 1;
      sim.body.inverseInertia.set(12 / (ch * ch + cd * cd), 12 / (cw * cw + cd * cd), 12 / (cw * cw + ch * ch));
      sim.body.hang.set(0, cardSpecs.hangY, 0);
      sim.nodes[0].copy(sim.anchor);
      sim.previous[0].copy(sim.anchor);

      if (!initialized) {
        introSlideX = frustumW * 1.15;
        rootGroup.position.x = introSlideX;
        resetSim(true);
        initialized = true;
      }
    };

    new ResizeObserver(updateFraming).observe(container);
    updateFraming();

    // Pointer Interaction (Drag, Throw & Click-to-Flip)
    const raycaster = new THREE.Raycaster();
    const pointerNDC = new THREE.Vector2();
    let clickDownInfo = null;
    let isHoveringCard = false;

    const updateRay = (e) => {
      const rect = canvas.getBoundingClientRect();
      pointerNDC.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointerNDC, camera);
    };

    const hitTestCard = () => {
      cardGroup.updateMatrixWorld();
      return raycaster.intersectObjects([bodyMesh, frontMesh, backMesh], false)[0] || null;
    };

    const flipCard = (hitPoint, impulseStrength = 9) => {
      const body = sim.body;
      const upAxis = scratch.a.set(0, 1, 0).applyQuaternion(body.quaternion);
      let dir = sim.turn > 0 ? -1 : 1;
      if (sim.turn === 0) {
        const toCam = scratch.c.subVectors(hitPoint, camera.position).normalize();
        dir = scratch.b.subVectors(hitPoint, body.position).cross(toCam).dot(upAxis) < 0 ? -1 : 1;
      }
      sim.turn = sim.turn === 0 ? Math.PI * dir : 0;
      body.angular.addScaledVector(upAxis, impulseStrength * dir);
    };

    canvas.addEventListener('pointerdown', (e) => {
      if (e.button > 0) return;
      updateRay(e);
      const hit = hitTestCard();
      if (hit) {
        sim.grab = {
          local: hit.point.clone().sub(sim.body.position).applyQuaternion(sim.body.quaternion.clone().invert()),
          rotation: sim.body.quaternion.clone(),
          reach: hit.distance,
          from: hit.point.clone(),
          target: hit.point.clone()
        };
        clickDownInfo = { x: e.clientX, y: e.clientY, time: performance.now(), point: hit.point.clone() };
        canvas.setPointerCapture?.(e.pointerId);
        canvas.style.cursor = 'grabbing';
        e.preventDefault();
      }
    });

    canvas.addEventListener('pointermove', (e) => {
      updateRay(e);
      if (sim.grab) {
        if (clickDownInfo && Math.hypot(e.clientX - clickDownInfo.x, e.clientY - clickDownInfo.y) > 6) {
          clickDownInfo = null;
        }
        raycaster.ray.at(sim.grab.reach, sim.grab.target);
      } else if (e.pointerType !== 'touch') {
        isHoveringCard = !!hitTestCard();
        canvas.style.cursor = isHoveringCard ? 'grab' : '';
      }
    });

    const releaseGrab = (e) => {
      if (sim.grab) {
        sim.grab = null;
        if (clickDownInfo && e.type === 'pointerup' && performance.now() - clickDownInfo.time < 450) {
          flipCard(clickDownInfo.point);
          SFX.click();
        }
        clickDownInfo = null;
        canvas.releasePointerCapture?.(e.pointerId);
        canvas.style.cursor = isHoveringCard && e.pointerType !== 'touch' ? 'grab' : '';
      }
    };
    canvas.addEventListener('pointerup', releaseGrab);
    canvas.addEventListener('pointercancel', releaseGrab);
    canvas.addEventListener('lostpointercapture', releaseGrab);

    // Animation Loop
    let lastTime = performance.now();
    let elapsed = 0;
    let nextAutoFlip = 6 + Math.random() * 6;
    let autoFlipped = false;
    let inView = true;

    new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
    }).observe(container);

    const getPhysicsParams = () => {
      const g = 40 * config.gravity;
      const n = Math.max(g, 20);
      const el = config.elasticity;
      const da = config.damping;
      return {
        gravity: g,
        hold: n * lerp(2.2, 5.5, el),
        stiffness: n * 10 * NODES,
        spring: n * lerp(0.1, 0.4, el) * NODES,
        bandDamping: n * lerp(0.3, 0.08, el) * NODES,
        linearDrag: 0.25 * Math.pow(16, da),
        angularDrag: 0.5 * Math.pow(12, da),
        air: 0.15,
        broadside: 0.5,
        spinAir: 0.03,
        nodeDrag: 2,
        nodeAir: 0.2,
        twist: 30,
        twistDamping: 3,
        grip: 40,
        gripDamping: 6,
        breeze: config.breeze
      };
    };

    const animate = (now) => {
      requestAnimationFrame(animate);
      if (!inView || document.hidden) {
        lastTime = now;
        return;
      }
      const dt = Math.min(1 / 30, Math.max(1 / 240, (now - lastTime) / 1000));
      lastTime = now;
      elapsed += dt;

      if (introSlideX > 0 && window.__lanyardIntroStarted) {
        if (introStartT === null) introStartT = now;
        const t = clamp((now - introStartT) / 100, 0, 1);
        const ease = 1 - Math.pow(1 - t, 3);
        rootGroup.position.x = introSlideX * (1 - ease);
        if (t === 1) introSlideX = 0;
      }

      if (config.autoFlip && !sim.grab) {
        if (autoFlipped && sim.twist * Math.sign(sim.turn) >= Math.PI * 0.85) {
          autoFlipped = false;
          flipCard(sim.body.position, 3.5);
          nextAutoFlip = elapsed + 8 + Math.random() * 12;
        } else if (!autoFlipped && sim.turn === 0 && elapsed >= nextAutoFlip) {
          flipCard(sim.body.position, 3.5);
          autoFlipped = sim.turn !== 0;
        }
      }

      stepPhysics(dt, getPhysicsParams(), elapsed);
      const b = sim.body;
      if (!Number.isFinite(b.position.x + b.position.y + b.position.z + b.quaternion.w)) {
        sim.grab = null;
        resetSim(false);
      }

      cardGroup.position.copy(b.position);
      cardGroup.quaternion.copy(b.quaternion);
      updateStrapMesh();
      renderer.render(scene, camera);
    };

    requestAnimationFrame(animate);
  }

  // ==========================================================================
  // 6. ZENITSU THUNDER BREATHING INTERACTIVE PORTRAIT + LIGHTNING CANVAS
  // ==========================================================================
  function initZenitsuPortrait() {
    const stage = document.getElementById('about-portrait-stage');
    const lightningCanvas = document.getElementById('zenitsu-lightning-canvas');
    if (!stage) return;

    let leaveTimer = null;
    let lastThunderSfx = 0;
    const bolts = [];

    // Spawn procedural electric lightning arcs on the canvas when hovering!
    const spawnBolt = (x, y) => {
      if (!lightningCanvas) return;
      const pts = [{ x, y }];
      let cx = x, cy = y;
      const angle = Math.random() * Math.PI * 2;
      const segs = 6 + Math.floor(Math.random() * 6);
      for (let i = 0; i < segs; i++) {
        const len = 18 + Math.random() * 28;
        const a = angle + (Math.random() - 0.5) * 1.8;
        cx += Math.cos(a) * len;
        cy += Math.sin(a) * len;
        pts.push({ x: cx, y: cy });
      }
      bolts.push({
        pts,
        color: Math.random() > 0.38 ? '#f97316' : '#fbbf24',
        alpha: 1.0,
        width: 1.8 + Math.random() * 2.3
      });
    };

    if (lightningCanvas) {
      const ctx = lightningCanvas.getContext('2d');
      const resizeCvs = () => {
        const r = stage.getBoundingClientRect();
        lightningCanvas.width = Math.max(1, r.width);
        lightningCanvas.height = Math.max(1, r.height);
      };
      new ResizeObserver(resizeCvs).observe(stage);
      resizeCvs();

      const drawBolts = () => {
        requestAnimationFrame(drawBolts);
        ctx.clearRect(0, 0, lightningCanvas.width, lightningCanvas.height);
        for (let i = bolts.length - 1; i >= 0; i--) {
          const b = bolts[i];
          b.alpha -= 0.065;
          if (b.alpha <= 0) {
            bolts.splice(i, 1);
            continue;
          }
          ctx.save();
          ctx.globalAlpha = b.alpha;
          ctx.strokeStyle = b.color;
          ctx.shadowColor = b.color;
          ctx.shadowBlur = 18;
          ctx.lineWidth = b.width;
          ctx.beginPath();
          b.pts.forEach((p, idx) => (idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
          ctx.stroke();
          // White hot core
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = b.width * 0.45;
          ctx.stroke();
          ctx.restore();
        }
      };
      requestAnimationFrame(drawBolts);
    }

    stage.addEventListener('pointermove', (e) => {
      const portrait = stage.querySelector('.about-portrait');
      if (!portrait) return;
      clearTimeout(leaveTimer);
      const rect = portrait.getBoundingClientRect();
      const ox = ((e.clientX - rect.left) / rect.width) * 100;
      const oy = ((e.clientY - rect.top) / rect.height) * 100;
      stage.style.setProperty('--hover-x', `${ox}%`);
      stage.style.setProperty('--hover-y', `${oy}%`);

      if (!stage.dataset.spiderVisible) {
        const now = performance.now();
        if (now - lastThunderSfx > 1200) {
          SFX.thunder();
          lastThunderSfx = now;
        }
      }
      stage.classList.add('spider-hovered');
      stage.dataset.spiderVisible = 'true';

      const sRect = stage.getBoundingClientRect();
      if (Math.random() < 0.45) {
        spawnBolt(e.clientX - sRect.left, e.clientY - sRect.top);
      }
    });

    stage.addEventListener('pointerleave', () => {
      delete stage.dataset.spiderVisible;
      clearTimeout(leaveTimer);
      leaveTimer = setTimeout(() => {
        stage.classList.remove('spider-hovered');
      }, 7000);
    });

    new IntersectionObserver(([entry]) => {
      stage.classList.toggle('is-in-view', entry.isIntersecting);
      if (!entry.isIntersecting) {
        clearTimeout(leaveTimer);
        stage.classList.remove('spider-hovered');
        delete stage.dataset.spiderVisible;
      }
    }, { threshold: 0.2 }).observe(stage);
  }

  // ==========================================================================
  // 7. BOOTSTRAP EXPORT
  // ==========================================================================
  window.initPortfolio3DEngine = function (THREE) {
    initParticles(document.getElementById('particles-canvas'));
    initLanyard3D(document.getElementById('lanyard-mount'), THREE);
    initZenitsuPortrait();
    initLiquidMetalBorders();
    setupBorderGlowCards();
  };
})();
