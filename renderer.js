/**
 * SlidesApp - Presentation Controller for Model Poisoning Slide Deck
 * Highly optimized, secure, and accessible presentation runner.
 */
class SlidesApp {
  constructor() {
    this.stage = document.getElementById('stage');
    this.counter = document.getElementById('counter');
    this.fullscreenBtn = document.getElementById('fullscreen-btn');
    this.orientationWarning = document.getElementById('orientation-warning');
    
    this.current = 0;
    this.animating = false;
    this.slideEls = [];
    this.slideInners = []; // Cache slide inner containers for scaling performance
    
    this.countAnimRegistry = new Map();
    this.autoPopupTriggers = new Map(); // Cache elements for auto popups (Slides 17 & 23)
    this.indexItems = []; // Cache index items to avoid querySelectorAll on update
    
    this.currentPopup = null;
    this.hidePopupTimer = null;
    this.autoPopupTimer = null;
    this.orientationWarningTimer = null;
    this.currentAudio = null;
    
    this.lastScroll = 0;
    this.touchStartY = 0;
    
    this.bgAccentMap = {
      '#e6e0f5': '#6e5db0', '#fbd3d8': '#a8456b', '#d2ebdf': '#3f8b70',
      '#ffdcc9': '#b0683a', '#d5e5f1': '#36679a', '#fff2ce': '#9d7d1a',
      '#f1daf4': '#b87cc1', '#ffc9d2': '#a8456b', '#67b991': '#1e5c3f',
      '#ffffff': '#2d2d2d', '#ffd24a': '#8a5c00', '#2d2d2d': '#ffd24a',
    };
    
    this.bgBulletMap = {
      '#e6e0f5': '#aa9ed2', '#fbd3d8': '#d18ca1', '#d2ebdf': '#88bba7',
      '#ffdcc9': '#d7a281', '#d5e5f1': '#85a6c5', '#fff2ce': '#d4ad52',
      '#f1daf4': '#d4abda', '#ffc9d2': '#d3879e', '#67b991': '#428a68',
      '#ffffff': '#969696', '#ffd24a': '#c49725', '#2d2d2d': '#967f3b',
    };

    this.slideTitles = [
      "Model Poison", "O que é?", "250 docs", "Custo do ataque", "O ataque ensina",
      "Ciclos do ataque", "Não precisa invadir", "Por que é perigoso?", "Técnicas",
      "Backdoor", "Coleta de dados", "Prompt-injection", "RAG poison", "IA infectando IA",
      "Casos reais", "Rússia", "China", "DeepSeek R1", "LiteLLM", "Manipulação",
      "Áreas afetadas", "Geopolítica", "Temos defesas?", "DevSecML", "Desafios", "Conclusão"
    ];

    this.playIconSvg = `<svg width="28" height="32" viewBox="0 0 18 20" fill="none"><polygon points="1,1 17,10 1,19" fill="white" stroke="white" stroke-width="1" stroke-linejoin="round"/></svg>`;
    this.pauseIconSvg = `<svg width="28" height="32" viewBox="0 0 18 20" fill="none"><rect x="1" y="1" width="5" height="18" rx="2" fill="white"/><rect x="12" y="1" width="5" height="18" rx="2" fill="white"/></svg>`;
  }

  init() {
    this.buildSlides();
    this.buildIndexPopup();
    this.setupEvents();
    
    this.updateScale();
    this.updateCounter();
    this.setupOrientationWarning();
  }

