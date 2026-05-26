const stage = document.getElementById('stage');
const counter = document.getElementById('counter');
let current = 0;
let animating = false;
const slideEls = [];

function buildEl(el, parent) {
  if (el.t === 'fr') {
    const div = document.createElement('div');
    let css = `position:absolute;left:${el.x}px;top:${el.y}px;width:${el.w}px;height:${el.h}px;`;
    if (el.bg) css += `background:${el.bg};`;
    if (el.r) css += `border-radius:${el.r}px;`;
    if (el.ov !== false) css += `overflow:hidden;`;
    if (el.stroke) css += `outline:2px solid ${el.stroke};outline-offset:-2px;`;
    div.style.cssText = css;
    parent.appendChild(div);
    (el.els || []).forEach(c => buildEl(c, div));

  } else if (el.t === 'tx') {
    const div = document.createElement('div');
    let css = `position:absolute;left:${el.x}px;top:${el.y}px;width:${el.w}px;`;
    css += `font-family:'${el.font}',sans-serif;font-size:${el.sz}px;font-weight:${el.wt};`;
    css += `font-style:${el.it ? 'italic' : 'normal'};color:${el.color};text-align:${el.align};`;
    css += `white-space:pre-wrap;overflow:visible;`;
    if (el.lh) css += `line-height:${el.lh};`;
    if (el.ls) css += `letter-spacing:${el.ls};`;
    if (el.dec) css += `text-decoration:${el.dec};`;
    div.style.cssText = css;
    div.textContent = el.text;
    parent.appendChild(div);

  } else if (el.t === 'img') {
    const img = document.createElement('img');
    img.src = el.src;
    img.loading = 'lazy';
    let css = `position:absolute;left:${el.x}px;top:${el.y}px;width:${el.w}px;height:${el.h}px;object-fit:cover;`;
    if (el.r) css += `border-radius:${el.r}px;`;
    if (el.stroke) css += `outline:2px solid ${el.stroke};outline-offset:-2px;`;
    img.style.cssText = css;
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
  counter.textContent = `${current + 1} / ${SLIDES.length}`;
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
  setTimeout(() => { animating = false; }, 650);
}

let lastScroll = 0;
window.addEventListener('wheel', e => {
  const now = Date.now();
  if (now - lastScroll < 700) return;
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
