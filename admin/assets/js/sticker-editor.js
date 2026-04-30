/*!
 * 同学录后台 · 贴纸编辑器 v12
 * admin/assets/js/sticker-editor.js
 *
 * ══════════════════════════════════════════════════════════════════
 * v12 修复内容：
 *   1. 预览 iframe 加载修复：iframe 加载后注入 sessionStorage，
 *      确保学生页面不会因 Session.getName() 重定向到首页
 *   2. 映射板触控板模式：
 *      - 空白区域滑动 → 控制预览页面滚动（像笔记本触控板）
 *      - 贴纸上单击 → 选中；长按 350ms → 进入拖拽模式
 *      - 拖拽时实时同步贴纸位置到预览 iframe
 *   3. 预览窗口增大：从 100px 增大到 200px
 *   4. 长按拖动修复：
 *      - touchmove 绑定在 document 上（而非 scrollWrap）
 *      - 贴纸 touchstart 立即 preventDefault 阻止浏览器手势
 *      - 降低长按阈值到 350ms，提高移动容差到 15px
 *   5. 映射板不再自身滚动，改为固定视口比例，滑动手势传递给预览
 *
 * 坐标系：
 *   · 贴纸坐标以百分比存储（相对于 background-layer 即视口）
 *   · PAGE_W=390, PAGE_H=844 对应目标设计尺寸（手机视口）
 * ══════════════════════════════════════════════════════════════════
 */
