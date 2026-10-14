// ---------- Custom Cursor FX & Context Menu Protection ----------

// 1. Zákaz kontextového menu prohlížeče (Save image as, Inspect, atd.)
window.addEventListener('contextmenu', e => {
  e.preventDefault();
  return false;
}, { passive: false, capture: true });

// 2. Jemný světelný efekt částic sledující kurzor myši v menu a UI
(function initCursorFx() {
  if (typeof window === 'undefined') return;

  const canvas = document.createElement('canvas');
  canvas.id = 'cursorFxCanvas';
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '999999';
  canvas.style.opacity = '0.9';

  const ctx = canvas.getContext('2d');
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const particles = [];
  let lastX = -1, lastY = -1;
  let animId = null;

  function spawnParticle(x, y, isHover) {
    if (document.pointerLockElement) return; // Během zamčení myši ve 3D hře částice nespouštíme
    const count = isHover ? 2 : 1;
    for (let i = 0; i < count; i++) {
      if (particles.length > 25) particles.shift();
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.4 + Math.random() * 1.2;
      particles.push({
        x: x + (Math.random() - 0.5) * 4,
        y: y + (Math.random() - 0.5) * 4,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed + 0.3,
        size: isHover ? 2.8 + Math.random() * 2 : 2.0 + Math.random() * 1.5,
        life: 1.0,
        decay: 0.045 + Math.random() * 0.03,
        color: isHover
          ? (Math.random() > 0.4 ? '#fbbf24' : '#f59e0b') // Zlaté jiskry nad tlačítky
          : (Math.random() > 0.3 ? '#38bdf8' : '#7dd3fc')  // Diamantově modré jiskry běžně
      });
    }
  }

  function updateAndDraw() {
    ctx.clearRect(0, 0, width, height);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;

      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;

      // Vykreslení jiskřičky (kosočtverec / hvězdička)
      const s = p.size * p.life;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - s);
      ctx.lineTo(p.x + s * 0.7, p.y);
      ctx.lineTo(p.x, p.y + s);
      ctx.lineTo(p.x - s * 0.7, p.y);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    if (particles.length > 0) {
      animId = requestAnimationFrame(updateAndDraw);
    } else {
      animId = null;
    }
  }

  window.addEventListener('mousemove', e => {
    if (document.pointerLockElement) return;

    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    const dist = Math.hypot(dx, dy);

    if (dist > 3) {
      lastX = e.clientX;
      lastY = e.clientY;
      const target = document.elementFromPoint(e.clientX, e.clientY);
      const isHover = target && (
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.closest('button') ||
        target.classList.contains('pill') ||
        target.classList.contains('swatch') ||
        target.classList.contains('emote-btn')
      );
      spawnParticle(e.clientX, e.clientY, !!isHover);

      if (!animId) {
        animId = requestAnimationFrame(updateAndDraw);
      }
    }
  }, { passive: true });

  if (document.body) {
    document.body.appendChild(canvas);
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      document.body.appendChild(canvas);
    });
  }
})();
