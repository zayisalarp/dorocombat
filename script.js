/**
 * COMBAT - CONTINUOUS BATTLE ENGINE
 * 100% visible fighters (no disappearing, no teleporting),
 * elastic arena bouncing, punchy clashing, and live scoreboard.
 */

// ============================================================================
// AUDIO SYNTHESIZER
// ============================================================================
class CombatAudio {
  constructor() {
    this.ctx = null;
    this.enabled = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggle() {
    this.init();
    this.enabled = !this.enabled;
    return this.enabled;
  }

  playHit(isCrit = false) {
    if (!this.enabled || !this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = isCrit ? 'sawtooth' : 'triangle';

      osc.frequency.setValueAtTime(isCrit ? 340 : 220, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.1);

      gain.gain.setValueAtTime(isCrit ? 0.2 : 0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.11);
    } catch (e) {}
  }

  playLunge() {
    if (!this.enabled || !this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';

      osc.frequency.setValueAtTime(160, t);
      osc.frequency.exponentialRampToValueAtTime(420, t + 0.08);

      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.09);
    } catch (e) {}
  }

  playBreak() {
    if (!this.enabled || !this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';

      osc.frequency.setValueAtTime(260, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.25);

      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.28);
    } catch (e) {}
  }

  playPop() {
    if (!this.enabled || !this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';

      osc.frequency.setValueAtTime(500, t);
      osc.frequency.exponentialRampToValueAtTime(850, t + 0.08);

      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.09);
    } catch (e) {}
  }
}

const sfx = new CombatAudio();

// ============================================================================
// ARENA CONFIGURATION
// ============================================================================
const CONFIG = {
  assetSrc: '4x.avif',
  fighterCount: 12,
  spriteW: 105,
  spriteH: 96,
  scores: { cyan: 0, red: 0 },
};

let hitStopFrames = 0;

// High-speed vector canvas for sparks and damage numbers
const canvas = document.getElementById('combat-canvas');
const ctx = canvas.getContext('2d');
let particles = [];
let damageTexts = [];

// Pointer State
const pointer = {
  x: window.innerWidth / 2,
  y: window.innerHeight / 2,
  prevX: window.innerWidth / 2,
  prevY: window.innerHeight / 2,
  vx: 0,
  vy: 0,
  draggedFighter: null,
};

let fighters = [];

// ============================================================================
// PARTICLES & DAMAGE POPUPS
// ============================================================================
class Spark {
  constructor(x, y, vx, vy, color, size, life) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.size = size;
    this.maxLife = life;
    this.life = life;
  }

  update(delta) {
    this.x += this.vx * delta;
    this.y += this.vy * delta;
    this.vx *= 0.94;
    this.vy *= 0.94;
    this.life -= delta;
    return this.life > 0;
  }

  draw(c) {
    const alpha = Math.max(0, this.life / this.maxLife);
    c.globalAlpha = alpha;
    c.fillStyle = this.color;
    c.beginPath();
    c.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    c.fill();
  }
}

class DamageNumber {
  constructor(x, y, text, color, isCrit) {
    this.x = x + (Math.random() - 0.5) * 16;
    this.y = y - 16;
    this.text = text;
    this.color = color;
    this.isCrit = isCrit;
    this.vy = isCrit ? -1.8 : -1.2;
    this.vx = (Math.random() - 0.5) * 0.8;
    this.maxLife = isCrit ? 36 : 28;
    this.life = this.maxLife;
    this.size = isCrit ? 18 : 13;
  }

  update(delta) {
    this.x += this.vx * delta;
    this.y += this.vy * delta;
    this.life -= delta;
    return this.life > 0;
  }

  draw(c) {
    const alpha = Math.max(0, this.life / this.maxLife);
    c.globalAlpha = alpha;
    c.font = `700 ${this.size}px 'Space Grotesk', sans-serif`;
    c.fillStyle = this.color;
    c.textAlign = 'center';
    c.fillText(this.text, this.x, this.y);
  }
}

