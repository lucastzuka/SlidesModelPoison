const stage = document.getElementById('stage');
const counter = document.getElementById('counter');
let current = 0;
let animating = false;
const slideEls = [];

const BG_ACCENT = {
  '#e6e0f5': '#6e5db0', '#fbd3d8': '#a8456b', '#d2ebdf': '#3f8b70',
  '#ffdcc9': '#b0683a', '#d5e5f1': '#36679a', '#fff2ce': '#9d7d1a',
  '#f1daf4': '#b87cc1', '#ffc9d2': '#a8456b', '#67b991': '#1e5c3f',
  '#ffffff': '#2d2d2d', '#ffd24a': '#8a5c00', '#2d2d2d': '#ffd24a',
};
const BG_BULLET = {
  '#e6e0f5': '#aa9ed2', '#fbd3d8': '#d18ca1', '#d2ebdf': '#88bba7',
  '#ffdcc9': '#d7a281', '#d5e5f1': '#85a6c5', '#fff2ce': '#d4ad52',
  '#f1daf4': '#d4abda', '#ffc9d2': '#d3879e', '#67b991': '#428a68',
  '#ffffff': '#969696', '#ffd24a': '#c49725', '#2d2d2d': '#967f3b',
};

const countAnimRegistry = new Map();

function runCountAnim(el, target) {
  const duration = 2100;
  const t0 = performance.now();
  el.textContent = '0';
  function frame(now) {
    const t = Math.min((now - t0) / duration, 1);

    let eased;
    if (t < 0.5) {
      eased = 4.571 * t * t * t;
    } else {
      const s = 1 - t;
      eased = 1 - 6.857 * s * s * s * s;
    }
    el.textContent = String(Math.round(eased * target));
    if (t < 1) requestAnimationFrame(frame);
    else el.textContent = String(target);
  }
  requestAnimationFrame(frame);
}

function zalgoify(text) {
  const above = ['\u0300','\u0301','\u0302','\u0303','\u0304','\u0305','\u0306','\u0307','\u0308','\u0309','\u030A','\u030B','\u030C','\u030D','\u030E','\u030F','\u0310','\u0311','\u0312','\u0313','\u0314','\u0315'];
  const below = ['\u0316','\u0317','\u0318','\u0319','\u031B','\u031C','\u031D','\u031E','\u031F','\u0320','\u0321','\u0322','\u0323','\u0324','\u0325','\u0326','\u0327','\u0328','\u0329'];
  return [...text].map(char => {
    if (char === '\n' || char === ' ' || char.charCodeAt(0) > 0x007E) return char;
    let result = char;
    const n = 2 + Math.floor(Math.random() * 5);
    for (let i = 0; i < n; i++) {
      const pool = Math.random() < 0.6 ? above : below;
      result += pool[Math.floor(Math.random() * pool.length)];
    }
    return result;
  }).join('');
}

let currentPopup = null;
let hidePopupTimer = null;

function scheduleHidePopup() {
  hidePopupTimer = setTimeout(() => {
    if (currentPopup) { currentPopup.remove(); currentPopup = null; }
  }, 120);
}
function cancelHidePopup() {
  if (hidePopupTimer) { clearTimeout(hidePopupTimer); hidePopupTimer = null; }
}

function positionPopup(popup, trigger) {
  const rect = trigger.getBoundingClientRect();
  const pw = popup.offsetWidth || 440;
  const ph = popup.offsetHeight || 280;
  const gap = 16;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const candidates = [
    [rect.left + rect.width / 2 - pw / 2,  rect.top - ph - gap],       
    [rect.left - pw - gap,                  rect.top + rect.height / 2 - ph / 2], 
    [rect.right + gap,                      rect.top + rect.height / 2 - ph / 2], 
    [rect.left + rect.width / 2 - pw / 2,  rect.bottom + gap],          
  ];

  for (let [l, t] of candidates) {
    l = Math.max(10, Math.min(l, vw - pw - 10));
    t = Math.max(10, Math.min(t, vh - ph - 10));
    
    const overlapX = l < rect.right - 4 && l + pw > rect.left + 4;
    const overlapY = t < rect.bottom - 4 && t + ph > rect.top + 4;
    if (!(overlapX && overlapY)) {
      popup.style.left = l + 'px';
      popup.style.top = t + 'px';
      return;
    }
  }
  
  popup.style.left = Math.max(10, rect.left - pw - gap) + 'px';
  popup.style.top = Math.max(10, rect.top - ph - gap) + 'px';
}

