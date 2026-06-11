/**
 * 同学录后台管理系统 · 主入口
 * admin/assets/js/app.js
 *
 * 初始化顺序：
 * 1. 检查登录状态
 * 2. 加载学生数据
 * 3. 初始化各模块的 select 联动
 * 4. 绑定全局事件
 */
(async function init() {
  // ── 验证登录 ────────────────────────────────
  try {
    const auth = await API.checkAuth();
    if (!auth.logged_in) {
      window.location.href = 'index.php';
      return;
    }
  } catch(e) {
    window.location.href = 'index.php';
    return;
  }

  // ── 加载学生数据 ────────────────────────────
  await StudentsModule.load();
  StudentsModule.initSearch();
  StudentsModule.initSlugPreview();

  // ── 加载班级相册 ────────────────────────────
  await AlbumManager.loadClassmates();
  await AlbumManager.load();
  await PanoramaManager.load();
  await CustomParticlesManager.load();
  await DanmakuManager.loadAuthors();
  await DanmakuManager.load();

  // ── 绑定各模块的下拉选择器 ──────────────────
  InfoEditor.bindSelect();
  BackgroundEditor.bindSelect();
  StickerEditor.bindSelect();
  MusicEditor.bindSelect();
  ParticleEditor.bindSelect();
  PhotosManager.bindSelect();

  // ── 绑定上传事件 ────────────────────────────
  AlbumManager.bindUpload();
  PanoramaManager.bind();
  CustomParticlesManager.bind();
  SiteSettings.bind();
  ContentEditor.bind();
  PhotosManager.bindUpload();
  DanmakuManager.bind();

  // ── 新建学生 ────────────────────────────────
  document.getElementById('btn-new-student')?.addEventListener('click', () => Modal.open('modal-new-student'));
  document.getElementById('btn-new-student2')?.addEventListener('click', () => Modal.open('modal-new-student'));
  document.getElementById('btn-confirm-new-student')?.addEventListener('click', StudentsModule.doCreate);
  document.getElementById('new-student-name')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') StudentsModule.doCreate();
  });

  // ── 贴纸上传 ────────────────────────────────
  document.getElementById('btn-upload-sticker')?.addEventListener('click', () => Modal.open('modal-upload-sticker'));
  const stickerFileInput = document.getElementById('sticker-file-input');
  stickerFileInput?.addEventListener('change', () => {
    const file = stickerFileInput.files[0];
    if (file) previewImage(file, document.getElementById('sticker-preview'));
  });
  const stickerUploadArea = document.getElementById('sticker-upload-area');
  if (stickerUploadArea) initDropZone(stickerUploadArea);
  // 贴纸文件选择后显示文件名
  stickerFileInput?.addEventListener('change', () => {
    const file = stickerFileInput.files[0];
    const nameEl = document.getElementById('sticker-upload-name');
    if (file && nameEl && !nameEl.value) {
      // 自动填入去掉扩展名的文件名作为建议名称
      nameEl.value = file.name.replace(/\.[^.]+$/, '');
    }
    const hint = document.getElementById('sticker-file-hint');
    if (hint) hint.textContent = file ? file.name + ' (' + (file.size / 1024 / 1024).toFixed(2) + ' MB)' : '';
  });

  document.getElementById('btn-confirm-sticker-upload')?.addEventListener('click', async () => {
    const file = stickerFileInput?.files[0];
    if (!file) { Toast.warning('请先选择贴纸文件'); return; }
    const name = document.getElementById('sticker-upload-name')?.value || '';
    const btn  = document.getElementById('btn-confirm-sticker-upload');
    const res = await doUploadWithProgress({
      type: 'sticker', file, extraData: { name }, btn,
      progressContainer: document.getElementById('modal-upload-sticker').querySelector('.modal-body'),
      successMsg: '贴纸上传成功',
    });
    if (res) {
      Modal.close('modal-upload-sticker');
      stickerFileInput.value = '';
      document.getElementById('sticker-preview').classList.remove('show');
      const hint = document.getElementById('sticker-file-hint');
      if (hint) hint.textContent = '';
      // 上传成功后刷新贴纸库
      if (typeof StickerEditor !== 'undefined' && StickerEditor.refreshLibrary) {
        StickerEditor.refreshLibrary();
      }
    }
  });

  // ── 退出登录 ────────────────────────────────
  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    if (!confirm('确认退出登录？')) return;
    await API.logout();
    window.location.href = 'index.php';
  });

  // ── 站点粒子设置由 SiteSettings 模块统一管理 ──

  // ── 移动端汉堡菜单 ────────────────────────────
  const appLayout    = document.getElementById('app-layout');
  const hamburgerBtn = document.getElementById('hamburger-btn');
  const backdrop     = document.getElementById('sidebar-backdrop');

  function openSidebar()  { appLayout?.classList.add('sidebar-open'); }
  function closeSidebar() { appLayout?.classList.remove('sidebar-open'); }

  hamburgerBtn?.addEventListener('click', () => {
    appLayout?.classList.contains('sidebar-open') ? closeSidebar() : openSidebar();
  });
  backdrop?.addEventListener('click', closeSidebar);

  // 点击侧边栏导航项后自动关闭
  document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
    item.addEventListener('click', () => {
      if (window.innerWidth <= 768) closeSidebar();
    });
  });

  // ── 移动端相册照片点击显示操作按钮 ────────────
  document.addEventListener('click', e => {
    const item = e.target.closest('.album-item');
    if (!item) {
      document.querySelectorAll('.album-item.touch-active')
        .forEach(el => el.classList.remove('touch-active'));
      return;
    }
    if (window.innerWidth <= 768 && !e.target.closest('[data-action]')) {
      document.querySelectorAll('.album-item.touch-active')
        .forEach(el => el !== item && el.classList.remove('touch-active'));
      item.classList.toggle('touch-active');
    }
  });

  // ── 默认路由 ────────────────────────────────
  Router.go('dashboard');

  console.log('[同学录后台 v10.5] 初始化完成 ✓');
})();


