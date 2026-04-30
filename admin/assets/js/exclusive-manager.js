/**
 * 专属模板管理器
 * 管理 isOwner 学生的专属页面资源上传和部署
 */
(function () {
  'use strict';

  let currentStudent = null;  // 当前选中的学生
  let resources = {};         // 当前资源列表

  // ── 初始化 ──
  function init() {
    const select = document.getElementById('exclusive-student-select');
    if (!select) return;

    select.addEventListener('change', async () => {
      const id = select.value;
      if (!id) {
        currentStudent = null;
        resources = {};
        renderEmpty();
        return;
      }
      await loadResources(id);
    });

    // 绑定上传按钮
    bindUploadButtons();
    // 绑定部署按钮
    document.getElementById('btn-deploy-exclusive')?.addEventListener('click', deployPage);
  }

  // ── 填充专属学生下拉列表 ──
  async function fillSelect() {
    const select = document.getElementById('exclusive-student-select');
    if (!select) return;
    try {
      const data = await API.request('exclusive.php');
      const owners = data.owners || [];
      select.innerHTML = '<option value="">请选择专属模板学生</option>';
      owners.forEach(o => {
        const opt = document.createElement('option');
        opt.value = o.id;
        opt.textContent = o.name + (o.hasExclusiveDir ? '' : ' (未初始化)');
        select.appendChild(opt);
      });
    } catch (e) {
      console.error('加载专属学生列表失败:', e);
    }
  }

  // ── 加载资源列表 ──
  async function loadResources(studentId) {
    const panel = document.getElementById('exclusive-resources');
    if (panel) panel.innerHTML = '<div class="loading-text">加载中...</div>';
    try {
      const data = await API.request('exclusive.php?id=' + encodeURIComponent(studentId));
      currentStudent = data.student;
      resources = data.resources || {};
      renderResources(data);
    } catch (e) {
      if (panel) panel.innerHTML = '<div class="error-text">加载失败: ' + e.message + '</div>';
    }
  }

  // ── 渲染空状态 ──
  function renderEmpty() {
    const panel = document.getElementById('exclusive-resources');
    if (panel) {
      panel.innerHTML = '<div class="empty-state"><span class="icon">📦</span><p>请先选择一个专属模板学生</p></div>';
    }
  }

  // ── 渲染资源列表 ──
  function renderResources(data) {
    const panel = document.getElementById('exclusive-resources');
    if (!panel) return;

    const student = data.student;
    const res = data.resources;
    const deployed = data.deployed;
    const basePath = data.basePath;

    let html = '';

    // 学生信息头
    html += '<div class="exclusive-header">';
    html += '<h3>' + escHtml(student.name) + ' <span class="slug-tag">' + escHtml(student.slug) + '</span></h3>';
    html += '<div class="exclusive-header-actions">';
    html += '<button class="btn btn-sm btn-danger" id="btn-delete-exclusive-template">🗑 删除专属模板</button>';
    html += '</div>';
    html += '<div class="deploy-status">';
    if (deployed) {
      html += '<span class="status-badge success">已部署</span>';
      html += ' <a href="../students/' + encodeURIComponent(student.slug) + '.html" target="_blank" class="btn btn-sm btn-secondary">预览页面</a>';
    } else {
      html += '<span class="status-badge warning">未部署</span>';
    }
    html += '</div></div>';

    // 资源目录说明
    html += '<div class="dir-info">';
    html += '<strong>资源根目录：</strong><code>exclusive/' + escHtml(student.slug) + '/</code>';
    html += '</div>';

    // ── HTML 页面代码 ──
    html += renderSection('html', '📄 页面代码', res.html || [], [
      { res: 'html', label: '上传 HTML', accept: '.html,.htm', id: 'upload-exclusive-html' }
    ], basePath);

    // ── 头像 ──
    html += renderSection('avatar', '👤 头像', res.avatar || [], [
      { res: 'avatar', label: '上传头像', accept: '.jpg,.jpeg,.png,.webp', id: 'upload-exclusive-avatar' }
    ], basePath, true);

    // ── 背景 ──
    html += renderSection('backgrounds', '🖼 背景图', res.backgrounds || [], [
      { res: 'bg', label: '上传背景', accept: '.jpg,.jpeg,.png,.webp,.gif', id: 'upload-exclusive-bg' }
    ], basePath, true);

    // ── 音乐 ──
    html += renderSection('music', '🎵 音乐', res.music || [], [
      { res: 'music', label: '上传音乐', accept: '.mp3,.ogg,.m4a', id: 'upload-exclusive-music' }
    ], basePath);

    // ── 贴纸 ──
    html += renderSection('stickers', '🎀 贴纸', res.stickers || [], [
      { res: 'sticker', label: '上传贴纸', accept: '.png,.gif,.webp', id: 'upload-exclusive-sticker' }
    ], basePath);

    // ── 照片 ──
    html += renderSection('photos', '📷 照片', res.photos || [], [
      { res: 'photo', label: '上传照片', accept: '.jpg,.jpeg,.png,.webp', id: 'upload-exclusive-photo' }
    ], basePath);

    // ── 自定义资源 ──
    html += renderSection('assets', '📁 自定义资源 (CSS/JS/字体)', res.assets || [], [
      { res: 'asset', label: '上传资源', accept: '*', id: 'upload-exclusive-asset' }
    ], basePath);

    // ── 部署按钮 ──
    html += '<div class="deploy-section">';
    html += '<button class="btn btn-primary" id="btn-deploy-exclusive" ' + ((res.html || []).length === 0 ? 'disabled' : '') + '>';
    html += '🚀 部署到同学录</button>';
    html += '<span class="deploy-hint">将 index.html 部署到 students/' + escHtml(student.slug) + '.html，计入同学录总数</span>';
    html += '</div>';

    panel.innerHTML = html;

    // 重新绑定事件
    bindUploadButtons();
    document.getElementById('btn-deploy-exclusive')?.addEventListener('click', deployPage);

    // 绑定删除专属模板按钮
    document.getElementById('btn-delete-exclusive-template')?.addEventListener('click', deleteTemplate);

    // 绑定删除按钮
    panel.querySelectorAll('.btn-delete-res').forEach(btn => {
      btn.addEventListener('click', async () => {
        const file = btn.dataset.file;
        if (!confirm('确定删除 ' + file + '？')) return;
        try {
          await API.request('exclusive.php?id=' + encodeURIComponent(currentStudent.id) + '&file=' + encodeURIComponent(file), { method: 'DELETE' });
          Toast.success('已删除 ' + file);
          loadResources(currentStudent.id);
        } catch (e) {
          Toast.error('删除失败: ' + e.message);
        }
      });
    });
  }

  // ── 渲染资源区块 ──
  function renderSection(key, title, files, uploadBtns, basePath, isImage) {
    let html = '<div class="res-section">';
    html += '<div class="res-section-header">';
    html += '<h4>' + title + '</h4>';
    html += '<div class="res-actions">';
    uploadBtns.forEach(b => {
      html += '<label class="btn btn-sm btn-secondary upload-label" for="' + b.id + '">' + b.label;
      html += '<input type="file" id="' + b.id + '" accept="' + b.accept + '" data-res="' + b.res + '" class="exclusive-file-input" style="display:none">';
      html += '</label>';
    });
    html += '</div></div>';

    // 自定义文件名输入（贴纸、照片、资源）
    const needsName = ['sticker', 'photo', 'asset'];
    if (uploadBtns.some(b => needsName.includes(b.res))) {
      html += '<div class="name-input-row" style="margin-bottom:8px;">';
      html += '<input type="text" class="input-sm exclusive-name-input" data-for="' + uploadBtns[0].res + '" placeholder="自定义文件名（可选，留空保留原名）" style="width:100%;max-width:300px;padding:4px 8px;border:1px solid var(--border);border-radius:4px;background:var(--bg-card);color:var(--text);">';
      html += '</div>';
    }

    if (files.length === 0) {
      html += '<div class="res-empty">暂无文件</div>';
    } else {
      html += '<div class="res-file-list">';
      files.forEach(f => {
        // html文件直接存放在根目录，其他资源在子目录下
        const filePath = (key === 'html') ? basePath + f.name : basePath + key + '/' + f.name;
        const deleteKey = (key === 'html') ? f.name : key + '/' + f.name;
        html += '<div class="res-file-item">';
        if (isImage) {
          html += '<img src="../' + filePath + '?t=' + Date.now() + '" class="res-thumb" alt="' + escHtml(f.name) + '">';
        }
        html += '<div class="res-file-info">';
        html += '<span class="res-file-name">' + escHtml(f.name) + '</span>';
        html += '<span class="res-file-meta">' + formatSize(f.size) + ' \u00b7 ' + f.time + '</span>';
        html += '</div>';
        html += '<div class="res-file-actions">';
        html += '<code class="res-path" title="\u5728HTML\u4e2d\u5f15\u7528\u6b64\u8def\u5f84">../' + filePath + '</code>';
        html += '<button class="btn btn-sm btn-danger btn-delete-res" data-file="' + escHtml(deleteKey) + '">\u5220\u9664</button>';
        html += '</div>';
        html += '</div>';
      });
      html += '</div>';
    }
    html += '</div>';
    return html;
  }

  // ── 绑定上传按钮 ──
  function bindUploadButtons() {
    document.querySelectorAll('.exclusive-file-input').forEach(input => {
      // 移除旧监听器（通过克隆替换）
      const newInput = input.cloneNode(true);
      input.parentNode.replaceChild(newInput, input);

      newInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file || !currentStudent) return;

        const resType = newInput.dataset.res;
        // 获取自定义文件名
        const nameInput = document.querySelector('.exclusive-name-input[data-for="' + resType + '"]');
        const customName = nameInput ? nameInput.value.trim() : '';

        const fd = new FormData();
        fd.append('file', file);
        if (customName) fd.append('name', customName);

        const btn = newInput.closest('.upload-label');
        const origText = btn ? btn.childNodes[0].textContent : '';
        if (btn) btn.childNodes[0].textContent = '上传中...';

        try {
          const url = 'exclusive.php?id=' + encodeURIComponent(currentStudent.id) + '&action=upload&res=' + encodeURIComponent(resType);
          const res = await uploadFile(url, fd);
          Toast.success('上传成功: ' + (res.filename || file.name));
          if (nameInput) nameInput.value = '';
          loadResources(currentStudent.id);
        } catch (err) {
          Toast.error('上传失败: ' + err.message);
        } finally {
          if (btn) btn.childNodes[0].textContent = origText;
          newInput.value = '';
        }
      });
    });
  }

  // ── 上传文件 ──
  function uploadFile(url, formData) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', 'api/' + url, true);
      xhr.withCredentials = true;
      xhr.timeout = 180000;
      xhr.addEventListener('load', () => {
        let data;
        try { data = JSON.parse(xhr.responseText); }
        catch (e) {
          reject(new Error('服务器返回异常 (HTTP ' + xhr.status + ')'));
          return;
        }
        data.success ? resolve(data) : reject(new Error(data.message || '上传失败'));
      });
      xhr.addEventListener('error', () => reject(new Error('网络错误')));
      xhr.addEventListener('timeout', () => reject(new Error('上传超时')));
      xhr.send(formData);
    });
  }

  // ── 部署页面 ──
  async function deployPage() {
    if (!currentStudent) { Toast.warning('请先选择学生'); return; }
    const btn = document.getElementById('btn-deploy-exclusive');
    if (btn) { btn.disabled = true; btn.textContent = '部署中...'; }
    try {
      const url = 'exclusive.php?id=' + encodeURIComponent(currentStudent.id) + '&action=deploy';
      const res = await API.request(url, { method: 'POST' });
      Toast.success(res.message || '部署成功！');
      loadResources(currentStudent.id);
    } catch (e) {
      Toast.error('部署失败: ' + e.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '🚀 部署到同学录'; }
    }
  }

  // ── 删除整个专属模板 ──
  async function deleteTemplate() {
    if (!currentStudent) { Toast.warning('请先选择学生'); return; }
    const confirmMsg = '确定要删除「' + currentStudent.name + '」的专属模板吗？\n\n此操作将：\n• 删除 exclusive/' + currentStudent.slug + '/ 目录下所有资源\n• 删除已部署的 students/' + currentStudent.slug + '.html\n• 取消该学生的专属模板标记\n\n此操作不可恢复！';
    if (!confirm(confirmMsg)) return;
    const btn = document.getElementById('btn-delete-exclusive-template');
    if (btn) { btn.disabled = true; btn.textContent = '删除中...'; }
    try {
      const url = 'exclusive.php?id=' + encodeURIComponent(currentStudent.id) + '&action=delete_template';
      const res = await API.request(url, { method: 'DELETE' });
      Toast.success(res.message || '专属模板已删除');
      // 重置状态
      currentStudent = null;
      resources = {};
      renderEmpty();
      // 刷新下拉列表
      await fillSelect();
    } catch (e) {
      Toast.error('删除失败: ' + e.message);
      if (btn) { btn.disabled = false; btn.textContent = '🗑 删除专属模板'; }
    }
  }

  // ── 工具函数 ──
  function escHtml(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  }

  // ── 暴露给全局 ──
  window.ExclusiveManager = {
    init,
    fillSelect,
    loadResources,
  };

  // 页面加载后初始化
  document.addEventListener('DOMContentLoaded', () => {
    init();
  });
})();