function showPopup(imageSrc, triggerEl, label) {
  cancelHidePopup();
  if (currentPopup) { currentPopup.remove(); currentPopup = null; }

  const balloon = document.createElement('div');
  balloon.className = 'popup-balloon';
  balloon.style.visibility = 'hidden';

  const img = document.createElement('img');
  img.src = imageSrc;
  balloon.appendChild(img);

  if (label) {
    const lbl = document.createElement('div');
    lbl.style.cssText = 'font-family:Nunito,sans-serif;font-size:11px;color:#888;text-align:center;margin-top:6px;font-style:italic;letter-spacing:.5px;';
    lbl.textContent = label;
    balloon.appendChild(lbl);
  }

  balloon.addEventListener('mouseenter', cancelHidePopup);
  balloon.addEventListener('mouseleave', scheduleHidePopup);
  document.body.appendChild(balloon);
  currentPopup = balloon;

  const doPosition = () => {
    positionPopup(balloon, triggerEl);
    balloon.style.visibility = 'visible';
  };
  
  if (img.complete && img.naturalHeight > 0) { doPosition(); }
  else { img.onload = doPosition; img.onerror = doPosition; }
}

function showTextPopup(htmlContent, triggerEl, bg) {
  cancelHidePopup();
  if (currentPopup) { currentPopup.remove(); currentPopup = null; }
  const balloon = document.createElement('div');
  balloon.className = 'popup-text-balloon';
  if (bg) balloon.style.background = bg;
  balloon.innerHTML = htmlContent;
  balloon.addEventListener('mouseenter', cancelHidePopup);
  balloon.addEventListener('mouseleave', scheduleHidePopup);
  document.body.appendChild(balloon);
  currentPopup = balloon;
  positionPopup(balloon, triggerEl);
}

const PLAY_ICON  = `<svg width="18" height="20" viewBox="0 0 18 20" fill="none"><polygon points="1,1 17,10 1,19" fill="white" stroke="white" stroke-width="1" stroke-linejoin="round"/></svg>`;
const PAUSE_ICON = `<svg width="18" height="20" viewBox="0 0 18 20" fill="none"><rect x="1" y="1" width="5" height="18" rx="2" fill="white"/><rect x="12" y="1" width="5" height="18" rx="2" fill="white"/></svg>`;

