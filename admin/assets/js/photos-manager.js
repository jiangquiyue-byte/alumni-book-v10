/**
 * 同学录后台 · 个人照片墙管理模块
 * admin/assets/js/photos-manager.js
 */
const PhotosManager = (() => {
  let currentStudent = null;
  let photos = [];

  // ── 加载 ──────────────────────────────────────
  async function load(id) {
    const student = StudentsModule.getStudent(id);
    if (!student) return;
    currentStudent = student;
    const sel = document.getElementById('photos-student-select');
    if (sel) sel.value = id;
    try {
      const data = await API.getStudentPhotos(id);
      photos = data.photos || [];
    } catch(e) {
      photos = student.photos || [];
    }
    renderGrid();
  }

  // ── 渲染照片网格 ──────────────────────────────
  function renderGrid() {
    const wrap = document.getElementById('photos-grid-wrap');
    if (!wrap) return;

    if (!photos.length) {
      wrap.innerHTML = '<div class="empty-state"><span class="icon">🖼</span><p>该同学暂无照片<br>点击右上角「上传照片」添加</p></div>';
      return;
    }

    const FRAME_ICONS = { retro: '🖼', film: '🎞', none: '⬜' };

    wrap.innerHTML = `
      <div class="album-grid">
        ${photos.map((p, idx) => `
          <div class="album-item ${p.wide?'wide':''} ${p.tall?'tall':''}" data-idx="${idx}">
            <img src="/students/photos/${p.file}" alt="${p.caption || ''}">
            <div class="album-item-overlay">
              <button class="btn btn-secondary btn-sm" data-action="edit" data-idx="${idx}">编辑</button>
              <button class="btn btn-danger btn-sm" data-action="delete" data-idx="${idx}">删除</button>
            </div>
            ${p.caption ? `<div class="album-item-caption">${p.caption}</div>` : ''}
            <div style="position:absolute;top:4px;right:4px;font-size:14px;" title="${p.frame||'none'}">${FRAME_ICONS[p.frame||'none']||''}</div>
          </div>
        `).join('')}
      </div>
    `;

    document.querySelectorAll('[data-action][data-idx]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.idx);
        if (btn.dataset.action === 'delete') confirmDelete(idx);
        if (btn.dataset.action === 'edit')   editPhoto(idx);
      });
    });
  }

  async function confirmDelete(idx) {
    const p = photos[idx];
    if (!p) return;
    if (!confirm(`删除照片「${p.caption || p.file}」？`)) return;
    try {
      await API.deleteStudentPhoto(currentStudent.id, p.file, true);
      Toast.success('照片已删除');
      load(currentStudent.id);
    } catch(e) {
      Toast.error('删除失败: ' + e.message);
    }
  }

  function editPhoto(idx) {
    const p = photos[idx];
    const caption = prompt('照片说明：', p.caption || '');
    if (caption === null) return;
    photos[idx].caption = caption;
    API.updateStudentPhotos(currentStudent.id, photos).then(() => {
      Toast.success('已更新'); load(currentStudent.id);
    });
  }

  // ── 上传并添加 ────────────────────────────────
  async function uploadAndAdd() {
    if (!currentStudent) { Toast.warning('请先选择学生'); return; }
    const fileInput = document.getElementById('photo-file-input');
    const file      = fileInput?.files[0];
    if (!file) { Toast.warning('请先选择照片'); return; }

    const caption = document.getElementById('photo-caption')?.value || '';
    const ratio   = document.getElementById('photo-ratio-select')?.value || 'normal';
    const frame   = document.getElementById('photo-frame')?.value || 'none';

    const btn = document.getElementById('btn-confirm-photo-upload');
    const modalBody = document.querySelector('#modal-photo-upload .modal-body');
    const res = await doUploadWithProgress({
      type: 'photo', file, studentId: currentStudent.id, extraData: { name: caption || '' }, btn,
      progressContainer: modalBody,
      successMsg: '照片上传成功',
    });
    if (!res) return;
    try {
      await API.addStudentPhoto(currentStudent.id, {
        file:    res.filename,
        caption,
        wide:    ratio === 'wide',
        tall:    ratio === 'tall',
        frame,
      });
      Modal.close('modal-photo-upload');
      Toast.success('照片已添加到照片墙');
      fileInput.value = '';
      document.getElementById('photo-preview').classList.remove('show');
      load(currentStudent.id);
    } catch(e) {
      Toast.error('添加记录失败: ' + e.message);
    }
  }

  function bindUpload() {
    const photoFileInput = document.getElementById('photo-file-input');
    photoFileInput?.addEventListener('change', () => {
      const file = photoFileInput.files[0];
      if (file) previewImage(file, document.getElementById('photo-preview'));
    });
    const photoUploadArea = document.getElementById('photo-upload-area');
    if (photoUploadArea) initDropZone(photoUploadArea);
    document.getElementById('btn-confirm-photo-upload')?.addEventListener('click', uploadAndAdd);
    document.getElementById('btn-photo-add')?.addEventListener('click', () => {
      if (!currentStudent) { Toast.warning('请先选择学生'); return; }
      Modal.open('modal-photo-upload');
    });
  }

  function bindSelect() {
    const sel = document.getElementById('photos-student-select');
    if (!sel) return;
    sel.addEventListener('change', () => { if (sel.value) load(sel.value); });
  }

  return { load, bindUpload, bindSelect };
})();