function spawnSparks(x, y, color, count = 12) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2.5 + Math.random() * 5.5;
    particles.push(new Spark(
      x, y,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed,
      color,
      1.5 + Math.random() * 2,
      18 + Math.random() * 14
    ));
  }
}

// Subtle ambient cosmic dust
let ambientDust = [];
function initAmbientDust() {
  ambientDust = [];
  const count = 35;
  for (let i = 0; i < count; i++) {
    ambientDust.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      size: 1 + Math.random() * 1.5,
      alpha: 0.12 + Math.random() * 0.2
    });
  }
}

// ============================================================================
// CONTINUOUS FIGHTER CLASS (ALWAYS VISIBLE - NO TELEPORTING)
// ============================================================================
class Fighter {
  constructor(team, x, y) {
    this.team = team || (Math.random() > 0.5 ? 'cyan' : 'red');
    this.width = CONFIG.spriteW;
    this.height = CONFIG.spriteH;

    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    const topLimit = 80;

    // Guaranteed visible position inside screen bounds
    this.x = x !== undefined ? x : 40 + Math.random() * (screenW - this.width - 80);
    this.y = y !== undefined ? y : topLimit + 20 + Math.random() * (screenH - this.height - topLimit - 40);

    const angle = Math.random() * Math.PI * 2;
    const speed = 1.0 + Math.random() * 1.2;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;

    this.maxHp = 100;
    this.hp = 100;
    this.state = 'PATROL'; // 'PATROL' | 'HUNT' | 'LUNGE' | 'RECOIL' | 'GRABBED'
    this.facing = this.vx >= 0 ? 1 : -1;

    this.decisionTimer = Math.floor(Math.random() * 25);
    this.attackCooldown = Math.floor(Math.random() * 45);
    this.lungeTimer = 0;
    this.history = [];

    this.createElement();
    this.bindEvents();
    this.applyRender();
  }

  createElement() {
    this.element = document.createElement('div');
    this.element.className = `fighter-sprite team-${this.team}`;
    this.element.style.width = `${this.width}px`;
    this.element.style.height = `${this.height}px`;

    // Health bar HUD
    this.hudEl = document.createElement('div');
    this.hudEl.className = 'fighter-hud';

    this.healthTrackEl = document.createElement('div');
    this.healthTrackEl.className = 'health-track';

    this.healthFillEl = document.createElement('div');
    this.healthFillEl.className = 'health-fill';
    this.healthTrackEl.appendChild(this.healthFillEl);
    this.hudEl.appendChild(this.healthTrackEl);

    // Avatar Image
    this.avatarEl = document.createElement('div');
    this.avatarEl.className = 'fighter-avatar';

    this.imgEl = document.createElement('img');
    this.imgEl.src = CONFIG.assetSrc;
    this.imgEl.alt = `${this.team} fighter`;
    this.imgEl.draggable = false;
    this.avatarEl.appendChild(this.imgEl);

    this.element.appendChild(this.hudEl);
    this.element.appendChild(this.avatarEl);

    document.getElementById('fighters-container').appendChild(this.element);
  }