const StickerEditor = (() => {

  /* ── 页面真实尺寸（宽高比用于格子板） ─────────────────────────── */
  const PAGE_W = 390;
  const PAGE_H = 844;

  /* ── 预览窗口宽度 ─────────────────────────────────────────────── */
  const PREVIEW_W = 200;

  /* ── 状态 ──────────────────────────────────────────────────────── */
  let currentStudent   = null;
  let stickers         = [];
  let selectedIdx      = -1;
  let allStickerFiles  = [];
  let step             = 1;
  let pendingSticker   = null;

  // 自动保存防抖
  let _autoSaveTimer   = null;

  // 网格配置
  let _gridEnabled = false;
  let _gridSnap    = true;
  let _gridCols    = 20;
  let _gridRows    = 40;

  // 键盘长按
  let _keyHoldTimer    = null;
  let _keyHoldInterval = null;
  const _keyState      = {};

  // 贴纸双指缩放
  let _pinchActive     = false;
  let _pinchStartDist  = 0;
  let _pinchStartWidth = 60;

  // 预览浮窗位置更新函数
  let _updateFloatWinPos = null;

  // ★ v12: 映射板触控板滚动状态
  let _trackpadScrollY = 0;  // 当前预览页面的滚动位置（百分比 0~1）

  const MAX_STICKERS      = 50;
  const LONG_PRESS_MS     = 350;
  const LONG_PRESS_MOVE   = 15;
  const SNAP_ANIM_MS      = 150;

  const ANIMATIONS = [
    { value: 'sticker--float',  label: '漂浮' },
    { value: 'sticker--sway',   label: '摇摆' },
    { value: 'sticker--spin',   label: '旋转' },
    { value: 'sticker--bounce', label: '弹跳' },
    { value: '',                label: '无动画' },
  ];

  /* ══════════════════════════════════════════════════════════════
     加载入口
  ══════════════════════════════════════════════════════════════ */
  async function load(id) {
    const student = StudentsModule.getStudent(id);
    if (!student) return;
    currentStudent = student;
    stickers       = JSON.parse(JSON.stringify(student.stickers || []));
    selectedIdx    = -1;
    pendingSticker = null;
    _trackpadScrollY = 0;

    const sel = document.getElementById('sticker-student-select');
    if (sel) sel.value = id;

    try {
      const data = await API.getStickers();
      allStickerFiles = data.stickers || [];
    } catch(e) { allStickerFiles = []; }

    renderEditor();
  }

  /* ══════════════════════════════════════════════════════════════
     渲染编辑器 HTML 骨架
  ══════════════════════════════════════════════════════════════ */
  function renderEditor() {
    const wrap = document.getElementById('sticker-editor-wrap');
    if (!wrap) return;

    const previewH = Math.round(PREVIEW_W * PAGE_H / PAGE_W);

    wrap.innerHTML = `
      <div class="sticker-editor sticker-editor--proxy" style="
        display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap;
      ">

        <!-- ① 左侧控制面板 -->
        <div class="sticker-controls" style="flex:0 0 220px;min-width:180px;">

          <!-- 贴纸库 -->
          <div class="card">
            <div class="card-header">
              <span class="card-title">贴纸库</span>
              <button class="btn btn-secondary btn-sm" id="btn-refresh-stickers">刷新</button>
            </div>
            <div class="card-body" style="padding:10px;">
              <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px;line-height:1.6;">
                <strong style="color:var(--gold);">使用方式：</strong>
                点击贴纸图标 → 点击映射板放置<br>
                手机：<strong>长按贴纸</strong> 拖动移位<br>
                映射板空白处滑动 → 预览页面滚动<br>
                PC：单击选中 · 右键/Delete 删除
              </div>
              <div id="sticker-pending-tip" style="
                display:none;
                background:rgba(229,62,62,0.15);
                border:1px solid #e53e3e;
                border-radius:6px;padding:6px 10px;
                font-size:11px;color:#e53e3e;
                margin-bottom:8px;text-align:center;
              ">✦ 已选中贴纸，点击映射板放置 · 再次点击或按 Esc 取消</div>
              <div class="sticker-library" id="sticker-library">
                ${renderLibraryHTML()}
              </div>
            </div>
          </div>

          <!-- 选中贴纸属性 -->
          <div class="card" id="sticker-props-card" style="${selectedIdx < 0 ? 'opacity:0.4;pointer-events:none' : ''}">
            <div class="card-header">
              <span class="card-title">贴纸属性</span>
              <button class="btn btn-secondary btn-sm" id="btn-deselect-sticker" title="取消选中 (Esc)">✕ 取消</button>
            </div>
            <div class="card-body">
              <div class="form-group" style="margin-bottom:10px;">
                <label class="form-label">动画效果</label>
                <select class="form-control" id="sticker-anim-select">
                  ${ANIMATIONS.map(a => `<option value="${a.value}">${a.label}</option>`).join('')}
                </select>
              </div>
              <div class="form-group" style="margin-bottom:10px;">
                <label class="form-label">宽度</label>
                <input type="range" id="sticker-width-range" min="20" max="300" value="60" style="width:100%;">
                <span id="sticker-width-val" style="font-size:11px;color:var(--text-dim);">60px</span>
              </div>
              <div class="form-group" style="margin-bottom:10px;">
                <label class="form-label">旋转角度</label>
                <input type="range" id="sticker-rotate-range" min="-180" max="180" value="0" style="width:100%;">
                <span id="sticker-rotate-val" style="font-size:11px;color:var(--text-dim);">0deg</span>
              </div>
              <button class="btn btn-danger btn-sm" style="width:100%;margin-top:4px;" id="btn-remove-sticker">删除选中贴纸</button>
            </div>
          </div>

          <!-- D-Pad 精确控制 -->
          <div class="card">
            <div class="card-header"><span class="card-title">精确移动</span></div>
            <div class="card-body">
              <div style="margin-bottom:10px;">
                <label class="form-label">步长</label>
                <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;">
                  ${[1,5,10,20].map(n => `<button class="btn btn-secondary btn-sm step-btn ${n===step?'btn-primary':''}" data-step="${n}">${n}px</button>`).join('')}
                </div>
              </div>
              <div class="dpad" style="margin:8px 0;">
                <div></div>
                <div class="dpad-btn" id="dpad-up"    data-dx="0"  data-dy="-1">↑</div>
                <div></div>
                <div class="dpad-btn" id="dpad-left"  data-dx="-1" data-dy="0">←</div>
                <div class="dpad-btn dpad-center">移动</div>
                <div class="dpad-btn" id="dpad-right" data-dx="1"  data-dy="0">→</div>
                <div></div>
                <div class="dpad-btn" id="dpad-down"  data-dx="0"  data-dy="1">↓</div>
                <div></div>
              </div>
              <div style="font-size:11px;color:var(--text-muted);">
                键盘方向键微调 · Esc 取消选中
              </div>
            </div>
          </div>

          <!-- 网格控制 -->
          <div class="card">
            <div class="card-header"><span class="card-title">网格辅助</span></div>
            <div class="card-body">
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;flex-wrap:wrap;">
                <label style="font-size:12px;cursor:pointer;display:flex;align-items:center;gap:6px;">
                  <input type="checkbox" id="grid-show-toggle" ${_gridEnabled ? 'checked' : ''}>
                  显示辅助线
                </label>
                <label style="font-size:12px;cursor:pointer;display:flex;align-items:center;gap:6px;">
                  <input type="checkbox" id="grid-snap-toggle" ${_gridSnap ? 'checked' : ''}>
                  网格吸附
                </label>
              </div>
              <div style="display:flex;gap:8px;align-items:center;font-size:11px;color:var(--text-muted);">
                <span>列</span>
                <input type="number" id="grid-cols-input" value="${_gridCols}" min="4" max="50"
                  style="width:52px;padding:2px 6px;border:1px solid var(--border-color,rgba(0,0,0,.2));border-radius:4px;font-size:11px;background:var(--bg2,#fff);color:inherit;">
                <span>行</span>
                <input type="number" id="grid-rows-input" value="${_gridRows}" min="4" max="100"
                  style="width:52px;padding:2px 6px;border:1px solid var(--border-color,rgba(0,0,0,.2));border-radius:4px;font-size:11px;background:var(--bg2,#fff);color:inherit;">
              </div>
            </div>
          </div>

          <!-- 坐标显示 -->
          <div style="padding:4px 4px 0;font-size:11px;color:var(--gold);" id="sticker-coord">—</div>

          <!-- 保存 -->
          <div style="padding:4px 4px 0;">
            <button class="btn btn-primary" style="width:100%;" id="btn-save-stickers">保存并生成页面</button>
          </div>

        </div><!-- /sticker-controls -->

        <!-- ② 中间：映射板 + 实时预览并排 -->
        <div style="flex:1;min-width:280px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
            <span style="font-size:12px;color:var(--gold);font-weight:600;">🗺 触控映射板</span>
            <span style="font-size:11px;color:var(--text-muted);">空白滑动=预览滚动 · 长按贴纸=拖动 · 点击=放置</span>
          </div>

          <div style="display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap;">
            <!-- 映射板（固定视口比例，不自身滚动） -->
            <div id="proxy-scroll-wrap" style="
              flex:1;
              min-width:200px;
              max-width:400px;
              border:2px solid var(--gold,#c9a84c);
              border-radius:8px;
              background:#0d0d0d;
              position:relative;
              overflow:hidden;
              touch-action:none;
              -webkit-touch-callout:none;
              user-select:none;
              -webkit-user-select:none;
            ">
              <!-- 格子代理板（宽高比 = PAGE_W:PAGE_H = 390:844） -->
              <div id="proxy-board" style="
                position:relative;
                width:100%;
                padding-bottom:${(PAGE_H / PAGE_W * 100).toFixed(4)}%;
                background:transparent;
                overflow:hidden;
                touch-action:none;
                -webkit-touch-callout:none;
                user-select:none;
                -webkit-user-select:none;
              ">
                <!-- 网格辅助线 canvas -->
                <canvas id="proxy-grid-canvas" style="
                  position:absolute;top:0;left:0;
                  width:100%;height:100%;
                  pointer-events:none;
                  z-index:1;
                  display:${_gridEnabled ? 'block' : 'none'};
                "></canvas>

                <!-- 贴纸层 -->
                <div id="proxy-sticker-layer" style="
                  position:absolute;top:0;left:0;
                  width:100%;height:100%;
                  z-index:2;
                "></div>

                <!-- 点击放置捕获层（最顶层，仅在 pendingSticker 时激活） -->
                <div id="proxy-click-layer" style="
                  position:absolute;top:0;left:0;
                  width:100%;height:100%;
                  z-index:3;
                  pointer-events:none;
                  cursor:crosshair;
                  touch-action:none;
                "></div>

                <!-- ★ v12: 触控板滚动指示器 -->
                <div id="scroll-indicator" style="
                  position:absolute;
                  right:4px;
                  width:4px;
                  height:20%;
                  background:rgba(201,168,76,0.5);
                  border-radius:2px;
                  z-index:5;
                  transition:top 0.15s ease-out;
                  pointer-events:none;
                  top:0;
                "></div>

              </div>
            </div>

            <!-- ★ v12: 实时预览（从浮窗改为并排显示，增大到200px宽） -->
            <div id="preview-panel" style="
              flex:0 0 ${PREVIEW_W}px;
              min-width:${PREVIEW_W}px;
            ">
              <div style="
                background:rgba(0,0,0,0.85);
                border:2px solid rgba(201,168,76,0.7);
                border-radius:8px;
                overflow:hidden;
                box-shadow:0 4px 20px rgba(0,0,0,0.8);
              ">
                <div style="
                  font-size:10px;color:rgba(201,168,76,0.9);
                  text-align:center;padding:4px 6px;
                  background:rgba(201,168,76,0.1);
                  border-bottom:1px solid rgba(201,168,76,0.25);
                  letter-spacing:0.05em;font-weight:600;
                ">📱 实时预览 · 映射板滑动联动</div>
                <div id="preview-iframe-wrap" style="
                  position:relative;
                  width:${PREVIEW_W}px;
                  height:${Math.round(PREVIEW_W * PAGE_H / PAGE_W)}px;
                  overflow:hidden;
                ">
                  <iframe id="preview-iframe"
                    style="
                      position:absolute;top:0;left:0;
                      width:${PAGE_W}px;height:${PAGE_H * 3}px;
                      border:none;
                      transform-origin:top left;
                      pointer-events:none;
                      display:block;
                    "
                    sandbox="allow-scripts allow-same-origin"
                    loading="lazy">
                  </iframe>
                </div>
              </div>
            </div>
          </div>

          <!-- 提示文字 -->
          <div style="font-size:10px;color:var(--text-muted);margin-top:6px;text-align:center;">
            映射板如触控板：空白滑动控制预览滚动 · 贴纸坐标实时同步
          </div>
        </div>

      </div>
    `;

    renderProxyBoard();
    bindEvents();
    initPreview();
  }

  /* ══════════════════════════════════════════════════════════════
     贴纸库 HTML
  ══════════════════════════════════════════════════════════════ */
  function renderLibraryHTML() {
    if (!allStickerFiles.length) {
      return '<div style="font-size:12px;color:var(--text-muted);text-align:center;padding:12px;grid-column:1/-1;">暂无贴纸，请先上传</div>';
    }
    return allStickerFiles.map(s => {
      const isPending = pendingSticker && pendingSticker.path === s.path;
      return `
      <div class="sticker-thumb${isPending ? ' sticker-thumb--pending' : ''}"
           data-path="${s.path}" data-filename="${s.filename}" title="${s.filename}"
           style="${isPending ? 'outline:2px solid #e53e3e;outline-offset:2px;background:rgba(229,62,62,0.12);' : ''}">
        <img src="/${s.path}" alt="" loading="lazy" decoding="async">
        <button class="sticker-del-btn" data-filename="${s.filename}" title="删除此贴纸" type="button">✕</button>
      </div>`;
    }).join('');
  }

  /* ══════════════════════════════════════════════════════════════
     渲染格子代理板上的贴纸
  ══════════════════════════════════════════════════════════════ */
  function renderProxyBoard() {
    const layer = document.getElementById('proxy-sticker-layer');
    if (!layer) return;
    layer.innerHTML = '';

    stickers.forEach((s, idx) => {
      const el = createProxyStickerEl(s, idx);
      layer.appendChild(el);
    });

    syncPreviewStickers();
    if (_gridEnabled) drawProxyGrid();
  }

  /* ── 创建格子板上的单个贴纸元素 ────────────────────────────── */
  function createProxyStickerEl(s, idx) {
    const isSelected = (idx === selectedIdx);
    const widthPct   = stickerWidthToPct(s.width || '60px');
    const leftPct    = parseFloat(s.left)   || 0;
    const topPct     = parseFloat(s.top)    || 0;
    const rotateDeg  = parseFloat(s.rotate) || 0;

    const el = document.createElement('div');
    el.className   = 'proxy-sticker' + (isSelected ? ' selected' : '');
    el.dataset.idx = idx;

    el.style.cssText = `
      position:absolute;
      left:${leftPct}%;
      top:${topPct}%;
      width:${widthPct}%;
      transform:rotate(${rotateDeg}deg) translateZ(0);
      transform-origin:center center;
      will-change:transform;
      cursor:${isSelected ? 'grab' : 'pointer'};
      user-select:none;
      -webkit-user-select:none;
      -webkit-touch-callout:none;
      touch-action:none;
      z-index:${isSelected ? 5 : 4};
      pointer-events:auto;
      box-sizing:border-box;
      ${isSelected ? 'outline:2px solid #e53e3e;outline-offset:3px;' : ''}
    `;

    const img = document.createElement('img');
    img.src           = '/' + s.file;
    img.draggable     = false;
    img.style.cssText = 'width:100%;height:auto;display:block;pointer-events:none;-webkit-touch-callout:none;';
    el.appendChild(img);

    if (isSelected) {
      el.appendChild(makeDelBtn(idx));
      el.appendChild(makeRotateHandle(idx));
    }

    // PC：mousedown 选中并拖拽
    el.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      if (e.target.closest('.proxy-handle')) return;
      e.stopPropagation();
      pendingSticker = null;
      updatePendingTip();
      if (selectedIdx !== idx) selectSticker(idx);
      startMouseDrag(e, idx);
    });

    // PC：右键删除
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (confirm('删除这个贴纸？')) {
        selectSticker(idx);
        removeSelectedSticker();
      }
    });

    // ★ v12: 移动端触摸 - 立即 preventDefault 阻止浏览器手势
    el.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2 && isSelected) {
        e.stopPropagation();
        e.preventDefault();
        startStickerPinch(e, idx);
        return;
      }
      if (e.touches.length > 1) return;
      e.stopPropagation();
      e.preventDefault();
      pendingSticker = null;
      updatePendingTip();
      startTouchInteract(e, idx);
    }, { passive: false });

    return el;
  }

  /* ── 将贴纸宽度（px）转换为相对于格子板的百分比 ─────────────── */
  function stickerWidthToPct(widthStr) {
    const px = parseSizeToPx(widthStr);
    return (px / PAGE_W * 100).toFixed(3);
  }

  function pctToStickerWidthPx(pct) {
    return Math.round(pct / 100 * PAGE_W);
  }

  /* ── 创建右上角删除按钮 ─────────────────────────────────────── */
  function makeDelBtn(idx) {
    const btn = document.createElement('button');
    btn.className = 'proxy-handle';
    btn.title     = '删除此贴纸 (Delete)';
    btn.innerHTML = '✕';
    btn.style.cssText = `
      position:absolute;top:-10px;right:-10px;
      width:24px;height:24px;border-radius:50%;
      background:#e53e3e;color:#fff;border:2px solid #fff;
      cursor:pointer;font-size:13px;line-height:20px;
      text-align:center;padding:0;z-index:20;
      box-shadow:0 2px 6px rgba(0,0,0,0.5);
      display:flex;align-items:center;justify-content:center;
      touch-action:manipulation;
      -webkit-tap-highlight-color:transparent;
      font-weight:bold;
    `;
    btn.addEventListener('mousedown', e => { e.stopPropagation(); e.preventDefault(); });
    btn.addEventListener('click',    e => { e.stopPropagation(); e.preventDefault(); removeSelectedSticker(); });
    btn.addEventListener('touchend', e => { e.stopPropagation(); e.preventDefault(); removeSelectedSticker(); }, { passive: false });
    return btn;
  }

  /* ── 创建旋转手柄 ───────────────────────────────────────────── */
  function makeRotateHandle(idx) {
    const handle = document.createElement('div');
    handle.className  = 'proxy-handle';
    handle.title      = '拖拽旋转';
    handle.style.cssText = `
      position:absolute;top:-28px;left:50%;
      transform:translateX(-50%);
      width:20px;height:20px;border-radius:50%;
      background:#4a90e2;border:2px solid #fff;
      cursor:grab;z-index:20;
      box-shadow:0 1px 4px rgba(0,0,0,0.4);
      touch-action:none;
    `;

    // PC 旋转
    handle.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      const el = document.querySelector(`#proxy-sticker-layer .proxy-sticker[data-idx="${idx}"]`);
      if (!el) return;
      const rect   = el.getBoundingClientRect();
      const cx     = rect.left + rect.width  / 2;
      const cy     = rect.top  + rect.height / 2;
      const startAngle = Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI;
      const startRot   = parseFloat(stickers[idx]?.rotate) || 0;

      function onMove(ev) {
        const angle = Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180 / Math.PI;
        let newRot  = startRot + (angle - startAngle);
        newRot = Math.round(newRot);
        if (stickers[idx]) {
          stickers[idx].rotate = newRot + 'deg';
          el.style.transform = `rotate(${newRot}deg) translateZ(0)`;
          const rv = document.getElementById('sticker-rotate-range');
          const rl = document.getElementById('sticker-rotate-val');
          if (rv) rv.value = newRot;
          if (rl) rl.textContent = newRot + 'deg';
        }
      }
      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup',   onUp);
        renderProxyBoard();
        autoSave();
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup',   onUp);
    });

    // ★ v12: 移动端旋转手柄
    handle.addEventListener('touchstart', (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (e.touches.length !== 1) return;
      const el = document.querySelector(`#proxy-sticker-layer .proxy-sticker[data-idx="${idx}"]`);
      if (!el) return;
      const rect   = el.getBoundingClientRect();
      const cx     = rect.left + rect.width  / 2;
      const cy     = rect.top  + rect.height / 2;
      const touch  = e.touches[0];
      const startAngle = Math.atan2(touch.clientY - cy, touch.clientX - cx) * 180 / Math.PI;
      const startRot   = parseFloat(stickers[idx]?.rotate) || 0;

      function onMove(ev) {
        ev.preventDefault();
        const t = ev.touches[0];
        if (!t) return;
        const angle = Math.atan2(t.clientY - cy, t.clientX - cx) * 180 / Math.PI;
        let newRot  = startRot + (angle - startAngle);
        newRot = Math.round(newRot);
        if (stickers[idx]) {
          stickers[idx].rotate = newRot + 'deg';
          el.style.transform = `rotate(${newRot}deg) translateZ(0)`;
          const rv = document.getElementById('sticker-rotate-range');
          const rl = document.getElementById('sticker-rotate-val');
          if (rv) rv.value = newRot;
          if (rl) rl.textContent = newRot + 'deg';
        }
      }
      function onEnd() {
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend',  onEnd);
        document.removeEventListener('touchcancel', onEnd);
        renderProxyBoard();
        autoSave();
      }
      document.addEventListener('touchmove', onMove, { passive: false });
      document.addEventListener('touchend',  onEnd);
      document.addEventListener('touchcancel', onEnd);
    }, { passive: false });

    return handle;
  }

  /* ══════════════════════════════════════════════════════════════
     选中 / 取消选中
  ══════════════════════════════════════════════════════════════ */
  function selectSticker(idx) {
    selectedIdx = idx;
    renderProxyBoard();
    syncPropsPanel();
  }

  function deselectAll() {
    selectedIdx = -1;
    renderProxyBoard();
    syncPropsPanel();
  }

  /* ══════════════════════════════════════════════════════════════
     属性面板同步
  ══════════════════════════════════════════════════════════════ */
  function syncPropsPanel() {
    const card = document.getElementById('sticker-props-card');
    if (!card) return;
    const s = stickers[selectedIdx];
    if (!s) {
      card.style.opacity       = '0.4';
      card.style.pointerEvents = 'none';
      return;
    }
    card.style.opacity       = '1';
    card.style.pointerEvents = '';

    const animSel = document.getElementById('sticker-anim-select');
    const wRange  = document.getElementById('sticker-width-range');
    const wVal    = document.getElementById('sticker-width-val');
    const rRange  = document.getElementById('sticker-rotate-range');
    const rVal    = document.getElementById('sticker-rotate-val');

    const animClass = (s.animClass || '').trim();
    if (animSel) animSel.value = animClass;

    const widthPx = parseSizeToPx(s.width || '60px');
    if (wRange) wRange.value = widthPx;
    if (wVal)   wVal.textContent = widthPx + 'px';

    const rot = parseFloat(s.rotate) || 0;
    if (rRange) rRange.value = rot;
    if (rVal)   rVal.textContent = rot + 'deg';
  }

  /* ══════════════════════════════════════════════════════════════
     坐标显示
  ══════════════════════════════════════════════════════════════ */
  function showCoord(s) {
    const el = document.getElementById('sticker-coord');
    if (!el || !s) return;
    el.textContent = `X: ${parseFloat(s.left).toFixed(1)}%  Y: ${parseFloat(s.top).toFixed(1)}%`;
  }

  /* ══════════════════════════════════════════════════════════════
     PC 鼠标拖拽
  ══════════════════════════════════════════════════════════════ */
  function startMouseDrag(e, idx) {
    const board = document.getElementById('proxy-board');
    if (!board) return;
    const s      = stickers[idx];
    if (!s) return;
    const rect   = board.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const initL  = parseFloat(s.left) / 100 * rect.width;
    const initT  = parseFloat(s.top)  / 100 * rect.height;
    let hasMoved = false;

    document.body.style.cursor = 'grabbing';

    function onMove(ev) {
      hasMoved = true;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      let newL = initL + dx;
      let newT = initT + dy;
      newL = Math.max(0, Math.min(rect.width,  newL));
      newT = Math.max(0, Math.min(rect.height, newT));
      s.left = (newL / rect.width  * 100).toFixed(2) + '%';
      s.top  = (newT / rect.height * 100).toFixed(2) + '%';
      const el = document.querySelector(`#proxy-sticker-layer .proxy-sticker[data-idx="${idx}"]`);
      if (el) {
        el.style.left = s.left;
        el.style.top  = s.top;
      }
      showCoord(s);
    }

    function onUp() {
      document.body.style.cursor = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);
      if (hasMoved) {
        if (_gridSnap) applySnapToSticker(idx);
        syncPreviewStickers();
        autoSave();
      }
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
  }

  /* ══════════════════════════════════════════════════════════════
     ★ v12: 移动端触摸交互（长按拖拽，大幅简化）
     - touchmove/touchend 绑定在 document 上
     - 贴纸 touchstart 已 preventDefault，不会触发浏览器手势
     - 长按 350ms 进入拖拽模式
     - 拖拽时实时更新贴纸位置和预览
  ══════════════════════════════════════════════════════════════ */
  function startTouchInteract(e, idx) {
    const board = document.getElementById('proxy-board');
    if (!board) return;
    const s = stickers[idx];
    if (!s) return;

    const touch   = e.touches[0];
    const touchId = touch.identifier;
    const startX  = touch.clientX;
    const startY  = touch.clientY;

    const boardRect = board.getBoundingClientRect();
    const initL   = parseFloat(s.left) / 100 * boardRect.width;
    const initT   = parseFloat(s.top)  / 100 * boardRect.height;

    let isDragging   = false;
    let hasMoved     = false;
    let latestDx     = 0;
    let latestDy     = 0;
    let rafPending   = false;

    // 长按计时器
    const longPressTimer = setTimeout(() => {
      isDragging = true;
      selectSticker(idx);
      if (navigator.vibrate) navigator.vibrate(50);
      // 视觉放大反馈
      const el = document.querySelector(`#proxy-sticker-layer .proxy-sticker[data-idx="${idx}"]`);
      if (el) {
        const rot = parseFloat(s.rotate) || 0;
        el.style.transition = 'transform 0.12s ease';
        el.style.transform  = `rotate(${rot}deg) scale(1.15) translateZ(0)`;
        el.style.zIndex     = '10';
        setTimeout(() => {
          if (el) {
            el.style.transition = '';
            el.style.transform  = `rotate(${rot}deg) translateZ(0)`;
          }
        }, 200);
      }
    }, LONG_PRESS_MS);

    function findTouch(ev) {
      for (let i = 0; i < ev.changedTouches.length; i++) {
        if (ev.changedTouches[i].identifier === touchId) return ev.changedTouches[i];
      }
      return null;
    }

    function onMove(ev) {
      if (ev.touches.length > 1) {
        clearTimeout(longPressTimer);
        return;
      }
      const t = findTouch(ev);
      if (!t) return;

      latestDx = t.clientX - startX;
      latestDy = t.clientY - startY;
      const totalMovePx = Math.sqrt(latestDx * latestDx + latestDy * latestDy);

      // 移动超过阈值 → 取消长按（但如果已经在拖拽则不取消）
      if (!isDragging && totalMovePx > LONG_PRESS_MOVE) {
        clearTimeout(longPressTimer);
      }

      if (!isDragging) return;

      ev.preventDefault();
      hasMoved = true;

      if (!rafPending) {
        rafPending = true;
        requestAnimationFrame(() => {
          rafPending = false;
          const currentBoardRect = board.getBoundingClientRect();
          let newL = initL + latestDx;
          let newT = initT + latestDy;
          newL = Math.max(0, Math.min(currentBoardRect.width,  newL));
          newT = Math.max(0, Math.min(currentBoardRect.height, newT));
          s.left = (newL / currentBoardRect.width  * 100).toFixed(2) + '%';
          s.top  = (newT / currentBoardRect.height * 100).toFixed(2) + '%';
          const el = document.querySelector(`#proxy-sticker-layer .proxy-sticker[data-idx="${idx}"]`);
          if (el) {
            el.style.left = s.left;
            el.style.top  = s.top;
          }
          showCoord(s);
          syncPreviewStickers();
        });
      }
    }

    function onEnd(ev) {
      clearTimeout(longPressTimer);
      if (!findTouch(ev)) return;

      document.removeEventListener('touchmove',   onMove);
      document.removeEventListener('touchend',    onEnd);
      document.removeEventListener('touchcancel', onEnd);

      if (!isDragging) {
        // 短按 → 选中
        selectSticker(idx);
      } else {
        if (hasMoved) {
          if (_gridSnap) applySnapToSticker(idx);
          renderProxyBoard();
          syncPreviewStickers();
          autoSave();
        }
      }
    }

    // ★ v12: 绑定在 document 上，确保手指移出映射板区域也能跟踪
    document.addEventListener('touchmove',   onMove, { passive: false });
    document.addEventListener('touchend',    onEnd,  { passive: false });
    document.addEventListener('touchcancel', onEnd,  { passive: false });
  }

  /* ══════════════════════════════════════════════════════════════
     ★ v12: 映射板触控板滚动（空白区域滑动 → 预览页面滚动）
  ══════════════════════════════════════════════════════════════ */
  function startTrackpadScroll(e) {
    const touch   = e.touches[0];
    const touchId = touch.identifier;
    const startY  = touch.clientY;
    const startScrollY = _trackpadScrollY;
    let lastMoveY = startY;

    function findTouch(ev) {
      for (let i = 0; i < ev.changedTouches.length; i++) {
        if (ev.changedTouches[i].identifier === touchId) return ev.changedTouches[i];
      }
      return null;
    }

    function onMove(ev) {
      const t = findTouch(ev);
      if (!t) return;
      ev.preventDefault();

      const dy = t.clientY - startY;
      // 映射板高度对应整个页面，滑动距离映射到滚动比例
      const board = document.getElementById('proxy-board');
      if (!board) return;
      const boardH = board.getBoundingClientRect().height;
      // 滑动灵敏度：映射板滑动 boardH 像素 = 预览滚动 100%
      const scrollDelta = -dy / boardH * 1.5;  // 1.5x 灵敏度
      _trackpadScrollY = Math.max(0, Math.min(1, startScrollY + scrollDelta));

      updatePreviewScroll();
      updateScrollIndicator();
    }

    function onEnd(ev) {
      if (!findTouch(ev)) return;
      document.removeEventListener('touchmove',   onMove);
      document.removeEventListener('touchend',    onEnd);
      document.removeEventListener('touchcancel', onEnd);
    }

    document.addEventListener('touchmove',   onMove, { passive: false });
    document.addEventListener('touchend',    onEnd,  { passive: false });
    document.addEventListener('touchcancel', onEnd,  { passive: false });
  }

  /* ── 更新预览 iframe 的滚动位置 ─────────────────────────────── */
  function updatePreviewScroll() {
    const iframe = document.getElementById('preview-iframe');
    if (!iframe) return;
    try {
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      const scrollH = doc.documentElement.scrollHeight || doc.body.scrollHeight || PAGE_H * 3;
      const viewH   = PAGE_H;
      const maxScroll = Math.max(0, scrollH - viewH);
      const targetScroll = Math.round(_trackpadScrollY * maxScroll);

      // 方法1：直接滚动 iframe 内容
      iframe.contentWindow.scrollTo(0, targetScroll);

      // 方法2：如果 iframe 内容无法滚动（因为 transform:scale），
      // 移动 iframe 本身的 top 偏移
      const scale = PREVIEW_W / PAGE_W;
      const iframeWrap = document.getElementById('preview-iframe-wrap');
      if (iframeWrap) {
        const wrapH = iframeWrap.offsetHeight;
        const scaledContentH = scrollH * scale;
        if (scaledContentH > wrapH) {
          const maxOffset = scaledContentH - wrapH;
          iframe.style.top = -(_trackpadScrollY * maxOffset / scale) + 'px';
        }
      }
    } catch(err) {
      // 跨域错误时使用 iframe top 偏移方式
      const scale = PREVIEW_W / PAGE_W;
      const totalH = PAGE_H * 3;
      const viewH  = PAGE_H;
      const maxOffset = (totalH - viewH);
      iframe.style.top = -(_trackpadScrollY * maxOffset) + 'px';
    }
  }

  /* ── 更新滚动指示器 ─────────────────────────────────────────── */
  function updateScrollIndicator() {
    const indicator = document.getElementById('scroll-indicator');
    if (!indicator) return;
    const maxTop = 80; // 指示器最大 top 百分比
    indicator.style.top = (_trackpadScrollY * maxTop) + '%';
  }

  /* ══════════════════════════════════════════════════════════════
     双指缩放单个贴纸
  ══════════════════════════════════════════════════════════════ */
  function startStickerPinch(e, idx) {
    if (e.touches.length !== 2) return;
    _pinchActive     = true;
    _pinchStartDist  = getTouchDist(e.touches);
    _pinchStartWidth = parseSizeToPx(stickers[idx]?.width || '60px');

    function onMove(ev) {
      if (ev.touches.length !== 2) return;
      ev.preventDefault();
      const dist  = getTouchDist(ev.touches);
      const ratio = dist / (_pinchStartDist || 1);
      const newW  = Math.max(20, Math.min(300, Math.round(_pinchStartWidth * ratio)));
      if (stickers[idx]) {
        stickers[idx].width = newW + 'px';
        const el = document.querySelector(`#proxy-sticker-layer .proxy-sticker[data-idx="${idx}"]`);
        if (el) el.style.width = stickerWidthToPct(newW + 'px') + '%';
        const wr = document.getElementById('sticker-width-range');
        const wv = document.getElementById('sticker-width-val');
        if (wr) wr.value = newW;
        if (wv) wv.textContent = newW + 'px';
      }
    }
    function onEnd() {
      _pinchActive = false;
      document.removeEventListener('touchmove',   onMove);
      document.removeEventListener('touchend',    onEnd);
      document.removeEventListener('touchcancel', onEnd);
      renderProxyBoard();
      autoSave();
    }
    document.addEventListener('touchmove',   onMove, { passive: false });
    document.addEventListener('touchend',    onEnd);
    document.addEventListener('touchcancel', onEnd);
  }

  /* ══════════════════════════════════════════════════════════════
     网格吸附
  ══════════════════════════════════════════════════════════════ */
  function applySnapToSticker(idx) {
    const s = stickers[idx];
    if (!s) return;
    const colStep = 100 / _gridCols;
    const rowStep = 100 / _gridRows;
    const rawL = parseFloat(s.left) || 0;
    const rawT = parseFloat(s.top)  || 0;
    const snapL = Math.round(rawL / colStep) * colStep;
    const snapT = Math.round(rawT / rowStep) * rowStep;
    s.left = snapL.toFixed(2) + '%';
    s.top  = snapT.toFixed(2) + '%';

    const el = document.querySelector(`#proxy-sticker-layer .proxy-sticker[data-idx="${idx}"]`);
    if (el) {
      el.style.transition = `left ${SNAP_ANIM_MS}ms ease-out, top ${SNAP_ANIM_MS}ms ease-out`;
      el.style.left = s.left;
      el.style.top  = s.top;
      setTimeout(() => { if (el) el.style.transition = ''; }, SNAP_ANIM_MS + 20);
    }
  }

  /* ══════════════════════════════════════════════════════════════
     网格辅助线绘制
  ══════════════════════════════════════════════════════════════ */
  function drawProxyGrid() {
    const canvas = document.getElementById('proxy-grid-canvas');
    const board  = document.getElementById('proxy-board');
    if (!canvas || !board) return;
    const W = board.offsetWidth;
    const H = board.offsetHeight;
    canvas.width  = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth   = 0.5;
    for (let c = 1; c < _gridCols; c++) {
      const x = W / _gridCols * c;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let r = 1; r < _gridRows; r++) {
      const y = H / _gridRows * r;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
  }

  /* ══════════════════════════════════════════════════════════════
     同步贴纸到浮动预览 iframe
  ══════════════════════════════════════════════════════════════ */
  function syncPreviewStickers() {
    const iframe = document.getElementById('preview-iframe');
    if (!iframe) return;
    try {
      const doc = iframe.contentDocument;
      if (!doc) return;
      const layer = doc.getElementById('sticker-layer') || doc.querySelector('.sticker-layer');
      if (!layer) return;

      layer.innerHTML = stickers.map((s, i) => {
        const animClass = s.animClass ? ` ${s.animClass}` : '';
        const rot = s.rotate ? `rotate(${parseFloat(s.rotate)}deg)` : '';
        return `<div class="sticker${animClass}" style="
          position:absolute;
          left:${s.left};
          top:${s.top};
          width:${s.width || '60px'};
          transform:${rot} translateZ(0);
          pointer-events:none;
        "><img src="/${s.file}" style="width:100%;height:auto;display:block;" draggable="false"></div>`;
      }).join('');
    } catch(err) {
      // 跨域或 iframe 未加载完成
    }
  }

  /* ══════════════════════════════════════════════════════════════
     ★ v12: 初始化预览 iframe（修复 Session 问题）
  ══════════════════════════════════════════════════════════════ */
  function initPreview() {
    if (!currentStudent) return;
    const iframe = document.getElementById('preview-iframe');
    if (!iframe) return;

    const scale = PREVIEW_W / PAGE_W;
    iframe.style.transform = `scale(${scale})`;

    const slug = currentStudent.slug || currentStudent.id;
    const studentName = currentStudent.name || currentStudent.id;

    // ★ v12: 使用 srcdoc 或 blob URL 来绕过 Session 检查
    // 方法：先加载 iframe，在 iframe 加载前注入 sessionStorage
    // 由于 iframe 和父页面同源（都在 47.96.77.181），可以直接操作

    // 先设置一个空白页，然后通过 JS 注入 session 再导航
    iframe.src = 'about:blank';

    iframe.onload = function onBlankLoad() {
      // 只在 about:blank 加载时执行一次
      iframe.onload = null;

      try {
        // 在 iframe 的 window 中设置 sessionStorage
        iframe.contentWindow.sessionStorage.setItem('classmate_name', studentName);
      } catch(err) {
        console.warn('无法设置 iframe sessionStorage:', err);
      }

      // 现在导航到学生页面，Session.getName() 将能找到 classmate_name
      iframe.src = `/students/${slug}.html`;

      iframe.onload = function onStudentLoad() {
        // 再次确保 sessionStorage 存在（以防页面脚本清除了它）
        try {
          iframe.contentWindow.sessionStorage.setItem('classmate_name', studentName);
        } catch(err) {}

        syncPreviewStickers();
        updatePreviewScroll();
      };
    };
  }

  /* ══════════════════════════════════════════════════════════════
     放置新贴纸（格子板点击）
  ══════════════════════════════════════════════════════════════ */
  function placeSticker(e) {
    if (!pendingSticker) return;
    if (stickers.length >= MAX_STICKERS) {
      alert('贴纸数量已达上限（' + MAX_STICKERS + '）');
      return;
    }
    const board = document.getElementById('proxy-board');
    if (!board) return;
    const rect = board.getBoundingClientRect();

    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const leftPct = ((clientX - rect.left) / rect.width  * 100).toFixed(2);
    const topPct  = ((clientY - rect.top)  / rect.height * 100).toFixed(2);

    const newSticker = {
      file:      pendingSticker.path,
      left:      leftPct + '%',
      top:       topPct  + '%',
      width:     '60px',
      rotate:    '0deg',
      animClass: '',
    };

    stickers.push(newSticker);
    selectedIdx    = stickers.length - 1;
    pendingSticker = null;
    updatePendingTip();

    renderProxyBoard();
    syncPreviewStickers();
    autoSave();
  }

  /* ══════════════════════════════════════════════════════════════
     删除选中贴纸
  ══════════════════════════════════════════════════════════════ */
  function removeSelectedSticker() {
    if (selectedIdx < 0 || selectedIdx >= stickers.length) return;
    stickers.splice(selectedIdx, 1);
    selectedIdx = -1;
    renderProxyBoard();
    syncPreviewStickers();
    autoSave();
  }

  /* ══════════════════════════════════════════════════════════════
     待放置提示条
  ══════════════════════════════════════════════════════════════ */
  function updatePendingTip() {
    const tip        = document.getElementById('sticker-pending-tip');
    const clickLayer = document.getElementById('proxy-click-layer');
    if (tip) tip.style.display = pendingSticker ? 'block' : 'none';
    if (clickLayer) {
      clickLayer.style.pointerEvents = pendingSticker ? 'auto' : 'none';
      clickLayer.style.cursor        = pendingSticker ? 'crosshair' : 'default';
    }
    document.querySelectorAll('.sticker-thumb').forEach(t => {
      const isPending = pendingSticker && t.dataset.path === pendingSticker.path;
      t.style.outline       = isPending ? '2px solid #e53e3e' : '';
      t.style.outlineOffset = isPending ? '2px' : '';
      t.style.background    = isPending ? 'rgba(229,62,62,0.12)' : '';
    });
  }

  /* ══════════════════════════════════════════════════════════════
     自动保存（防抖 800ms）
  ══════════════════════════════════════════════════════════════ */
  function autoSave() {
    clearTimeout(_autoSaveTimer);
    _autoSaveTimer = setTimeout(() => saveStickers(false), 800);
  }

  /* ══════════════════════════════════════════════════════════════
     保存贴纸到后端
  ══════════════════════════════════════════════════════════════ */
  async function saveStickers(regenerate = true) {
    if (!currentStudent) return;
    const btn = document.getElementById('btn-save-stickers');
    if (btn) { btn.disabled = true; btn.textContent = '保存中…'; }

    try {
      await API.saveStudentStickers(currentStudent.id, stickers);
      if (regenerate) {
        setTimeout(() => {
          // 重新初始化预览（确保 session 注入）
          initPreview();
        }, 500);
      }
      if (btn) { btn.textContent = '✓ 已保存'; setTimeout(() => { if (btn) { btn.disabled = false; btn.textContent = '保存并生成页面'; } }, 1500); }
    } catch(err) {
      console.error('保存失败', err);
      if (btn) { btn.disabled = false; btn.textContent = '保存并生成页面'; }
      alert('保存失败：' + (err.message || err));
    }
  }

  /* ══════════════════════════════════════════════════════════════
     D-Pad 方向键移动
  ══════════════════════════════════════════════════════════════ */
  function moveStickerByStep(dx, dy) {
    if (selectedIdx < 0) return;
    const s = stickers[selectedIdx];
    if (!s) return;
    const board = document.getElementById('proxy-board');
    if (!board) return;
    const W = board.offsetWidth;
    const H = board.offsetHeight;
    let l = parseFloat(s.left) / 100 * W + dx * step;
    let t = parseFloat(s.top)  / 100 * H + dy * step;
    l = Math.max(0, Math.min(W, l));
    t = Math.max(0, Math.min(H, t));
    s.left = (l / W * 100).toFixed(2) + '%';
    s.top  = (t / H * 100).toFixed(2) + '%';
    const el = document.querySelector(`#proxy-sticker-layer .proxy-sticker[data-idx="${selectedIdx}"]`);
    if (el) { el.style.left = s.left; el.style.top = s.top; }
    showCoord(s);
    syncPreviewStickers();
    autoSave();
  }

  /* ══════════════════════════════════════════════════════════════
     事件绑定
  ══════════════════════════════════════════════════════════════ */
  function bindEvents() {
    /* 格子板：点击放置（通过 proxy-click-layer） */
    const clickLayer = document.getElementById('proxy-click-layer');
    if (clickLayer) {
      clickLayer.addEventListener('click', (e) => {
        if (selectedIdx >= 0) { deselectAll(); return; }
        if (pendingSticker) placeSticker(e);
      });
      clickLayer.addEventListener('touchend', (e) => {
        e.preventDefault();
        if (selectedIdx >= 0) { deselectAll(); return; }
        if (pendingSticker) placeSticker(e);
      }, { passive: false });
    }

    /* 格子板背景点击（非贴纸区域） */
    const board = document.getElementById('proxy-board');
    if (board) {
      board.addEventListener('click', (e) => {
        if (e.target === board || e.target.id === 'proxy-sticker-layer' || e.target.id === 'proxy-grid-canvas') {
          if (selectedIdx >= 0) { deselectAll(); return; }
          if (pendingSticker) placeSticker(e);
        }
      });

      // ★ v12: 映射板空白区域触摸 → 触控板滚动模式
      board.addEventListener('touchstart', (e) => {
        // 只在空白区域（非贴纸）触发
        const target = e.target;
        if (target.closest('.proxy-sticker') || target.closest('.proxy-handle')) return;

        if (e.touches.length !== 1) return;

        // 如果有待放置贴纸，则放置
        if (pendingSticker) {
          e.preventDefault();
          placeSticker(e);
          return;
        }

        // 如果有选中贴纸，取消选中
        if (selectedIdx >= 0) {
          e.preventDefault();
          deselectAll();
          return;
        }

        // ★ 触控板滚动模式
        e.preventDefault();
        startTrackpadScroll(e);
      }, { passive: false });
    }

    /* 贴纸库：点击选中待放置 */
    const lib = document.getElementById('sticker-library');
    if (lib) {
      lib.addEventListener('click', (e) => {
        const delBtn = e.target.closest('.sticker-del-btn');
        if (delBtn) {
          e.stopPropagation();
          const fn = delBtn.dataset.filename;
          if (fn && confirm('从贴纸库删除 ' + fn + '？')) {
            API.deleteSticker(fn).then(() => {
              allStickerFiles = allStickerFiles.filter(s => s.filename !== fn);
              const libEl = document.getElementById('sticker-library');
              if (libEl) libEl.innerHTML = renderLibraryHTML();
            }).catch(err => alert('删除失败：' + err.message));
          }
          return;
        }
        const thumb = e.target.closest('.sticker-thumb');
        if (!thumb) return;
        const path = thumb.dataset.path;
        const fn   = thumb.dataset.filename;
        if (pendingSticker && pendingSticker.path === path) {
          pendingSticker = null;
        } else {
          pendingSticker = { path, filename: fn };
          deselectAll();
        }
        updatePendingTip();
      });
    }

    /* 刷新贴纸库 */
    const btnRefresh = document.getElementById('btn-refresh-stickers');
    if (btnRefresh) {
      btnRefresh.addEventListener('click', async () => {
        try {
          const data = await API.getStickers();
          allStickerFiles = data.stickers || [];
          const libEl = document.getElementById('sticker-library');
          if (libEl) libEl.innerHTML = renderLibraryHTML();
        } catch(e) { alert('刷新失败'); }
      });
    }

    /* 取消选中 */
    const btnDeselect = document.getElementById('btn-deselect-sticker');
    if (btnDeselect) btnDeselect.addEventListener('click', deselectAll);

    /* 删除选中贴纸 */
    const btnRemove = document.getElementById('btn-remove-sticker');
    if (btnRemove) btnRemove.addEventListener('click', removeSelectedSticker);

    /* 保存 */
    const btnSave = document.getElementById('btn-save-stickers');
    if (btnSave) btnSave.addEventListener('click', () => saveStickers(true));

    /* 动画效果 */
    const animSel = document.getElementById('sticker-anim-select');
    if (animSel) {
      animSel.addEventListener('change', () => {
        if (selectedIdx < 0) return;
        stickers[selectedIdx].animClass = animSel.value;
        renderProxyBoard();
        autoSave();
      });
    }

    /* 宽度滑块 */
    const wRange = document.getElementById('sticker-width-range');
    const wVal   = document.getElementById('sticker-width-val');
    if (wRange) {
      wRange.addEventListener('input', () => {
        const v = parseInt(wRange.value, 10);
        if (wVal) wVal.textContent = v + 'px';
        if (selectedIdx >= 0) {
          stickers[selectedIdx].width = v + 'px';
          const el = document.querySelector(`#proxy-sticker-layer .proxy-sticker[data-idx="${selectedIdx}"]`);
          if (el) el.style.width = stickerWidthToPct(v + 'px') + '%';
        }
      });
      wRange.addEventListener('change', () => {
        if (selectedIdx >= 0) { renderProxyBoard(); autoSave(); }
      });
    }

    /* 旋转滑块 */
    const rRange = document.getElementById('sticker-rotate-range');
    const rVal   = document.getElementById('sticker-rotate-val');
    if (rRange) {
      rRange.addEventListener('input', () => {
        const v = parseInt(rRange.value, 10);
        if (rVal) rVal.textContent = v + 'deg';
        if (selectedIdx >= 0) {
          stickers[selectedIdx].rotate = v + 'deg';
          const el = document.querySelector(`#proxy-sticker-layer .proxy-sticker[data-idx="${selectedIdx}"]`);
          if (el) el.style.transform = `rotate(${v}deg) translateZ(0)`;
        }
      });
      rRange.addEventListener('change', () => {
        if (selectedIdx >= 0) { renderProxyBoard(); autoSave(); }
      });
    }

    /* D-Pad 按钮 */
    document.querySelectorAll('.dpad-btn[data-dx]').forEach(btn => {
      const dx = parseInt(btn.dataset.dx, 10);
      const dy = parseInt(btn.dataset.dy, 10);
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        moveStickerByStep(dx, dy);
        _keyHoldTimer = setTimeout(() => {
          _keyHoldInterval = setInterval(() => moveStickerByStep(dx, dy), 80);
        }, 400);
      });
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        moveStickerByStep(dx, dy);
        _keyHoldTimer = setTimeout(() => {
          _keyHoldInterval = setInterval(() => moveStickerByStep(dx, dy), 80);
        }, 400);
      }, { passive: false });
      const stopHold = () => { clearTimeout(_keyHoldTimer); clearInterval(_keyHoldInterval); };
      btn.addEventListener('mouseup',    stopHold);
      btn.addEventListener('mouseleave', stopHold);
      btn.addEventListener('touchend',   stopHold);
      btn.addEventListener('touchcancel',stopHold);
    });

    /* 步长按钮 */
    document.querySelectorAll('.step-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        step = parseInt(btn.dataset.step, 10);
        document.querySelectorAll('.step-btn').forEach(b => {
          b.classList.toggle('btn-primary',   parseInt(b.dataset.step) === step);
          b.classList.toggle('btn-secondary', parseInt(b.dataset.step) !== step);
        });
      });
    });

    /* 键盘方向键 */
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      if (_keyState[e.key]) return;
      _keyState[e.key] = true;
      const map = { ArrowUp:[0,-1], ArrowDown:[0,1], ArrowLeft:[-1,0], ArrowRight:[1,0] };
      if (map[e.key]) {
        e.preventDefault();
        const [dx, dy] = map[e.key];
        moveStickerByStep(dx, dy);
        _keyHoldTimer = setTimeout(() => {
          _keyHoldInterval = setInterval(() => moveStickerByStep(dx, dy), 80);
        }, 400);
      }
      if (e.key === 'Escape') { deselectAll(); pendingSticker = null; updatePendingTip(); }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIdx >= 0) {
        e.preventDefault();
        removeSelectedSticker();
      }
    });
    document.addEventListener('keyup', (e) => {
      _keyState[e.key] = false;
      clearTimeout(_keyHoldTimer);
      clearInterval(_keyHoldInterval);
    });

    /* 网格显示开关 */
    const gridShow = document.getElementById('grid-show-toggle');
    if (gridShow) {
      gridShow.addEventListener('change', () => {
        _gridEnabled = gridShow.checked;
        const c = document.getElementById('proxy-grid-canvas');
        if (c) c.style.display = _gridEnabled ? 'block' : 'none';
        if (_gridEnabled) drawProxyGrid();
      });
    }

    /* 网格吸附开关 */
    const gridSnap = document.getElementById('grid-snap-toggle');
    if (gridSnap) gridSnap.addEventListener('change', () => { _gridSnap = gridSnap.checked; });

    /* 网格列数 */
    const gridCols = document.getElementById('grid-cols-input');
    if (gridCols) gridCols.addEventListener('change', () => {
      _gridCols = Math.max(4, Math.min(50, parseInt(gridCols.value) || 20));
      if (_gridEnabled) drawProxyGrid();
    });

    /* 网格行数 */
    const gridRows = document.getElementById('grid-rows-input');
    if (gridRows) gridRows.addEventListener('change', () => {
      _gridRows = Math.max(4, Math.min(100, parseInt(gridRows.value) || 40));
      if (_gridEnabled) drawProxyGrid();
    });

    /* ResizeObserver */
    const proxyBoard = document.getElementById('proxy-board');
    if (proxyBoard && window.ResizeObserver) {
      const ro = new ResizeObserver(() => { if (_gridEnabled) drawProxyGrid(); });
      ro.observe(proxyBoard);
    }

    /* PC: 映射板鼠标滚轮 → 预览滚动 */
    const scrollWrap = document.getElementById('proxy-scroll-wrap');
    if (scrollWrap) {
      scrollWrap.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.05 : -0.05;
        _trackpadScrollY = Math.max(0, Math.min(1, _trackpadScrollY + delta));
        updatePreviewScroll();
        updateScrollIndicator();
      }, { passive: false });
    }
  }

  /* ══════════════════════════════════════════════════════════════
     工具函数
  ══════════════════════════════════════════════════════════════ */
  function parseSizeToPx(val) {
    if (!val) return 60;
    const n = parseFloat(val);
    return isNaN(n) ? 60 : n;
  }

  function getTouchDist(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /* ══════════════════════════════════════════════════════════════
     外部接口（供 app.js 调用）
  ══════════════════════════════════════════════════════════════ */
  function bindSelect(selectEl) {
    if (!selectEl) selectEl = document.getElementById('sticker-student-select');
    if (!selectEl) return;
    if (selectEl._stickerBound) return;
    selectEl._stickerBound = true;
    selectEl.addEventListener('change', function() {
      if (selectEl.value) load(selectEl.value);
    });
    if (selectEl.value) load(selectEl.value);
  }

  function refreshLibrary() {
    API.getStickers().then(data => {
      allStickerFiles = data.stickers || [];
      const libEl = document.getElementById('sticker-library');
      if (libEl) libEl.innerHTML = renderLibraryHTML();
    }).catch(() => {});
  }

  return { load, bindSelect, refreshLibrary };

})();
