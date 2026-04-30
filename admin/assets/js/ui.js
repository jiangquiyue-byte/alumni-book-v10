/**
 * 同学录后台管理系统 · UI 工具模块
 * admin/assets/js/ui.js
 */

/* ── Toast 通知 ──────────────────────────────── */
const Toast = (() => {
  const container = document.getElementById('toast-container');
  return {
    show(msg, type = 'info', duration = 3000) {
      const el = document.createElement('div');
      const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
      el.className = `toast ${type}`;
      el.innerHTML = `<span>${icons[type] || 'ℹ'}</span><span>${msg}</span>`;
      container.appendChild(el);
      setTimeout(() => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(6px)';
        el.style.transition = 'opacity 0.3s, transform 0.3s';
        setTimeout(() => el.remove(), 300);
      }, duration);
    },
    success: (m, d) => Toast.show(m, 'success', d),
    error:   (m, d) => Toast.show(m, 'error', d || 4000),
    info:    (m, d) => Toast.show(m, 'info', d),
    warning: (m, d) => Toast.show(m, 'warning', d),
  };
})();

/* ── Modal 管理 ──────────────────────────────── */
const Modal = {
  open(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('open');
  },
  close(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('open');
  },
  closeAll() {
    document.querySelectorAll('.modal-overlay.open').forEach(el => el.classList.remove('open'));
  },
};

// 点击遮罩关闭
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) Modal.closeAll();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') Modal.closeAll();
});

/* ── 页面/Tab 切换 ──────────────────────────── */
const Router = {
  currentPage: 'dashboard',
  go(page) {
    // 更新页面显示
    document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
    const target = document.getElementById(`page-${page}`);
    if (target) target.classList.add('active');

    // 更新 nav
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === page);
    });

    // 更新 topbar 标题
    const titles = {
      dashboard:          '控制台',
      students:           '学生管理',
      info_editor:        '信息编辑',
      background:         '背景管理',
      stickers:           '贴纸编辑',
      music:              '音乐设置',
      particles:          '粒子效果',
      'custom-particles': '自定义粒子',
      album:              '班级相册',
      panorama:           '360° 全景',
      photos:             '照片墙',
      content:            '内容管理',
      'site-settings':    '站点设置',
      'exclusive':        '专属模板',
    };
    const titleEl = document.getElementById('topbar-title');
    if (titleEl) titleEl.textContent = titles[page] || '管理后台';

    this.currentPage = page;

    // 2.4修复：切换到需要选择学生的页面时，自动选中第一个学生
    const autoLoadPages = {
      'info_editor': 'info-student-select',
      'background':  'bg-student-select',
      'stickers':    'sticker-student-select',
      'music':       'music-student-select',
      'particles':   'particle-student-select',
      'photos':      'photos-student-select',
    };
    // 专属模板页面特殊处理
    if (page === 'exclusive' && window.ExclusiveManager) {
      setTimeout(() => ExclusiveManager.fillSelect(), 200);
    }
    if (autoLoadPages[page]) {
      setTimeout(() => {
        const sel = document.getElementById(autoLoadPages[page]);
        if (sel && !sel.value && sel.options.length > 1) {
          sel.selectedIndex = 1;
          sel.dispatchEvent(new Event('change'));
        }
      }, 300);
    }
  },

};

/* ── Tab 切换 ──────────────────────────────── */
function initTabs(container) {
  const btns   = container.querySelectorAll('.tab-btn');
  const panels = container.querySelectorAll('.tab-panel');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      btns.forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
      panels.forEach(p => p.classList.toggle('active', p.dataset.tab === tab));
    });
  });
}

/* ── 确认对话框 ──────────────────────────────── */
function confirmDialog(msg) {
  return window.confirm(msg);
}