  bindEvents() {
    const onStart = (clientX, clientY) => {
      this.state = 'GRABBED';
      pointer.draggedFighter = this;
      this.dragOffsetX = clientX - this.x;
      this.dragOffsetY = clientY - this.y;
      this.element.classList.add('is-grabbed');
      this.history = [];
      sfx.playPop();
    };

    this.element.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      onStart(e.clientX, e.clientY);
    });

    this.element.addEventListener('touchstart', (e) => {
      e.stopPropagation();
      if (e.touches.length > 0) {
        onStart(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: false });
  }

  takeDamage(amount, attacker) {
    this.hp -= amount;

    const isCrit = amount >= 25;
    const hitColor = isCrit ? '#ffd600' : (this.team === 'cyan' ? '#00f2fe' : '#ff2a5f');

    damageTexts.push(new DamageNumber(
      this.x + this.width / 2,
      this.y,
      isCrit ? `💥 -${amount}` : `-${amount}`,
      hitColor,
      isCrit
    ));

    sfx.playHit(isCrit);

    // If health depleted, trigger a knockdown point and instant shield recovery!
    // FIGHTERS NEVER VANISH OR TELEPORT!
    if (this.hp <= 0) {
      this.onShieldBreak();
    } else {
      this.healthFillEl.style.width = `${(this.hp / this.maxHp) * 100}%`;
      this.state = 'RECOIL';
      this.decisionTimer = 16;
      this.element.classList.remove('is-attacking');
    }
  }

  onShieldBreak() {
    // Award point to opposing team
    if (this.team === 'cyan') {
      CONFIG.scores.red++;
      document.getElementById('score-red').textContent = CONFIG.scores.red;
    } else {
      CONFIG.scores.cyan++;
      document.getElementById('score-cyan').textContent = CONFIG.scores.cyan;
    }

    damageTexts.push(new DamageNumber(
      this.x + this.width / 2,
      this.y - 10,
      '⚡ KNOCKBACK!',
      '#ffd600',
      true
    ));

    sfx.playBreak();

    // Instant shield recharge without leaving screen
    this.hp = this.maxHp;
    this.healthFillEl.style.width = '100%';

    // Stunned visual reaction
    this.state = 'RECOIL';
    this.decisionTimer = 25;
    this.element.classList.add('is-stunned');
    setTimeout(() => {
      this.element.classList.remove('is-stunned');
    }, 400);

    spawnSparks(this.x + this.width / 2, this.y + this.height / 2, '#ffffff', 18);
  }

  update(delta) {
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    const topLimit = 75; // Stay clear of minimalist top bar

    // DRAGGED BY PLAYER
    if (this.state === 'GRABBED') {
      const targetX = pointer.x - this.dragOffsetX;
      const targetY = pointer.y - this.dragOffsetY;

      this.history.push({ x: targetX, y: targetY, t: performance.now() });
      if (this.history.length > 5) this.history.shift();

      this.vx = targetX - this.x;
      this.vy = targetY - this.y;
      this.x = Math.max(10, Math.min(screenW - this.width - 10, targetX));
      this.y = Math.max(topLimit, Math.min(screenH - this.height - 10, targetY));

      this.checkPlayerTossCollisions();

      if (Math.abs(this.vx) > 0.4) {
        this.facing = this.vx >= 0 ? 1 : -1;
      }
      this.applyRender();
      return;
    }

    // AI DECISIONS
    this.decisionTimer -= delta;
    this.attackCooldown -= delta;

    if (this.decisionTimer <= 0) {
      this.decisionTimer = 18 + Math.random() * 18;

      let closestEnemy = null;
      let closestDistSq = Infinity;
      const myCenterX = this.x + this.width / 2;
      const myCenterY = this.y + this.height / 2;

      for (let i = 0; i < fighters.length; i++) {
        const other = fighters[i];
        if (other === this || other.team === this.team) continue;

        const dx = (other.x + other.width / 2) - myCenterX;
        const dy = (other.y + other.height / 2) - myCenterY;
        const distSq = dx * dx + dy * dy;

        if (distSq < closestDistSq) {
          closestDistSq = distSq;
          closestEnemy = other;
        }
      }

      if (closestEnemy && closestDistSq < 140000 && this.attackCooldown <= 0) { // ~370px range
        // LUNGE ATTACK
        this.state = 'LUNGE';
        this.lungeTimer = 18;
        this.attackCooldown = 65 + Math.random() * 35;

        const dist = Math.sqrt(closestDistSq) || 1;
        const dx = (closestEnemy.x + closestEnemy.width / 2) - myCenterX;
        const dy = (closestEnemy.y + closestEnemy.height / 2) - myCenterY;
        const speed = 7.5;

        this.vx = (dx / dist) * speed;
        this.vy = (dy / dist) * speed;

        this.element.classList.add('is-attacking');
        sfx.playLunge();
      } else if (closestEnemy && closestDistSq < 400000) {
        // HUNT / APPROACH TARGET
        this.state = 'HUNT';
        const dist = Math.sqrt(closestDistSq) || 1;
        const dx = (closestEnemy.x + closestEnemy.width / 2) - myCenterX;
        const dy = (closestEnemy.y + closestEnemy.height / 2) - myCenterY;
        const speed = 2.0;

        this.vx = (dx / dist) * speed;
        this.vy = (dy / dist) * speed;
        this.element.classList.remove('is-attacking');
      } else {
        // PATROL / CHILL DRIFT
        this.state = 'PATROL';
        this.element.classList.remove('is-attacking');
        if (Math.random() < 0.25) {
          const randAngle = Math.random() * Math.PI * 2;
          this.vx += Math.cos(randAngle) * 0.6;
          this.vy += Math.sin(randAngle) * 0.6;
        }
      }
    }

    // LUNGE PROGRESSION
    if (this.state === 'LUNGE') {
      this.lungeTimer -= delta;
      if (this.lungeTimer <= 0) {
        this.state = 'PATROL';
        this.element.classList.remove('is-attacking');
      }
    }

    // POSITION & GENTLE FRICTION
    this.x += this.vx * delta;
    this.y += this.vy * delta;
    this.vx *= 0.985;
    this.vy *= 0.985;

    // SMOOTH ELASTIC ARENA BOUNDS (NO SNAPPING / NO DISAPPEARING)
    const margin = 10;
    if (this.x < margin) {
      this.x = margin;
      this.vx = Math.abs(this.vx) * 0.85 + 0.8;
    } else if (this.x + this.width > screenW - margin) {
      this.x = screenW - this.width - margin;
      this.vx = -Math.abs(this.vx) * 0.85 - 0.8;
    }

    if (this.y < topLimit) {
      this.y = topLimit;
      this.vy = Math.abs(this.vy) * 0.85 + 0.8;
    } else if (this.y + this.height > screenH - margin) {
      this.y = screenH - this.height - margin;
      this.vy = -Math.abs(this.vy) * 0.85 - 0.8;
    }

    // FACING WITH DEADZONE (PREVENTS JITTERY FLICKERING)
    if (Math.abs(this.vx) > 0.4) {
      this.facing = this.vx >= 0 ? 1 : -1;
    }

    // CLASH CHECKS
    this.checkCombatCollisions();

    this.applyRender();
  }

  checkCombatCollisions() {
    const myCenterX = this.x + this.width / 2;
    const myCenterY = this.y + this.height / 2;
    const hitRadius = (this.width + this.height) / 4.2;
    const hitRadiusSq = hitRadius * hitRadius * 3.2;

    for (let i = 0; i < fighters.length; i++) {
      const enemy = fighters[i];
      if (enemy === this || enemy.team === this.team) continue;

      const enemyCenterX = enemy.x + enemy.width / 2;
      const enemyCenterY = enemy.y + enemy.height / 2;
      const dx = enemyCenterX - myCenterX;
      const dy = enemyCenterY - myCenterY;
      const distSq = dx * dx + dy * dy;

      if (distSq < hitRadiusSq) {
        this.resolveClash(enemy, dx, dy, Math.sqrt(distSq) || 1);
        break;
      }
    }
  }

  checkPlayerTossCollisions() {
    const myCenterX = this.x + this.width / 2;
    const myCenterY = this.y + this.height / 2;

    for (let i = 0; i < fighters.length; i++) {
      const enemy = fighters[i];
      if (enemy === this) continue;

      const enemyCenterX = enemy.x + enemy.width / 2;
      const enemyCenterY = enemy.y + enemy.height / 2;
      const dx = enemyCenterX - myCenterX;
      const dy = enemyCenterY - myCenterY;
      const distSq = dx * dx + dy * dy;

      if (distSq < 5200) { // ~72px
        const dist = Math.sqrt(distSq) || 1;
        enemy.vx = (dx / dist) * 14;
        enemy.vy = (dy / dist) * 14;
        enemy.takeDamage(32, this);
        spawnSparks(enemyCenterX, enemyCenterY, '#ffffff', 18);
        hitStopFrames = 2;
      }
    }
  }

  resolveClash(enemy, dx, dy, dist) {
    const midX = (this.x + this.width / 2 + enemy.x + enemy.width / 2) / 2;
    const midY = (this.y + this.height / 2 + enemy.y + enemy.height / 2) / 2;

    let myDmg = Math.floor(14 + Math.random() * 10);
    let enemyDmg = Math.floor(14 + Math.random() * 10);

    if (this.state === 'LUNGE') myDmg += 14;
    if (enemy.state === 'LUNGE') enemyDmg += 14;

    enemy.takeDamage(myDmg, this);
    this.takeDamage(enemyDmg, enemy);

    hitStopFrames = 2; // quick satisfying micro hit-stop

    // Recoil knockback
    const recoil = 6.8;
    const pushX = (dx / dist) * recoil;
    const pushY = (dy / dist) * recoil;

    this.vx = -pushX;
    this.vy = -pushY;
    enemy.vx = pushX;
    enemy.vy = pushY;

    this.state = 'RECOIL';
    enemy.state = 'RECOIL';
    this.element.classList.remove('is-attacking');
    enemy.element.classList.remove('is-attacking');

    spawnSparks(midX, midY, this.team === 'cyan' ? '#00f2fe' : '#ff2a5f', 16);
  }

  fling(vx, vy) {
    this.state = 'PATROL';
    this.element.classList.remove('is-grabbed');
    this.vx = Math.max(-26, Math.min(26, vx));
    this.vy = Math.max(-26, Math.min(26, vy));
    sfx.playLunge();
  }

  applyRender() {
    const transform = `translate3d(${this.x.toFixed(1)}px, ${this.y.toFixed(1)}px, 0) scaleX(${this.facing})`;
    this.element.style.transform = transform;
  }

  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}

