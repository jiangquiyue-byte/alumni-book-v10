/**
 * 同学录后台 · 信息编辑模块
 * admin/assets/js/info-editor.js
 */
const InfoEditor = (() => {
  let currentStudent = null;

  const FIELDS = [
    // [字段key, 标签, 类型, placeholder]
    { section: '基础信息', fields: [
      ['name',           '姓名',     'text',     '必填'],
      ['nickname',       '昵称',     'text',     ''],
      ['gender',         '性别',     'select',   ['男','女','保密']],
      ['birthday',       '出生日期', 'text',     '如：2008年3月15日'],
      ['school',         '学校',     'text',     ''],
      ['class',          '班级',     'text',     '如：高三(2)班'],
      ['graduationYear', '毕业年份', 'text',     '如：2025'],
    ]},
    { section: '联系方式', fields: [
      ['qq',      'QQ',   'text', ''],
      ['wechat',  '微信', 'text', ''],
      ['weibo',   '微博', 'text', ''],
      ['phone',   '手机', 'text', ''],
      ['email',   '邮箱', 'email',''],
      ['address', '常住地','text',''],
    ]},
    { section: '社交账号', fields: [
      ['douyinId',      '抖音号',  'text', ''],
      ['kuaishou',      '快手',    'text', ''],
      ['bilibili',      'B站',     'text', ''],
    ]},
    { section: '个性标签', fields: [
      ['mbti',        'MBTI',   'text',   '如：INFP'],
      ['bloodType',   '血型',   'select', ['A','B','AB','O','不知道']],
      ['astro',       '星座',   'select', ['白羊','金牛','双子','巨蟹','狮子','处女','天秤','天蝎','射手','摩羯','水瓶','双鱼']],
      ['strengths',   '擅长的事',   'text',''],
      ['weaknesses',  '不擅长的事', 'text',''],
      ['bestSubject', '最喜欢科目', 'text',''],
      ['worstSubject','最讨厌科目', 'text',''],
      ['motto',       '座右铭',   'textarea',''],
    ]},
    { section: '兴趣爱好', fields: [
      ['favoriteIdol',  '喜欢明星', 'text',''],
      ['favoriteAnime', '喜欢动漫', 'text',''],
      ['favoriteMovie', '喜欢电影', 'text',''],
      ['favoriteSong',  '喜欢歌曲', 'text',''],
      ['favoriteGame',  '喜欢游戏', 'text',''],
      ['favoriteFood',  '喜欢食物', 'text',''],
      ['favoriteColor', '喜欢颜色', 'text',''],
      ['favoriteSport', '喜欢运动', 'text',''],
    ]},
    { section: '校园回忆', fields: [
      ['bestMemory',          '最难忘的一件事',       'textarea',''],
      ['bestLesson',          '最难忘的一节课',       'textarea',''],
      ['deskmateFun',         '同桌趣事',             'textarea',''],
      ['classMeme',           '班级经典梗',           'textarea',''],
      ['embarrassingMoment',  '最社死瞬间',           'textarea',''],
      ['proudestAchievement', '学生时代最骄傲的事',   'textarea',''],
    ]},
    { section: '未来规划', fields: [
      ['targetUniversity', '目标大学', 'text',''],
      ['targetMajor',      '目标专业', 'text',''],
      ['futureCareer',     '未来职业', 'text',''],
      ['futureCity',       '未来城市', 'text',''],
      ['futureSelf',       '十年后的自己',     'textarea',''],
      ['letterToFuture',   '给未来自己的话',   'textarea',''],
    ]},
    { section: '给同学们的话', fields: [
      ['letterToClassmates', '心里话', 'textarea',''],
    ]},
  ];

  // ── 加载并渲染编辑器 ──────────────────────────
  function load(id) {
    const student = StudentsModule.getStudent(id);
    if (!student) { Toast.error('找不到该学生'); return; }

    currentStudent = student;
    const select = document.getElementById('info-student-select');
    if (select) select.value = id;

    renderEditor(student);
  }

  function renderEditor(student) {
    const wrap = document.getElementById('info-editor-wrap');
    if (!wrap) return;

    const info = student.info || {};
    let html = `
      <!-- 头像上传 -->
      <div class="card" style="margin-bottom:20px;">
        <div class="card-header"><span class="card-title">头像</span></div>
        <div class="card-body" style="display:flex;align-items:flex-start;gap:24px;flex-wrap:wrap;">
          <div>
            <div class="avatar-preview-wrap">
              <div class="avatar-preview" id="avatar-preview-box">
                ${student.hasAvatar
                  ? `<img src="../${student.avatar}?t=${Date.now()}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
                  : `<span style="font-size:36px;color:var(--gold)">${student.name.slice(0,1)}</span>`}
              </div>
            </div>
            <div style="text-align:center;font-size:11px;color:var(--text-muted);margin-top:4px;">实时预览 · 选图后可拖动调整位置</div>
            <!-- 裁剪滑块 -->
            <div id="avatar-crop-controls" style="display:none;margin-top:10px;width:100px;">
              <label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:4px;">缩放</label>
              <input type="range" id="avatar-scale" min="0.5" max="3" step="0.05" value="1" style="width:100%;">
            </div>
          </div>
          <div style="flex:1;min-width:200px;">
            <div class="upload-area" id="avatar-upload-area">
              <input type="file" id="avatar-file-input" accept=".jpg,.jpeg,.png,.webp">
              <div class="upload-icon">👤</div>
              <div class="upload-text">点击上传头像</div>
              <div class="upload-hint">支持 JPG / PNG / WebP，将自动裁剪为圆形</div>
            </div>
            <button class="btn btn-primary" style="margin-top:10px;width:100%;" id="btn-upload-avatar">上传头像</button>
          </div>
        </div>
      </div>
    `;

    // 各信息区块
    FIELDS.forEach(group => {
      html += `<div class="card" style="margin-bottom:16px;">
        <div class="card-header"><span class="card-title">${group.section}</span></div>
        <div class="card-body">
          <div class="form-row">`;

      group.fields.forEach(([key, label, type, opts]) => {
        const val = info[key] || '';
        const fullClass = (type === 'textarea') ? ' full' : '';
        html += `<div class="form-group${fullClass}">
          <label class="form-label">${label}</label>`;

        if (type === 'textarea') {
          html += `<textarea class="form-control" data-field="${key}" rows="3">${escHtml(val)}</textarea>`;
        } else if (type === 'select') {
          const options = Array.isArray(opts) ? opts : [];
          html += `<select class="form-control" data-field="${key}">
            <option value="">暂未填写</option>
            ${options.map(o => `<option value="${o}" ${val===o?'selected':''}>${o}</option>`).join('')}
          </select>`;
        } else {
          html += `<input type="${type}" class="form-control" data-field="${key}" value="${escHtml(val)}" placeholder="${Array.isArray(opts)?'':opts||''}">`;
        }
        html += `</div>`;
      });

      html += `</div></div></div>`;
    });

    html += `
      <div style="display:flex;justify-content:flex-end;gap:12px;margin-top:8px;">
        <button class="btn btn-secondary" id="btn-regen-page">仅重新生成页面</button>
        <button class="btn btn-primary" id="btn-save-info">保存所有信息</button>
      </div>`;

    wrap.innerHTML = html;

    // 绑定头像上传
    bindAvatarUpload(student);

    // 保存按钮（底部）
    document.getElementById('btn-save-info')?.addEventListener('click', () => saveInfo(student.id));
    document.getElementById('btn-regen-page')?.addEventListener('click', () => regenPage(student.id));

    // 顶部保存按钮（始终可见）
    const topSave = document.getElementById('btn-save-info-top');
    const topRegen = document.getElementById('btn-regen-page-top');
    if (topSave) { topSave.style.display = ''; topSave.onclick = () => saveInfo(student.id); }
    if (topRegen) { topRegen.style.display = ''; topRegen.onclick = () => regenPage(student.id); }

    // 上传区拖拽
    const avatarArea = document.getElementById('avatar-upload-area');
    if (avatarArea) initDropZone(avatarArea);
  }

  function bindAvatarUpload(student) {
    const fileInput = document.getElementById('avatar-file-input');
    const previewBox = document.getElementById('avatar-preview-box');
    const uploadBtn  = document.getElementById('btn-upload-avatar');
    const cropControls = document.getElementById('avatar-crop-controls');
    const scaleSlider  = document.getElementById('avatar-scale');

    if (!fileInput) return;

    // 拖拽状态
    let isDragging = false, startX = 0, startY = 0;
    let imgOffsetX = 0, imgOffsetY = 0, currentScale = 1;
    let currentImg = null;

    function applyTransform() {
      if (!currentImg) return;
      currentImg.style.transform = `translate(${imgOffsetX}px, ${imgOffsetY}px) scale(${currentScale})`;
    }

    function attachDrag(img) {
      currentImg = img;
      img.style.position = 'absolute';
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      img.style.borderRadius = '50%';
      img.style.cursor = 'grab';
      img.style.transformOrigin = 'center';
      img.style.userSelect = 'none';
      img.style.pointerEvents = 'all';
      imgOffsetX = 0; imgOffsetY = 0; currentScale = 1;
      if (scaleSlider) scaleSlider.value = 1;
      applyTransform();

      img.addEventListener('mousedown', e => {
        isDragging = true; startX = e.clientX - imgOffsetX; startY = e.clientY - imgOffsetY;
        img.style.cursor = 'grabbing'; e.preventDefault();
      });
      img.addEventListener('touchstart', e => {
        isDragging = true;
        startX = e.touches[0].clientX - imgOffsetX;
        startY = e.touches[0].clientY - imgOffsetY;
        e.preventDefault();
      }, { passive: false });
    }

    window.addEventListener('mousemove', e => {
      if (!isDragging || !currentImg) return;
      imgOffsetX = e.clientX - startX; imgOffsetY = e.clientY - startY;
      applyTransform();
    });
    window.addEventListener('touchmove', e => {
      if (!isDragging || !currentImg) return;
      imgOffsetX = e.touches[0].clientX - startX;
      imgOffsetY = e.touches[0].clientY - startY;
      applyTransform();
    }, { passive: true });
    window.addEventListener('mouseup',  () => { isDragging = false; if (currentImg) currentImg.style.cursor = 'grab'; });
    window.addEventListener('touchend', () => { isDragging = false; });

    // 缩放滑块
    scaleSlider?.addEventListener('input', () => {
      currentScale = parseFloat(scaleSlider.value);
      applyTransform();
    });

    // 预览（选图后立即显示 + 拖拽调整）
    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = e => {
        previewBox.style.overflow = 'hidden';
        previewBox.style.position = 'relative';
        const img = document.createElement('img');
        img.src = e.target.result;
        img.alt = '';
        previewBox.innerHTML = '';
        previewBox.appendChild(img);
        attachDrag(img);
        if (cropControls) cropControls.style.display = 'block';
        Toast.info('选图成功，可拖动调整位置，滑动缩放后上传');
      };
      reader.readAsDataURL(file);
    });

    // 上传
    uploadBtn?.addEventListener('click', async () => {
      const file = fileInput.files[0];
      if (!file) { Toast.warning('请先选择图片'); return; }
      const wrap = document.getElementById('info-editor-wrap');
      const res = await doUploadWithProgress({
        type: 'avatar', file, studentId: student.id, btn: uploadBtn,
        progressContainer: wrap,
        successMsg: '头像上传成功',
      });
      if (!res) return;
      const img = document.createElement('img');
      img.src = `/${res.path}?t=${Date.now()}`;
      img.alt = '';
      previewBox.innerHTML = '';
      previewBox.style.overflow = 'hidden';
      previewBox.style.position = 'relative';
      previewBox.appendChild(img);
      attachDrag(img);
      if (cropControls) cropControls.style.display = 'none';
      StudentsModule.load();
    });
  }

  // ── 收集表单数据 ──────────────────────────────
  function collectInfo() {
    const info = {};
    const wrap = document.getElementById('info-editor-wrap');
    if (!wrap) return info;
    wrap.querySelectorAll('[data-field]').forEach(el => {
      info[el.dataset.field] = el.value;
    });
    return info;
  }

  // ── 保存信息 ──────────────────────────────────
  async function saveInfo(id) {
    const btn = document.getElementById('btn-save-info');
    btnLoading(btn, true);
    try {
      const info = collectInfo();
      await API.updateStudent(id, { info });
      Toast.success('信息已保存，页面已重新生成');
      StudentsModule.load();
    } catch(e) {
      Toast.error('保存失败: ' + e.message);
    } finally {
      btnLoading(btn, false);
    }
  }

  // ── 仅重新生成页面 ────────────────────────────
  async function regenPage(id) {
    const btn = document.getElementById('btn-regen-page');
    btnLoading(btn, true);
    try {
      await API.updateStudent(id, {}); // 触发生成
      Toast.success('页面已重新生成');
    } catch(e) {
      Toast.error('失败: ' + e.message);
    } finally {
      btnLoading(btn, false);
    }
  }

  function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── Select 联动 ──────────────────────────────
  function bindSelect() {
    const sel = document.getElementById('info-student-select');
    if (!sel) return;
    sel.addEventListener('change', () => {
      if (sel.value) load(sel.value);
    });
  }

  return { load, bindSelect };
})();