function buildEl(el, parent) {
  if (el.t === 'fr') {
    const div = document.createElement('div');
    let css = `position:absolute;left:${el.x}px;top:${el.y}px;width:${el.w}px;height:${el.h}px;`;
    if (el.bg) css += `background:${el.bg};`;
    if (el.r) css += `border-radius:${el.r}px;`;
    if (el.ov !== false) css += `overflow:hidden;`;
    if (el.stroke) css += `outline:2px solid ${el.stroke};outline-offset:-2px;`;
    div.style.cssText = css;
    if (el.bg && BG_ACCENT[el.bg]) div.style.setProperty('--accent', BG_ACCENT[el.bg]);
    if (el.bg && BG_BULLET[el.bg]) div.style.setProperty('--bullet', BG_BULLET[el.bg]);
    parent.appendChild(div);
    (el.els || []).forEach(c => buildEl(c, div));

  } else if (el.t === 'tx') {
    const div = document.createElement('div');
    const isLink = !!el.href;
    const hasHoverText = !!(el.hoverText || el.hoverZalgo);
    let css = `position:absolute;left:${el.x}px;top:${el.y}px;width:${el.w}px;`;
    css += `font-family:'${el.font}',sans-serif;font-size:${el.sz}px;font-weight:${el.wt};`;
    css += `font-style:${el.it ? 'italic' : 'normal'};color:${el.color};text-align:${el.align};`;
    css += `white-space:${(isLink && !hasHoverText) ? 'nowrap' : 'pre-wrap'};overflow:visible;`;
    if (el.lh) css += `line-height:${el.lh};`;
    if (el.ls) css += `letter-spacing:${el.ls};`;
    if (el.dec) css += `text-decoration:${el.dec};`;
    if (el.z != null) css += `z-index:${el.z};`;
    div.style.cssText = css;

    if (el.href) {
      div.classList.add('tx-link');
      div.addEventListener('click', () => window.open(el.href, '_blank'));
    }

    let txt = el.text;
    let asHtml = el.html;
    if (txt && txt.includes('•')) {
      if (!asHtml) txt = txt.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      txt = txt.replace(/•/g, "<span class='bullet'>•</span>");
      asHtml = true;
    }
    if (asHtml) div.innerHTML = txt;
    else div.textContent = txt;

    if (el.popupLinks) {
      el.popupLinks.forEach(pl => {
        let anchors = [...div.querySelectorAll('a')];
        if (pl.href) anchors = anchors.filter(a => a.getAttribute('href') === pl.href);
        if (pl.text) anchors = anchors.filter(a => a.textContent.trim().includes(pl.text));
        anchors.forEach(a => {
          if (pl.textPopup) {
            a.addEventListener('mouseenter', () => showTextPopup(pl.textPopup, a, pl.popupBg));
          } else if (pl.popup) {
            a.addEventListener('mouseenter', () => showPopup(pl.popup, a, pl.label || null));
          }
          a.addEventListener('mouseleave', scheduleHidePopup);
        });
      });
    }

    if (el.textPopup) {
      div.addEventListener('mouseenter', () => showTextPopup(el.textPopup, div, el.popupBg));
      div.addEventListener('mouseleave', scheduleHidePopup);
    }

    if (el.countAnim != null) {
      div.dataset.countTarget = String(el.countAnim);
    }

    if (el.hoverText || el.hoverZalgo) {
      const srcText = el.text; 
      div.addEventListener('mouseenter', () => {
        div._savedHTML = div.innerHTML;
        div.style.whiteSpace = 'pre-wrap';
        div.textContent = el.hoverZalgo ? zalgoify(srcText) : el.hoverText;
      });
      div.addEventListener('mouseleave', () => {
        if (div._savedHTML !== undefined) {
          div.innerHTML = div._savedHTML;
          div.style.whiteSpace = '';
          div._savedHTML = undefined;
        }
      });
    }

    parent.appendChild(div);

  } else if (el.t === 'img') {
    const img = document.createElement('img');
    img.src = el.src;
    img.loading = 'lazy';
    const fit = el.of || 'cover';
    let css = `position:absolute;left:${el.x}px;top:${el.y}px;width:${el.w}px;height:${el.h}px;object-fit:${fit};`;
    if (el.r != null) {
      const rval = typeof el.r === 'number' ? `${el.r}px` : el.r;
      css += `border-radius:${rval};`;
    }
    if (el.stroke) css += `outline:2px solid ${el.stroke};outline-offset:-2px;`;
    if (el.z != null) css += `z-index:${el.z};`;
    img.style.cssText = css;
    if (el.anim) {
      img.classList.add('anim', 'anim-' + el.anim);
      if (el.animDur) img.style.animationDuration = el.animDur;
      if (el.animDelay) img.style.animationDelay = el.animDelay;
      if (el.animOrigin) img.style.transformOrigin = el.animOrigin;
    }
    if (el.href) {
      img.style.cursor = 'pointer';
      img.addEventListener('click', () => window.open(el.href, '_blank'));
    }
    if (el.popup) {
      img.dataset.href = '1';
      img.addEventListener('mouseenter', () => showPopup(el.popup, img, el.popupLabel || null));
      img.addEventListener('mouseleave', scheduleHidePopup);
    }

    if (el.audio) {
      const audioSrc = el.audio;
      const bw = 56, bh = 56;
      const btn = document.createElement('div');
      btn.className = 'anim anim-pulse';
      btn.innerHTML = PLAY_ICON;
      btn.style.cssText = `
        position:absolute;
        left:${el.x + (el.w - bw) / 2}px;
        top:${el.y + (el.h - bh) / 2}px;
        width:${bw}px;height:${bh}px;
        background:rgba(0,0,0,0.62);
        border-radius:14px;
        display:flex;align-items:center;justify-content:center;
        cursor:pointer;z-index:15;
        animation-duration:2s;
        box-shadow:0 4px 20px rgba(0,0,0,0.4);
        user-select:none;transition:background .2s;`;

      let audioEl = null;
      let playing = false;

      btn.addEventListener('mouseenter', () => { btn.style.background = 'rgba(0,0,0,0.82)'; });
      btn.addEventListener('mouseleave', () => { btn.style.background = 'rgba(0,0,0,0.62)'; });
      btn.addEventListener('click', e => {
        e.stopPropagation();
        if (playing && audioEl) {
          audioEl.pause();
          audioEl = null;
          playing = false;
          btn.innerHTML = PLAY_ICON;
          btn.style.animation = '';
        } else {
          audioEl = new Audio(audioSrc);
          audioEl.play().catch(() => {});
          playing = true;
          btn.innerHTML = PAUSE_ICON;
          btn.style.animation = 'none';
          audioEl.onended = () => {
            playing = false;
            audioEl = null;
            btn.innerHTML = PLAY_ICON;
            btn.style.animation = '';
          };
        }
      });
      parent.appendChild(btn);
    }

    parent.appendChild(img);

  } else if (el.t === 'rc') {
    const div = document.createElement('div');
    let css = `position:absolute;left:${el.x}px;top:${el.y}px;width:${el.w}px;height:${el.h}px;`;
    if (el.bg) css += `background:${el.bg};`;
    if (el.r) css += `border-radius:${el.r}px;`;
    div.style.cssText = css;
    parent.appendChild(div);

  } else if (el.t === 'group') {
    (el.els || []).forEach(c => buildEl(c, parent));
  }
}