// ============================================================================
// ARENA ROSTER & RESIZING
// ============================================================================
function initFighters(count) {
  fighters.forEach(f => f.destroy());
  fighters = [];

  for (let i = 0; i < count; i++) {
    const team = i % 2 === 0 ? 'cyan' : 'red';
    fighters.push(new Fighter(team));
  }

  updateFighterCountDisplay();
}

function spawnFighterAt(x, y) {
  const cyanCount = fighters.filter(f => f.team === 'cyan').length;
  const redCount = fighters.filter(f => f.team === 'red').length;
  const team = cyanCount <= redCount ? 'cyan' : 'red';

  const f = new Fighter(team, x - CONFIG.spriteW / 2, y - CONFIG.spriteH / 2);
  fighters.push(f);

  spawnSparks(x, y, team === 'cyan' ? '#00f2fe' : '#ff2a5f', 16);
  sfx.playPop();

  updateFighterCountDisplay();
}

function updateFighterCountDisplay() {
  const countEl = document.getElementById('fighters-count');
  if (countEl) countEl.textContent = `${fighters.length} fighters`;
}

// ============================================================================
// MAIN BATTLE LOOP (SOLID 60+ FPS)
// ============================================================================
let lastTime = performance.now();
let frameCount = 0;
let lastFpsUpdate = performance.now();

