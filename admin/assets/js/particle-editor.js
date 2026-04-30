
/**
 * 同学录后台 · 粒子效果模块
 * admin/assets/js/particle-editor.js
 */
const ParticleEditor = (() => {
  const PRESETS = [
    { value: 'sakura',    icon: '&#127800;', name: '樱花' },
    { value: 'stars',     icon: '&#11088;', name: '星星' },
    { value: 'snow',      icon: '&#10052;', name: '雪花' },
    { value: 'confetti',  icon: '&#127882;', name: '彩纸' },
    { value: 'fireflies', icon: '&#127775;', name: '萤火虫' },
    { value: 'bamboo',    icon: '&#127819;', name: '竹叶' },
    { value: 'maple',     icon: '&#127809;', name: '枫叶' },
    { value: 'ginkgo',    icon: '&#127810;', name: '银杏' },
    { value: 'feather',   icon: '&#129718;', name: '羽毛' },
    { value: 'hearts',    icon: '&#10084;&#65039;', name: '心形' },
    { value: 'bubbles',   icon: '&#129767;', name: '光泡' },
    { value: 'paper',     icon: '&#128220;', name: '书页' },
    { value: 'lite',      icon: '&#10022;',  name: '轻量' },
    { value: 'none',      icon: '&#9711;',   name: '关闭' },
  ];

  function load(id) {
    const student = StudentsModule.getStudent(id);
    if (!student) return;
    const sel = document.getElementById('particle-student-select');
    if (sel) sel.value = id;
    renderEditor(student);
  }

  function renderEditor(student) {
    const wrap = document.getElementById('particle-editor-wrap');
    if (!wrap) return;
    const current = student.particles || 'sakura';

    // 获取自定义粒子列表
    const customList = (typeof CustomParticlesManager !== 'undefined')
      ? CustomParticlesManager.getAll()
      : [];

    const customOptions = customList.map(p => ({
      value: p.id,
      icon:  `<img src="/assets/images/overlays/${p.file}" style="width:22px;height:22px;object-fit:contain;">`,
      name:  p.name,
      isCustom: true,
    }));

    const allPresets = [...PRESETS.slice(0, -1), ...customOptions, PRESETS[PRESETS.length - 1]];

    wrap.innerHTML = `
      <div class="card">
        <div class="card-header"><span class="card-title">粒子效果 · ${student.name}</span></div>
        <div class="card-body">
          <p style="font-size:13px;color:var(--text-dim);margin-bottom:16px;">
            选择该同学个人主页的粒子飘落效果（自定义粒子在「自定义粒子」页面上传）
          </p>
          <div class="particle-grid" id="particle-grid">
            ${allPresets.map(p => `
              <div class="particle-option ${p.value === current ? 'selected' : ''}" data-value="${p.value}"
                   ${p.isCustom ? 'data-custom="1" data-file="'+p.icon+'"' : ''}>
                <span class="p-icon">${p.icon}</span>
                <div class="p-name">${p.name}</div>
              </div>
            `).join('')}
          </div>
          <div style="margin-top:20px;display:flex;justify-content:flex-end;">
            <button class="btn btn-primary" id="btn-save-particle">保存并生成</button>
          </div>
        </div>
      </div>
    `;

    let selected = current;
    document.querySelectorAll('.particle-option').forEach(opt => {
      opt.addEventListener('click', () => {
        document.querySelectorAll('.particle-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        selected = opt.dataset.value;
      });
    });

    document.getElementById('btn-save-particle')?.addEventListener('click', async () => {
      const btn = document.getElementById('btn-save-particle');
      btnLoading(btn, true);
      try {
        await API.updateStudent(student.id, { particles: selected });
        Toast.success('粒子效果已更新');
        StudentsModule.load();
      } catch(e) {
        Toast.error('保存失败: ' + e.message);
      } finally {
        btnLoading(btn, false);
      }
    });
  }

  function bindSelect() {
    const sel = document.getElementById('particle-student-select');
    if (!sel) return;
    sel.addEventListener('change', () => { if (sel.value) load(sel.value); });
  }

  return { load, bindSelect };
})();
