/**
 * 同学录后台 · 网格映射系统模块
 * admin/assets/js/grid-system.js
 *
 * 功能：
 * 1. 将画布划分为 N×M 网格，辅助贴纸对齐
 * 2. 贴纸松手时自动吸附到最近网格交叉点（0.15s ease-out 过渡）
 * 3. 网格坐标 ↔ 百分比坐标 双向转换
 * 4. 编辑模式下可选择性显示半透明辅助线
 * 5. 网格密度可配置（列数 × 行数）
 *
 * 使用方式：
 *   GridSystem.init(canvasEl, { cols:20, rows:40 });
 *   GridSystem.setVisible(true);
 *   const snapped = GridSystem.snap(leftPct, topPct);
 *   // → { left: '35.00%', top: '22.50%' }
 */
const GridSystem = (() => {
  /* ── 配置 ──────────────────────────────────────────────────── */
  let _canvas  = null;   // 画布 DOM 元素（承载贴纸的容器）
  let _cols    = 20;     // 网格列数
  let _rows    = 40;     // 网格行数
  let _visible = false;  // 是否显示辅助线
  let _snap    = true;   // 是否开启吸附

  const SNAP_ANIM_MS = 150;  // 吸附过渡动画时长（ms）

  /* ── 内部 canvas 元素（用于绘制辅助线） ─────────────────── */
  let _gridCanvas = null;
  let _ctx        = null;

  /* ══════════════════════════════════════════════════════════
     初始化
  ══════════════════════════════════════════════════════════ */
  /**
   * 初始化网格系统
   * @param {HTMLElement} canvasEl  贴纸画布容器（position:relative 或 absolute）
   * @param {object}      opts      配置项 { cols, rows, visible, snap }
   */
  function init(canvasEl, opts = {}) {
    _canvas  = canvasEl;
    _cols    = opts.cols    ?? _cols;
    _rows    = opts.rows    ?? _rows;
    _visible = opts.visible ?? _visible;
    _snap    = opts.snap    ?? _snap;

    _ensureGridCanvas();
    if (_visible) draw();
  }

  /* ── 确保辅助线 canvas 存在 ─────────────────────────────── */
  function _ensureGridCanvas() {
    if (!_canvas) return;

    // 复用已有的 #sticker-grid-canvas
    let gc = _canvas.querySelector('#sticker-grid-canvas');
    if (!gc) {
      gc = document.createElement('canvas');
      gc.id = 'sticker-grid-canvas';
      gc.style.cssText = `
        position:absolute;top:0;left:0;
        width:100%;height:100%;
        z-index:5;
        pointer-events:none;
        display:${_visible ? 'block' : 'none'};
      `;
      _canvas.appendChild(gc);
    }
    _gridCanvas = gc;
    _ctx        = gc.getContext('2d');
  }

  /* ══════════════════════════════════════════════════════════
     绘制辅助线
  ══════════════════════════════════════════════════════════ */
  function draw() {
    if (!_gridCanvas || !_ctx || !_canvas) return;

    const W = _canvas.offsetWidth;
    const H = _canvas.offsetHeight;
    if (!W || !H) return;

    _gridCanvas.width  = W;
    _gridCanvas.height = H;
    _gridCanvas.style.width  = W + 'px';
    _gridCanvas.style.height = H + 'px';

    const cellW = W / _cols;
    const cellH = H / _rows;

    _ctx.clearRect(0, 0, W, H);

    // 普通格线（细线）
    _ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    _ctx.lineWidth   = 0.5;

    for (let c = 0; c <= _cols; c++) {
      const x = Math.round(c * cellW) + 0.5;
      _ctx.beginPath();
      _ctx.moveTo(x, 0);
      _ctx.lineTo(x, H);
      _ctx.stroke();
    }
    for (let r = 0; r <= _rows; r++) {
      const y = Math.round(r * cellH) + 0.5;
      _ctx.beginPath();
      _ctx.moveTo(0, y);
      _ctx.lineTo(W, y);
      _ctx.stroke();
    }

    // 每 5 格加粗辅助线
    _ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    _ctx.lineWidth   = 1;

    for (let c = 0; c <= _cols; c += 5) {
      const x = Math.round(c * cellW) + 0.5;
      _ctx.beginPath();
      _ctx.moveTo(x, 0);
      _ctx.lineTo(x, H);
      _ctx.stroke();
    }
    for (let r = 0; r <= _rows; r += 5) {
      const y = Math.round(r * cellH) + 0.5;
      _ctx.beginPath();
      _ctx.moveTo(0, y);
      _ctx.lineTo(W, y);
      _ctx.stroke();
    }

    // 中心十字线（金色）
    _ctx.strokeStyle = 'rgba(212,175,55,0.25)';
    _ctx.lineWidth   = 1;
    const cx = Math.round(W / 2) + 0.5;
    const cy = Math.round(H / 2) + 0.5;
    _ctx.beginPath(); _ctx.moveTo(cx, 0); _ctx.lineTo(cx, H); _ctx.stroke();
    _ctx.beginPath(); _ctx.moveTo(0, cy); _ctx.lineTo(W, cy); _ctx.stroke();
  }

  /* ══════════════════════════════════════════════════════════
     显示 / 隐藏辅助线
  ══════════════════════════════════════════════════════════ */
  function setVisible(visible) {
    _visible = visible;
    if (!_gridCanvas) _ensureGridCanvas();
    if (_gridCanvas) {
      _gridCanvas.style.display = visible ? 'block' : 'none';
    }
    if (visible) draw();
  }

  /* ══════════════════════════════════════════════════════════
     开启 / 关闭吸附
  ══════════════════════════════════════════════════════════ */
  function setSnap(enabled) {
    _snap = enabled;
  }

  /* ══════════════════════════════════════════════════════════
     更新网格密度
  ══════════════════════════════════════════════════════════ */
  function setSize(cols, rows) {
    _cols = Math.max(4, Math.min(100, cols));
    _rows = Math.max(4, Math.min(200, rows));
    if (_visible) draw();
  }

  /* ══════════════════════════════════════════════════════════
     坐标转换工具
  ══════════════════════════════════════════════════════════ */

  /**
   * 像素坐标 → 网格坐标
   * @param {number} pixelX  相对于画布左上角的 x 像素
   * @param {number} pixelY  相对于画布左上角的 y 像素
   * @returns {{ gridX: number, gridY: number }}
   */
  function pixelToGrid(pixelX, pixelY) {
    if (!_canvas) return { gridX: 0, gridY: 0 };
    const W = _canvas.offsetWidth;
    const H = _canvas.offsetHeight;
    const cellW = W / _cols;
    const cellH = H / _rows;
    return {
      gridX: Math.round(pixelX / cellW),
      gridY: Math.round(pixelY / cellH),
    };
  }

  /**
   * 网格坐标 → 像素坐标
   * @param {number} gridX
   * @param {number} gridY
   * @returns {{ pixelX: number, pixelY: number }}
   */
  function gridToPixel(gridX, gridY) {
    if (!_canvas) return { pixelX: 0, pixelY: 0 };
    const W = _canvas.offsetWidth;
    const H = _canvas.offsetHeight;
    return {
      pixelX: gridX * (W / _cols),
      pixelY: gridY * (H / _rows),
    };
  }

  /**
   * 百分比坐标 → 网格坐标
   * @param {number} leftPct  0~100
   * @param {number} topPct   0~100
   * @returns {{ gridX: number, gridY: number }}
   */
  function percentToGrid(leftPct, topPct) {
    return {
      gridX: Math.round(leftPct / 100 * _cols),
      gridY: Math.round(topPct  / 100 * _rows),
    };
  }

  /**
   * 网格坐标 → 百分比坐标
   * @param {number} gridX
   * @param {number} gridY
   * @returns {{ leftPct: number, topPct: number }}
   */
  function gridToPercent(gridX, gridY) {
    return {
      leftPct: (gridX / _cols) * 100,
      topPct:  (gridY / _rows) * 100,
    };
  }

  /* ══════════════════════════════════════════════════════════
     网格吸附（核心 API）
  ══════════════════════════════════════════════════════════ */

  /**
   * 将百分比坐标吸附到最近的网格交叉点
   * @param {number|string} leftPct  百分比数字（0~100）或带 '%' 的字符串
   * @param {number|string} topPct   百分比数字（0~100）或带 '%' 的字符串
   * @returns {{ left: string, top: string }}  带 '%' 的字符串坐标
   */
  function snap(leftPct, topPct) {
    const lNum = parseFloat(String(leftPct));
    const tNum = parseFloat(String(topPct));

    if (!_snap) {
      return {
        left: lNum.toFixed(2) + '%',
        top:  tNum.toFixed(2) + '%',
      };
    }

    const { gridX, gridY } = percentToGrid(lNum, tNum);
    const { leftPct: snappedL, topPct: snappedT } = gridToPercent(
      Math.max(0, Math.min(_cols, gridX)),
      Math.max(0, Math.min(_rows, gridY))
    );

    return {
      left: snappedL.toFixed(2) + '%',
      top:  snappedT.toFixed(2) + '%',
    };
  }

  /**
   * 将百分比坐标吸附到最近的网格交叉点（像素版本）
   * @param {number} leftPx  相对于画布的 x 像素
   * @param {number} topPx   相对于画布的 y 像素
   * @returns {{ leftPx: number, topPx: number }}
   */
  function snapPixel(leftPx, topPx) {
    if (!_canvas) return { leftPx, topPx };
    const W = _canvas.offsetWidth;
    const H = _canvas.offsetHeight;
    if (!W || !H) return { leftPx, topPx };

    if (!_snap) return { leftPx, topPx };

    const cellW = W / _cols;
    const cellH = H / _rows;
    return {
      leftPx: Math.round(leftPx / cellW) * cellW,
      topPx:  Math.round(topPx  / cellH) * cellH,
    };
  }

  /**
   * 对 DOM 贴纸元素应用吸附动画
   * @param {HTMLElement} el       贴纸 DOM 元素
   * @param {string}      left     吸附后的 left 百分比字符串（如 '35.00%'）
   * @param {string}      top      吸附后的 top 百分比字符串
   * @param {string}      rotate   旋转角度字符串（如 '15deg'）
   */
  function applySnapAnim(el, left, top, rotate) {
    if (!el) return;
    el.style.transition = `transform ${SNAP_ANIM_MS}ms ease-out`;
    el.style.transform  = `translate3d(${parseFloat(left)}%,${parseFloat(top)}%,0) rotate(${rotate || '0deg'}) translateZ(0)`;
    setTimeout(() => {
      if (el) el.style.transition = '';
    }, SNAP_ANIM_MS + 20);
  }

  /* ══════════════════════════════════════════════════════════
     画布尺寸变化时重绘
  ══════════════════════════════════════════════════════════ */
  function onResize() {
    if (_visible) draw();
  }

  /* ══════════════════════════════════════════════════════════
     获取当前配置
  ══════════════════════════════════════════════════════════ */
  function getConfig() {
    return {
      cols:    _cols,
      rows:    _rows,
      visible: _visible,
      snap:    _snap,
    };
  }

  /* ══════════════════════════════════════════════════════════
     销毁（清理）
  ══════════════════════════════════════════════════════════ */
  function destroy() {
    if (_gridCanvas) {
      _gridCanvas.remove();
      _gridCanvas = null;
      _ctx        = null;
    }
    _canvas = null;
  }

  /* ── 公开接口 ─────────────────────────────────────────── */
  return {
    init,
    draw,
    setVisible,
    setSnap,
    setSize,
    snap,
    snapPixel,
    applySnapAnim,
    pixelToGrid,
    gridToPixel,
    percentToGrid,
    gridToPercent,
    onResize,
    getConfig,
    destroy,
  };
})();
