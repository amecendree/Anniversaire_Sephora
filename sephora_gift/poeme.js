/* ============================================================
   POUR SEPHORA — logique interactive
   Aucune dépendance externe (canvas natif).
   ============================================================ */
(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------
     0. UTILITAIRES
     ------------------------------------------------------------ */
  const rand  = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function goToStage(id){
    document.querySelectorAll('.stage').forEach(s => s.classList.remove('is-active'));
    document.getElementById(id).classList.add('is-active');
  }

  /* ------------------------------------------------------------
     1. ARRIÈRE-PLAN — étoiles + cœurs qui dérivent + confettis
     ------------------------------------------------------------ */
  const canvas = document.getElementById('bg-canvas');
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2);

  function resize(){
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  const GOLD = ['#f0c987', '#f7dca8', '#ffd77a'];
  const ROSE = ['#ff7fa3', '#ff9fbb', '#d4235c'];

  /* --- champ d'étoiles scintillantes (permanent) --- */
  const stars = Array.from({ length: reducedMotion ? 40 : 90 }, () => ({
    x: rand(0, 1), y: rand(0, 1),
    r: rand(.5, 1.6),
    phase: rand(0, Math.PI * 2),
    speed: rand(.6, 1.6),
  }));

  /* --- petits cœurs qui dérivent doucement vers le haut (permanent) --- */
  const drifters = Array.from({ length: reducedMotion ? 5 : 12 }, () => spawnDrifter());
  function spawnDrifter(){
    return {
      x: rand(0, 1) * W,
      y: H + rand(20, 200),
      size: rand(8, 18),
      speed: rand(10, 22),
      sway: rand(0.4, 1.2),
      swayPhase: rand(0, Math.PI * 2),
      color: ROSE[(Math.random() * ROSE.length) | 0],
      opacity: rand(.25, .55),
    };
  }

  function drawHeart(x, y, size, color, opacity, rot = 0){
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(size / 20, size / 20);
    ctx.globalAlpha = opacity;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.bezierCurveTo(-10, -4, -20, 4, 0, 18);
    ctx.bezierCurveTo(20, 4, 10, -4, 0, 6);
    ctx.fill();
    ctx.restore();
  }

  function drawStar(x, y, r, color, opacity){
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /* --- particules de célébration (confettis + cœurs + étoiles) --- */
  let bursts = [];
  function spawnBurst(count, originX, originY, spread = 'full'){
    for (let i = 0; i < count; i++){
      const type = Math.random() < 0.4 ? 'heart' : (Math.random() < 0.7 ? 'confetti' : 'star');
      const x = spread === 'full' ? rand(0, W) : originX + rand(-40, 40);
      const y = spread === 'full' ? rand(-40, 0) : originY + rand(-20, 20);
      bursts.push({
        type, x, y,
        vx: rand(-40, 40),
        vy: spread === 'full' ? rand(20, 70) : rand(-180, -60),
        rot: rand(0, Math.PI * 2),
        vr: rand(-3, 3),
        size: rand(6, 13),
        color: Math.random() < 0.5 ? GOLD[(Math.random() * GOLD.length) | 0] : ROSE[(Math.random() * ROSE.length) | 0],
        life: 0,
        maxLife: rand(2.4, 4.2),
      });
    }
  }

  let lastT = performance.now();
  let celebrating = false;
  let emitAcc = 0;

  function frame(now){
    const dt = clamp((now - lastT) / 1000, 0, .05);
    lastT = now;
    ctx.clearRect(0, 0, W, H);

    /* étoiles */
    for (const s of stars){
      s.phase += dt * s.speed;
      const tw = (Math.sin(s.phase) + 1) / 2;
      drawStar(s.x * W, s.y * H, s.r, '#ffe9c7', .25 + tw * .55);
    }

    /* cœurs dérivants */
    for (const d of drifters){
      if (!reducedMotion){
        d.y -= d.speed * dt;
        d.swayPhase += dt * 0.8;
        d.x += Math.sin(d.swayPhase) * d.sway;
      }
      drawHeart(d.x, d.y, d.size, d.color, d.opacity);
      if (d.y < -30){
        Object.assign(d, spawnDrifter(), { y: H + rand(20, 80) });
      }
    }

    /* célébration : émission continue tant que celebrating est vrai */
    if (celebrating && !reducedMotion){
      emitAcc += dt;
      if (emitAcc > 0.06){
        emitAcc = 0;
        spawnBurst(3, 0, 0, 'full');
      }
    }

    /* particules actives (confettis / cœurs / étoiles de fête) */
    bursts = bursts.filter(p => p.life < p.maxLife);
    for (const p of bursts){
      p.life += dt;
      p.vy += 60 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      const fade = 1 - clamp(p.life / p.maxLife, 0, 1);

      if (p.type === 'heart'){
        drawHeart(p.x, p.y, p.size, p.color, fade * .9, p.rot * .2);
      } else if (p.type === 'star'){
        drawStar(p.x, p.y, p.size * .5, p.color, fade);
      } else {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = fade;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * .6);
        ctx.restore();
      }
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* ------------------------------------------------------------
     2. ACTE 1 — RÉVÉLATION DU POÈME
     ------------------------------------------------------------ */
  const verseEls = document.querySelectorAll('.verse');
  const heartBtn = document.getElementById('heartBtn');

  function playPoem(){
    if (reducedMotion){
      verseEls.forEach(v => v.classList.add('is-visible'));
      heartBtn.classList.add('is-visible');
      return;
    }
    verseEls.forEach((v, i) => {
      setTimeout(() => v.classList.add('is-visible'), 500 + i * 650);
    });
    const totalDelay = 500 + verseEls.length * 650 + 500;
    setTimeout(() => heartBtn.classList.add('is-visible'), totalDelay);
  }
  playPoem();

  heartBtn.addEventListener('click', () => {
    const r = heartBtn.getBoundingClientRect();
    spawnBurst(24, r.left + r.width / 2, r.top + r.height / 2, 'point');
    // filet de sécurité : quoi qu'il se soit passé avant, la question s'ouvre
    // toujours avec « Non » sagement à côté de « Oui »
    resetNoBtn();
    goToStage('stage-question');
  });

  /* ------------------------------------------------------------
     3. ACTE 2 — LE BOUTON « NON » QUI FUIT
     ------------------------------------------------------------ */
  const noBtn = document.getElementById('noBtn');
  const yesBtn = document.getElementById('yesBtn');
  const actions = document.querySelector('.card__actions');

  const MARGIN = 16;
  const FLEE_RADIUS = 110;
  let lastFleeAt = 0;

  const questionStage = document.getElementById('stage-question');
  /* Les stages inactifs gardent leur boîte (position:absolute; inset:0) : le
     bouton « Non » a donc de vraies coordonnées dès l'ACTE 1. Comme le listener
     pointermove vit sur window, la souris qui passe par là pendant le poème le
     ferait fuir en position:fixed — il serait déjà ailleurs au moment où la
     question s'affiche, au lieu d'être à côté de « Oui ». */
  const isQuestionLive = () => questionStage.classList.contains('is-active');

  /* remet le bouton dans le flux, à sa place à côté de « Oui » */
  function resetNoBtn(){
    noBtn.classList.remove('is-fleeing');
    noBtn.style.left = '';
    noBtn.style.top = '';
  }

  function viewportBounds(){
    const vv = window.visualViewport;
    const left = vv ? vv.offsetLeft : 0;
    const top = vv ? vv.offsetTop : 0;
    const width = vv ? vv.width : window.innerWidth;
    const height = vv ? vv.height : window.innerHeight;

    return {
      minX: left + MARGIN,
      minY: top + MARGIN,
      maxX: left + width - MARGIN,
      maxY: top + height - MARGIN,
    };
  }

  function placeButtonAt(x, y){
    const w = noBtn.offsetWidth || 100;
    const h = noBtn.offsetHeight || 44;
    const bounds = viewportBounds();
    const minLeft = bounds.minX;
    const minTop = bounds.minY;
    const maxLeft = Math.max(minLeft, bounds.maxX - w);
    const maxTop = Math.max(minTop, bounds.maxY - h);
    const cx = clamp(x - w / 2, minLeft, maxLeft);
    const cy = clamp(y - h / 2, minTop, maxTop);
    noBtn.style.left = cx + 'px';
    noBtn.style.top = cy + 'px';
  }

  function flee(fromX, fromY){
    if (!noBtn.classList.contains('is-fleeing')){
      const r = noBtn.getBoundingClientRect();
      noBtn.classList.add('is-fleeing');
      noBtn.style.left = r.left + 'px';
      noBtn.style.top = r.top + 'px';
    }
    const w = noBtn.offsetWidth || 100;
    const h = noBtn.offsetHeight || 44;
    const bounds = viewportBounds();
    const minCenterX = bounds.minX + w / 2;
    const minCenterY = bounds.minY + h / 2;
    const maxCenterX = Math.max(minCenterX, bounds.maxX - w / 2);
    const maxCenterY = Math.max(minCenterY, bounds.maxY - h / 2);
    let nx, ny, tries = 0;
    do {
      nx = rand(minCenterX, maxCenterX);
      ny = rand(minCenterY, maxCenterY);
      tries++;
    } while (
      fromX !== undefined &&
      Math.hypot(nx - fromX, ny - fromY) < FLEE_RADIUS &&
      tries < 8
    );
    placeButtonAt(nx, ny);
  }

  /* fuite anticipée au survol / approche du curseur (desktop) */
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    if (!isQuestionLive()) return;        // la carte n'est pas encore à l'écran
    const r = noBtn.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
    const now = performance.now();
    if (dist < FLEE_RADIUS && now - lastFleeAt > 220){
      lastFleeAt = now;
      flee(e.clientX, e.clientY);
    }
  });

  /* sur mobile : dès qu'on touche le bouton, il se déplace avant le tap */
  noBtn.addEventListener('touchstart', (e) => {
    if (!isQuestionLive()) return;
    e.preventDefault();
    const t = e.touches[0];
    lastFleeAt = performance.now();
    flee(t.clientX, t.clientY);
  }, { passive: false });

  /* filet de sécurité : si un clic aboutit malgré tout, il fuit encore
     et ne déclenche jamais l'action "Non" */
  noBtn.addEventListener('click', (e) => {
    if (!isQuestionLive()) return;
    e.preventDefault();
    lastFleeAt = performance.now();
    flee(e.clientX, e.clientY);
  });

  noBtn.addEventListener('pointerenter', (e) => {
    if (e.pointerType === 'touch') return;
    if (!isQuestionLive()) return;
    flee(e.clientX, e.clientY);
  });

  window.addEventListener('resize', () => {
    if (noBtn.classList.contains('is-fleeing')){
      const r = noBtn.getBoundingClientRect();
      placeButtonAt(r.left + r.width / 2, r.top + r.height / 2);
    }
  });

  /* ------------------------------------------------------------
     4. ACTE 3 — « OUI » : CÉLÉBRATION
     ------------------------------------------------------------ */
  const finaleLines = document.querySelectorAll('.finale__line');

  yesBtn.addEventListener('click', () => {
    const r = yesBtn.getBoundingClientRect();
    spawnBurst(50, r.left + r.width / 2, r.top + r.height / 2, 'point');
    goToStage('stage-celebration');

    celebrating = true;
    setTimeout(() => { celebrating = false; }, 3400);

    finaleLines.forEach((l, i) => {
      setTimeout(() => l.classList.add('is-visible'), 300 + i * 500);
    });
  });
})();
