/**
 * 同学录后台 · 内容管理模块
 * admin/assets/js/content-editor.js
 */
const ContentEditor = (() => {
  let config = {};

  async function load() {
    try {
      const data = await API.getSiteConfig();
      config = data.config || {};
      render();
    } catch(e) {
      Toast.error('加载内容配置失败: ' + e.message);
    }
  }

  function render() {
    const f = config.footer || {};
    const p = config.preface || {};
    const acks = config.acknowledgments || [];

    // 备案
    const beianEl = document.getElementById('ct-beian');
    const beianUrlEl = document.getElementById('ct-beian-url');
    const copyrightEl = document.getElementById('ct-copyright');
    if (beianEl) beianEl.value = f.beian || '';
    if (beianUrlEl) beianUrlEl.value = f.beianUrl || 'https://beian.miit.gov.cn/';
    if (copyrightEl) copyrightEl.value = f.copyright || '同学录 · 青春回忆';

    // 前言
    const titleEl = document.getElementById('ct-preface-title');
    const subEl = document.getElementById('ct-preface-subtitle');
    const contentEl = document.getElementById('ct-preface-content');
    if (titleEl) titleEl.value = p.title || '致青春岁月';
    if (subEl) subEl.value = p.subtitle || '写在翻开同学录之前';
    if (contentEl) contentEl.value = p.content || '';

    // 致谢人物
    renderAcks(acks);
  }

  function renderAcks(acks) {
    const wrap = document.getElementById('ack-editor-list');
    if (!wrap) return;

    // 确保恰好3人
    while (acks.length < 3) acks.push({ name: '', role: '', tip: '', avatar: '' });
    acks = acks.slice(0, 3);

    wrap.innerHTML = acks.map((a, i) => {
      const avatarSrc = a.avatar
        ? `<img src="../${a.avatar}?t=${Date.now()}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;">`
        : `<div style="width:36px;height:36px;border-radius:50%;background:var(--gold-dim);display:flex;align-items:center;justify-content:center;font-size:16px;color:var(--gold);">${(a.name || '?').charAt(0)}</div>`;
      return `
      <div class="ack-edit-row" style="display:flex;gap:10px;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);flex-wrap:wrap;">
        <div class="ack-avatar-wrap" data-idx="${i}" title="点击上传头像" style="cursor:pointer;position:relative;flex-shrink:0;">
          ${avatarSrc}
          <div style="position:absolute;bottom:-2px;right:-2px;width:14px;height:14px;border-radius:50%;background:var(--gold);display:flex;align-items:center;justify-content:center;font-size:9px;">📷</div>
        </div>
        <input type="file" class="ack-avatar-file" data-idx="${i}" accept="image/jpeg,image/png,image/webp" style="display:none;">
        <input type="hidden" class="ack-avatar-path" data-idx="${i}" value="${a.avatar || ''}">
        ${a.avatar ? `<button class="btn btn-danger btn-sm ack-avatar-del" data-idx="${i}" title="删除头像" style="padding:2px 7px;font-size:11px;flex-shrink:0;">×</button>` : ''}
        <input type="text" class="form-control ack-name" data-idx="${i}" value="${a.name || ''}" placeholder="姓名" style="flex:1;min-width:80px;">
        <input type="text" class="form-control ack-role" data-idx="${i}" value="${a.role || ''}" placeholder="角色/称号" style="flex:1;min-width:80px;">
        <input type="text" class="form-control ack-tip" data-idx="${i}" value="${a.tip || ''}" placeholder="点击提示语" style="flex:1;min-width:80px;">
      </div>
    `}).join('');

    // 绑定头像上传事件
    wrap.querySelectorAll('.ack-avatar-wrap').forEach(avatarWrap => {
      const idx = avatarWrap.dataset.idx;
      const fileInput = wrap.querySelector(`.ack-avatar-file[data-idx="${idx}"]`);
      avatarWrap.addEventListener('click', () => fileInput && fileInput.click());
      if (fileInput) {
        fileInput.addEventListener('change', async () => {
          const file = fileInput.files[0];
          if (!file) return;
          const formData = new FormData();
          formData.append('file', file);
          try {
            Toast.info && Toast.info('上传中...');
            const resp = await fetch(`api/upload.php?type=ack-avatar&id=${idx}`, {
              method: 'POST',
              body: formData
            });
            const data = await resp.json();
            if (data.success) {
              // 更新头像预览
              const pathInput = wrap.querySelector(`.ack-avatar-path[data-idx="${idx}"]`);
              if (pathInput) pathInput.value = data.path || '';
              // 刷新头像图片
              const img = avatarWrap.querySelector('img');
              const placeholder = avatarWrap.querySelector('div:not([style*="position:absolute"])');
              if (img) {
                img.src = `../${data.path}?t=${Date.now()}`;
              } else if (placeholder && data.path) {
                placeholder.outerHTML = `<img src="../${data.path}?t=${Date.now()}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;">`;
              }
              Toast.success('头像上传成功');
            } else {
              Toast.error('上传失败: ' + (data.message || '未知错误'));
            }
          } catch(e) {
            Toast.error('上传失败: ' + e.message);
          }
          fileInput.value = '';
        });
      }
    });

    // 删除头像按钮
    wrap.querySelectorAll('.ack-avatar-del').forEach(delBtn => {
      delBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const idx = delBtn.dataset.idx;
        if (!confirm('确认删除该致谢人物的头像？')) return;
        const pathInput = wrap.querySelector(`.ack-avatar-path[data-idx="${idx}"]`);
        if (pathInput) pathInput.value = '';
        // 将头像替换为首字占位
        const avatarWrap = wrap.querySelector(`.ack-avatar-wrap[data-idx="${idx}"]`);
        const nameVal = wrap.querySelector(`.ack-name[data-idx="${idx}"]`)?.value || '?';
        const img = avatarWrap?.querySelector('img');
        if (img) img.outerHTML = `<div style="width:36px;height:36px;border-radius:50%;background:var(--gold-dim);display:flex;align-items:center;justify-content:center;font-size:16px;color:var(--gold);">${nameVal.charAt(0)}</div>`;
        delBtn.remove();
        Toast.success('头像已清除，请点击「保存内容」以生效');
      });
    });

    // 姓名变化时同步更新头像首字占位
    wrap.querySelectorAll('.ack-name').forEach(nameInput => {
      nameInput.addEventListener('input', () => {
        const idx = nameInput.dataset.idx;
        const avatarWrap = wrap.querySelector(`.ack-avatar-wrap[data-idx="${idx}"]`);
        const pathInput = wrap.querySelector(`.ack-avatar-path[data-idx="${idx}"]`);
        if (avatarWrap && !pathInput?.value) {
          const placeholder = avatarWrap.querySelector('div:not([style*="position:absolute"])');
          if (placeholder) placeholder.textContent = (nameInput.value || '?').charAt(0);
        }
      });
    });
  }

  function collectAcks() {
    const names = document.querySelectorAll('.ack-name');
    const roles = document.querySelectorAll('.ack-role');
    const tips  = document.querySelectorAll('.ack-tip');
    const avatarPaths = document.querySelectorAll('.ack-avatar-path');
    const result = [];
    names.forEach((el, i) => {
      result.push({
        name:   el.value.trim(),
        role:   roles[i]?.value.trim() || '',
        tip:    tips[i]?.value.trim() || '',
        avatar: avatarPaths[i]?.value.trim() || '',
      });
    });
    return result;
  }

  async function save() {
    const btn = document.getElementById('btn-save-content');
    btnLoading(btn, true);
    try {
      const body = {
        footer: {
          beian:     document.getElementById('ct-beian')?.value.trim() || '',
          beianUrl:  document.getElementById('ct-beian-url')?.value.trim() || 'https://beian.miit.gov.cn/',
          copyright: document.getElementById('ct-copyright')?.value.trim() || '同学录 · 青春回忆',
        },
        preface: {
          title:    document.getElementById('ct-preface-title')?.value.trim() || '致青春岁月',
          subtitle: document.getElementById('ct-preface-subtitle')?.value.trim() || '',
          content:  document.getElementById('ct-preface-content')?.value.trim() || '',
        },
        acknowledgments: collectAcks(),
      };
      const data = await API.updateSiteConfig(body);
      if (data.success) {
        Toast.success('内容已保存，刷新前台页面即可看到更新');
        config = data.config || config;
      } else {
        Toast.error(data.message || '保存失败');
      }
    } catch(e) {
      Toast.error('保存失败: ' + e.message);
    } finally {
      btnLoading(btn, false);
    }
  }

  function bind() {
    document.getElementById('btn-save-content')?.addEventListener('click', save);
    // 致谢人物固定3人，无需添加按钮
    // 切换到内容管理页时自动加载
    document.querySelectorAll('.nav-item[data-page="content"]').forEach(btn => {
      btn.addEventListener('click', () => setTimeout(load, 50));
    });
  }

  return { load, bind };
})();
