/**
 * 同学录后台 · 背景管理模块
 * admin/assets/js/background.js
 */
const BackgroundEditor = (() => {
  let currentId = null;

  const PRESET_COLORS = [
    '#f5e6d0','#e8d5b7','#d4e8d7','#d0dff5',
    '#f5d0d0','#e8d0f5','#f5f0d0','#d0f5f5',
    '#2a1506','#1a2035','#0f2418','#1a1a2e',
  ];

  // 裁剪状态（仅前端预览用，上传后由服务器保存原图）
  let _cropState = {
    active: false,
    startX: 0, startY: 0,
    x: 0, y: 0, w: 0, h: 0,
    dragging: false,
    resizing: false,
    resizeHandle: '',
    imgW: 0, imgH: 0,
    // 已确认的裁剪区域（0~1比例）
    confirmed: null,
  };

  function renderEditor(student) {
    const wrap = document.getElementById('bg-editor-wrap');
    if (!wrap) return;
    const bg        = student.background || {};
    const bgType    = bg.type     || 'default';
    const bgSrc     = bg.src      || '';
    const bgColor   = bg.color    || '#f5e6d0';
    const bgPos     = bg.position || 'center center';
    const bgOpacity = bg.opacity  !== undefined ? bg.opacity : 1;
    const bgRotate  = bg.rotate   !== undefined ? bg.rotate  : 0;
    const bgScaleX  = bg.scaleX   !== undefined ? bg.scaleX  : 1;
    const bgScaleY  = bg.scaleY   !== undefined ? bg.scaleY  : 1;

    // 预览框：竖屏比例 9:16，最大高度 480px
    const previewStyle = `
      width:100%; max-width:270px; margin:0 auto;
      aspect-ratio:9/16; border-radius:10px; overflow:hidden;
      border:1px solid var(--border); position:relative;
      background: url('data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2220%22 height=%2220%22><rect width=%2210%22 height=%2210%22 fill=%22%23ddd%22/><rect x=%2210%22 y=%2210%22 width=%2210%22 height=%2210%22 fill=%22%23ddd%22/></svg>');
    `;

    // 背景图变换 CSS
    const bgTransform = `rotate(${bgRotate}deg) scaleX(${bgScaleX}) scaleY(${bgScaleY})`;

    wrap.innerHTML = `
      <!-- 实时预览框（竖屏） -->
      <div class="card" style="margin-bottom:16px;">
        <div class="card-header"><span class="card-title">实时预览（竖屏）</span></div>
        <div class="card-body" style="padding:12px;display:flex;justify-content:center;">
          <div id="bg-preview" style="${previewStyle}">
            ${bgType === 'image' && bgSrc
              ? `<div id="bg-preview-inner" style="position:absolute;inset:0;background-image:url('/${bgSrc}');background-size:cover;background-position:${bgPos};opacity:${bgOpacity};transform:${bgTransform};transform-origin:center center;"></div>`
              : bgType === 'color' && bgColor
              ? `<div id="bg-preview-inner" style="position:absolute;inset:0;background:${bgColor};"></div>`
              : `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:12px;color:#aaa;">默认纸张纹理</div>`
            }
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><span class="card-title">背景类型</span></div>
        <div class="card-body">
          <div class="tabs" id="bg-tabs">
            <button class="tab-btn ${bgType==='default'?'active':''}" data-tab="default">默认纹理</button>
            <button class="tab-btn ${bgType==='image'  ?'active':''}" data-tab="image">上传图片</button>
            <button class="tab-btn ${bgType==='color'  ?'active':''}" data-tab="color">纯色背景</button>
          </div>

          <!-- 默认纹理 -->
          <div class="tab-panel ${bgType==='default'?'active':''}" data-tab="default">
            <p style="font-size:13px;color:var(--text-dim);padding:16px 0;">使用系统默认的复古纸张纹理背景。</p>
            <button class="btn btn-primary" id="btn-bg-default">应用默认背景</button>
          </div>

          <!-- 上传图片 -->
          <div class="tab-panel ${bgType==='image'?'active':''}" data-tab="image">
            <div class="upload-area" style="margin:16px 0;" id="bg-upload-area">
              <input type="file" id="bg-file-input" accept=".jpg,.jpeg,.png,.webp">
              <div class="upload-icon">🖼</div>
              <div class="upload-text">点击或拖拽上传背景图</div>
              <div class="upload-hint">支持 JPG / PNG / WebP，建议分辨率 1920×1080，最大 120MB</div>
            </div>
            <img class="preview-img" id="bg-upload-preview" style="margin-bottom:12px;" alt="">

            ${bgType === 'image' && bgSrc ? `
            <div style="margin-bottom:16px;" id="bg-adjust-section">

              <!-- 透明度 -->
              <label class="form-label" style="margin-bottom:8px;">🌫 背景透明度</label>
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
                <span style="font-size:11px;color:var(--text-muted);width:28px;">透明</span>
                <input type="range" id="bg-opacity" min="10" max="100" value="${Math.round(bgOpacity * 100)}" style="flex:1;accent-color:var(--gold);" oninput="BackgroundEditor.updateOpacity()">
                <span id="bg-opacity-label" style="min-width:36px;font-size:12px;color:var(--gold);text-align:right;">${Math.round(bgOpacity * 100)}%</span>
              </div>

              <!-- 旋转 -->
              <label class="form-label" style="margin-bottom:8px;">🔄 旋转角度</label>
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
                <span style="font-size:11px;color:var(--text-muted);width:28px;">-180°</span>
                <input type="range" id="bg-rotate" min="-180" max="180" value="${bgRotate}" style="flex:1;accent-color:var(--gold);" oninput="BackgroundEditor.updateTransform()">
                <span id="bg-rotate-val" style="min-width:40px;font-size:12px;color:var(--gold);text-align:right;">${bgRotate}°</span>
              </div>

              <!-- 横向倍镜（scaleX） -->
              <label class="form-label" style="margin-bottom:8px;">↔ 横向缩放（倍镜）</label>
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
                <span style="font-size:11px;color:var(--text-muted);width:28px;">0.1×</span>
                <input type="range" id="bg-scale-x" min="10" max="300" value="${Math.round(bgScaleX * 100)}" style="flex:1;accent-color:var(--gold);" oninput="BackgroundEditor.updateTransform()">
                <span id="bg-scale-x-val" style="min-width:40px;font-size:12px;color:var(--gold);text-align:right;">${bgScaleX.toFixed(2)}×</span>
              </div>

              <!-- 纵向倍镜（scaleY） -->
              <label class="form-label" style="margin-bottom:8px;">↕ 纵向缩放（倍镜）</label>
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
                <span style="font-size:11px;color:var(--text-muted);width:28px;">0.1×</span>
                <input type="range" id="bg-scale-y" min="10" max="300" value="${Math.round(bgScaleY * 100)}" style="flex:1;accent-color:var(--gold);" oninput="BackgroundEditor.updateTransform()">
                <span id="bg-scale-y-val" style="min-width:40px;font-size:12px;color:var(--gold);text-align:right;">${bgScaleY.toFixed(2)}×</span>
              </div>

              <!-- 图片位置调整 -->
              <label class="form-label" style="margin-bottom:8px;">📐 图片位置调整</label>
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
                <span style="font-size:11px;color:var(--text-muted);width:28px;">上↕下</span>
                <input type="range" id="bg-pos-y" min="0" max="100" value="${parseInt(bg.posY ?? 50)}" style="flex:1;accent-color:var(--gold);">
                <span id="bg-pos-y-val" style="min-width:36px;font-size:12px;color:var(--gold);text-align:right;">${bg.posY ?? 50}%</span>
              </div>
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
                <span style="font-size:11px;color:var(--text-muted);width:28px;">左↔右</span>
                <input type="range" id="bg-pos-x" min="0" max="100" value="${parseInt(bg.posX ?? 50)}" style="flex:1;accent-color:var(--gold);">
                <span id="bg-pos-x-val" style="min-width:36px;font-size:12px;color:var(--gold);text-align:right;">${bg.posX ?? 50}%</span>
              </div>

              <!-- 裁剪背景 -->
              <label class="form-label" style="margin-bottom:8px;">✂ 裁剪背景</label>
              <div style="margin-bottom:12px;">
                <div id="bg-crop-container" style="position:relative;display:inline-block;width:100%;overflow:hidden;border-radius:6px;border:1px solid var(--border);background:#111;min-height:120px;">
                  <img id="bg-crop-img" src="/${bgSrc}" style="display:block;width:100%;height:auto;user-select:none;-webkit-user-drag:none;" draggable="false" alt="">
                  <div id="bg-crop-overlay" style="position:absolute;inset:0;pointer-events:none;background:rgba(0,0,0,0.45);"></div>
                  <div id="bg-crop-box" style="display:none;position:absolute;border:2px solid var(--gold);box-shadow:0 0 0 9999px rgba(0,0,0,0.5);cursor:move;box-sizing:border-box;">
                    <div class="crop-handle" data-h="nw" style="position:absolute;top:-5px;left:-5px;width:10px;height:10px;background:var(--gold);cursor:nw-resize;"></div>
                    <div class="crop-handle" data-h="ne" style="position:absolute;top:-5px;right:-5px;width:10px;height:10px;background:var(--gold);cursor:ne-resize;"></div>
                    <div class="crop-handle" data-h="sw" style="position:absolute;bottom:-5px;left:-5px;width:10px;height:10px;background:var(--gold);cursor:sw-resize;"></div>
                    <div class="crop-handle" data-h="se" style="position:absolute;bottom:-5px;right:-5px;width:10px;height:10px;background:var(--gold);cursor:se-resize;"></div>
                  </div>
                </div>
                <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">
                  <button class="btn btn-secondary" id="btn-crop-start" style="font-size:12px;padding:5px 12px;">✂ 开始裁剪</button>
                  <button class="btn btn-primary"   id="btn-crop-confirm" style="display:none;font-size:12px;padding:5px 12px;">✔ 确认裁剪</button>
                  <button class="btn btn-secondary" id="btn-crop-cancel"  style="display:none;font-size:12px;padding:5px 12px;">✕ 取消</button>
                  <button class="btn btn-secondary" id="btn-crop-reset"   style="font-size:12px;padding:5px 12px;">↺ 重置裁剪</button>
                </div>
                <div id="bg-crop-hint" style="font-size:11px;color:var(--text-dim);margin-top:6px;">点击「开始裁剪」后，在图片上拖拽选择裁剪区域，再点击「确认裁剪」保存。</div>
              </div>

            </div>
            ` : ''}

            <!-- 上传进度条容器 -->
            <div id="bg-upload-progress-wrap"></div>

            <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
              <button class="btn btn-primary" id="btn-bg-upload">上传并应用</button>
              <button class="btn btn-secondary" id="btn-bg-save-pos" style="${bgType === 'image' && bgSrc ? '' : 'display:none;'}">保存设置</button>
              ${bgType === 'image' && bgSrc ? '<button class="btn btn-danger" id="btn-bg-delete" style="margin-left:auto;">🗑 删除背景</button>' : ''}
            </div>
          </div>

          <!-- 纯色背景 -->
          <div class="tab-panel ${bgType==='color'?'active':''}" data-tab="color">
            <div style="margin:16px 0;">
              <div class="form-label" style="margin-bottom:10px;">预设颜色</div>
              <div class="color-row" id="preset-colors">
                ${PRESET_COLORS.map(col => `
                  <div class="color-dot ${bgColor===col?'selected':''}" data-color="${col}"
                       style="background:${col};" title="${col}"></div>
                `).join('')}
              </div>
            </div>
            <div class="form-group" style="margin-bottom:16px;">
              <label class="form-label">自定义颜色</label>
              <div style="display:flex;gap:10px;align-items:center;">
                <input type="color" id="bg-color-picker" value="${bgColor}" style="width:40px;height:36px;border:none;background:none;cursor:pointer;">
                <input type="text" class="form-control" id="bg-color-text" value="${bgColor}" placeholder="#f5e6d0" style="width:120px;">
              </div>
            </div>
            <div style="display:flex;gap:10px;">
              <button class="btn btn-primary" id="btn-bg-color">应用颜色</button>
              ${bgType === 'color' ? '<button class="btn btn-danger" id="btn-bg-delete" style="margin-left:auto;">🗑 删除背景</button>' : ''}
            </div>
          </div>
        </div>
      </div>
    `;

    initTabs(document.getElementById('bg-editor-wrap'));
    bindBgEvents(student);
  }

  // 从 CSS position 字符串提取 X/Y 百分比
  function getBgPosX(pos) {
    const parts = (pos || 'center center').split(' ');
    const v = parts[0];
    if (v === 'left')   return 0;
    if (v === 'right')  return 100;
    if (v === 'center') return 50;
    return parseInt(v) || 50;
  }
  function getBgPosY(pos) {
    const parts = (pos || 'center center').split(' ');
    const v = parts[1] || parts[0];
    if (v === 'top')    return 0;
    if (v === 'bottom') return 100;
    if (v === 'center') return 50;
    return parseInt(v) || 50;
  }

  // 更新透明度（供 oninput 调用）
  function updateOpacity() {
    const val = document.getElementById('bg-opacity')?.value || 100;
    document.getElementById('bg-opacity-label').textContent = val + '%';
    const inner = document.getElementById('bg-preview-inner');
    if (inner) inner.style.opacity = val / 100;
    // 透明度变化后，自动显示「保存设置」按钮
    const saveBtn = document.getElementById('btn-bg-save-pos');
    if (saveBtn) saveBtn.style.display = '';
  }

   // 更新旋转/缩放变换（供 oninput 调用）
  function updateTransform() {
    const rot    = parseFloat(document.getElementById('bg-rotate')?.value   || 0);
    const scaleX = parseFloat(document.getElementById('bg-scale-x')?.value  || 100) / 100;
    const scaleY = parseFloat(document.getElementById('bg-scale-y')?.value  || 100) / 100;
    const rotVal    = document.getElementById('bg-rotate-val');
    const scaleXVal = document.getElementById('bg-scale-x-val');
    const scaleYVal = document.getElementById('bg-scale-y-val');
    if (rotVal)    rotVal.textContent    = rot + '°';
    if (scaleXVal) scaleXVal.textContent = scaleX.toFixed(2) + '×';
    if (scaleYVal) scaleYVal.textContent = scaleY.toFixed(2) + '×';
    const inner = document.getElementById('bg-preview-inner');
    if (inner) {
      inner.style.transform = `rotate(${rot}deg) scaleX(${scaleX}) scaleY(${scaleY})`;
      inner.style.transformOrigin = 'center center';
    }
    // 旋转/缩放变化后，自动显示「保存设置」按钮
    const saveBtn = document.getElementById('btn-bg-save-pos');
    if (saveBtn) saveBtn.style.display = '';
  }

  // ── 裁剪功能 ──────────────────────────────────────
  function initCropTool() {
    const container = document.getElementById('bg-crop-container');
    const cropImg   = document.getElementById('bg-crop-img');
    const cropBox   = document.getElementById('bg-crop-box');
    const overlay   = document.getElementById('bg-crop-overlay');
    const btnStart  = document.getElementById('btn-crop-start');
    const btnConfirm= document.getElementById('btn-crop-confirm');
    const btnCancel = document.getElementById('btn-crop-cancel');
    const btnReset  = document.getElementById('btn-crop-reset');
    const hint      = document.getElementById('bg-crop-hint');
    if (!container || !cropImg) return;

    // 重置裁剪状态
    _cropState.active = false;
    _cropState.confirmed = null;

    function getContainerRect() {
      return container.getBoundingClientRect();
    }
    function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

    function showCropBox(x, y, w, h) {
      cropBox.style.display = 'block';
      cropBox.style.left   = x + 'px';
      cropBox.style.top    = y + 'px';
      cropBox.style.width  = w + 'px';
      cropBox.style.height = h + 'px';
      overlay.style.display = 'none';
    }

    function hideCropBox() {
      cropBox.style.display = 'none';
      overlay.style.display = '';
    }

    // 开始裁剪
    btnStart?.addEventListener('click', () => {
      _cropState.active = true;
      _cropState.confirmed = null;
      hideCropBox();
      btnStart.style.display   = 'none';
      btnConfirm.style.display = '';
      btnCancel.style.display  = '';
      if (hint) hint.textContent = '在图片上拖拽选择裁剪区域，拖动边角可调整大小。';
      container.style.cursor = 'crosshair';
    });

    // 取消裁剪
    btnCancel?.addEventListener('click', () => {
      _cropState.active = false;
      hideCropBox();
      btnStart.style.display   = '';
      btnConfirm.style.display = 'none';
      btnCancel.style.display  = 'none';
      container.style.cursor   = '';
      if (hint) hint.textContent = '点击「开始裁剪」后，在图片上拖拽选择裁剪区域，再点击「确认裁剪」保存。';
    });

    // 重置裁剪
    btnReset?.addEventListener('click', () => {
      _cropState.confirmed = null;
      hideCropBox();
      _cropState.active = false;
      btnStart.style.display   = '';
      btnConfirm.style.display = 'none';
      btnCancel.style.display  = 'none';
      container.style.cursor   = '';
      if (hint) hint.textContent = '裁剪已重置，背景将使用原始图片。';
      // 更新预览
      const inner = document.getElementById('bg-preview-inner');
      if (inner) {
        inner.style.backgroundSize     = 'cover';
        inner.style.backgroundPosition = 'center center';
      }
    });

    // 确认裁剪
    btnConfirm?.addEventListener('click', () => {
      const imgRect = cropImg.getBoundingClientRect();
      const conRect = getContainerRect();
      const boxL = parseFloat(cropBox.style.left);
      const boxT = parseFloat(cropBox.style.top);
      const boxW = parseFloat(cropBox.style.width);
      const boxH = parseFloat(cropBox.style.height);
      const imgDisplayW = cropImg.offsetWidth;
      const imgDisplayH = cropImg.offsetHeight;

      if (boxW < 10 || boxH < 10) {
        Toast.warning('请先拖拽选择裁剪区域');
        return;
      }

      // 计算裁剪比例（相对于显示图片的比例）
      const cx = boxL / imgDisplayW;
      const cy = boxT / imgDisplayH;
      const cw = boxW / imgDisplayW;
      const ch = boxH / imgDisplayH;

      _cropState.confirmed = { cx, cy, cw, ch };

      // 更新预览：用 background-position + background-size 模拟裁剪效果
      const inner = document.getElementById('bg-preview-inner');
      if (inner) {
        const scaleW = 1 / cw;
        const scaleH = 1 / ch;
        const posX   = -cx * scaleW * 100;
        const posY   = -cy * scaleH * 100;
        inner.style.backgroundSize     = `${scaleW * 100}% ${scaleH * 100}%`;
        inner.style.backgroundPosition = `${posX}% ${posY}%`;
      }

      _cropState.active = false;
      btnStart.style.display   = '';
      btnConfirm.style.display = 'none';
      btnCancel.style.display  = 'none';
      container.style.cursor   = '';
      if (hint) hint.textContent = `✔ 裁剪已确认（${Math.round(cw*100)}% × ${Math.round(ch*100)}%）。点击「保存设置」应用到页面。`;
    });

    // 鼠标拖拽绘制裁剪框
    let dragStartX = 0, dragStartY = 0;
    let isDragging = false;
    let isResizing = false;
    let resizeHandle = '';
    let moveStartX = 0, moveStartY = 0;
    let moveBoxX = 0, moveBoxY = 0;
    let moveBoxW = 0, moveBoxH = 0;

    container.addEventListener('mousedown', e => {
      if (!_cropState.active) return;
      e.preventDefault();
      const rect = container.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      // 检查是否点击了 resize handle
      const handle = e.target.closest('.crop-handle');
      if (handle) {
        isResizing = true;
        resizeHandle = handle.dataset.h;
        moveStartX = mx; moveStartY = my;
        moveBoxX = parseFloat(cropBox.style.left);
        moveBoxY = parseFloat(cropBox.style.top);
        moveBoxW = parseFloat(cropBox.style.width);
        moveBoxH = parseFloat(cropBox.style.height);
        return;
      }

      // 检查是否点击了裁剪框内部（移动）
      if (e.target === cropBox || cropBox.contains(e.target)) {
        isDragging = true;
        moveStartX = mx; moveStartY = my;
        moveBoxX = parseFloat(cropBox.style.left);
        moveBoxY = parseFloat(cropBox.style.top);
        moveBoxW = parseFloat(cropBox.style.width);
        moveBoxH = parseFloat(cropBox.style.height);
        container.style.cursor = 'grabbing';
        return;
      }

      // 新建裁剪框
      dragStartX = mx;
      dragStartY = my;
      showCropBox(mx, my, 0, 0);
    });

    document.addEventListener('mousemove', e => {
      if (!_cropState.active) return;
      const rect = container.getBoundingClientRect();
      const mx = clamp(e.clientX - rect.left, 0, container.offsetWidth);
      const my = clamp(e.clientY - rect.top,  0, container.offsetHeight);
      const maxW = container.offsetWidth;
      const maxH = container.offsetHeight;

      if (isResizing) {
        let nx = moveBoxX, ny = moveBoxY, nw = moveBoxW, nh = moveBoxH;
        const dx = mx - moveStartX;
        const dy = my - moveStartY;
        if (resizeHandle.includes('e')) { nw = clamp(moveBoxW + dx, 20, maxW - nx); }
        if (resizeHandle.includes('s')) { nh = clamp(moveBoxH + dy, 20, maxH - ny); }
        if (resizeHandle.includes('w')) { nx = clamp(moveBoxX + dx, 0, moveBoxX + moveBoxW - 20); nw = moveBoxW - (nx - moveBoxX); }
        if (resizeHandle.includes('n')) { ny = clamp(moveBoxY + dy, 0, moveBoxY + moveBoxH - 20); nh = moveBoxH - (ny - moveBoxY); }
        showCropBox(nx, ny, nw, nh);
        return;
      }

      if (isDragging) {
        const dx = mx - moveStartX;
        const dy = my - moveStartY;
        const nx = clamp(moveBoxX + dx, 0, maxW - moveBoxW);
        const ny = clamp(moveBoxY + dy, 0, maxH - moveBoxH);
        showCropBox(nx, ny, moveBoxW, moveBoxH);
        return;
      }

      if (cropBox.style.display === 'block' && !isDragging && !isResizing) {
        // 正在绘制新框
        const x = Math.min(mx, dragStartX);
        const y = Math.min(my, dragStartY);
        const w = Math.abs(mx - dragStartX);
        const h = Math.abs(my - dragStartY);
        if (w > 5 || h > 5) showCropBox(x, y, w, h);
      }
    });

    document.addEventListener('mouseup', e => {
      if (isResizing) { isResizing = false; return; }
      if (isDragging) { isDragging = false; container.style.cursor = 'crosshair'; return; }
    });

    // 触摸支持
    container.addEventListener('touchstart', e => {
      if (!_cropState.active) return;
      const t = e.touches[0];
      const rect = container.getBoundingClientRect();
      dragStartX = t.clientX - rect.left;
      dragStartY = t.clientY - rect.top;
      showCropBox(dragStartX, dragStartY, 0, 0);
    }, { passive: true });

    container.addEventListener('touchmove', e => {
      if (!_cropState.active) return;
      const t = e.touches[0];
      const rect = container.getBoundingClientRect();
      const mx = clamp(t.clientX - rect.left, 0, container.offsetWidth);
      const my = clamp(t.clientY - rect.top,  0, container.offsetHeight);
      const x = Math.min(mx, dragStartX);
      const y = Math.min(my, dragStartY);
      const w = Math.abs(mx - dragStartX);
      const h = Math.abs(my - dragStartY);
      if (w > 5 || h > 5) showCropBox(x, y, w, h);
    }, { passive: true });
  }

  function bindBgEvents(student) {
    // 默认背景
    document.getElementById('btn-bg-default')?.addEventListener('click', () => {
      saveBg(student.id, { type: 'default', src: '', color: '', position: 'center center', opacity: 1, rotate: 0, scaleX: 1, scaleY: 1 });
    });

    // 图片上传
    const bgFileInput = document.getElementById('bg-file-input');
    bgFileInput?.addEventListener('change', () => {
      const file = bgFileInput.files[0];
      if (!file) return;
      // 显示文件名提示
      const uploadText = document.getElementById('bg-upload-area')?.querySelector('.upload-text');
      if (uploadText) uploadText.textContent = file.name + ' (' + (file.size / 1024 / 1024).toFixed(2) + ' MB)';
      // 显示本地预览
      const reader = new FileReader();
      reader.onload = e => {
        const preview = document.getElementById('bg-preview');
        if (preview) {
          preview.innerHTML = `<div id="bg-preview-inner" style="position:absolute;inset:0;background-image:url('${e.target.result}');background-size:cover;background-position:center center;opacity:1;transform:rotate(0deg) scaleX(1) scaleY(1);transform-origin:center center;"></div>`;
        }
      };
      reader.readAsDataURL(file);
      previewImage(file, document.getElementById('bg-upload-preview'));
    });

    const bgUploadArea = document.getElementById('bg-upload-area');
    if (bgUploadArea) initDropZone(bgUploadArea);

    document.getElementById('btn-bg-upload')?.addEventListener('click', async () => {
      const file = bgFileInput?.files[0];
      if (!file) { Toast.warning('请先选择背景图片'); return; }
      const btn  = document.getElementById('btn-bg-upload');
      const progressWrap = document.getElementById('bg-upload-progress-wrap') || document.getElementById('bg-editor-wrap');
      const res  = await doUploadWithProgress({
        type: 'background', file, studentId: student.id, btn,
        progressContainer: progressWrap,
        successMsg: '背景图上传成功',
      });
      if (!res) return;
      try {
        const x      = document.getElementById('bg-pos-x')?.value    || 50;
        const y      = document.getElementById('bg-pos-y')?.value    || 50;
        const opac   = (document.getElementById('bg-opacity')?.value  || 100) / 100;
        const rot    = parseFloat(document.getElementById('bg-rotate')?.value   || 0);
        const scaleX = parseFloat(document.getElementById('bg-scale-x')?.value  || 100) / 100;
        const scaleY = parseFloat(document.getElementById('bg-scale-y')?.value  || 100) / 100;
        const crop   = _cropState.confirmed || null;
        await saveBg(student.id, {
          type: 'image', src: res.path, color: '',
          posX: x, posY: y,
          position: `${x}% ${y}%`,
          opacity: opac,
          rotate: rot,
          scaleX, scaleY,
          crop,
        });
      } catch(e) {
        Toast.error('保存背景失败: ' + e.message);
      }
    });

    // 图片位置控制
    const posY    = document.getElementById('bg-pos-y');
    const posX    = document.getElementById('bg-pos-x');

    function updatePosPreview() {
      const y = posY?.value ?? 50;
      const x = posX?.value ?? 50;
      if (posY) document.getElementById('bg-pos-y-val').textContent = y + '%';
      if (posX) document.getElementById('bg-pos-x-val').textContent = x + '%';
      const inner = document.getElementById('bg-preview-inner');
      if (inner && !_cropState.confirmed) {
        inner.style.backgroundPosition = x + '% ' + y + '%';
      }
      // 位置变化后，自动显示「保存设置」按钮
      const saveBtn = document.getElementById('btn-bg-save-pos');
      if (saveBtn) saveBtn.style.display = '';
    }
    posY?.addEventListener('input', updatePosPreview);
    posX?.addEventListener('input', updatePosPreview);

    // 保存设置（位置 + 旋转 + 缩放 + 裁剪）
    document.getElementById('btn-bg-save-pos')?.addEventListener('click', async () => {
      const bg     = student.background || {};
      const opac   = (document.getElementById('bg-opacity')?.value   || 100) / 100;
      const rot    = parseFloat(document.getElementById('bg-rotate')?.value    || 0);
      const scaleX = parseFloat(document.getElementById('bg-scale-x')?.value   || 100) / 100;
      const scaleY = parseFloat(document.getElementById('bg-scale-y')?.value   || 100) / 100;
      const x      = posX?.value ?? 50;
      const y      = posY?.value ?? 50;
      const crop   = _cropState.confirmed || bg.crop || null;
      await saveBg(student.id, {
        type:     'image',
        src:      bg.src,
        color:    '',
        posX:     x,
        posY:     y,
        position: `${x}% ${y}%`,
        opacity:  opac,
        rotate:   rot,
        scaleX,
        scaleY,
        crop,
      });
    });

    // 删除背景
    document.getElementById('btn-bg-delete')?.addEventListener('click', async () => {
      const bg = student.background || {};
      const label = bg.type === 'color' ? `颜色背景「${bg.color}」` : `图片背景「${bg.src}」`;
      if (!confirm(`确认删除${label}？将恢复为默认纹理背景。`)) return;
      const btn = document.getElementById('btn-bg-delete');
      if (btn) { btn.disabled = true; btn.textContent = '删除中…'; }
      try {
        await API.updateStudent(student.id, {
          background: { type: 'default', src: '', color: '', position: 'center center', opacity: 1, rotate: 0, scaleX: 1, scaleY: 1 }
        });
        Toast.success('背景已删除，已恢复默认纹理');
        StudentsModule.load();
        load(student.id);
      } catch(e) {
        Toast.error('删除失败: ' + e.message);
        if (btn) { btn.disabled = false; btn.textContent = '🗑 删除背景'; }
      }
    });

    // 颜色选择
    const colorPicker = document.getElementById('bg-color-picker');
    const colorText   = document.getElementById('bg-color-text');
    colorPicker?.addEventListener('input', () => {
      colorText.value = colorPicker.value;
      updateColorPreview(colorPicker.value);
    });
    colorText?.addEventListener('input', () => {
      const v = colorText.value;
      if (/^#[0-9a-fA-F]{6}$/.test(v)) { colorPicker.value = v; updateColorPreview(v); }
    });
    document.querySelectorAll('.color-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        document.querySelectorAll('.color-dot').forEach(d => { d.classList.remove('selected'); });
        dot.classList.add('selected');
        const col = dot.dataset.color;
        colorPicker.value = col; colorText.value = col;
        updateColorPreview(col);
      });
    });
    document.getElementById('btn-bg-color')?.addEventListener('click', () => {
      const color = colorText?.value || colorPicker?.value;
      if (!color) return;
      saveBg(student.id, { type: 'color', src: '', color, position: 'center center', opacity: 1, rotate: 0, scaleX: 1, scaleY: 1 });
    });

    // 初始化裁剪工具
    initCropTool();
  }

  function updateColorPreview(color) {
    const preview = document.getElementById('bg-preview');
    if (preview) preview.innerHTML = `<div id="bg-preview-inner" style="position:absolute;inset:0;background:${color};"></div>`;
  }

  async function saveBg(id, bgData) {
    try {
      await API.updateStudent(id, { background: bgData });
      Toast.success('背景已保存，页面已重新生成');
      StudentsModule.load();
    } catch(e) {
      Toast.error('保存失败: ' + e.message);
    }
  }

  function load(id) {
    currentId = id;
    const student = StudentsModule.getStudent(id);
    if (!student) return;
    const sel = document.getElementById('bg-student-select');
    if (sel) sel.value = id;
    _cropState.confirmed = null;
    renderEditor(student);
  }

  function bindSelect() {
    const sel = document.getElementById('bg-student-select');
    if (!sel) return;
    sel.addEventListener('change', () => { if (sel.value) load(sel.value); });
  }

  // 暴露给 HTML oninput 的全局函数
  return { load, bindSelect, updateOpacity, updateTransform };
})();
