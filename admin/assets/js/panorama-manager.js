/**
 * 同学录后台 · 360° 全景管理模块
 * admin/assets/js/panorama-manager.js
 */
const PanoramaManager = (() => {
  let panoramas = [];

  // ── 加载列表 ─────────────────────────────────
  async function load() {
    try {
      const data = await API.getPanoramas();
      panoramas = data.panoramas || [];
      renderGrid();
    } catch(e) {
      Toast.error('加载全景列表失败: ' + e.message);
    }
  }

  // ── 渲染网格 ──────────────────────────────────
  function renderGrid() {
    const wrap = document.getElementById('pano-grid-wrap');
    if (!wrap) return;

    if (!panoramas.length) {
      wrap.innerHTML = '<div class="empty-state"><span class="icon">🌐</span><p>暂无全景图<br>点击右上角「上传全景图」添加</p></div>';
      return;
    }

    wrap.innerHTML = `<div class="pano-grid">${
      panoramas.map((p, idx) => `
        <div class="pano-card" data-idx="${idx}">
          <div class="pano-thumb">
            <img src="/album/panoramas/${p.file}" alt="${p.title || ''}" loading="lazy">
            <div class="pano-thumb-overlay">
              <button class="btn btn-secondary btn-sm" data-action="edit" data-idx="${idx}">重命名</button>
              <button class="btn btn-danger btn-sm" data-action="delete" data-idx="${idx}">删除</button>
            </div>
            <div class="pano-360-badge">360°</div>
          </div>
          <div class="pano-info">
            <div class="pano-name">${p.title || '未命名场景'}</div>
            <div class="pano-file">${p.file}</div>
          </div>
        </div>
      `).join('')
    }</div>`;

    // 添加 CSS（首次）
    if (!document.getElementById('pano-grid-style')) {
      const style = document.createElement('style');
      style.id = 'pano-grid-style';
      style.textContent = `
        .pano-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
        .pano-card { border-radius: 8px; overflow: hidden; background: var(--bg3); border: 1px solid var(--border); transition: border-color 0.2s; }
        .pano-card:hover { border-color: var(--border2); }
        .pano-thumb { position: relative; aspect-ratio: 2/1; overflow: hidden; }
        .pano-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 0.4s; }
        .pano-card:hover .pano-thumb img { transform: scale(1.04); }
        .pano-thumb-overlay { display: none; position: absolute; inset: 0; background: rgba(0,0,0,0.5); align-items: center; justify-content: center; gap: 8px; }
        .pano-card:hover .pano-thumb-overlay { display: flex; }
        .pano-card.touch-active .pano-thumb-overlay { display: flex; }
        .pano-360-badge { position: absolute; top: 6px; right: 6px; background: rgba(0,0,0,0.6); color: rgba(201,168,76,0.9); font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 3px; letter-spacing: 0.05em; border: 1px solid rgba(201,168,76,0.3); font-family: monospace; }
        .pano-info { padding: 10px 12px; }
        .pano-name { font-size: 13px; color: var(--text); font-weight: 500; margin-bottom: 3px; }
        .pano-file { font-size: 11px; color: var(--text-muted); font-family: monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        @media (max-width: 768px) { .pano-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; } }
      `;
      document.head.appendChild(style);
    }

    wrap.querySelectorAll('[data-action][data-idx]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.idx);
        if (btn.dataset.action === 'delete') confirmDelete(idx);
        if (btn.dataset.action === 'edit')   renameScene(idx);
      });
    });
  }

  // ── 删除 ──────────────────────────────────────
  async function confirmDelete(idx) {
    const p = panoramas[idx];
    if (!p || !confirm(`删除全景图「${p.title || p.file}」？同时删除文件？`)) return;
    try {
      await API.deletePanorama(p.file, true);
      Toast.success('全景图已删除');
      load();
    } catch(e) {
      Toast.error('删除失败: ' + e.message);
    }
  }

  // ── 重命名 ────────────────────────────────────
  async function renameScene(idx) {
    const p = panoramas[idx];
    if (!p) return;
    const newTitle = prompt('场景名称：', p.title || '');
    if (newTitle === null) return;
    panoramas[idx].title = newTitle.trim();
    try {
      await API.updatePanoramas(panoramas);
      Toast.success('已更新');
      load();
    } catch(e) {
      Toast.error('保存失败: ' + e.message);
    }
  }

  // ── 上传 ──────────────────────────────────────
  async function uploadAndAdd() {
    const fileInput = document.getElementById('pano-file-input');
    const file = fileInput?.files[0];
    if (!file) { Toast.warning('请先选择全景图'); return; }

    const title = document.getElementById('pano-title')?.value.trim() || '';
    const btn   = document.getElementById('btn-confirm-pano-upload');
    const modalBody = document.querySelector('#modal-pano-upload .modal-body');
    const res = await doUploadWithProgress({
      type: 'panorama', file, extraData: { name: title || '' }, btn,
      progressContainer: modalBody,
      successMsg: '全景图上传成功',
    });
    if (!res) return;
    try {
      await API.addPanorama({ file: res.filename, title });
      Modal.close('modal-pano-upload');
      fileInput.value = '';
      document.getElementById('pano-preview').classList.remove('show');
      document.getElementById('pano-title').value = '';
      Toast.success('全景图已添加');
      load();
    } catch(e) {
      Toast.error('添加记录失败: ' + e.message);
    }
  }

  // ── 绑定事件 ──────────────────────────────────
  function bind() {
    const fileInput = document.getElementById('pano-file-input');
    fileInput?.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (file) previewImage(file, document.getElementById('pano-preview'));
    });
    const uploadArea = document.getElementById('pano-upload-area');
    if (uploadArea) initDropZone(uploadArea);
    document.getElementById('btn-confirm-pano-upload')?.addEventListener('click', uploadAndAdd);
    document.getElementById('btn-pano-add')?.addEventListener('click', () => Modal.open('modal-pano-upload'));
  }

  return { load, bind };
})();