// ── 站点设置模块 ────────────────────────────
const SiteSettings = (() => {
  const PAGE_LABELS = {
    index:   '主页（书本动画）',
    preface: '前言页',
    roster:  '同学录名册',
    album:   '班级相册',
    // student 粒子已改为在「粒子效果」页面按学生单独设置，此处不再显示
  };
  const PRESET_OPTIONS = [
    {value:'sakura',    label:'🌸 樱花'},
    {value:'stars',     label:'⭐ 星星'},
    {value:'snow',      label:'❄️ 雪花'},
    {value:'confetti',  label:'🎊 彩纸'},
    {value:'fireflies', label:'🌟 萤火虫'},
    {value:'bamboo',    label:'🎋 竹叶'},
    {value:'maple',     label:'🍁 枫叶'},
    {value:'ginkgo',    label:'🍂 银杏'},
    {value:'feather',   label:'🪶 羽毛'},
    {value:'hearts',    label:'❤️ 心形'},
    {value:'bubbles',   label:'🫧 光泡'},
    {value:'paper',     label:'📜 书页'},
    {value:'lite',      label:'✦ 轻量'},
    {value:'none',      label:'○ 关闭'},
  ];

  let config = {};

  // Google Fonts 字体映射（用于动态加载）
  const FONT_LINKS = {
    'Ma Shan Zheng':       'https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&display=swap',
    'ZCOOL XiaoWei':       'https://fonts.googleapis.com/css2?family=ZCOOL+XiaoWei&display=swap',
    'Noto Serif SC':       'https://fonts.googleapis.com/css2?family=Noto+Serif+SC&display=swap',
    'Noto Sans SC':        'https://fonts.googleapis.com/css2?family=Noto+Sans+SC&display=swap',
    'ZCOOL QingKe HuangYou': 'https://fonts.googleapis.com/css2?family=ZCOOL+QingKe+HuangYou&display=swap',
    'Liu Jian Mao Cao':    'https://fonts.googleapis.com/css2?family=Liu+Jian+Mao+Cao&display=swap',
  };

  async function load() {
    try {
      const data = await API.getSiteConfig();
      config = data.config || {};
      render();
      renderTypography();
    } catch(e) {
      const wrap = document.getElementById('site-particle-settings');
      if (wrap) wrap.innerHTML = '<div style="color:var(--danger);font-size:13px;">加载失败: ' + e.message + '<br>请刷新重试</div>';
    }
  }

  function render() {
    const wrap = document.getElementById('site-particle-settings');
    if (!wrap) return;
    const particles = config.particles || {};

    wrap.innerHTML = Object.entries(PAGE_LABELS).map(([page, label]) => {
      const pcfg    = particles[page] || {enabled: true, preset: 'sakura'};
      const enabled = pcfg.enabled !== false;
      const preset  = pcfg.preset || 'sakura';
      return `
        <div style="display:flex;align-items:center;gap:14px;padding:12px 0;border-bottom:1px solid var(--border);">
          <div style="flex:1;font-size:13px;color:var(--text);">${label}</div>
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:12px;color:var(--text-dim);">
            <input type="checkbox" class="sp-enabled" data-page="${page}" ${enabled?'checked':''}>
            开启
          </label>
          <select class="form-control sp-preset" data-page="${page}" style="width:130px;${!enabled?'opacity:.4;pointer-events:none;':''}">
            ${PRESET_OPTIONS.map(o => `<option value="${o.value}" ${preset===o.value?'selected':''}>${o.label}</option>`).join('')}
          </select>
        </div>`;
    }).join('');

    wrap.querySelectorAll('.sp-enabled').forEach(cb => {
      cb.addEventListener('change', () => {
        const sel = wrap.querySelector('.sp-preset[data-page="' + cb.dataset.page + '"]');
        if (sel) { sel.style.opacity = cb.checked?'1':'0.4'; sel.style.pointerEvents = cb.checked?'':'none'; }
      });
    });
  }

  function renderTypography() {
    const typo = config.typography || {};
    const fontFamily = typo.fontFamily || 'default';
    const fontSize   = typo.fontSize   || '15';

    const sel = document.getElementById('site-font-family');
    const sizeRange = document.getElementById('site-font-size');
    const sizeVal   = document.getElementById('site-font-size-val');
    if (sel)       sel.value = fontFamily;
    if (sizeRange) sizeRange.value = fontSize;
    if (sizeVal)   sizeVal.textContent = fontSize + 'px';
    updateFontPreview(fontFamily, fontSize);
  }

  function updateFontPreview(fontFamily, fontSize) {
    const preview = document.getElementById('font-preview-text');
    if (!preview) return;
    const ff = fontFamily === 'default' ? 'inherit' : `"${fontFamily}", sans-serif`;
    preview.style.fontFamily = ff;
    preview.style.fontSize   = fontSize + 'px';
    // 动态加载字体
    if (fontFamily !== 'default' && FONT_LINKS[fontFamily]) {
      const id = 'gfont-' + fontFamily.replace(/\s/g, '-');
      if (!document.getElementById(id)) {
        const link = document.createElement('link');
        link.id   = id;
        link.rel  = 'stylesheet';
        link.href = FONT_LINKS[fontFamily];
        document.head.appendChild(link);
      }
    }
  }

  async function save() {
    const wrap = document.getElementById('site-particle-settings');
    if (!wrap) return;
    const particles = {};
    wrap.querySelectorAll('.sp-enabled').forEach(cb => {
      const page = cb.dataset.page;
      const sel  = wrap.querySelector('.sp-preset[data-page="' + page + '"]');
      particles[page] = { enabled: cb.checked, preset: sel?.value || 'sakura' };
    });

    // 读取字体配置
    const fontFamily = document.getElementById('site-font-family')?.value || 'default';
    const fontSize   = document.getElementById('site-font-size')?.value   || '15';
    const typography = { fontFamily, fontSize };

    const btn = document.getElementById('btn-save-site-settings');
    btnLoading(btn, true);
    try {
      const data = await API.updateSiteConfig({ particles, typography });
      if (data.success) {
        Toast.success('站点设置已保存，前台字体将实时同步');
        config = data.config || config;
      } else Toast.error(data.message || '保存失败');
    } catch(e) {
      Toast.error('保存失败: ' + e.message);
    } finally {
      btnLoading(btn, false);
    }
  }

  function bind() {
    document.getElementById('btn-save-site-settings')?.addEventListener('click', save);
    document.querySelectorAll('.nav-item[data-page="site-settings"]').forEach(btn => {
      btn.addEventListener('click', () => setTimeout(load, 50));
    });

    // ── 修改登录密码 ──
    document.getElementById('btn-change-password')?.addEventListener('click', async () => {
      const oldPwd     = document.getElementById('pwd-old')?.value?.trim()     || '';
      const newPwd     = document.getElementById('pwd-new')?.value?.trim()     || '';
      const confirmPwd = document.getElementById('pwd-confirm')?.value?.trim() || '';
      if (!oldPwd || !newPwd || !confirmPwd) { Toast.error('请填写所有密码字段'); return; }
      if (newPwd !== confirmPwd) { Toast.error('新密码与确认密码不一致'); return; }
      if (newPwd.length < 6) { Toast.error('新密码长度不能少于 6 位'); return; }
      const btn = document.getElementById('btn-change-password');
      btnLoading(btn, true);
      try {
        await API.changePassword(oldPwd, newPwd, confirmPwd);
        Toast.success('密码已修改，即将跳转到登录页…');
        setTimeout(() => { window.location.href = './index.php'; }, 1500);
      } catch(e) {
        Toast.error('修改失败：' + e.message);
        btnLoading(btn, false);
      }
    });
    // 字体选择实时预览
    document.addEventListener('change', e => {
      if (e.target.id === 'site-font-family') {
        updateFontPreview(e.target.value, document.getElementById('site-font-size')?.value || '15');
      }
    });
    document.addEventListener('input', e => {
      if (e.target.id === 'site-font-size') {
        const v = e.target.value;
        const el = document.getElementById('site-font-size-val');
        if (el) el.textContent = v + 'px';
        updateFontPreview(document.getElementById('site-font-family')?.value || 'default', v);
      }
    });
  }

  return { load, bind };
})();
