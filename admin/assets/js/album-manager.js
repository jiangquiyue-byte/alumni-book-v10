/**
 * 同学录后台 · 班级相册管理模块
 * admin/assets/js/album-manager.js
 *
 * 新增功能：长按拖动调整照片顺序（PC鼠标 + 移动端触摸）
 */
const AlbumManager = (() => {
  let photos = [];
  let sortMode = false;       // 是否处于排序模式
  let dragSrcIdx = null;      // 拖拽源索引
  let dragEl = null;          // 正在拖拽的 DOM 元素
  let ghostEl = null;         // 拖拽幽灵元素
  let longPressTimer = null;  // 长按计时器
  let isDragging = false;     // 是否正在拖拽中

  const FRAME_LABELS = { retro: '🖼 复古木框', polaroid: '📸 拍立得白框', film: '🎞 胶片黑框', none: '⬜ 无框' };
  const FRAME_ICONS  = { retro: '🖼', polaroid: '📸', film: '🎞', none: '⬜' };

  // ── 加载相册 ─────────────────────────────────
  async function load() {
    try {
      const data = await API.getAlbum();
      photos = data.photos || [];
      renderGrid();
      const el = document.getElementById('stat-album');
      if (el) el.textContent = photos.length;
    } catch(e) {
      Toast.error('加载相册失败: ' + e.message);
    }
  }

  // ── 渲染照片网格 ──────────────────────────────
  function renderGrid() {
    const wrap = document.getElementById('album-grid-wrap');
    if (!wrap) return;

    if (!photos.length) {
      wrap.innerHTML = '<div class="empty-state"><span class="icon">📷</span><p>暂无班级相册照片<br>点击右上角「上传照片」添加</p></div>';
      return;
    }

    // 排序模式提示条
    const sortHint = sortMode
      ? `<div id="sort-hint-bar" style="
            background:linear-gradient(135deg,rgba(201,168,76,0.18),rgba(201,168,76,0.08));
            border:1px solid rgba(201,168,76,0.4);
            border-radius:8px;padding:10px 16px;margin-bottom:12px;
            display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
          <span style="font-size:13px;color:var(--gold);">
            🔀 排序模式：长按照片拖动调整顺序
          </span>
          <div style="display:flex;gap:8px;">
            <button class="btn btn-primary btn-sm" id="btn-save-order">💾 保存顺序</button>
            <button class="btn btn-secondary btn-sm" id="btn-cancel-sort">✕ 取消</button>
          </div>
        </div>`
      : `<div style="display:flex;justify-content:flex-end;margin-bottom:8px;">
           <button class="btn btn-secondary btn-sm" id="btn-enter-sort" style="font-size:12px;">
             🔀 调整顺序
           </button>
         </div>`;

    wrap.innerHTML = sortHint + `
      <div class="album-grid" id="album-grid">
        ${photos.map((p, idx) => {
          const frame = p.frame || 'none';
          return `
          <div class="album-item ${p.wide?'wide':''} ${p.tall?'tall':''} ${sortMode?'sortable-item':''}"
               data-idx="${idx}" data-file="${p.file}"
               style="${sortMode ? 'cursor:grab;user-select:none;' : ''}">
            <img src="/album/photos/${p.file}" alt="${p.caption || ''}" draggable="false">
            ${sortMode
              ? `<div class="album-sort-overlay" style="
                    position:absolute;inset:0;background:rgba(0,0,0,0.35);
                    display:flex;align-items:center;justify-content:center;
                    border-radius:inherit;pointer-events:none;">
                   <span style="font-size:22px;opacity:0.8;">⠿</span>
                 </div>`
              : `<div class="album-item-overlay">
                   <button class="btn btn-secondary btn-sm" data-action="edit"   data-idx="${idx}">编辑</button>
                   <button class="btn btn-danger  btn-sm" data-action="delete" data-idx="${idx}">删除</button>
                 </div>`
            }
            ${p.caption ? `<div class="album-item-caption">${p.caption}</div>` : ''}
            <div style="position:absolute;top:4px;right:4px;font-size:13px;line-height:1;"
                 title="${FRAME_LABELS[frame]||frame}">${FRAME_ICONS[frame]||''}</div>
            ${sortMode ? `<div style="position:absolute;top:4px;left:4px;background:rgba(0,0,0,0.5);
                              color:rgba(201,168,76,0.9);font-size:11px;padding:2px 5px;border-radius:3px;
                              font-family:monospace;">${idx+1}</div>` : ''}
          </div>
        `}).join('')}
      </div>
    `;

    // 绑定编辑/删除按钮（非排序模式）
    if (!sortMode) {
      document.querySelectorAll('[data-action][data-idx]').forEach(btn => {
        btn.addEventListener('click', e => {
          e.stopPropagation();
          const idx = parseInt(btn.dataset.idx);
          if (btn.dataset.action === 'delete') confirmDeletePhoto(idx);
          if (btn.dataset.action === 'edit')   openEditModal(idx);
        });
      });

      // 绑定进入排序模式按钮
      document.getElementById('btn-enter-sort')?.addEventListener('click', () => {
        sortMode = true;
        renderGrid();
      });
    } else {
      // 排序模式：绑定保存/取消
      document.getElementById('btn-save-order')?.addEventListener('click', saveOrder);
      document.getElementById('btn-cancel-sort')?.addEventListener('click', () => {
        sortMode = false;
        load(); // 重新加载，放弃未保存的排序
      });

      // 绑定拖拽事件
      bindSortDrag();
    }
  }

  // ── 拖拽排序绑定 ──────────────────────────────
  function bindSortDrag() {
    const grid = document.getElementById('album-grid');
    if (!grid) return;

    const items = grid.querySelectorAll('.sortable-item');

    items.forEach(item => {
      // ── PC 鼠标：长按 300ms 触发拖拽 ──
      item.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return; // 只响应左键
        const idx = parseInt(item.dataset.idx);
        longPressTimer = setTimeout(() => {
          startDrag(e.clientX, e.clientY, idx, item);
        }, 300);
      });

      item.addEventListener('mouseup', () => {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      });

      item.addEventListener('mouseleave', () => {
        if (!isDragging) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
      });

      // ── 移动端触摸：长按 300ms 触发拖拽 ──
      item.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        const idx = parseInt(item.dataset.idx);
        longPressTimer = setTimeout(() => {
          e.preventDefault();
          startDrag(touch.clientX, touch.clientY, idx, item);
        }, 300);
      }, { passive: true });

      item.addEventListener('touchend', () => {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      });

      item.addEventListener('touchcancel', () => {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      });
    });

    // ── 全局鼠标移动/松开 ──
    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup', onDragEnd);

    // ── 全局触摸移动/结束 ──
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
  }

  // ── 开始拖拽 ──────────────────────────────────
  function startDrag(clientX, clientY, idx, el) {
    isDragging = true;
    dragSrcIdx = idx;
    dragEl = el;

    // 创建幽灵元素跟随鼠标
    ghostEl = el.cloneNode(true);
    const rect = el.getBoundingClientRect();
    ghostEl.style.cssText = `
      position:fixed;
      width:${rect.width}px;
      height:${rect.height}px;
      left:${rect.left}px;
      top:${rect.top}px;
      opacity:0.75;
      pointer-events:none;
      z-index:9999;
      border-radius:8px;
      box-shadow:0 8px 32px rgba(0,0,0,0.5);
      transform:scale(1.05);
      transition:transform 0.1s;
      cursor:grabbing;
    `;
    document.body.appendChild(ghostEl);

    // 原元素半透明
    el.style.opacity = '0.3';
    el.style.cursor = 'grabbing';

    // 记录偏移
    ghostEl._offsetX = clientX - rect.left;
    ghostEl._offsetY = clientY - rect.top;
  }

  // ── 拖拽移动（鼠标）──────────────────────────
  function onDragMove(e) {
    if (!isDragging || !ghostEl) return;
    moveGhost(e.clientX, e.clientY);
    updateDropTarget(e.clientX, e.clientY);
  }

  // ── 拖拽移动（触摸）──────────────────────────
  function onTouchMove(e) {
    if (!isDragging || !ghostEl) return;
    e.preventDefault();
    const touch = e.touches[0];
    moveGhost(touch.clientX, touch.clientY);
    updateDropTarget(touch.clientX, touch.clientY);
  }

  // ── 移动幽灵元素 ──────────────────────────────
  function moveGhost(clientX, clientY) {
    ghostEl.style.left = (clientX - ghostEl._offsetX) + 'px';
    ghostEl.style.top  = (clientY - ghostEl._offsetY) + 'px';
  }

  // ── 更新目标位置（实时重排）────────────────────
  function updateDropTarget(clientX, clientY) {
    const grid = document.getElementById('album-grid');
    if (!grid) return;

    const items = [...grid.querySelectorAll('.sortable-item')];
    let targetIdx = null;

    for (let i = 0; i < items.length; i++) {
      if (items[i] === dragEl) continue;
      const rect = items[i].getBoundingClientRect();
      const midX = rect.left + rect.width / 2;
      const midY = rect.top  + rect.height / 2;
      // 判断鼠标是否在该元素中心附近
      if (clientX > rect.left && clientX < rect.right &&
          clientY > rect.top  && clientY < rect.bottom) {
        targetIdx = parseInt(items[i].dataset.idx);
        break;
      }
    }

    if (targetIdx !== null && targetIdx !== dragSrcIdx) {
      // 实时重排 photos 数组
      const moved = photos.splice(dragSrcIdx, 1)[0];
      photos.splice(targetIdx, 0, moved);
      dragSrcIdx = targetIdx;

      // 重新渲染（保持排序模式，不重置 isDragging）
      const wrap = document.getElementById('album-grid-wrap');
      if (!wrap) return;

      // 仅重新渲染网格内容，不重绑全局事件
      const grid2 = document.getElementById('album-grid');
      if (grid2) {
        grid2.innerHTML = photos.map((p, idx) => {
          const frame = p.frame || 'none';
          return `
          <div class="album-item ${p.wide?'wide':''} ${p.tall?'tall':''} sortable-item"
               data-idx="${idx}" data-file="${p.file}"
               style="cursor:grab;user-select:none;${idx === dragSrcIdx ? 'opacity:0.3;' : ''}">
            <img src="/album/photos/${p.file}" alt="${p.caption || ''}" draggable="false">
            <div class="album-sort-overlay" style="
                position:absolute;inset:0;background:rgba(0,0,0,0.35);
                display:flex;align-items:center;justify-content:center;
                border-radius:inherit;pointer-events:none;">
               <span style="font-size:22px;opacity:0.8;">⠿</span>
            </div>
            ${p.caption ? `<div class="album-item-caption">${p.caption}</div>` : ''}
            <div style="position:absolute;top:4px;right:4px;font-size:13px;line-height:1;"
                 title="${FRAME_LABELS[frame]||frame}">${FRAME_ICONS[frame]||''}</div>
            <div style="position:absolute;top:4px;left:4px;background:rgba(0,0,0,0.5);
                        color:rgba(201,168,76,0.9);font-size:11px;padding:2px 5px;border-radius:3px;
                        font-family:monospace;">${idx+1}</div>
          </div>
        `}).join('');

        // 重新绑定拖拽（仅 grid 内部元素）
        const newItems = grid2.querySelectorAll('.sortable-item');
        newItems.forEach(item => {
          item.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            const idx = parseInt(item.dataset.idx);
            longPressTimer = setTimeout(() => {
              startDrag(e.clientX, e.clientY, idx, item);
            }, 300);
          });
          item.addEventListener('mouseup', () => { clearTimeout(longPressTimer); });
          item.addEventListener('mouseleave', () => { if (!isDragging) clearTimeout(longPressTimer); });
          item.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            const idx = parseInt(item.dataset.idx);
            longPressTimer = setTimeout(() => {
              e.preventDefault();
              startDrag(touch.clientX, touch.clientY, idx, item);
            }, 300);
          }, { passive: true });
          item.addEventListener('touchend', () => { clearTimeout(longPressTimer); });
        });

        // 更新 dragEl 引用
        dragEl = grid2.querySelector(`.sortable-item[data-idx="${dragSrcIdx}"]`);
      }
    }
  }

  // ── 结束拖拽（鼠标）──────────────────────────
  function onDragEnd(e) {
    if (!isDragging) return;
    endDrag();
  }

  // ── 结束拖拽（触摸）──────────────────────────
  function onTouchEnd(e) {
    if (!isDragging) return;
    endDrag();
  }

  // ── 清理拖拽状态 ──────────────────────────────
  function endDrag() {
    isDragging = false;

    if (ghostEl) {
      ghostEl.remove();
      ghostEl = null;
    }
    if (dragEl) {
      dragEl.style.opacity = '';
      dragEl.style.cursor = 'grab';
      dragEl = null;
    }

    dragSrcIdx = null;

    // 移除全局事件监听（避免重复绑定）
    document.removeEventListener('mousemove', onDragMove);
    document.removeEventListener('mouseup', onDragEnd);
    document.removeEventListener('touchmove', onTouchMove);
    document.removeEventListener('touchend', onTouchEnd);

    // 重新渲染以更新序号
    renderGrid();
  }

  // ── 保存排序 ──────────────────────────────────
  async function saveOrder() {
    const btn = document.getElementById('btn-save-order');
    if (btn) { btn.disabled = true; btn.textContent = '保存中...'; }
    try {
      await API.updateAlbum(photos);
      sortMode = false;
      Toast.success('照片顺序已保存');
      load();
    } catch(e) {
      Toast.error('保存失败: ' + e.message);
      if (btn) { btn.disabled = false; btn.textContent = '💾 保存顺序'; }
    }
  }

  // ── 删除照片 ──────────────────────────────────
  async function confirmDeletePhoto(idx) {
    const p = photos[idx];
    if (!p) return;
    if (!confirm(`删除照片「${p.caption || p.file}」？同时删除文件？`)) return;
    try {
      await API.deleteAlbumPhoto(p.file, true);
      Toast.success('照片已删除');
      load();
    } catch(e) {
      Toast.error('删除失败: ' + e.message);
    }
  }

  // ── 编辑照片 Modal ────────────────────────────
  function openEditModal(idx) {
    const p = photos[idx];
    if (!p) return;
    document.getElementById('edit-photo-idx').value   = idx;
    document.getElementById('edit-photo-thumb').src   = `/album/photos/${p.file}`;
    document.getElementById('edit-photo-filename').textContent = p.file;
    document.getElementById('edit-photo-caption').value = p.caption || '';
    const frameEl = document.getElementById('edit-photo-frame');
    if (frameEl) frameEl.value = p.frame || 'none';
    const ratioEl = document.getElementById('edit-photo-ratio');
    if (ratioEl) ratioEl.value = p.wide ? 'wide' : p.tall ? 'tall' : 'normal';
    Modal.open('modal-album-edit');
  }

  async function saveEdit() {
    const idx     = parseInt(document.getElementById('edit-photo-idx').value);
    const caption = document.getElementById('edit-photo-caption').value.trim();
    const frame   = document.getElementById('edit-photo-frame')?.value || 'none';
    const ratio   = document.getElementById('edit-photo-ratio')?.value || 'normal';
    if (isNaN(idx) || !photos[idx]) return;

    photos[idx].caption = caption;
    photos[idx].frame   = frame;
    photos[idx].wide    = (ratio === 'wide');
    photos[idx].tall    = (ratio === 'tall');

    const btn = document.getElementById('btn-confirm-album-edit');
    btnLoading(btn, true);
    try {
      await API.updateAlbum(photos);
      Modal.close('modal-album-edit');
      Toast.success('照片信息已更新');
      load();
    } catch(e) {
      Toast.error('保存失败: ' + e.message);
    } finally {
      btnLoading(btn, false);
    }
  }

  // ── 上传并添加照片 ────────────────────────────
  async function uploadAndAdd() {
    const fileInput = document.getElementById('album-file-input');
    const file = fileInput?.files[0];
    if (!file) { Toast.warning('请先选择照片'); return; }

    const caption = document.getElementById('album-photo-caption')?.value.trim() || '';
    const frame   = document.getElementById('album-frame')?.value   || 'none';
    const ratio   = document.getElementById('album-ratio-select')?.value || 'normal';

    const btn = document.getElementById('btn-confirm-album-upload');
    const modalBody = document.querySelector('#modal-album-upload .modal-body');
    const res = await doUploadWithProgress({
      type: 'album', file, extraData: { name: caption || '' }, btn,
      progressContainer: modalBody,
      successMsg: '照片上传成功',
    });
    if (!res) return;
    try {
      await API.addAlbumPhoto({
        file:    res.filename,
        caption,
        wide:    (ratio === 'wide'),
        tall:    (ratio === 'tall'),
        frame,
      });
      Modal.close('modal-album-upload');
      Toast.success('照片已添加到班级相册');
      fileInput.value = '';
      const prev = document.getElementById('album-preview');
      if (prev) prev.classList.remove('show');
      document.getElementById('album-photo-caption').value = '';
      document.getElementById('album-frame').value = 'none';
      document.getElementById('album-ratio-select').value = 'normal';
      load();
    } catch(e) {
      Toast.error('添加记录失败: ' + e.message);
    }
  }

  // ── 绑定事件 ──────────────────────────────────
  function bindUpload() {
    const albumFileInput = document.getElementById('album-file-input');
    albumFileInput?.addEventListener('change', () => {
      const file = albumFileInput.files[0];
      if (file) previewImage(file, document.getElementById('album-preview'));
    });
    const albumUploadArea = document.getElementById('album-upload-area');
    if (albumUploadArea) initDropZone(albumUploadArea);
    document.getElementById('btn-confirm-album-upload')?.addEventListener('click', uploadAndAdd);
    document.getElementById('btn-confirm-album-edit')?.addEventListener('click', saveEdit);
    document.getElementById('btn-album-add')?.addEventListener('click', () => Modal.open('modal-album-upload'));
  }

  // 空函数：保持 app.js 调用兼容
  async function loadClassmates() {}

  return { load, bindUpload, loadClassmates };
})();