function battleLoop(currentTime) {
  const deltaMs = currentTime - lastTime;
  lastTime = currentTime;
  const delta = Math.min(deltaMs / (1000 / 60), 2.0);

  // Smooth FPS Counter
  frameCount++;
  if (currentTime - lastFpsUpdate >= 500) {
    const fps = Math.round((frameCount * 1000) / (currentTime - lastFpsUpdate));
    const fpsEl = document.getElementById('fps-display');
    if (fpsEl) fpsEl.textContent = `${Math.min(120, fps)} fps`;
    frameCount = 0;
    lastFpsUpdate = currentTime;
  }

  // Clear Canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Ambient Dust
  ctx.save();
  for (let i = 0; i < ambientDust.length; i++) {
    const d = ambientDust[i];
    d.x += d.vx * delta;
    d.y += d.vy * delta;
    if (d.x < 0) d.x = canvas.width;
    if (d.x > canvas.width) d.x = 0;
    if (d.y < 0) d.y = canvas.height;
    if (d.y > canvas.height) d.y = 0;

    ctx.globalAlpha = d.alpha;
    ctx.fillStyle = '#00f2fe';
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Sparks
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    if (p.update(delta)) {
      p.draw(ctx);
    } else {
      particles.splice(i, 1);
    }
  }

  // Damage Numbers
  for (let i = damageTexts.length - 1; i >= 0; i--) {
    const d = damageTexts[i];
    if (d.update(delta)) {
      d.draw(ctx);
    } else {
      damageTexts.splice(i, 1);
    }
  }

  // Hit-Stop Micro Freeze
  if (hitStopFrames > 0) {
    hitStopFrames--;
  } else {
    for (let i = 0; i < fighters.length; i++) {
      fighters[i].update(delta);
    }
  }

  requestAnimationFrame(battleLoop);
}