/* ── 文件上传拖拽增强 ──────────────────────── */
function initDropZone(area) {
  const input = area.querySelector('input[type=file]');

  // 修复移动端/PC端点击上传区域无法调用文件管理器的问题：
  // 将 input[type=file] 设为 display:none，通过 JS 手动触发 click
  if (input) {
    input.style.position = 'absolute';
    input.style.width    = '0';
    input.style.height   = '0';
    input.style.opacity  = '0';
    input.style.overflow = 'hidden';
    input.style.pointerEvents = 'none';
  }

  // 点击上传区域 → 触发文件选择（兼容 PC 和移动端）
  area.addEventListener('click', e => {
    // 如果点击的是 input 本身则跳过（避免二次触发）
    if (e.target === input) return;
    if (input) input.click();
  });

  // 拖拽支持
  area.addEventListener('dragover', e => {
    e.preventDefault(); area.classList.add('dragover');
  });
  area.addEventListener('dragleave', () => area.classList.remove('dragover'));
  area.addEventListener('drop', e => {
    e.preventDefault(); area.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (input && files.length) {
      // 触发 change 事件
      const dt = new DataTransfer();
      dt.items.add(files[0]);
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
}

/* ── 图片预览 ──────────────────────────────── */
function previewImage(file, imgEl) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    imgEl.src = e.target.result;
    imgEl.classList.add('show');
  };
  reader.readAsDataURL(file);
}

/* ── 格式化时间 ──────────────────────────────── */
function fmtDate(str) {
  if (!str) return '—';
  return str.replace('T', ' ').slice(0, 16);
}

/* ── 防抖 ──────────────────────────────────── */
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

/* ── 按钮 loading 状态 ──────────────────────── */
function btnLoading(btn, loading, originalText) {
  if (loading) {
    btn._origText = btn.innerHTML;
    btn.innerHTML = '<span class="spinner"></span> 处理中…';
    btn.disabled = true;
  } else {
    btn.innerHTML = btn._origText || originalText || '确认';
    btn.disabled = false;
  }
}

/* ── 全局 nav 绑定 ──────────────────────────── */
document.querySelectorAll('.nav-item[data-page]').forEach(btn => {
  btn.addEventListener('click', () => Router.go(btn.dataset.page));
});

/* ══════════════════════════════════════════
   Progress · 上传进度条组件
   ══════════════════════════════════════════ */
const Progress = {
  /**
   * 创建进度条 DOM 并插入到指定容器
   * @param {string|Element} container - 容器选择器或元素
   * @returns {object} { el, update(pct), setText(msg), done(msg), error(msg), remove() }
   */
  create(container) {
    const parent = typeof container === 'string' ? document.querySelector(container) : container;
    const el = document.createElement('div');
    el.className = 'upload-progress';
    el.innerHTML = `
      <div class="upload-progress-header">
        <span class="upload-progress-text">准备上传…</span>
        <span class="upload-progress-pct">0%</span>
      </div>
      <div class="upload-progress-track">
        <div class="upload-progress-bar" style="width:0%"></div>
      </div>
    `;
    if (parent) parent.appendChild(el);

    const bar     = el.querySelector('.upload-progress-bar');
    const textEl  = el.querySelector('.upload-progress-text');
    const pctEl   = el.querySelector('.upload-progress-pct');

    return {
      el,
      update(pct) {
        bar.style.width = pct + '%';
        pctEl.textContent = pct + '%';
        if (pct > 0 && pct < 100) textEl.textContent = '正在上传…';
        if (pct >= 100) textEl.textContent = '上传完成，处理中…';
      },
      setText(msg) { textEl.textContent = msg; },
      done(msg) {
        bar.style.width = '100%';
        bar.classList.add('done');
        pctEl.textContent = '✓';
        textEl.textContent = msg || '上传成功';
        setTimeout(() => el.remove(), 2000);
      },
      error(msg) {
        bar.classList.add('error');
        pctEl.textContent = '✕';
        textEl.textContent = msg || '上传失败';
      },
      remove() { el.remove(); }
    };
  }
};

/**
 * 全局上传辅助函数（自动处理进度条 + Toast + 按钮状态）
 * @param {object} opts
 *   type, file, studentId, extraData,
 *   btn - 按钮元素（自动 loading）
 *   progressContainer - 进度条容器
 *   successMsg, errorMsg
 * @returns {Promise<object>} 上传结果
 */
async function doUploadWithProgress(opts) {
  const { type, file, studentId = '', extraData = {}, btn, progressContainer, successMsg, errorMsg } = opts;
  if (!file) { Toast.warning('请先选择文件'); return null; }

  const progress = progressContainer ? Progress.create(progressContainer) : null;
  if (btn) btnLoading(btn, true);

  try {
    const res = await API.upload(type, file, studentId, extraData, (pct) => {
      if (progress) progress.update(pct);
    });
    if (progress) progress.done(successMsg || '上传成功');
    Toast.success(successMsg || '上传成功');
    return res;
  } catch(e) {
    if (progress) progress.error(e.message);
    Toast.error((errorMsg || '上传失败') + ': ' + e.message);
    return null;
  } finally {
    if (btn) btnLoading(btn, false);
  }
}
