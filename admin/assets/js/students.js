/**
 * 同学录后台 · 学生列表模块
 * admin/assets/js/students.js
 */
const StudentsModule = (() => {
  let students = [];

  // ── 渲染学生卡片 ──────────────────────────────
  function renderRow(s) {
    const row = document.createElement('div');
    row.className = 'student-row';
    row.dataset.id = s.id;

    const char = s.name.slice(0, 1);
    const avatarHtml = s.hasAvatar
      ? `<img src="../${s.avatar}?t=${Date.now()}" alt="">`
      : char;

    // Owner 专属页面：只显示姓名和标签，隐藏所有操作按钮
    const actionsHtml = s.isOwner
      ? `<div class="student-actions"><span style="font-size:12px;color:var(--gold);opacity:.7;">专属页面·不可编辑</span></div>`
      : `<div class="student-actions">
          <button class="btn btn-secondary btn-sm" data-action="edit" data-id="${s.id}">编辑信息</button>
          <button class="btn btn-secondary btn-sm" data-action="sticker" data-id="${s.id}">贴纸</button>
          <button class="btn btn-danger btn-sm" data-action="delete" data-id="${s.id}">删除</button>
        </div>`;

    row.innerHTML = `
      <div class="student-avatar">${avatarHtml}</div>
      <div class="student-info">
        <div class="student-name">
          ${s.name}
          ${s.isOwner ? '<span class="owner-tag">专属</span>' : ''}
        </div>
        <div class="student-meta">
          ID: ${s.id} · 更新于 ${fmtDate(s.updatedAt)}
        </div>
      </div>
      ${actionsHtml}
    `;
    return row;
  }

  // ── 渲染列表 ──────────────────────────────────
  function renderList(list) {
    const container = document.getElementById('student-list-full');
    if (!container) return;
    container.innerHTML = '';
    if (!list.length) {
      container.innerHTML = '<div class="empty-state"><span class="icon">👥</span><p>暂无学生数据<br>点击右上角「新建学生」开始</p></div>';
      return;
    }
    list.forEach(s => container.appendChild(renderRow(s)));

    // 绑定操作按钮
    container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const { action, id } = btn.dataset;
        if (action === 'edit')    { Router.go('info_editor'); InfoEditor.load(id); }
        if (action === 'sticker') { Router.go('stickers'); StickerEditor.load(id); }
        if (action === 'delete')  { doDelete(id); }
      });
    });
  }

  // ── 加载学生数据 ──────────────────────────────
  async function load() {
    try {
      const data = await API.getStudents();
      students = data.students || [];
      renderList(students);
      updateStats();
      fillSelects();
      renderRecentList();
    } catch(e) {
      Toast.error('加载学生数据失败: ' + e.message);
    }
  }

   // ── 更新统计数据 ────────────────────────────
  function updateStats() {
    const total   = students.length;
    const avatars = students.filter(s => s.hasAvatar).length;
    const owners  = students.filter(s => s.isOwner).length;
    document.getElementById('stat-total') && (document.getElementById('stat-total').textContent = total);
    document.getElementById('stat-avatar') && (document.getElementById('stat-avatar').textContent = avatars);
    document.getElementById('stat-owner') && (document.getElementById('stat-owner').textContent = owners);
    // 异步加载相册数量
    const statAlbum = document.getElementById('stat-album');
    if (statAlbum) {
      API.getAlbum().then(data => {
        statAlbum.textContent = (data.photos || []).length;
      }).catch(() => {
        statAlbum.textContent = '0';
      });
    }
  }

  // ── 填充下拉选择器 ────────────────────────────
  function fillSelects() {
    const selects = [
      'info-student-select', 'bg-student-select', 'sticker-student-select',
      'music-student-select', 'particle-student-select', 'photos-student-select',
    ];
    selects.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const cur = el.value;
      el.innerHTML = '<option value="">请选择学生</option>';
      // Owner 专属页面不允许在后台编辑，从所有下拉选择器中排除
      students.filter(s => !s.isOwner).forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.name;
        el.appendChild(opt);
      });
      if (cur) el.value = cur;
    });
  }

  // ── 最近更新列表 ──────────────────────────────
  function renderRecentList() {
    const container = document.getElementById('recent-list');
    if (!container) return;
    const sorted = [...students].sort((a,b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')).slice(0, 5);
    container.innerHTML = '';
    if (!sorted.length) {
      container.innerHTML = '<div class="empty-state"><span class="icon">👥</span><p>暂无数据</p></div>';
      return;
    }
    sorted.forEach(s => container.appendChild(renderRow(s)));
    container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const { action, id } = btn.dataset;
        if (action === 'edit')    { Router.go('info_editor'); InfoEditor.load(id); }
        if (action === 'sticker') { Router.go('stickers'); StickerEditor.load(id); }
        if (action === 'delete')  { doDelete(id); }
      });
    });
  }

  // ── 删除学生 ──────────────────────────────────
  async function doDelete(id) {
    const s = students.find(x => x.id === id);
    if (!s) return;
    if (!confirm(`确认删除「${s.name}」？此操作不可撤销，将同时删除其 HTML 页面。`)) return;
    try {
      await API.deleteStudent(id);
      Toast.success(`「${s.name}」已删除`);
      load();
    } catch(e) {
      Toast.error('删除失败: ' + e.message);
    }
  }

  // ── 创建学生 ──────────────────────────────────
  async function doCreate() {
    const nameEl  = document.getElementById('new-student-name');
    const slugEl  = document.getElementById('new-student-slug');
    const ownerEl = document.getElementById('new-student-owner');
    const name    = nameEl.value.trim();
    const slug    = (slugEl?.value || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const isOwner = ownerEl.checked;

    if (!name) { Toast.warning('请输入学生姓名'); return; }
    if (!slug) { Toast.warning('请输入拼音代号（仅限英文字母和数字）'); return; }

    const btn = document.getElementById('btn-confirm-new-student');
    btnLoading(btn, true);
    try {
      const data = await API.createStudent(name, {}, slug);
      if (isOwner) {
        await API.updateStudent(data.student.id, { isOwner: true, slug });
      }
      Modal.close('modal-new-student');
      nameEl.value = '';
      if (slugEl) slugEl.value = '';
      ownerEl.checked = false;
      document.getElementById('slug-preview').textContent = 'students/wangxiaoming.html';
      Toast.success(`学生「${name}」已创建，页面已生成`);
      load();
    } catch(e) {
      Toast.error('创建失败: ' + e.message);
    } finally {
      btnLoading(btn, false);
    }
  }

  // ── slug 预览更新 ──────────────────────────────
  function initSlugPreview() {
    const slugEl   = document.getElementById('new-student-slug');
    const preview  = document.getElementById('slug-preview');
    if (!slugEl || !preview) return;
    slugEl.addEventListener('input', () => {
      const v = slugEl.value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'wangxiaoming';
      preview.textContent = `students/${v}.html`;
    });
  }

  // ── 搜索 ──────────────────────────────────────
  function initSearch() {
    const input = document.getElementById('student-search');
    if (!input) return;
    input.addEventListener('input', debounce(() => {
      const q = input.value.trim().toLowerCase();
      const filtered = q ? students.filter(s => s.name.toLowerCase().includes(q)) : students;
      renderList(filtered);
    }, 200));
  }

  // ── 公开接口 ──────────────────────────────────
  return {
    load,
    getStudents: () => students,
    getStudent: id => students.find(s => s.id === id),
    fillSelects,
    doCreate,
    initSearch,
    initSlugPreview,
  };
})();