// ============================================================================
// MOUSE & TOUCH LISTENERS
// ============================================================================
window.addEventListener('mousemove', (e) => {
  pointer.prevX = pointer.x;
  pointer.prevY = pointer.y;
  pointer.x = e.clientX;
  pointer.y = e.clientY;
  pointer.vx = pointer.x - pointer.prevX;
  pointer.vy = pointer.y - pointer.prevY;
});

window.addEventListener('mouseup', () => {
  if (pointer.draggedFighter) {
    let vx = pointer.vx * 1.1;
    let vy = pointer.vy * 1.1;

    if (pointer.draggedFighter.history.length >= 2) {
      const first = pointer.draggedFighter.history[0];
      const last = pointer.draggedFighter.history[pointer.draggedFighter.history.length - 1];
      const dt = (last.t - first.t) / 1000;
      if (dt > 0.01) {
        vx = (last.x - first.x) / (dt * 60);
        vy = (last.y - first.y) / (dt * 60);
      }
    }

    pointer.draggedFighter.fling(vx, vy);
    pointer.draggedFighter = null;
  }
});

window.addEventListener('touchmove', (e) => {
  if (e.touches.length > 0) {
    pointer.prevX = pointer.x;
    pointer.prevY = pointer.y;
    pointer.x = e.touches[0].clientX;
    pointer.y = e.touches[0].clientY;
    pointer.vx = pointer.x - pointer.prevX;
    pointer.vy = pointer.y - pointer.prevY;
  }
}, { passive: true });

window.addEventListener('touchend', () => {
  if (pointer.draggedFighter) {
    pointer.draggedFighter.fling(pointer.vx * 1.1, pointer.vy * 1.1);
    pointer.draggedFighter = null;
  }
});

// Click anywhere on empty stage to summon a new fighter
document.getElementById('fighters-container').addEventListener('click', (e) => {
  if (pointer.draggedFighter) return;
  if (e.target.id === 'fighters-container') {
    spawnFighterAt(e.clientX, e.clientY);
  }
});

function handleResize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const screenW = window.innerWidth;
  const screenH = window.innerHeight;
  const topLimit = 75;

  // Keep all fighters smoothly within visible bounds
  fighters.forEach(f => {
    f.x = Math.max(10, Math.min(screenW - f.width - 10, f.x));
    f.y = Math.max(topLimit, Math.min(screenH - f.height - 10, f.y));
  });
}
window.addEventListener('resize', handleResize);

// ============================================================================
// SOUND TOGGLE IN MINIMALIST TOP BAR
// ============================================================================
function initSoundToggle() {
  const btn = document.getElementById('sound-btn');
  const icon = document.getElementById('sound-icon');

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const enabled = sfx.toggle();
    if (enabled) {
      btn.classList.add('active');
      icon.innerHTML = `
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
      `;
      sfx.playPop();
    } else {
      btn.classList.remove('active');
      icon.innerHTML = `
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
        <line x1="23" y1="9" x2="17" y2="15"></line>
        <line x1="17" y1="9" x2="23" y2="15"></line>
      `;
    }
  });
}

// ============================================================================
// INITIALIZATION
// ============================================================================
window.addEventListener('DOMContentLoaded', () => {
  handleResize();
  initAmbientDust();
  initFighters(CONFIG.fighterCount);
  initSoundToggle();
  requestAnimationFrame(battleLoop);
});
