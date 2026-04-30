/**
 * 同学录后台 · 音乐设置模块
 * admin/assets/js/music-editor.js
 *
 * 修复点：
 * 1. 上传区域移出 #music-settings（pointer-events:none 区域），确保始终可点击
 * 2. music.src 为空时，"启用音乐"开关初始渲染为 disabled
 * 3. 选择文件后解除开关禁用
 * 4. 上传进度条正常显示
 * 5. 保存时若无 src 且未选文件，强制禁用开关并提示
 */
// 内联 escapeHtml（防止外部依赖缺失）
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const MusicEditor = (() => {
  function load(id) {
    const student = StudentsModule.getStudent(id);
    if (!student) return;
    const sel = document.getElementById('music-student-select');
    if (sel) sel.value = id;
    renderEditor(student);
  }

  function renderEditor(student) {
    const wrap = document.getElementById('music-editor-wrap');
    if (!wrap) return;
    const music = student.music || {};

    // 判断是否已有真实上传的音乐文件
    const hasSrc = !!(music.src && music.src.trim());

    // 构建当前音乐预览区块（在 settings 区域内）
    const currentMusicHtml = hasSrc ? `
      <div style="margin-bottom:16px;" id="music-current-preview">
        <label class="form-label">当前音乐（已上传）</label>
        <div style="background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:12px 14px;margin-top:6px;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
            <span style="font-size:22px;line-height:1;">&#127925;</span>
            <div style="flex:1;min-width:0;">
              <div style="font-size:13px;font-weight:600;color:var(--gold);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(music.title || '未命名音乐')}</div>
              <div style="font-size:11px;color:var(--text-dim);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(music.src.split('/').pop())}</div>
            </div>
            <span style="font-size:11px;color:#4caf50;font-weight:600;white-space:nowrap;">&#10003; 已上传</span>
          </div>
          <audio id="music-preview-player" controls style="width:100%;" src="/${escapeHtml(music.src)}"></audio>
        </div>
      </div>` : '';

    // 开关禁用提示（无音乐时显示）
    const toggleDisabledTip = !hasSrc
      ? `<span id="music-toggle-tip" style="font-size:11px;color:#e53e3e;margin-left:8px;">请先上传音乐文件</span>`
      : `<span id="music-toggle-tip" style="display:none;font-size:11px;color:#e53e3e;margin-left:8px;">请先上传音乐文件</span>`;

    wrap.innerHTML = `
      <div class="card">
        <div class="card-header"><span class="card-title">背景音乐设置 · ${escapeHtml(student.name)}</span></div>
        <div class="card-body">

          <!-- ① 启用开关（始终可见） -->
          <div class="toggle-wrap" style="margin-bottom:20px;align-items:center;">
            <label class="toggle">
              <input type="checkbox" id="music-enabled"
                ${music.enabled && hasSrc ? 'checked' : ''}
                ${!hasSrc ? 'disabled' : ''}>
              <span class="toggle-slider" style="${!hasSrc ? 'opacity:0.45;cursor:not-allowed;' : ''}"></span>
            </label>
            <span style="font-size:13px;color:var(--text-dim);">启用背景音乐</span>
            ${toggleDisabledTip}
          </div>

          <!-- ② 上传区域：独立于 music-settings，始终 pointer-events:auto -->
          <div id="music-upload-section" style="margin-bottom:20px;">
            <label class="form-label">${hasSrc ? '替换音乐文件' : '上传音乐文件'}</label>
            <div class="upload-area" id="music-upload-area" style="pointer-events:auto !important;">
              <input type="file" id="music-file-input" accept=".mp3,.ogg,.m4a" style="pointer-events:auto !important;">
              <div class="upload-icon">&#127925;</div>
              <div class="upload-text">${hasSrc ? '点击替换音乐文件' : '点击上传音乐文件'}</div>
              <div class="upload-hint">支持 MP3 / OGG / M4A，最大 20MB</div>
            </div>
            <!-- 已选文件预览 -->
            <div id="music-selected-file" style="display:none;margin-top:8px;padding:8px 12px;background:var(--bg3);border:1px solid var(--border);border-radius:6px;font-size:12px;color:var(--text-dim);">
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="font-size:14px;">&#127925;</span>
                <span id="music-selected-name" style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"></span>
                <span id="music-selected-size" style="color:var(--gold);white-space:nowrap;"></span>
              </div>
            </div>
            <!-- 上传进度条 -->
            <div id="music-upload-progress-wrap" style="margin-top:8px;"></div>
          </div>

          <!-- ③ 其他设置（无音乐时半透明禁用，但不影响上传区） -->
          <div id="music-settings" style="${music.enabled && hasSrc ? '' : 'opacity:0.4;pointer-events:none'}">
            <div class="form-row">
              <div class="form-group full">
                <label class="form-label">歌曲名称（显示在播放器上）</label>
                <input type="text" class="form-control" id="music-title" value="${escapeHtml(music.title || '')}" placeholder="如：晴天 - 周杰伦">
              </div>
            </div>

            <!-- 当前音乐预览（已上传时显示） -->
            ${currentMusicHtml}

            <div class="form-row">
              <div class="form-group">
                <div class="toggle-wrap">
                  <label class="toggle">
                    <input type="checkbox" id="music-autoplay" ${music.autoplay !== false ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                  </label>
                  <span style="font-size:13px;color:var(--text-dim);">自动播放</span>
                </div>
              </div>
              <div class="form-group">
                <div class="toggle-wrap">
                  <label class="toggle">
                    <input type="checkbox" id="music-loop" ${music.loop !== false ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                  </label>
                  <span style="font-size:13px;color:var(--text-dim);">循环播放</span>
                </div>
              </div>
            </div>
          </div>

          <!-- ④ 操作按钮 -->
          <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px;flex-wrap:wrap;">
            ${hasSrc ? `<button class="btn btn-danger" id="btn-delete-music" style="margin-right:auto;">&#128465; 删除音乐</button>` : ''}
            <button class="btn btn-secondary" id="btn-music-upload-only">仅上传文件</button>
            <button class="btn btn-primary" id="btn-save-music">保存设置</button>
          </div>

        </div>
      </div>
    `;

    // ── 删除音乐文件 ──────────────────────────────────────────────────────
    document.getElementById('btn-delete-music')?.addEventListener('click', async () => {
      if (!music.src) return;
      if (!confirm(`确认删除音乐文件「${music.src}」？此操作不可撤销。`)) return;
      const btn = document.getElementById('btn-delete-music');
      btnLoading(btn, true);
      try {
        await API.updateStudent(student.id, {
          music: { ...music, enabled: false, src: '', title: '' }
        });
        Toast.success('音乐已删除');
        StudentsModule.load();
        load(student.id);
      } catch(e) {
        Toast.error('删除失败: ' + e.message);
      } finally {
        btnLoading(btn, false);
      }
    });

    // ── Toggle 联动（启用前校验是否已上传音乐） ───────────────────────────
    document.getElementById('music-enabled')?.addEventListener('change', e => {
      if (e.target.checked) {
        const hasSavedSrc = !!(music.src && music.src.trim());
        const hasNewFile  = !!(document.getElementById('music-file-input')?.files?.[0]);
        if (!hasSavedSrc && !hasNewFile) {
          e.target.checked = false;
          Toast.error('请先上传音乐文件，再启用背景音乐');
          return;
        }
      }
      document.getElementById('music-settings').style.cssText =
        e.target.checked ? '' : 'opacity:0.4;pointer-events:none';
    });

    // ── 初始化上传区域拖拽 ────────────────────────────────────────────────
    const musicUploadArea = document.getElementById('music-upload-area');
    const musicFileInput  = document.getElementById('music-file-input');

    if (musicUploadArea) {
      // 拖拽支持
      initDropZone(musicUploadArea);

      // 点击上传区域 → 触发 file input（兜底：防止 CSS pointer-events 继承导致失效）
      musicUploadArea.addEventListener('click', e => {
        // 如果点击的不是 input 本身，手动触发 input.click()
        if (e.target !== musicFileInput) {
          e.preventDefault();
          e.stopPropagation();
          musicFileInput?.click();
        }
      });
    }

    // ── 文件选择后：显示预览，解除开关禁用 ──────────────────────────────
    musicFileInput?.addEventListener('change', () => {
      const file = musicFileInput.files[0];
      const uploadText    = musicUploadArea?.querySelector('.upload-text');
      const selectedFile  = document.getElementById('music-selected-file');
      const selectedName  = document.getElementById('music-selected-name');
      const selectedSize  = document.getElementById('music-selected-size');
      const enabledCb     = document.getElementById('music-enabled');
      const toggleTip     = document.getElementById('music-toggle-tip');
      const toggleSlider  = enabledCb?.nextElementSibling;

      if (file) {
        if (uploadText)   uploadText.textContent = '已选择：' + file.name;
        if (selectedFile) selectedFile.style.display = 'block';
        if (selectedName) selectedName.textContent = file.name;
        if (selectedSize) selectedSize.textContent = (file.size / 1024 / 1024).toFixed(2) + ' MB';

        // 解除开关禁用
        if (enabledCb && enabledCb.disabled) {
          enabledCb.disabled = false;
          if (toggleSlider) toggleSlider.style.cssText = '';
          if (toggleTip)    toggleTip.style.display = 'none';
        }
        // 解除 music-settings 禁用，允许填写歌曲名称等
        const settingsDiv = document.getElementById('music-settings');
        if (settingsDiv) settingsDiv.style.cssText = '';
      } else {
        if (uploadText)   uploadText.textContent = hasSrc ? '点击替换音乐文件' : '点击上传音乐文件';
        if (selectedFile) selectedFile.style.display = 'none';

        if (!hasSrc && enabledCb) {
          enabledCb.disabled = true;
          enabledCb.checked  = false;
          if (toggleSlider) toggleSlider.style.cssText = 'opacity:0.45;cursor:not-allowed;';
          if (toggleTip)    toggleTip.style.display = '';
          const settingsDiv = document.getElementById('music-settings');
          if (settingsDiv) settingsDiv.style.cssText = 'opacity:0.4;pointer-events:none';
        }
      }
    });

    // ── 仅上传文件 ────────────────────────────────────────────────────────
    document.getElementById('btn-music-upload-only')?.addEventListener('click', async () => {
      const file = musicFileInput?.files[0];
      if (!file) { Toast.warning('请先选择音乐文件'); return; }
      const btn         = document.getElementById('btn-music-upload-only');
      const progressWrap = document.getElementById('music-upload-progress-wrap');
      try {
        const res = await doUploadWithProgress({
          type: 'music', file, studentId: student.id, btn,
          progressContainer: progressWrap,
          successMsg: '音乐文件已上传',
        });
        if (res) {
          StudentsModule.load();
          load(student.id);
        }
      } catch(e) {
        // doUploadWithProgress 内部已处理错误 Toast
      }
    });

    // ── 保存设置 ──────────────────────────────────────────────────────────
    document.getElementById('btn-save-music')?.addEventListener('click', async () => {
      const btn = document.getElementById('btn-save-music');
      btnLoading(btn, true);
      try {
        let src  = music.src || '';
        const file = musicFileInput?.files[0];
        if (file) {
          const progressWrap = document.getElementById('music-upload-progress-wrap');
          const res = await doUploadWithProgress({
            type: 'music', file, studentId: student.id,
            progressContainer: progressWrap,
            successMsg: '音乐上传成功',
          });
          if (!res) { btnLoading(btn, false); return; }
          src = res.path;
        }

        const enabledChecked = document.getElementById('music-enabled')?.checked || false;
        if (!src && enabledChecked) {
          Toast.error('请先上传音乐文件，再启用背景音乐');
          btnLoading(btn, false);
          return;
        }

        const musicData = {
          enabled:  src ? enabledChecked : false,
          src,
          title:    document.getElementById('music-title')?.value || '',
          autoplay: document.getElementById('music-autoplay')?.checked !== false,
          loop:     document.getElementById('music-loop')?.checked !== false,
        };
        await API.updateStudent(student.id, { music: musicData });
        Toast.success('音乐设置已保存，页面已重新生成');
        StudentsModule.load();
        load(student.id);
      } catch(e) {
        Toast.error('保存失败: ' + e.message);
      } finally {
        btnLoading(btn, false);
      }
    });
  }

  function bindSelect() {
    const sel = document.getElementById('music-student-select');
    if (!sel) return;
    sel.addEventListener('change', () => { if (sel.value) load(sel.value); });
  }

  return { load, bindSelect };
})();