SLIDES.forEach((s, i) => {
  const slide = document.createElement('div');
  slide.className = 'slide ' + (i === 0 ? 'active' : 'after');
  slide.dataset.w = s.w;
  slide.dataset.h = s.h;
  const inner = document.createElement('div');
  inner.className = 'slide-inner';
  inner.style.width = s.w + 'px';
  inner.style.height = s.h + 'px';
  inner.style.position = 'relative';
  s.els.forEach(el => buildEl(el, inner));
  slide.appendChild(inner);
  stage.appendChild(slide);
  slideEls.push(slide);
});

slideEls.forEach((slideEl, idx) => {
  const cel = slideEl.querySelector('[data-count-target]');
  if (cel) countAnimRegistry.set(idx, cel);
});

const SLIDE_TITLES = [
  "Model Poison",
  "O que é?",
  "250 docs",
  "Custo do ataque",
  "O ataque ensina",
  "Ciclos do ataque",
  "Não precisa invadir",
  "Por que é perigoso?",
  "Técnicas",
  "Backdoor",
  "Coleta de dados",
  "Prompt-injection",
  "RAG poison",
  "IA infectando IA",
  "Casos reais",
  "Rússia",
  "China",
  "DeepSeek R1",
  "LiteLLM",
  "Manipulação",
  "Áreas afetadas",
  "Geopolítica",
  "Temos defesas?",
  "DevSecML",
  "Desafios",
  "Conclusão"
];

