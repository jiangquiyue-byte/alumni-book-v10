/**
 * 同学录 v10.5 · 公共 JavaScript 工具库
 *
 * 模块列表：
 *  - Layers     四层结构初始化
 *  - Overlay    全局漂浮粒子系统
 *  - Parallax   3D 视差卡片效果
 *  - Music      背景音乐管理
 *  - Ripple     按钮水波纹效果
 *  - FadeIn     滚动淡入动画
 *  - Session    用户会话管理
 *  - Utils      工具函数
 */

/* ══════════════════════════════════════════
   Utils · 工具函数
   ══════════════════════════════════════════ */
const Utils = {
  /** 随机整数 [min, max] */
  randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },
  /** 随机浮点 [min, max] */
  randFloat(min, max) {
    return Math.random() * (max - min) + min;
  },
  /** 随机数组元素 */
  randItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  },
  /** 节流 */
  throttle(fn, wait) {
    let last = 0;
    return function(...args) {
      const now = Date.now();
      if (now - last >= wait) { last = now; fn.apply(this, args); }
    };
  },
  /** RAF 节流 */
  rafThrottle(fn) {
    let raf = null;
    return function(...args) {
      if (raf) return;
      raf = requestAnimationFrame(() => { fn.apply(this, args); raf = null; });
    };
  },
};


/* ══════════════════════════════════════════
   Session · 用户会话管理
   ══════════════════════════════════════════ */
const Session = {
  KEY: 'classmate_name',

  /** 获取当前用户姓名，如果没有则跳转首页 */
  getName(redirect = true) {
    const name = sessionStorage.getItem(this.KEY);
    if (!name && redirect) {
      window.location.href = this._getRootPath() + 'index.html';
      return null;
    }
    return name || '';
  },

  /** 设置用户姓名 */
  setName(name) {
    sessionStorage.setItem(this.KEY, name);
  },

  /** 清除会话 */
  clear() {
    sessionStorage.removeItem(this.KEY);
  },

  /** 计算到首页的相对路径 */
  _getRootPath() {
    const depth = window.location.pathname.split('/').length - 2;
    return depth > 0 ? '../'.repeat(depth) : '';
  },

  /** 渲染问候语到指定元素 */
  renderGreeting(selector) {
    const name = this.getName(false);
    const el = document.querySelector(selector);
    if (!el || !name) return;
    el.innerHTML = `<span class="name">${name}</span> 同学，你好 ✦`;
  },
};


/* ══════════════════════════════════════════
   Overlay · 全局漂浮粒子系统 (Layer 4)
   ══════════════════════════════════════════ */
