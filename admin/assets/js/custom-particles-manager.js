/**
 * 同学录后台 · 自定义粒子效果管理模块
 * admin/assets/js/custom-particles-manager.js
 */
const CustomParticlesManager = (() => {
  let particles = [];

  // ── 加载列表 ─────────────────────────────────
  async function load() {
    try {
      const data = await API.getCustomParticles();
      particles = data.particles || [];
      renderGrid();
    } catch(e) {
      console.warn('自定义粒子加载失败:', e.message);
    }
  }

  // ── 渲染卡片网格 ──────────────────────────────
  function renderGrid() {
    const wrap = document.getElementById('custom-particle-grid');
    if (!wrap) return;

    if (!particles.length) {
      wrap.innerHTML = '<div class="empty-state"><span class="icon">🎨</span><p>暂无自定义粒子<br>上传图片后自动出现在粒子选择器中</p></div>';
      return;
    }

    wrap.innerHTML = `<div class="cp-grid">${
      particles.map((p, idx) => `
        <div class="cp-card" data-idx="${idx}">
          <div class="cp-preview-box">
            <img src="/assets/images/overlays/${p.file}" alt="${p.name}" loading="lazy">
          </div>
          <div class="cp-info">
            <div class="cp-name">${p.name}</div>
            <div class="cp-meta">数量 ${p.count} · 尺寸 ${p.size[0]}~${p.size[1]}px</div>
            <div class="cp-id">id: ${p.id}</div>
          </div>
          <div class="cp-actions">
            <button class="btn btn-secondary btn-sm" data-action="edit" data-idx="${idx}">编辑</button>
            <button class="btn btn-danger btn-sm" data-action="delete" data-idx="${idx}">删除</button>
          </div>
        </div>
      `).join('')
    }</div>`;

    // CSS（首次注入）
    if (!document.getElementById('cp-style')) {
      const style = document.createElement('style');
      style.id = 'cp-style';
      style.textContent = `
        .cp-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:14px; }
        .cp-card { background:var(--bg3); border:1px solid var(--border); border-radius:8px; overflow:hidden; transition:border-color .2s; }
        .cp-card:hover { border-color:var(--border2); }
        .cp-preview-box { height:80px; background:rgba(255,255,255,0.04); display:flex; align-items:center; justify-content:center; overflow:hidden; }
        .cp-preview-box img { max-height:64px; max-width:90%; object-fit:contain; image-rendering:pixelated; }
        .cp-info { padding:10px 12px 4px; }
        .cp-name { font-size:13px; color:var(--text); font-weight:500; margin-bottom:3px; }
        .cp-meta { font-size:11px; color:var(--text-dim); }
        .cp-id   { font-size:10px; color:var(--text-muted); font-family:monospace; margin-top:2px; }
        .cp-actions { display:flex; gap:6px; padding:8px 12px 12px; }
        @media(max-width:768px){ .cp-grid{ grid-template-columns:repeat(2,1fr); gap:10px; } }
      `;
      document.head.appendChild(style);
    }

    wrap.querySelectorAll('[data-action][data-idx]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.idx);
        if (btn.dataset.action === 'delete') confirmDelete(idx);
        if (btn.dataset.action === 'edit')   openEdit(idx);
      });
    });

    // 通知粒子选择器刷新
    refreshParticleEditor();
  }

  // ── 删除 ──────────────────────────────────────
  async function confirmDelete(idx) {
    const p = particles[idx];
    if (!p || !confirm(`删除粒子「${p.name}」？同时删除图片文件？`)) return;
    try {
      await API.deleteCustomParticle(p.id, true);
      Toast.success('已删除');
      load();
    } catch(e) {
      Toast.error('删除失败: ' + e.message);
    }
  }

  // ── 编辑 ──────────────────────────────────────
  async function openEdit(idx) {
    const p = particles[idx];
    if (!p) return;
    const name    = prompt('粒子名称：', p.name);
    if (name === null) return;
    const count   = parseInt(prompt('飘落数量（5-60）：', p.count)) || p.count;
    const sizeMin = parseInt(prompt('最小尺寸 px：', p.size[0])) || p.size[0];
    const sizeMax = parseInt(prompt('最大尺寸 px：', p.size[1])) || p.size[1];
    try {
      await API.updateCustomParticle(p.id, { name: name.trim(), count, sizeMin, sizeMax });
      Toast.success('已更新');
      load();
    } catch(e) {
      Toast.error('更新失败: ' + e.message);
    }
  }

  // ── 上传 ──────────────────────────────────────
  async function uploadAndAdd() {
    const fileInput = document.getElementById('cp-file-input');
    const file = fileInput?.files[0];
    if (!file) { Toast.warning('请先选择粒子图片'); return; }

    const name    = document.getElementById('cp-name')?.value.trim() || file.name.replace(/\.[^.]+$/, '');
    const count   = parseInt(document.getElementById('cp-count')?.value)   || 20;
    const sizeMin = parseInt(document.getElementById('cp-size-min')?.value) || 12;
    const sizeMax = parseInt(document.getElementById('cp-size-max')?.value) || 32;

    const btn = document.getElementById('btn-confirm-custom-particle');
    const modalBody = document.querySelector('#modal-custom-particle .modal-body');
    const res = await doUploadWithProgress({
      type: 'overlay', file, extraData: { name }, btn,
      progressContainer: modalBody,
      successMsg: '粒子图片上传成功',
    });
    if (!res) return;
    try {
      await API.addCustomParticle({ file: res.filename, name, count, sizeMin, sizeMax });
      Modal.close('modal-custom-particle');
      fileInput.value = '';
      document.getElementById('cp-preview').classList.remove('show');
      document.getElementById('cp-name').value = '';
      Toast.success(`粒子「${name}」已添加`);
      load();
    } catch(e) {
      Toast.error('添加记录失败: ' + e.message);
    }
  }

  // ── 通知粒子选择器同步自定义选项 ────────────────
  function refreshParticleEditor() {
    // ParticleEditor 如果在当前已渲染，需要重新 load 当前学生
    const sel = document.getElementById('particle-student-select');
    if (sel?.value) ParticleEditor.load(sel.value);
  }

  // ── 获取当前自定义粒子（供 ParticleEditor 使用）──
  function getAll() { return particles; }

  // ── 绑定事件 ──────────────────────────────────
  function bind() {
    const fileInput = document.getElementById('cp-file-input');
    fileInput?.addEventListener('change', () => {
      const f = fileInput.files[0];
      if (f) previewImage(f, document.getElementById('cp-preview'));
    });
    const area = document.getElementById('cp-upload-area');
    if (area) initDropZone(area);
    document.getElementById('btn-confirm-custom-particle')?.addEventListener('click', uploadAndAdd);
    document.getElementById('btn-add-custom-particle')?.addEventListener('click', () => Modal.open('modal-custom-particle'));
  }

  return { load, bind, getAll };
})();