const indexPopup = document.createElement('div');
indexPopup.id = 'index-popup';
const indexInner = document.createElement('div');
indexInner.id = 'index-inner';
SLIDES.forEach((s, i) => {
  const item = document.createElement('button');
  item.className = 'index-item';
  item.dataset.idx = i;
  const num = document.createElement('span');
  num.className = 'index-num';
  num.textContent = String(i + 1).padStart(2, '0');
  const title = document.createElement('span');
  title.className = 'index-title';
  title.textContent = SLIDE_TITLES[i] || ('Slide ' + (i + 1));
  item.appendChild(num);
  item.appendChild(title);
  item.addEventListener('click', () => goTo(i));
  indexInner.appendChild(item);
});
indexInner.style.gridTemplateRows = `repeat(${Math.ceil(SLIDES.length / 2)}, auto)`;
indexPopup.appendChild(indexInner);
const counterLabel = document.createElement('span');
counterLabel.id = 'counter-label';
counter.appendChild(indexPopup);
counter.appendChild(counterLabel);

function updateScale() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  slideEls.forEach(slide => {
    const sw = +slide.dataset.w;
    const sh = +slide.dataset.h;
    const scale = Math.min(vw / sw, vh / sh) * 0.92;
    const scaledW = sw * scale;
    const scaledH = sh * scale;
    const inner = slide.querySelector('.slide-inner');
    inner.style.transform = `scale(${scale})`;
    inner.style.left = Math.round((vw - scaledW) / 2) + 'px';
    inner.style.top = Math.round((vh - scaledH) / 2) + 'px';
  });
}

function updateCounter() {
  counterLabel.textContent = `${current + 1} / ${SLIDES.length}`;
  const items = indexInner.querySelectorAll('.index-item');
  items.forEach((el, i) => el.classList.toggle('active', i === current));
  const active = items[current];
  if (active) {
    const target = active.offsetTop - indexInner.clientHeight / 2 + active.clientHeight / 2;
    indexInner.scrollTop = Math.max(0, target);
  }
}

function goTo(index) {
  if (animating || index === current || index < 0 || index >= SLIDES.length) return;
  animating = true;
  const dir = index > current ? 1 : -1;
  const prev = current;
  current = index;
  slideEls[prev].classList.remove('active');
  slideEls[prev].classList.add(dir > 0 ? 'before' : 'after');
  slideEls[current].classList.remove('before', 'after');
  slideEls[current].classList.add('active');
  updateCounter();
  if (countAnimRegistry.has(index)) {
    const cel = countAnimRegistry.get(index);
    const target = parseInt(cel.dataset.countTarget);
    cel.textContent = '0';
    setTimeout(() => runCountAnim(cel, target), 340);
  }
  setTimeout(() => { animating = false; }, 650);
}

let lastScroll = 0;
window.addEventListener('wheel', e => {
  const now = Date.now();
  if (now - lastScroll < 380) return;
  lastScroll = now;
  if (e.deltaY > 0) goTo(current + 1);
  else goTo(current - 1);
}, { passive: true });

let touchStartY = 0;
window.addEventListener('touchstart', e => { touchStartY = e.touches[0].clientY; }, { passive: true });
window.addEventListener('touchend', e => {
  const diff = touchStartY - e.changedTouches[0].clientY;
  if (Math.abs(diff) < 40) return;
  if (diff > 0) goTo(current + 1);
  else goTo(current - 1);
});

window.addEventListener('keydown', e => {
  if (e.key === 'ArrowDown' || e.key === 'PageDown') goTo(current + 1);
  if (e.key === 'ArrowUp' || e.key === 'PageUp') goTo(current - 1);
  if (e.key === 'Home') goTo(0);
  if (e.key === 'End') goTo(SLIDES.length - 1);
});

window.addEventListener('resize', updateScale);
updateScale();
updateCounter();