const Overlay = {
  defaults: {
    container: null,
    type: 'petal',
    count: 20,
    imageSrc: null,
    imageSize: [12, 28],
    colors: ['#f9c', '#fc9', '#9cf', '#cf9', '#c9f'],
    spawnDelay: 200,
    driftRange: [-80, 80],
    duration: [7, 16],
    size: null,
    opacityPeak: [0.78, 0.98],
    clearBeforeInit: true,
  },

  init(options = {}) {
    if (!options) return;
    const cfg = this._normalizeConfig(options);
    if (!cfg.container) return;
    if (cfg.clearBeforeInit) {
      cfg.container.innerHTML = '';
    }
    for (let i = 0; i < cfg.count; i++) {
      setTimeout(() => this._spawnParticle(cfg), i * cfg.spawnDelay);
    }
  },

  _normalizeConfig(options) {
    const cfg = Object.assign({}, this.defaults, options);
    cfg.container = cfg.container || document.querySelector('.overlay-effect-layer');
    if (!cfg.container) {
      const layer = document.createElement('div');
      layer.className = 'overlay-effect-layer';
      document.body.appendChild(layer);
      cfg.container = layer;
    }
    cfg.count = Math.max(0, parseInt(cfg.count, 10) || this.defaults.count);
    cfg.duration = this._range(cfg.duration, this.defaults.duration);
    cfg.driftRange = this._range(cfg.driftRange, this.defaults.driftRange);
    cfg.opacityPeak = this._range(cfg.opacityPeak, this.defaults.opacityPeak);
    cfg.imageSize = this._range(cfg.imageSize, this.defaults.imageSize);
    cfg.size = cfg.size ? this._range(cfg.size, cfg.size) : null;
    return cfg;
  },

  _range(input, fallback) {
    const base = Array.isArray(input) ? input : fallback;
    const min = Number(base[0]);
    const max = Number(base[1]);
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return fallback.slice();
    }
    return min <= max ? [min, max] : [max, min];
  },

  _rand(range) {
    return Utils.randFloat(range[0], range[1]);
  },

  _applyMotion(el, cfg, extra = {}) {
    const x = Utils.randFloat(0, 100);
    const dur = extra.duration || this._rand(cfg.duration);
    const delay = extra.delay !== undefined ? extra.delay : Utils.randFloat(0, -dur);
    const drift = extra.drift !== undefined ? extra.drift : this._rand(cfg.driftRange);
    const spin = extra.spin !== undefined ? extra.spin : Utils.randInt(0, 720);
    const peak = extra.opacityPeak !== undefined ? extra.opacityPeak : this._rand(cfg.opacityPeak);
    const sStart = Utils.randFloat(0.88, 0.96).toFixed(2);
    const sMid = Utils.randFloat(0.98, 1.10).toFixed(2);
    const sEnd = Utils.randFloat(1.02, 1.14).toFixed(2);

    el.style.left = `${x}%`;
    el.style.setProperty('--dur', `${dur}s`);
    el.style.setProperty('--delay', `${delay}s`);
    el.style.setProperty('--drift', `${drift}px`);
    el.style.setProperty('--spin', `${spin}deg`);
    el.style.setProperty('--opacity-peak', Number(peak).toFixed(2));
    el.style.setProperty('--scale-start', sStart);
    el.style.setProperty('--scale-mid', sMid);
    el.style.setProperty('--scale-end', sEnd);
  },

  _svgData(svg) {
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;
  },

  _svgParticle(className, size, viewBox, content, extraStyle = {}) {
    const el = document.createElement('img');
    el.className = `particle ${className}`.trim();
    el.src = this._svgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${content}</svg>`);
    el.style.width = `${size}px`;
    el.style.height = 'auto';
    el.style.objectFit = 'contain';
    Object.assign(el.style, extraStyle);
    return el;
  },

  _makeParticle(cfg) {
    if (cfg.imageSrc) {
      const size = this._rand(cfg.imageSize);
      const el = document.createElement('img');
      el.className = 'particle particle--custom';
      el.src = cfg.imageSrc;
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.objectFit = 'contain';
      return el;
    }

    switch (cfg.type) {
      case 'firefly': {
        const el = document.createElement('div');
        const size = this._rand(cfg.size || [4, 9]);
        el.className = 'particle particle--firefly';
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
        return el;
      }
      case 'confetti': {
        const el = document.createElement('div');
        const sizeRange = cfg.size || [6, 12];
        el.className = 'particle particle--confetti';
        el.style.background = Utils.randItem(cfg.colors || this.defaults.colors);
        el.style.width = `${Utils.randFloat(sizeRange[0], sizeRange[1]).toFixed(2)}px`;
        el.style.height = `${Utils.randFloat(Math.max(3, sizeRange[0] * 0.55), Math.max(4, sizeRange[1] * 0.7)).toFixed(2)}px`;
        el.style.borderRadius = '1px';
        return el;
      }
      case 'star': {
        const el = document.createElement('div');
        const size = this._rand(cfg.size || [4, 9]);
        el.className = 'particle particle--star';
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
        return el;
      }
      case 'snow': {
        const el = document.createElement('div');
        const size = this._rand(cfg.size || [3, 7]);
        el.className = 'particle particle--snow';
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
        return el;
      }
      case 'bamboo': {
        const size = this._rand(cfg.size || [18, 38]);
        const hue = Utils.randInt(88, 138);
        const sat = Utils.randInt(45, 75);
        const lit = Utils.randInt(30, 52);
        const col = `hsl(${hue},${sat}%,${lit}%)`;
        const col2 = `hsl(${hue + 8},${Math.max(20, sat - 10)}%,${Math.min(70, lit + 12)}%)`;
        return this._svgParticle(
          'particle--bamboo',
          size,
          '0 0 40 14',
          `<path d="M2 7 Q10 1 20 2 Q32 2 38 7 Q32 12 20 12 Q10 13 2 7Z" fill="${col}" opacity="0.88"/><line x1="2" y1="7" x2="38" y2="7" stroke="${col2}" stroke-width="0.8" opacity="0.6"/>`
        );
      }
      case 'maple': {
        const size = this._rand(cfg.size || [18, 34]);
        const fill = Utils.randItem(['#b94b2f', '#c85f2d', '#d57b2a', '#9f3f27']);
        const vein = Utils.randItem(['#7b261a', '#85311f', '#6f2a18']);
        return this._svgParticle(
          'particle--maple',
          size,
          '0 0 64 64',
          `<path d="M32 4l6 12 12-6-5 14 13 4-12 7 7 11-15-2-6 16-6-16-15 2 7-11-12-7 13-4-5-14 12 6z" fill="${fill}" stroke="${vein}" stroke-width="2" stroke-linejoin="round"/><path d="M32 16v30" stroke="${vein}" stroke-width="2" opacity="0.65"/>`
        );
      }
      case 'ginkgo': {
        const size = this._rand(cfg.size || [18, 32]);
        const fill = Utils.randItem(['#e9c54d', '#f2d46a', '#d7b038', '#e3c35a']);
        const stem = Utils.randItem(['#9a6b2f', '#8a5c24']);
        return this._svgParticle(
          'particle--ginkgo',
          size,
          '0 0 64 64',
          `<path d="M32 10c-12 0-22 10-22 22 0 13 10 20 22 20s22-7 22-20C54 20 44 10 32 10zm0 7c7 0 13 4 16 10-6-3-10-3-16 0-6-3-10-3-16 0 3-6 9-10 16-10z" fill="${fill}" stroke="#c29a31" stroke-width="2"/><path d="M32 32v20" stroke="${stem}" stroke-width="3" stroke-linecap="round"/>`
        );
      }
      case 'feather': {
        const size = this._rand(cfg.size || [24, 44]);
        const fill = Utils.randItem(['#f5efe6', '#efe5d8', '#f7f2ea']);
        const line = Utils.randItem(['#c9b8a3', '#b9a792']);
        return this._svgParticle(
          'particle--feather',
          size,
          '0 0 72 72',
          `<path d="M18 58c18-7 29-20 34-38 2-7 0-13-5-16-6-3-12 1-17 10-9 17-11 31-12 44z" fill="${fill}" stroke="${line}" stroke-width="2" stroke-linejoin="round"/><path d="M21 55c11-11 22-22 28-39" stroke="${line}" stroke-width="2" stroke-linecap="round"/><path d="M28 42l10-3M25 48l9-1M33 33l9-3" stroke="${line}" stroke-width="1.3" stroke-linecap="round" opacity="0.75"/>`
        );
      }
      case 'heart': {
        const size = this._rand(cfg.size || [12, 24]);
        const fill = Utils.randItem(['#f472b6', '#fb7185', '#f43f5e', '#f59eaf']);
        return this._svgParticle(
          'particle--heart',
          size,
          '0 0 64 64',
          `<path d="M32 55C18 44 8 34 8 21 8 13 14 8 22 8c5 0 8 2 10 6 2-4 5-6 10-6 8 0 14 5 14 13 0 13-10 23-24 34z" fill="${fill}" opacity="0.92"/>`
        );
      }
      case 'bubble': {
        const el = document.createElement('div');
        const size = this._rand(cfg.size || [12, 28]);
        el.className = 'particle particle--bubble';
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
        el.style.borderRadius = '50%';
        el.style.background = 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.95), rgba(186,230,253,0.5) 42%, rgba(125,211,252,0.18) 72%, rgba(255,255,255,0.06) 100%)';
        el.style.boxShadow = '0 0 14px rgba(255,255,255,0.35), inset -4px -6px 12px rgba(255,255,255,0.25)';
        el.style.backdropFilter = 'blur(1px)';
        return el;
      }
      case 'paper': {
        const size = this._rand(cfg.size || [18, 30]);
        const fill = Utils.randItem(['#f7edd7', '#efe2c4', '#f3e8cf']);
        const ink = Utils.randItem(['#b69b68', '#c4ab78']);
        return this._svgParticle(
          'particle--paper',
          size,
          '0 0 64 64',
          `<rect x="14" y="10" width="36" height="46" rx="3" fill="${fill}" stroke="#ceb788" stroke-width="2"/><line x1="22" y1="24" x2="42" y2="24" stroke="${ink}" stroke-width="2" opacity="0.7"/><line x1="22" y1="32" x2="42" y2="32" stroke="${ink}" stroke-width="2" opacity="0.6"/><line x1="22" y1="40" x2="36" y2="40" stroke="${ink}" stroke-width="2" opacity="0.5"/>`
        );
      }
      case 'petal':
      default: {
        const el = document.createElement('div');
        const size = this._rand(cfg.size || [6, 12]);
        el.className = 'particle particle--petal';
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
        return el;
      }
    }
  },

  _spawnParticle(cfg) {
    const el = this._makeParticle(cfg);
    this._applyMotion(el, cfg);
    if (cfg.imageSrc || ['bamboo', 'maple', 'ginkgo', 'feather', 'heart', 'paper'].includes(cfg.type)) {
      const dur = this._rand(cfg.duration);
      const delay = Utils.randFloat(0, -dur);
      el.style.animation = `particleFall ${dur}s ${delay}s linear infinite`;
    }
    cfg.container.appendChild(el);
  },

  spawnFireflies(container, count = 18) {
    if (!container) return;
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const f = document.createElement('div');
        f.className = 'particle particle--firefly';
        const size = Utils.randFloat(3, 9);
        const dur  = Utils.randFloat(10, 20);
        const delay = Utils.randFloat(0, 8);
        const drift = Utils.randInt(-60, 60);
        f.style.cssText = [
          `width:${size}px`, `height:${size}px`,
          `left:${Utils.randFloat(0, 100)}%`,
          `--dur:${dur}s`, `--delay:${delay}s`,
          `--drift:${drift}px`,
        ].join(';');
        container.appendChild(f);
      }, i * 300);
    }
  },
};

/* ══════════════════════════════════════════
   Parallax · 3D 视差卡片 (Layer 3)
   ══════════════════════════════════════════ */
const Parallax = {
  /**
   * 为容器内的 .parallax-inner 元素绑定鼠标视差
   * @param {Element|string} container - 包含 .parallax-inner 的外层容器
   * @param {number} intensity - 倾斜强度（默认 8，越大倾斜越明显）
   */
  bind(container, intensity = 8) {
    const el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return;
    const inner = el.querySelector('.parallax-inner') || el;

    const onMove = Utils.rafThrottle((e) => {
      const rect   = el.getBoundingClientRect();
      const cx     = rect.left + rect.width  / 2;
      const cy     = rect.top  + rect.height / 2;
      const dx     = (e.clientX - cx) / (rect.width  / 2);
      const dy     = (e.clientY - cy) / (rect.height / 2);
      const rotX   = -dy * intensity;
      const rotY   =  dx * intensity;
      inner.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
    });

    const onLeave = () => {
      inner.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
    };

    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
  },

  /** 为页面内所有 .form-card-wrap 自动绑定 */
  bindAll(intensity = 6) {
    document.querySelectorAll('.form-card-wrap').forEach(el => this.bind(el, intensity));
  },
};


/* ══════════════════════════════════════════
   Music · 背景音乐管理
   ══════════════════════════════════════════ */
const Music = {
  audio: null,
  playerEl: null,
  playing: false,

  /**
   * 初始化音乐播放器
   * @param {object} options
   *   src     - 音频文件路径（mp3/ogg）
   *   title   - 显示标题
   *   loop    - 是否循环（默认 true）
   *   autoplay - 是否尝试自动播放（默认 true）
   */
  init(options = {}) {
    if (!options) return; // OverlayPresets.none = false，直接返回不显示粒子
    const { src, title = '背景音乐', loop = true, autoplay = true } = options;
    if (!src) return;

    // 创建 audio 元素
    this.audio = document.createElement('audio');
    this.audio.loop  = loop;
    this.audio.preload = 'auto';
    const source = document.createElement('source');
    source.src  = src;
    source.type = src.endsWith('.ogg') ? 'audio/ogg' : 'audio/mpeg';
    this.audio.appendChild(source);
    document.body.appendChild(this.audio);

    // 渲染播放器 UI
    this._renderPlayer(title);

    // 自动播放
    if (autoplay) {
      this.audio.play()
        .then(() => { this.playing = true; this._updateUI(); })
        .catch(() => {
          // 浏览器阻止自动播放 → 播放器显示提示脉冲动画
          if (this.playerEl) {
            this.playerEl.classList.add('needs-interact');
            const tip = document.createElement('span');
            tip.className = 'music-tip';
            tip.textContent = '点击播放音乐';
            this.playerEl.appendChild(tip);
          }
          const onInteract = () => {
            this.audio.play()
              .then(() => {
                this.playing = true;
                this._updateUI();
                if (this.playerEl) {
                  this.playerEl.classList.remove('needs-interact');
                  const tip = this.playerEl.querySelector('.music-tip');
                  if (tip) tip.remove();
                }
              })
              .catch(() => {});
            document.removeEventListener('click', onInteract);
            document.removeEventListener('keydown', onInteract);
          };
          document.addEventListener('click', onInteract);
          document.addEventListener('keydown', onInteract);
        });
    }
  },

  _renderPlayer(title) {
    const existing = document.querySelector('.music-player');
    if (existing) { this.playerEl = existing; }
    else {
      this.playerEl = document.createElement('div');
      this.playerEl.className = 'music-player';
      this.playerEl.innerHTML = `
        <span class="music-icon">🎵</span>
        <span class="music-title">${title}</span>
      `;
      document.body.appendChild(this.playerEl);
    }
    this.playerEl.addEventListener('click', () => this.toggle());
  },

  toggle() {
    if (!this.audio) return;
    if (this.playing) {
      this.audio.pause();
      this.playing = false;
    } else {
      this.audio.play().catch(() => {});
      this.playing = true;
    }
    this._updateUI();
  },

  _updateUI() {
    if (!this.playerEl) return;
    this.playerEl.classList.toggle('playing', this.playing);
    const icon = this.playerEl.querySelector('.music-icon');
    if (icon) icon.textContent = this.playing ? '🎶' : '🎵';
  },
};


/* ══════════════════════════════════════════
   Ripple · 按钮水波纹效果
   ══════════════════════════════════════════ */
const Ripple = {
  /** 为所有 .btn 元素绑定水波纹 */
  bindAll() {
    document.querySelectorAll('.btn').forEach(btn => this.bind(btn));
  },

  bind(btn) {
    btn.addEventListener('click', (e) => {
      const rect = btn.getBoundingClientRect();
      const r    = document.createElement('span');
      const size = Math.max(rect.width, rect.height);
      r.className = 'ripple';
      r.style.cssText = [
        `width:${size}px`, `height:${size}px`,
        `left:${e.clientX - rect.left - size / 2}px`,
        `top:${e.clientY  - rect.top  - size / 2}px`,
      ].join(';');
      btn.appendChild(r);
      setTimeout(() => r.remove(), 600);
    });
  },
};


/* ══════════════════════════════════════════
   FadeIn · 滚动淡入动画
   ══════════════════════════════════════════ */
const FadeIn = {
  observer: null,

  /** 初始化 IntersectionObserver（交错淡入） */
  init(selector = '.fade-in', threshold = 0.08) {
    const stagger = 60; // ms between each element in viewport
    let viewportIdx = 0;

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          // Already-visible elements get instant reveal; others stagger
          const delay = el.dataset.delay
            ? parseInt(el.dataset.delay)
            : viewportIdx++ * stagger;
          setTimeout(() => el.classList.add('visible'), delay);
          this.observer.unobserve(el);
        }
      });
    }, { threshold, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll(selector).forEach(el => this.observer.observe(el));
  },

  /** 立即显示所有元素（带交错延迟） */
  revealAll(selector = '.fade-in', baseDelay = 120, step = 80) {
    document.querySelectorAll(selector).forEach((el, i) => {
      setTimeout(() => el.classList.add('visible'), baseDelay + i * step);
    });
  },
};


/* ══════════════════════════════════════════
   Layers · 四层结构初始化助手
   ══════════════════════════════════════════ */
const Layers = {
  /**
   * 确保页面包含四层结构
   * 调用此函数后，可通过 document.querySelector('.sticker-layer') 等访问各层
   */
  ensure() {
    // ★ 重构：sticker-layer 必须作为 background-layer 的子节点
    // 确保 background-layer 存在
    let bgLayer = document.querySelector('.background-layer');
    if (!bgLayer) {
      bgLayer = document.createElement('div');
      bgLayer.className = 'background-layer';
      document.body.insertBefore(bgLayer, document.body.firstChild);
    }
    // 确保 sticker-layer 嵌套在 background-layer 内
    if (!bgLayer.querySelector('.sticker-layer')) {
      // 如果 sticker-layer 是游离的兄弟节点，将其移入 background-layer
      const orphan = document.querySelector('.sticker-layer');
      if (orphan && orphan.parentElement !== bgLayer) {
        bgLayer.appendChild(orphan);
      } else if (!orphan) {
        const stickerLayer = document.createElement('div');
        stickerLayer.className = 'sticker-layer';
        bgLayer.appendChild(stickerLayer);
      }
    }
    // 确保 overlay-effect-layer 存在（保持在 body 顶层）
    if (!document.querySelector('.overlay-effect-layer')) {
      const overlayLayer = document.createElement('div');
      overlayLayer.className = 'overlay-effect-layer';
      document.body.insertBefore(overlayLayer, document.body.firstChild);
    }
  },

  getBackground() { return document.querySelector('.background-layer'); },
  getStickerLayer() { return document.querySelector('.sticker-layer'); },
  getFormLayer()   { return document.querySelector('.form-layer'); },
  getOverlay()     { return document.querySelector('.overlay-effect-layer'); },
};


/* ══════════════════════════════════════════
   页面初始化入口
   ══════════════════════════════════════════ */

/**
 * 通用页面初始化（在各页面 HTML 中调用）
 * @param {object} opts
 *   overlay     - 粒子配置对象（传 false 禁用）
 *   parallax    - 是否启用视差（默认 true）
 *   fadeIn      - 是否启用滚动淡入（默认 true）
 *   music       - 音乐配置对象（传 false 禁用）
 *   greeting    - 问候语选择器（默认 '.user-greeting'）
 *   fireflyCount - 萤火虫数量（0 禁用，默认 0）
 */
function initPage(opts = {}) {
  const defaults = {
    overlay: { type: 'petal', count: 18 },
    parallax: true,
    fadeIn: true,
    music: false,
    greeting: '.user-greeting',
    fireflyCount: 0,
  };
  const cfg = Object.assign({}, defaults, opts);

  // 问候语
  if (cfg.greeting) Session.renderGreeting(cfg.greeting);

  // 粒子
  if (cfg.overlay !== false) {
    const overlayLayer = document.querySelector('.overlay-effect-layer');
    if (overlayLayer) Overlay.init(Object.assign({ container: overlayLayer }, cfg.overlay));
  }

  // 萤火虫
  if (cfg.fireflyCount > 0) {
    const overlayLayer = document.querySelector('.overlay-effect-layer');
    if (overlayLayer) Overlay.spawnFireflies(overlayLayer, cfg.fireflyCount);
  }

  // 视差
  if (cfg.parallax) Parallax.bindAll();

  // 淡入
  if (cfg.fadeIn) FadeIn.init();

  // 水波纹
  Ripple.bindAll();

  // 音乐
  if (cfg.music) Music.init(cfg.music);
}

// 兼容旧代码的全局函数
function spawnFireflies(container, count) { Overlay.spawnFireflies(container, count); }

/**
 * 全站字体同步（从 site_config.json 读取）
 * 说明：
 *  - 兼容首页 / 前言 / 花名册 / 相册 / 学生页 / 专属页
 *  - 通过注入覆盖样式，让旧生成页也能跟随后台字号变化
 */
const Typography = {
  _styleId: 'site-typography-runtime-style',

  _rootPath() {
    const path = window.location.pathname || '';
    return path.indexOf('/students/') !== -1 ? '../' : '';
  },

  _fontUrl(fontFamily) {
    const map = {
      'Ma Shan Zheng': 'https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&display=swap',
      'ZCOOL XiaoWei': 'https://fonts.googleapis.com/css2?family=ZCOOL+XiaoWei&display=swap',
      'Noto Serif SC': 'https://fonts.googleapis.com/css2?family=Noto+Serif+SC&display=swap',
      'Noto Sans SC': 'https://fonts.googleapis.com/css2?family=Noto+Sans+SC&display=swap',
      'Liu Jian Mao Cao': 'https://fonts.googleapis.com/css2?family=Liu+Jian+Mao+Cao&display=swap',
      'JetBrains Mono': 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap'
    };
    return map[fontFamily] || '';
  },

  _ensureFont(fontFamily) {
    const href = this._fontUrl(fontFamily);
    if (!href) return;
    const id = 'gfont-runtime-' + fontFamily.replace(/\s+/g, '-').toLowerCase();
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  },

  _buildCss(fs, ff) {
    const label = Math.max(10, fs - 2);
    const small = Math.max(10, fs - 3);
    const tiny = Math.max(9, fs - 4);
    const title = Math.round(fs * 1.45);
    const heroName = Math.round(fs * 2.7);
    const bigName = Math.round(fs * 4.1);
    const familyCss = ff && ff !== 'default' ? '"' + ff + '", sans-serif' : 'inherit';
    return `
:root{
  --global-font:${familyCss};
  --global-font-size:${fs}px;
  --global-label-size:${label}px;
}
body{
  font-size:${fs}px !important;
}
.profile-nickname,
.profile-motto,
.info-item,
.info-value,
.roster-card,
.photo-meta,
.album-subtitle,
.preface-subtitle,
.empty-state p,
.lightbox-caption,
.pano-name,
.pano-hint,
.pano-load-txt,
.pagination-info{
  font-size:${fs}px !important;
}
.info-label,
.photo-caption,
.card-motto,
.search-btn,
.lightbox-counter,
.cc,
.slabel,
.spct,
.gdate,
.htag,
.hero-badge,
.hero-pinyin,
.hero-status{
  font-size:${small}px !important;
}
.card-name,
.section-title,
.roster-title,
.album-title,
.preface-title,
.profile-name,
.hero-name{
  font-size:${title}px !important;
}
.profile-name{
  font-size:${Math.round(fs * 2.7)}px !important;
}
.hero-name{
  font-size:${bigName}px !important;
}
.ccn,
.gmsg,
.hero-motto,
.owner-exclusive-section,
.tcard-body,
.info-item .info-value,
.info-item{
  font-size:${fs}px !important;
}
.tcard-title,
.card-motto,
.photo-caption{
  font-size:${label}px !important;
}
`; 
  },

  apply(cfg) {
    if (!cfg) return;
    const typo = cfg.typography || {};
    const ff = typo.fontFamily || 'default';
    const fs = parseInt(typo.fontSize, 10) || 15;
    if (ff && ff !== 'default') {
      this._ensureFont(ff);
      document.documentElement.style.setProperty('--global-font', '"' + ff + '", sans-serif');
      document.body.style.fontFamily = '"' + ff + '", sans-serif';
    }
    document.documentElement.style.setProperty('--global-font-size', fs + 'px');
    document.documentElement.style.setProperty('--global-label-size', Math.max(10, fs - 2) + 'px');
    document.body.style.fontSize = fs + 'px';

    let style = document.getElementById(this._styleId);
    if (!style) {
      style = document.createElement('style');
      style.id = this._styleId;
      document.head.appendChild(style);
    }
    style.textContent = this._buildCss(fs, ff);
  },

  init() {
    const url = this._rootPath() + 'data/site_config.json?_=' + Date.now();
    fetch(url).then(r => r.json()).then(cfg => this.apply(cfg)).catch(() => {});
  }
};

Typography.init();

/**
 * 渲染页脚备案信息（从 site_config.json 数据中读取）
 * @param {object} siteConfig - site_config.json 的完整数据
 */
function renderFooter(siteConfig) {
  var ft = document.getElementById('page-footer') || document.getElementById('index-footer');
  if (!ft || !siteConfig || !siteConfig.footer) return;
  var f = siteConfig.footer;
  var h = f.copyright || '同学录 · 青春回忆';
  if (f.beian) {
    h += '<br><a href="' + (f.beianUrl || 'https://beian.miit.gov.cn/') + '" target="_blank" style="color:inherit;text-decoration:none;opacity:0.7;">' + f.beian + '</a>';
  }
  ft.innerHTML = h;
}