  runCountAnim(el, target) {
    const duration = 2100;
    const t0 = performance.now();
    el.textContent = '0';
    
    const frame = (now) => {
      const t = Math.min((now - t0) / duration, 1);
      let eased;
      if (t < 0.5) {
        eased = 4.571 * t * t * t;
      } else {
        const s = 1 - t;
        eased = 1 - 6.857 * s * s * s * s;
      }
      el.textContent = String(Math.round(eased * target));
      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        el.textContent = String(target);
      }
    };
    requestAnimationFrame(frame);
  }

  zalgoify(text) {
    const above = ['\u0300', '\u0301', '\u0302', '\u0303', '\u0304', '\u0305', '\u0306', '\u0307', '\u0308', '\u0309', '\u030A', '\u030B', '\u030C', '\u030D', '\u030E', '\u030F', '\u0310', '\u0311', '\u0312', '\u0313', '\u0314', '\u0315'];
    const below = ['\u0316', '\u0317', '\u0318', '\u0319', '\u031B', '\u031C', '\u031D', '\u031E', '\u031F', '\u0320', '\u0321', '\u0322', '\u0323', '\u0324', '\u0325', '\u0326', '\u0327', '\u0328', '\u0329'];
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

  scheduleHidePopup() {
    this.hidePopupTimer = setTimeout(() => {
      if (this.currentPopup) {
        this.currentPopup.remove();
        this.currentPopup = null;
      }
    }, 120);
  }

  cancelHidePopup() {
    if (this.hidePopupTimer) {
      clearTimeout(this.hidePopupTimer);
      this.hidePopupTimer = null;
    }
  }

  positionPopup(popup, trigger) {
    const rect = trigger.getBoundingClientRect();
    const pw = popup.offsetWidth || 440;
    const ph = popup.offsetHeight || 280;
    const gap = 16;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const candidates = [
      [rect.left + rect.width / 2 - pw / 2, rect.top - ph - gap],
      [rect.left - pw - gap, rect.top + rect.height / 2 - ph / 2],
      [rect.right + gap, rect.top + rect.height / 2 - ph / 2],
      [rect.left + rect.width / 2 - pw / 2, rect.bottom + gap],
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

  createCloseButton(balloon) {
    const closeBtn = document.createElement('button');
    closeBtn.className = 'popup-close-btn';
    closeBtn.setAttribute('aria-label', 'Fechar');
    closeBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    `;
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      balloon.remove();
      if (this.currentPopup === balloon) {
        this.currentPopup = null;
      }
      if (balloon.triggerEl) {
        balloon.triggerEl.focus(); // Accessibility: Return focus to trigger
      }
    });
    return closeBtn;
  }

  showPopup(imageSrc, triggerEl, label) {
    this.cancelHidePopup();
    if (this.currentPopup) {
      this.currentPopup.remove();
      this.currentPopup = null;
    }

    const balloon = document.createElement('div');
    balloon.className = 'popup-balloon';
    balloon.style.visibility = 'hidden';
    balloon.triggerEl = triggerEl;

    const img = document.createElement('img');
    img.src = imageSrc;
    balloon.appendChild(img);

    if (label) {
      const lbl = document.createElement('div');
      lbl.style.cssText = 'font-family:Nunito,sans-serif;font-size:11px;color:#888;text-align:center;margin-top:6px;font-style:italic;letter-spacing:.5px;';
      lbl.textContent = label;
      balloon.appendChild(lbl);
    }

    const closeBtn = this.createCloseButton(balloon);
    balloon.appendChild(closeBtn);

    balloon.addEventListener('mouseenter', () => this.cancelHidePopup());
    balloon.addEventListener('mouseleave', () => this.scheduleHidePopup());
    document.body.appendChild(balloon);
    this.currentPopup = balloon;

    const doPosition = () => {
      this.positionPopup(balloon, triggerEl);
      balloon.style.visibility = 'visible';
    };

    if (img.complete && img.naturalHeight > 0) {
      doPosition();
    } else {
      img.onload = doPosition;
      img.onerror = doPosition;
    }
  }

  showTextPopup(htmlContent, triggerEl, bg) {
    this.cancelHidePopup();
    if (this.currentPopup) {
      this.currentPopup.remove();
      this.currentPopup = null;
    }
    const balloon = document.createElement('div');
    balloon.className = 'popup-text-balloon';
    balloon.triggerEl = triggerEl;
    if (bg) balloon.style.background = bg;
    balloon.innerHTML = htmlContent;

    const closeBtn = this.createCloseButton(balloon);
    balloon.appendChild(closeBtn);

    balloon.addEventListener('mouseenter', () => this.cancelHidePopup());
    balloon.addEventListener('mouseleave', () => this.scheduleHidePopup());
    document.body.appendChild(balloon);
    this.currentPopup = balloon;
    
    this.positionPopup(balloon, triggerEl);
  }

  buildEl(el, parent, slideIndex) {
    if (el.t === 'fr') {
      const div = document.createElement('div');
      let css = `position:absolute;left:${el.x}px;top:${el.y}px;width:${el.w}px;height:${el.h}px;`;
      if (el.bg) css += `background:${el.bg};`;
      if (el.r) css += `border-radius:${el.r}px;`;
      if (el.ov !== false) css += `overflow:hidden;`;
      if (el.stroke) css += `outline:2px solid ${el.stroke};outline-offset:-2px;`;
      div.style.cssText = css;
      
      if (el.bg && this.bgAccentMap[el.bg]) {
        div.style.setProperty('--accent', this.bgAccentMap[el.bg]);
      }
      if (el.bg && this.bgBulletMap[el.bg]) {
        div.style.setProperty('--bullet', this.bgBulletMap[el.bg]);
      }
      
      parent.appendChild(div);
      (el.els || []).forEach(c => this.buildEl(c, div, slideIndex));

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
        div.setAttribute('tabindex', '0');
        div.setAttribute('role', 'link');
        div.addEventListener('click', () => window.open(el.href, '_blank'));
        div.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            window.open(el.href, '_blank');
          }
        });
      }

      let txt = el.text;
      let asHtml = el.html;
      if (txt && txt.includes('•')) {
        if (!asHtml) txt = txt.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        txt = txt.replace(/•/g, "<span class='bullet'>•</span>");
        asHtml = true;
      }
      if (asHtml) {
        div.innerHTML = txt;
      } else {
        div.textContent = txt;
      }

      if (el.popupLinks) {
        el.popupLinks.forEach(pl => {
          let anchors = [...div.querySelectorAll('a')];
          if (pl.href) anchors = anchors.filter(a => a.getAttribute('href') === pl.href);
          if (pl.text) anchors = anchors.filter(a => a.textContent.trim().includes(pl.text));
          anchors.forEach(a => {
            a.setAttribute('tabindex', '0');
            a.setAttribute('role', 'button');
            a.setAttribute('aria-haspopup', pl.textPopup ? 'true' : 'dialog');

            if (pl.textPopup) {
              a.addEventListener('mouseenter', () => this.showTextPopup(pl.textPopup, a, pl.popupBg));
              if (pl.text === 'SEO' && slideIndex === 16) {
                this.autoPopupTriggers.set(16, a);
              }
            } else if (pl.popup) {
              a.addEventListener('mouseenter', () => this.showPopup(pl.popup, a, pl.label || null));
            }
            a.addEventListener('mouseleave', () => this.scheduleHidePopup());
            
            a.addEventListener('keydown', (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (pl.textPopup) this.showTextPopup(pl.textPopup, a, pl.popupBg);
                else if (pl.popup) this.showPopup(pl.popup, a, pl.label || null);
              }
            });
          });
        });
      }

      if (el.textPopup) {
        div.setAttribute('tabindex', '0');
        div.setAttribute('role', 'button');
        div.setAttribute('aria-haspopup', 'true');
        div.addEventListener('mouseenter', () => this.showTextPopup(el.textPopup, div, el.popupBg));
        div.addEventListener('mouseleave', () => this.scheduleHidePopup());
        div.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.showTextPopup(el.textPopup, div, el.popupBg);
          }
        });

        if (slideIndex === 22 && el.text && el.text.startsWith('Zero Trust')) {
          this.autoPopupTriggers.set(22, div);
        }
      }

      if (el.countAnim != null) {
        div.dataset.countTarget = String(el.countAnim);
      }

      if (el.hoverText || el.hoverZalgo) {
        const srcText = el.text;
        div.addEventListener('mouseenter', () => {
          div._savedHTML = div.innerHTML;
          div.style.whiteSpace = 'pre-wrap';
          div.textContent = el.hoverZalgo ? this.zalgoify(srcText) : el.hoverText;
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
      img.loading = 'eager'; // Eager loading prevents blank images in quick transitions
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
        img.setAttribute('tabindex', '0');
        img.setAttribute('role', 'link');
        img.style.cursor = 'pointer';
        img.addEventListener('click', () => window.open(el.href, '_blank'));
        img.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            window.open(el.href, '_blank');
          }
        });
      }
      
      if (el.popup) {
        img.dataset.href = '1';
        img.setAttribute('tabindex', '0');
        img.setAttribute('role', 'button');
        img.setAttribute('aria-haspopup', 'dialog');
        img.addEventListener('mouseenter', () => this.showPopup(el.popup, img, el.popupLabel || null));
        img.addEventListener('mouseleave', () => this.scheduleHidePopup());
        img.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.showPopup(el.popup, img, el.popupLabel || null);
          }
        });
      }

      if (el.audio) {
        const audioSrc = el.audio;
        const bw = 88, bh = 88;
        const btn = document.createElement('button');
        btn.className = 'anim anim-pulse';
        btn.setAttribute('aria-label', 'Tocar Áudio');
        btn.innerHTML = this.playIconSvg;
        btn.style.cssText = `
          position:absolute;
          left:${el.x + (el.w - bw) / 2}px;
          top:${el.y + (el.h - bh) / 2}px;
          width:${bw}px;height:${bh}px;
          background:rgba(0,0,0,0.62);
          border:none;
          border-radius:22px;
          display:flex;align-items:center;justify-content:center;
          cursor:pointer;z-index:15;
          animation-duration:2s;
          box-shadow:0 4px 20px rgba(0,0,0,0.4);
          user-select:none;transition:background .2s;`;

        let playing = false;

        btn.addEventListener('mouseenter', () => { btn.style.background = 'rgba(0,0,0,0.82)'; });
        btn.addEventListener('mouseleave', () => { btn.style.background = 'rgba(0,0,0,0.62)'; });
        
        btn.addEventListener('click', e => {
          e.stopPropagation();
          if (playing && this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
            playing = false;
            btn.innerHTML = this.playIconSvg;
            btn.style.animation = '';
            btn.setAttribute('aria-label', 'Tocar Áudio');
          } else {
            // Stop other playing audio if exists
            if (this.currentAudio) {
              this.currentAudio.pause();
              document.dispatchEvent(new CustomEvent('stopallaudio'));
            }
            
            this.currentAudio = new Audio(audioSrc);
            this.currentAudio.play().catch(() => { });
            playing = true;
            btn.innerHTML = this.pauseIconSvg;
            btn.style.animation = 'none';
            btn.setAttribute('aria-label', 'Pausar Áudio');
            
            this.currentAudio.onended = () => {
              playing = false;
              this.currentAudio = null;
              btn.innerHTML = this.playIconSvg;
              btn.style.animation = '';
              btn.setAttribute('aria-label', 'Tocar Áudio');
            };
          }
        });
        
        // Listen to global reset event to sync play button states
        document.addEventListener('stopallaudio', () => {
          playing = false;
          btn.innerHTML = this.playIconSvg;
          btn.style.animation = '';
          btn.setAttribute('aria-label', 'Tocar Áudio');
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
      (el.els || []).forEach(c => this.buildEl(c, parent, slideIndex));
    }
  }

  buildSlides() {
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
      
      s.els.forEach(el => this.buildEl(el, inner, i));
      slide.appendChild(inner);

      if (i === 0) {
        const hint = document.createElement('div');
        hint.className = 'scroll-down-hint';
        hint.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
            <path d="M7 10l5 5 5-5" />
          </svg>
        `.trim();
        slide.appendChild(hint);
      }

      this.stage.appendChild(slide);
      this.slideEls.push(slide);
      this.slideInners.push(inner); // Cache for scaling operations
      
      // Register count animation trigger if exists
      const cel = slide.querySelector('[data-count-target]');
      if (cel) {
        this.countAnimRegistry.set(i, cel);
      }
    });
  }

  buildIndexPopup() {
    const indexPopup = document.createElement('div');
    indexPopup.id = 'index-popup';
    
    const indexInner = document.createElement('div');
    indexInner.id = 'index-inner';
    
    SLIDES.forEach((s, i) => {
      const item = document.createElement('button');
      item.className = 'index-item';
      item.dataset.idx = i;
      item.setAttribute('aria-label', `Ir para slide ${i + 1}: ${this.slideTitles[i] || 'Sem título'}`);
      
      const num = document.createElement('span');
      num.className = 'index-num';
      num.textContent = String(i + 1).padStart(2, '0');
      
      const title = document.createElement('span');
      title.className = 'index-title';
      title.textContent = this.slideTitles[i] || ('Slide ' + (i + 1));
      
      item.appendChild(num);
      item.appendChild(title);
      item.addEventListener('click', () => this.goTo(i));
      indexInner.appendChild(item);
      
      this.indexItems.push(item); // Cache for quick updates
    });
    
    indexInner.style.gridTemplateRows = `repeat(${Math.ceil(SLIDES.length / 2)}, auto)`;
    indexPopup.appendChild(indexInner);
    
    this.indexInner = indexInner; // Keep reference to scroll inside
    
    const counterLabel = document.createElement('span');
    counterLabel.id = 'counter-label';
    counterLabel.setAttribute('role', 'status');
    counterLabel.setAttribute('aria-live', 'polite');
    
    this.counter.appendChild(indexPopup);
    this.counter.appendChild(counterLabel);
    this.counterLabel = counterLabel;
  }

  setupEvents() {
    // Resize with Debounce
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        this.updateScale();
        this.setupOrientationWarning();
      }, 100);
    });

    // Wheel Scroll (Slide changing)
    window.addEventListener('wheel', e => {
      // Don't change slides when scrolling index popup list
      if (e.target.closest('#index-popup')) return;
      const now = Date.now();
      if (now - this.lastScroll < 380) return;
      this.lastScroll = now;
      if (e.deltaY > 0) this.goTo(this.current + 1);
      else this.goTo(this.current - 1);
    }, { passive: true });

    // Touch Swipe (Slide changing)
    window.addEventListener('touchstart', e => {
      this.touchStartY = e.touches[0].clientY;
    }, { passive: true });
    
    window.addEventListener('touchend', e => {
      if (e.target.closest('#index-popup')) return;
      const diff = this.touchStartY - e.changedTouches[0].clientY;
      if (Math.abs(diff) < 40) return;
      if (diff > 0) this.goTo(this.current + 1);
      else this.goTo(this.current - 1);
    });

    // Keyboard controls
    window.addEventListener('keydown', e => {
      // Ignore main navigation if user is focusing elements inside the index
      if (document.activeElement && document.activeElement.closest('#index-popup')) {
        if (e.key === 'Escape') {
          // Blur active item
          document.activeElement.blur();
        }
        return;
      }

      // Escape key closes open popups
      if (e.key === 'Escape' && this.currentPopup) {
        const trigger = this.currentPopup.triggerEl;
        this.currentPopup.remove();
        this.currentPopup = null;
        if (trigger) trigger.focus();
        return;
      }

      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === 'ArrowRight') {
        this.goTo(this.current + 1);
      }
      if (e.key === 'ArrowUp' || e.key === 'PageUp' || e.key === 'ArrowLeft') {
        this.goTo(this.current - 1);
      }
      if (e.key === 'Home') {
        this.goTo(0);
      }
      if (e.key === 'End') {
        this.goTo(SLIDES.length - 1);
      }
    });

    // Fullscreen support
    if (this.fullscreenBtn) {
      this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
      document.addEventListener('fullscreenchange', () => this.updateFullscreenIcon());
      document.addEventListener('webkitfullscreenchange', () => this.updateFullscreenIcon());
    }

    // Dismiss popup on clicking outside
    document.addEventListener('pointerdown', (e) => {
      if (this.currentPopup) {
        if (this.currentPopup.contains(e.target)) return;
        if (this.currentPopup.triggerEl && (e.target === this.currentPopup.triggerEl || this.currentPopup.triggerEl.contains(e.target))) {
          return;
        }
        this.currentPopup.remove();
        this.currentPopup = null;
      }
    });
  }

  updateScale() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    
    this.slideEls.forEach((slide, idx) => {
      const sw = +slide.dataset.w;
      const sh = +slide.dataset.h;
      const scale = Math.min(vw / sw, vh / sh) * 0.92;
      const scaledW = sw * scale;
      const scaledH = sh * scale;
      
      const inner = this.slideInners[idx];
      inner.style.transform = `scale(${scale})`;
      inner.style.left = Math.round((vw - scaledW) / 2) + 'px';
      inner.style.top = Math.round((vh - scaledH) / 2) + 'px';
    });
  }

  updateCounter() {
    this.counterLabel.textContent = `${this.current + 1} / ${SLIDES.length}`;
    
    this.indexItems.forEach((el, i) => {
      const isActive = i === this.current;
      el.classList.toggle('active', isActive);
      el.setAttribute('aria-current', isActive ? 'true' : 'false');
    });
    
    const activeItem = this.indexItems[this.current];
    if (activeItem && this.indexInner) {
      const target = activeItem.offsetTop - this.indexInner.clientHeight / 2 + activeItem.clientHeight / 2;
      this.indexInner.scrollTop = Math.max(0, target);
    }
  }

  goTo(index) {
    if (this.animating || index === this.current || index < 0 || index >= SLIDES.length) return;

    if (this.currentPopup) {
      this.currentPopup.remove();
      this.currentPopup = null;
    }

    if (this.autoPopupTimer) {
      clearTimeout(this.autoPopupTimer);
      this.autoPopupTimer = null;
    }
    
    // Silence active audio on slide change
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
      document.dispatchEvent(new CustomEvent('stopallaudio'));
    }

    this.animating = true;
    const dir = index > this.current ? 1 : -1;
    const prev = this.current;
    this.current = index;

    this.slideEls[prev].classList.remove('active');
    this.slideEls[prev].classList.add(dir > 0 ? 'before' : 'after');
    
    this.slideEls[this.current].classList.remove('before', 'after');
    this.slideEls[this.current].classList.add('active');

    // Accessibility: shift focus to active slide
    this.slideEls[this.current].setAttribute('tabindex', '-1');
    this.slideEls[this.current].focus();

    this.updateCounter();

    if (this.countAnimRegistry.has(index)) {
      const cel = this.countAnimRegistry.get(index);
      const target = parseInt(cel.dataset.countTarget, 10);
      cel.textContent = '0';
      setTimeout(() => this.runCountAnim(cel, target), 340);
    }

    // Set auto popup timers (Slides 17 & 23)
    this.setupAutoPopupTimer(index);

    setTimeout(() => {
      this.animating = false;
    }, 650);
  }

  setupAutoPopupTimer(index) {
    if (index === 16) {
      this.autoPopupTimer = setTimeout(() => {
        const seoAnchor = this.autoPopupTriggers.get(16);
        if (seoAnchor) {
          const textPopup = 'O <b>S</b>earch <b>E</b>ngine <b>O</b>ptimization é um conjunto de técnicas e estratégias aplicadas em sites e conteúdos da web. Serve para melhorar o posicionamento orgânico dessas páginas no Google, facilitando que os usuários as encontrem. Na prática, o objetivo é colocar seu conteúdo nos primeiros resultados de busca para aumentar a visibilidade e atrair mais clientes.';
          this.showTextPopup(textPopup, seoAnchor, '#ece0bd');
        }
      }, 15000);
    } else if (index === 22) {
      this.autoPopupTimer = setTimeout(() => {
        const zeroTrustDiv = this.autoPopupTriggers.get(22);
        if (zeroTrustDiv) {
          const textPopup = 'O Zero Trust é uma estratégia de segurança digital com uma regra clara: <em>nunca confie, sempre verifique</em>. Ele serve para proteger o sistema exigindo que qualquer usuário ou aparelho confirme sua identidade o tempo todo. Na prática, o objetivo é evitar ataques liberando apenas o acesso mínimo necessário para cada tarefa.';
          this.showTextPopup(textPopup, zeroTrustDiv, '#c1d3e4');
        }
      }, 15000);
    }
  }

  toggleFullscreen() {
    const isFS = document.fullscreenElement || document.webkitFullscreenElement;
    if (!isFS) {
      const docEl = document.documentElement;
      const requestFS = docEl.requestFullscreen || docEl.webkitRequestFullscreen;
      if (requestFS) {
        requestFS.call(docEl).catch(err => {
          console.error(`Error attempting to enable full-screen mode: ${err.message}`);
        });
      }
    } else {
      const exitFS = document.exitFullscreen || document.webkitExitFullscreen;
      if (exitFS) {
        exitFS.call(document);
      }
    }
  }

  updateFullscreenIcon() {
    const isFS = document.fullscreenElement || document.webkitFullscreenElement;
    if (isFS) {
      this.fullscreenBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 14h6v6m10-6h-6v6M4 10h6V4m10 6h-6V4"/>
        </svg>
      `;
    } else {
      this.fullscreenBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
        </svg>
      `;
    }
  }

  closeOrientationWarning() {
    if (this.orientationWarning) {
      this.orientationWarning.style.display = 'none';
    }
    if (this.orientationWarningTimer) {
      clearTimeout(this.orientationWarningTimer);
      this.orientationWarningTimer = null;
    }
  }

  setupOrientationWarning() {
    const closeBtn = document.getElementById('orientation-close-btn');

    if (closeBtn && !closeBtn.dataset.listener) {
      closeBtn.addEventListener('click', () => this.closeOrientationWarning());
      closeBtn.dataset.listener = 'true';
    }

    if (this.orientationWarning && window.getComputedStyle(this.orientationWarning).display === 'flex') {
      if (this.orientationWarningTimer) {
        clearTimeout(this.orientationWarningTimer);
      }
      // Auto-hide warning after 7 seconds
      this.orientationWarningTimer = setTimeout(() => this.closeOrientationWarning(), 7000);
    }
  }
}

// Instantiate and start SlidesApp
document.addEventListener('DOMContentLoaded', () => {
  const app = new SlidesApp();
  app.init();
  // Expose goTo globally to support debugging and direct navigation tests
  window.goTo = (idx) => app.goTo(idx);
});