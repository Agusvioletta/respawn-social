// touch-controls.js — Controles táctiles para arcade
// Se incluye en todos los juegos. Simula teclas del teclado.

(function() {
  // Solo activar en móvil
  const isMobile = /Android|iPhone|iPad|iPod|Touch/i.test(navigator.userAgent) || window.innerWidth <= 768;

  function simulateKey(key, type = 'keydown') {
    const event = new KeyboardEvent(type, {
      key, code: key, bubbles: true, cancelable: true
    });
    document.dispatchEvent(event);
  }

  function holdKey(key) {
    const interval = setInterval(() => simulateKey(key, 'keydown'), 50);
    return interval;
  }

  // Detectar tipo de juego por URL para configurar controles
  const page = window.location.pathname.split('/').pop().replace('.html','');

  // Config de controles por juego
  const configs = {
    snake:        { dpad: true,  actionA: ' ',     actionALabel: 'START',  actionB: null },
    pong:         { dpad: true,  actionA: null,     actionALabel: null,     actionB: null, vertical: true },
    breakout:     { dpad: true,  actionA: ' ',     actionALabel: 'LANZAR', actionB: null, horizontal: true },
    asteroids:    { dpad: true,  actionA: ' ',     actionALabel: 'FUEGO',  actionB: 'Shift', actionBLabel: 'BOOST' },
    flappy:       { dpad: false, actionA: ' ',     actionALabel: 'VOLAR',  actionB: null },
    tetris:       { dpad: true,  actionA: 'ArrowUp', actionALabel: 'ROTAR', actionB: ' ', actionBLabel: 'DROP' },
    spaceinvaders:{ dpad: true,  actionA: ' ',     actionALabel: 'FUEGO',  actionB: null, horizontal: true },
    dino:         { dpad: false, actionA: ' ',     actionALabel: 'SALTAR', actionB: 'ArrowDown', actionBLabel: 'AGACHAR' },
    gamemap:      { dpad: true,  actionA: 'Enter', actionALabel: 'JUGAR',  actionB: null },
  };

  const cfg = configs[page];
  if (!cfg) return; // Página sin juego

  // Crear HTML de controles táctiles
  const controls = document.createElement('div');
  controls.className = 'touch-controls';
  controls.id = 'touchControls';

  // D-pad izquierdo
  let dpadHTML = '';
  if (cfg.dpad) {
    const up    = cfg.vertical || !cfg.horizontal ? 'ArrowUp'    : null;
    const down  = cfg.vertical || !cfg.horizontal ? 'ArrowDown'  : null;
    const left  = 'ArrowLeft';
    const right = 'ArrowRight';

    dpadHTML = `<div class="dpad">
      <div class="dpad-empty"></div>
      ${up    ? `<button class="dpad-btn" data-key="${up}">▲</button>`    : '<div class="dpad-empty"></div>'}
      <div class="dpad-empty"></div>
      ${left  ? `<button class="dpad-btn" data-key="${left}">◀</button>`  : '<div class="dpad-empty"></div>'}
      <div class="dpad-empty"></div>
      ${right ? `<button class="dpad-btn" data-key="${right}">▶</button>` : '<div class="dpad-empty"></div>'}
      <div class="dpad-empty"></div>
      ${down  ? `<button class="dpad-btn" data-key="${down}">▼</button>`  : '<div class="dpad-empty"></div>'}
      <div class="dpad-empty"></div>
    </div>`;
  } else {
    dpadHTML = '<div></div>';
  }

  // Botones de acción derechos
  let actionHTML = '<div class="action-btns">';
  if (cfg.actionB && cfg.actionBLabel) {
    actionHTML += `<button class="action-btn action-btn-b" data-key="${cfg.actionB}">${cfg.actionBLabel}</button>`;
  }
  if (cfg.actionA && cfg.actionALabel) {
    actionHTML += `<button class="action-btn action-btn-a" data-key="${cfg.actionA}">${cfg.actionALabel}</button>`;
  }
  actionHTML += '</div>';

  controls.innerHTML = dpadHTML + actionHTML;
  document.body.appendChild(controls);

  // Eventos táctiles — hold para movimiento continuo, tap para acciones
  let heldInterval = null;

  controls.addEventListener('touchstart', e => {
    e.preventDefault();
    const btn = e.target.closest('[data-key]');
    if (!btn) return;
    const key = btn.getAttribute('data-key');
    simulateKey(key, 'keydown');
    // Hold para movimiento continuo (no para acciones puntuales)
    const isMovement = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(key);
    if (isMovement) {
      if (heldInterval) clearInterval(heldInterval);
      heldInterval = setInterval(() => simulateKey(key, 'keydown'), 80);
    }
  }, { passive: false });

  controls.addEventListener('touchend', e => {
    e.preventDefault();
    if (heldInterval) { clearInterval(heldInterval); heldInterval = null; }
    const btn = e.target.closest('[data-key]');
    if (!btn) return;
    const key = btn.getAttribute('data-key');
    simulateKey(key, 'keyup');
  }, { passive: false });

  controls.addEventListener('touchcancel', e => {
    if (heldInterval) { clearInterval(heldInterval); heldInterval = null; }
  });

  // Mouse events como fallback para testing en desktop
  controls.addEventListener('mousedown', e => {
    const btn = e.target.closest('[data-key]');
    if (!btn) return;
    const key = btn.getAttribute('data-key');
    simulateKey(key, 'keydown');
    const isMovement = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(key);
    if (isMovement) {
      if (heldInterval) clearInterval(heldInterval);
      heldInterval = setInterval(() => simulateKey(key, 'keydown'), 80);
    }
  });
  document.addEventListener('mouseup', () => {
    if (heldInterval) { clearInterval(heldInterval); heldInterval = null; }
  });

  // Mostrar/ocultar según orientación
  function checkOrientation() {
    const portrait = window.innerHeight > window.innerWidth;
    const tc = document.getElementById('touchControls');
    if (tc && window.innerWidth <= 768) {
      tc.style.display = 'flex';
    }
  }
  window.addEventListener('resize', checkOrientation);
  window.addEventListener('orientationchange', checkOrientation);
  checkOrientation();

})();