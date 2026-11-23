/* ==========================================================================
   NELSON KUADJO PORTFOLIO — 3D KINETIC & HOLOGRAPHIC CARD MOTION ENGINE
   7 distinct scroll-choreographed entrances (GSAP ScrollTrigger scrub) +
   60fps damped 3D Perspective Tilt & specular glare on pointer hover.
   Zero SVG wires, zero extra WebGL contexts.
   ========================================================================== */
(function () {
  'use strict';

  const REDUCED_MOTION = () =>
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const CAN_HOVER = () =>
    window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const state = {
    initialized: false,
    instances: new Map(), // key -> { triggers: [], tweens: [] }
    resizeTimer: null,
    statsCounted: false,
    activeTilts: new Map(), // el -> { rx, ry, trx, try, lift, tlift, gx, gy, tgx, tgy, go, tgo }
    rafId: null,
  };

  // --------------------------------------------------------------------------
  // HELPERS: GLARE OVERLAY & ROW CLUSTERING
  // --------------------------------------------------------------------------
  function ensureGlareLayer(card) {
    if (card.querySelector('.cm-glare')) return;
    const glare = document.createElement('div');
    glare.className = 'cm-glare';
    glare.setAttribute('aria-hidden', 'true');
    card.appendChild(glare);
  }

  function clusterRows(cards) {
    const boxes = cards
      .map((el) => ({ el, y: el.offsetTop, x: el.offsetLeft, w: el.offsetWidth }))
      .sort((a, b) => a.y - b.y || a.x - b.x);
    const rows = [];
    for (const b of boxes) {
      const row = rows.find((r) => Math.abs(r[0].y - b.y) < 42);
      if (row) row.push(b);
      else rows.push([b]);
    }
    rows.forEach((r) => r.sort((a, b) => a.x - b.x));
    return rows;
  }

  function setCardVars(el, v) {
    if (v.x !== undefined) el.style.setProperty('--cm-x', `${v.x}px`);
    if (v.y !== undefined) el.style.setProperty('--cm-y', `${v.y}px`);
    if (v.z !== undefined) el.style.setProperty('--cm-z', `${v.z}px`);
    if (v.rx !== undefined) el.style.setProperty('--cm-rx', `${v.rx}deg`);
    if (v.ry !== undefined) el.style.setProperty('--cm-ry', `${v.ry}deg`);
    if (v.rz !== undefined) el.style.setProperty('--cm-rz', `${v.rz}deg`);
    if (v.scale !== undefined) el.style.setProperty('--cm-scale', `${v.scale}`);
    if (v.o !== undefined) el.style.setProperty('--cm-o', `${v.o}`);
    if (v.reveal !== undefined) el.style.setProperty('--cm-reveal', `${v.reveal}`);
    if (v.bar !== undefined) el.style.setProperty('--cm-bar', `${v.bar}`);
    if (v.sheen !== undefined) el.style.setProperty('--cm-sheen', `${v.sheen}%`);
  }

  function clearMotionToRest(cards) {
    cards.forEach((el) => {
      setCardVars(el, {
        x: 0,
        y: 0,
        z: 0.01,
        rx: 0,
        ry: 0,
        rz: 0,
        scale: 1,
        o: 1,
        reveal: 1,
        bar: 1,
        sheen: 165,
      });
    });
  }

  // --------------------------------------------------------------------------
  // INTERACTIVE 3D TILT + SPECULAR GLARE ENGINE (Fine Pointer Desktop)
  // --------------------------------------------------------------------------
  function tickTilts() {
    let keepRunning = false;
    state.activeTilts.forEach((t, el) => {
      const k = 0.16;
      t.rx += (t.trx - t.rx) * k;
      t.ry += (t.try - t.ry) * k;
      t.lift += (t.tlift - t.lift) * k;
      t.gx += (t.tgx - t.gx) * 0.22;
      t.gy += (t.tgy - t.gy) * 0.22;
      t.go += (t.tgo - t.go) * 0.16;

      el.style.setProperty('--tilt-rx', `${t.rx.toFixed(3)}deg`);
      el.style.setProperty('--tilt-ry', `${t.ry.toFixed(3)}deg`);
      el.style.setProperty('--tilt-lift', `${t.lift.toFixed(2)}px`);
      el.style.setProperty('--glare-x', `${t.gx.toFixed(1)}%`);
      el.style.setProperty('--glare-y', `${t.gy.toFixed(1)}%`);
      el.style.setProperty('--glare-o', `${t.go.toFixed(3)}`);

      const settled =
        Math.abs(t.rx - t.trx) < 0.02 &&
        Math.abs(t.ry - t.try) < 0.02 &&
        Math.abs(t.lift - t.tlift) < 0.05 &&
        Math.abs(t.go - t.tgo) < 0.01;

      if (settled && !t.hovered) {
        el.style.setProperty('--tilt-rx', '0deg');
        el.style.setProperty('--tilt-ry', '0deg');
        el.style.setProperty('--tilt-lift', '0px');
        el.style.setProperty('--glare-o', '0');
        state.activeTilts.delete(el);
      } else {
        keepRunning = true;
      }
    });

    if (keepRunning) {
      state.rafId = requestAnimationFrame(tickTilts);
    } else {
      state.rafId = null;
    }
  }

  function ensureTiltLoop() {
    if (!state.rafId) state.rafId = requestAnimationFrame(tickTilts);
  }

  function bindInteractiveTilt(card, maxAngle = 5.5, liftPx = -5) {
    card.classList.add('cm-card');
    ensureGlareLayer(card);
    if (!CAN_HOVER() || REDUCED_MOTION() || card.dataset.cmTiltReady) return;
    card.dataset.cmTiltReady = 'true';

    const getRecord = () => {
      let rec = state.activeTilts.get(card);
      if (!rec) {
        rec = {
          rx: 0, ry: 0, trx: 0, try: 0,
          lift: 0, tlift: 0,
          gx: 50, gy: 50, tgx: 50, tgy: 50,
          go: 0, tgo: 0,
          hovered: false,
        };
        state.activeTilts.set(card, rec);
      }
      return rec;
    };

    card.addEventListener('pointerenter', () => {
      const rec = getRecord();
      rec.hovered = true;
      rec.tlift = liftPx;
      rec.tgo = 1;
      ensureTiltLoop();
    });

    card.addEventListener('pointermove', (e) => {
      if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
      const rect = card.getBoundingClientRect();
      if (rect.width < 10 || rect.height < 10) return;
      const nx = Math.max(-1, Math.min(1, ((e.clientX - rect.left) / rect.width) * 2 - 1));
      const ny = Math.max(-1, Math.min(1, ((e.clientY - rect.top) / rect.height) * 2 - 1));
      const rec = getRecord();
      rec.hovered = true;
      rec.trx = -ny * maxAngle;
      rec.try = nx * maxAngle;
      rec.tlift = liftPx;
      rec.tgx = ((nx + 1) * 50);
      rec.tgy = ((ny + 1) * 50);
      rec.tgo = 1;
      ensureTiltLoop();
    });

    card.addEventListener('pointerleave', () => {
      const rec = getRecord();
      rec.hovered = false;
      rec.trx = 0;
      rec.try = 0;
      rec.tlift = 0;
      rec.tgo = 0;
      ensureTiltLoop();
    });
  }

  // --------------------------------------------------------------------------
  // 7 DISTINCT SCROLL-DRIVEN CARD BLOCK CHOREOGRAPHIES
  // --------------------------------------------------------------------------
  // 1. FORMATION — Chronological 3D Fold-Down Cascade + Inner Progress Accent Bar
  function choreographEducation(tl, cards) {
    cards.forEach((el, i) => {
      el.classList.add('cm-edu-card');
      const t0 = i * 0.22;
      const logo = el.querySelector('.experience-logo-hecm');
      tl.fromTo(
        el,
        { '--cm-y': '34px', '--cm-rx': '-20deg', '--cm-z': '-35px', '--cm-scale': 0.94, '--cm-o': 0, '--cm-bar': 0.08 },
        { '--cm-y': '0px', '--cm-rx': '0deg', '--cm-z': '0.01px', '--cm-scale': 1, '--cm-o': 1, '--cm-bar': 1, duration: 0.45, ease: 'power3.out' },
        t0
      );
      if (logo) {
        tl.fromTo(logo, { y: 14, scale: 0.88, opacity: 0.3 }, { y: 0, scale: 1, opacity: 1, duration: 0.4, ease: 'power2.out' }, t0 + 0.06);
      }
    });
  }

  // 2. EXPÉRIENCES — Alternate Lateral HUD Slide + Specular Neon Sweep
  function choreographWork(tl, cards) {
    cards.forEach((el, i) => {
      el.classList.add('cm-hud-card');
      const t0 = i * 0.22;
      const fromX = i % 2 === 0 ? '42px' : '-32px';
      const fromRy = i % 2 === 0 ? '-11deg' : '11deg';
      tl.fromTo(
        el,
        { '--cm-x': fromX, '--cm-y': '12px', '--cm-ry': fromRy, '--cm-scale': 0.95, '--cm-o': 0, '--cm-sheen': '-120%' },
        { '--cm-x': '0px', '--cm-y': '0px', '--cm-ry': '0deg', '--cm-scale': 1, '--cm-o': 1, '--cm-sheen': '165%', duration: 0.46, ease: 'power3.out' },
        t0
      );
    });
  }

  // 3. STATISTIQUES (7+, 7, 3+, 99%) — Curtain Clip-Path Wipe + De-Zoom
  function choreographStats(tl, cards) {
    const mid = (cards.length - 1) * 0.5;
    cards.forEach((el, i) => {
      el.classList.add('cm-stat-card');
      const t0 = Math.abs(i - mid) * 0.12;
      tl.fromTo(
        el,
        {
          '--cm-y': '22px',
          '--cm-scale': 1.07,
          '--cm-o': 0.08,
          '--cm-reveal': 0,
        },
        {
          '--cm-y': '0px',
          '--cm-scale': 1,
          '--cm-o': 1,
          '--cm-reveal': 1,
          duration: 0.5,
          ease: 'power3.out',
        },
        t0
      );
    });
  }

  // 4. PROJECTS — 3D Cross-Angle Perspective Unfold + Thumbnail Scroll Parallax
  function choreographProjects(tl, cards) {
    const rows = clusterRows(cards);
    const totalRows = Math.max(1, rows.length);
    rows.forEach((row, rIdx) => {
      const rowBaseT = (rIdx / totalRows) * 0.65;
      const cols = row.length;
      row.forEach(({ el }, cIdx) => {
        const rel = cols === 1 ? 0 : cIdx - (cols - 1) * 0.5; // -1, 0, +1
        const fromRy = `${(-rel * 13).toFixed(1)}deg`;
        const fromRx = cols === 1 || rel === 0 ? '15deg' : '9deg';
        const t0 = Math.min(0.82, rowBaseT + cIdx * 0.06);

        tl.fromTo(
          el,
          { '--cm-y': '42px', '--cm-z': '-55px', '--cm-rx': fromRx, '--cm-ry': fromRy, '--cm-scale': 0.92, '--cm-o': 0.08 },
          { '--cm-y': '0px', '--cm-z': '0.01px', '--cm-rx': '0deg', '--cm-ry': '0deg', '--cm-scale': 1, '--cm-o': 1, duration: 0.34, ease: 'power3.out' },
          t0
        );

        const img = el.querySelector('.portfolio-card-thumbnail-image');
        if (img) {
          tl.fromTo(img, { '--cm-img-y': '-4%' }, { '--cm-img-y': '4%', duration: 0.45, ease: 'none' }, t0);
        }
      });
    });
  }

  // 5. CERTIFICATES — Playing-Card Fan Straightening + Holographic Badge Foil Sweep
  function choreographCertificates(tl, cards) {
    cards.forEach((el, i) => {
      el.classList.add('cm-holo-card');
      const rowPos = i % 3; // 0, 1, 2
      const fanRz = rowPos === 0 ? '-5deg' : rowPos === 2 ? '5deg' : '0deg';
      const fanX = rowPos === 0 ? '-20px' : rowPos === 2 ? '20px' : '0px';
      const t0 = (i / Math.max(1, cards.length)) * 0.64;

      tl.fromTo(
        el,
        { '--cm-x': fanX, '--cm-y': '34px', '--cm-rx': '14deg', '--cm-rz': fanRz, '--cm-scale': 0.92, '--cm-o': 0.08, '--cm-sheen': '-130%' },
        { '--cm-x': '0px', '--cm-y': '0px', '--cm-rx': '0deg', '--cm-rz': '0deg', '--cm-scale': 1, '--cm-o': 1, '--cm-sheen': '165%', duration: 0.36, ease: 'power3.out' },
        t0
      );
    });
  }

  // 6. ACHIEVEMENTS — Royal Center-Out Podium Elevation & Wing Flare
  function choreographAchievements(tl, cards) {
    const mid = (cards.length - 1) * 0.5;
    cards.forEach((el, i) => {
      el.classList.add('cm-royal-card');
      const delta = i - mid; // -1, 0, +1
      const isCenter = Math.abs(delta) < 0.1;
      const fromX = isCenter ? '0px' : `${(-delta * 46).toFixed(0)}px`;
      const fromRz = isCenter ? '0deg' : `${(-delta * 3.5).toFixed(1)}deg`;
      const t0 = isCenter ? 0.0 : 0.2;

      tl.fromTo(
        el,
        {
          '--cm-x': fromX,
          '--cm-y': isCenter ? '26px' : '38px',
          '--cm-z': isCenter ? '-80px' : '-45px',
          '--cm-rx': isCenter ? '10deg' : '14deg',
          '--cm-rz': fromRz,
          '--cm-scale': isCenter ? 0.85 : 0.9,
          '--cm-o': 0.08,
          '--cm-sheen': '-110%',
        },
        {
          '--cm-x': '0px',
          '--cm-y': '0px',
          '--cm-z': '0.01px',
          '--cm-rx': '0deg',
          '--cm-rz': '0deg',
          '--cm-scale': 1,
          '--cm-o': 1,
          '--cm-sheen': '165%',
          duration: isCenter ? 0.45 : 0.48,
          ease: 'back.out(1.25)',
        },
        t0
      );
    });
  }

  // 7. TECH STACK — 2D Diagonal Matrix Flip-Wave + Micro-Elastic Bounce
  function choreographTechStack(tl, cards) {
    const rows = clusterRows(cards);
    const totalRows = Math.max(1, rows.length);
    const totalCols = Math.max(1, rows[0].length);
    const maxDiag = totalRows + totalCols - 2;

    rows.forEach((row, rIdx) => {
      row.forEach(({ el }, cIdx) => {
        const diagProgress = maxDiag > 0 ? (rIdx + cIdx) / maxDiag : 0;
        const t0 = diagProgress * 0.56;
        tl.fromTo(
          el,
          { '--cm-y': '24px', '--cm-rx': '24deg', '--cm-scale': 0.78, '--cm-o': 0.06 },
          { '--cm-y': '0px', '--cm-rx': '0deg', '--cm-scale': 1, '--cm-o': 1, duration: 0.36, ease: 'back.out(1.5)' },
          t0
        );
      });
    });
  }

  // --------------------------------------------------------------------------
  // STATS COUNT-UP & BLOCK REGISTRY
  // --------------------------------------------------------------------------
  function setupStatsCounter(container) {
    if (state.statsCounted || !window.ScrollTrigger || REDUCED_MOTION()) return;
    const nums = Array.from(container.querySelectorAll('.experience-stat-top strong'))
      .map((el) => {
        const match = el.textContent.trim().match(/^(\d+)(.*)$/);
        return match ? { el, target: parseInt(match[1], 10), suffix: match[2] } : null;
      })
      .filter(Boolean);

    if (!nums.length) return;
    window.ScrollTrigger.create({
      trigger: container,
      start: 'top 84%',
      once: true,
      onEnter: () => {
        if (state.statsCounted) return;
        state.statsCounted = true;
        nums.forEach(({ el, target, suffix }) => {
          const obj = { val: 0 };
          window.gsap.to(obj, {
            val: target,
            duration: 1.15,
            ease: 'power2.out',
            onUpdate: () => {
              el.textContent = `${Math.round(obj.val)}${suffix}`;
            },
          });
        });
      },
    });
  }

  const BLOCKS = {
    education: { selector: '.experience-card', fn: choreographEducation, start: 'top 86%', end: 'bottom 62%', maxTilt: 4.5, lift: -4 },
    work: { selector: '.experience-card', fn: choreographWork, start: 'top 86%', end: 'bottom 62%', maxTilt: 4.5, lift: -4 },
    stats: { selector: '.experience-stat-card', fn: choreographStats, start: 'top 88%', end: 'bottom 68%', maxTilt: 6.5, lift: -5 },
    projects: { selector: '.portfolio-project-card', fn: choreographProjects, start: 'top 86%', end: 'bottom 62%', maxTilt: 5, lift: -6 },
    certificates: { selector: '.cert-glow-card', fn: choreographCertificates, start: 'top 86%', end: 'bottom 64%', maxTilt: 6, lift: -5 },
    achievements: { selector: '.cert-glow-card', fn: choreographAchievements, start: 'top 88%', end: 'bottom 64%', maxTilt: 6.5, lift: -6 },
    techstack: { selector: '.portfolio-skill-card', fn: choreographTechStack, start: 'top 88%', end: 'bottom 64%', maxTilt: 8.5, lift: -6 },
  };

  function destroyBlock(key) {
    const inst = state.instances.get(key);
    if (!inst) return;
    inst.triggers.forEach((st) => st.kill());
    inst.tweens.forEach((tw) => tw.kill());
    state.instances.delete(key);
  }

  function mountBlock(key, container, options = {}) {
    const cfg = BLOCKS[key];
    if (!cfg || !container) return;
    destroyBlock(key);

    const cards = Array.from(container.querySelectorAll(cfg.selector));
    if (!cards.length) return;

    cards.forEach((c) => bindInteractiveTilt(c, cfg.maxTilt, cfg.lift));

    if (REDUCED_MOTION() || !window.gsap || !window.ScrollTrigger) {
      clearMotionToRest(cards);
      return;
    }

    const tl = window.gsap.timeline({ paused: true });
    cfg.fn(tl, cards);

    let activeIntroTween = null;
    const openScrollY = window.scrollY;
    const st = window.ScrollTrigger.create({
      trigger: container,
      start: cfg.start,
      end: cfg.end,
      scrub: 0.6,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        if (activeIntroTween) {
          if (Math.abs(window.scrollY - openScrollY) < 4) return;
          activeIntroTween.kill();
          activeIntroTween = null;
        }
        tl.progress(self.progress);
      },
    });

    const tweens = [tl];

    if (options.playVisibleSprout) {
      const targetProgress = Math.max(st.progress, 0.96);
      tl.progress(0);
      activeIntroTween = window.gsap.to(tl, {
        progress: Math.min(1, targetProgress),
        duration: 0.95,
        ease: 'power2.out',
        onComplete: () => {
          activeIntroTween = null;
        },
      });
      tweens.push(activeIntroTween);
    } else {
      tl.progress(st.progress);
    }

    state.instances.set(key, { triggers: [st], tweens });
  }

  function getTargets() {
    return [
      { key: 'education', el: document.getElementById('experience-col-education'), tab: null },
      { key: 'work', el: document.getElementById('experience-col-work'), tab: null },
      { key: 'stats', el: document.querySelector('.experience-stats'), tab: null },
      { key: 'projects', el: document.getElementById('projects-grid-container'), tab: 'projects' },
      { key: 'certificates', el: document.getElementById('certificates-grid-container'), tab: 'certificates' },
      { key: 'achievements', el: document.getElementById('achievements-grid-container'), tab: 'achievements' },
      { key: 'techstack', el: document.getElementById('techstack-grid-container'), tab: 'techstack' },
    ];
  }

  function rebuildAllVisible() {
    getTargets().forEach(({ key, el, tab }) => {
      if (!el) return;
      if (tab) {
        const pane = document.getElementById(`tab-${tab}`);
        if (!pane || !pane.classList.contains('is-active')) {
          destroyBlock(key);
          return;
        }
      }
      mountBlock(key, el, { playVisibleSprout: false });
    });
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  }

  function activateTab(tabName) {
    ['projects', 'certificates', 'achievements', 'techstack'].forEach((k) => {
      if (k !== tabName) destroyBlock(k);
    });
    const match = getTargets().find((t) => t.tab === tabName);
    if (match && match.el) {
      requestAnimationFrame(() => {
        mountBlock(match.key, match.el, { playVisibleSprout: true });
        if (window.ScrollTrigger) window.ScrollTrigger.refresh();
      });
    }
  }

  function init() {
    if (state.initialized) return;
    state.initialized = true;

    const statsEl = document.querySelector('.experience-stats');
    if (statsEl) setupStatsCounter(statsEl);

    requestAnimationFrame(() => rebuildAllVisible());
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => rebuildAllVisible());
    }

    let lastWidth = window.innerWidth;
    window.addEventListener('resize', () => {
      if (window.innerWidth === lastWidth) return;
      lastWidth = window.innerWidth;
      clearTimeout(state.resizeTimer);
      state.resizeTimer = setTimeout(() => rebuildAllVisible(), 180);
    }, { passive: true });
  }

  window.CardMotion = { init, activateTab, refresh: rebuildAllVisible };
})();
