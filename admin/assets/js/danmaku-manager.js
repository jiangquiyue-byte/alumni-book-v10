const DanmakuManager = (() => {
  let students = [];
  let loading = false;

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function els() {
    return {
      author: document.getElementById('danmaku-filter-author'),
      status: document.getElementById('danmaku-filter-status'),
      search: document.getElementById('danmaku-search'),
      refresh: document.getElementById('btn-refresh-danmaku'),
      wrap: document.getElementById('danmaku-list-wrap'),
      total: document.getElementById('danmaku-stat-total'),
      active: document.getElementById('danmaku-stat-active'),
      today: document.getElementById('danmaku-stat-today'),
      anonymous: document.getElementById('danmaku-stat-anonymous'),
    };
  }

  async function loadAuthors() {
    try {
      const data = await API.getStudents();
      students = Array.isArray(data.students) ? data.students : [];
      renderAuthors();
    } catch (e) {
      console.warn('[DanmakuManager] 加载学生失败', e);
    }
  }

  function renderAuthors() {
    const { author } = els();
    if (!author) return;
    const current = author.value;
    author.innerHTML = '<option value="">全部同学</option>' + students.map(item => {
      const name = escapeHtml(item.name || '');
      return `<option value="${name}">${name}</option>`;
    }).join('');
    author.value = current;
  }

  function getParams() {
    const { author, status, search } = els();
    return {
      author: author?.value || '',
      status: status?.value || 'all',
      keyword: search?.value?.trim() || '',
    };
  }

  function renderStats(stats = {}) {
    const { total, active, today, anonymous } = els();
    if (total) total.textContent = stats.total ?? '0';
    if (active) active.textContent = stats.active ?? '0';
    if (today) today.textContent = stats.today ?? '0';
    if (anonymous) anonymous.textContent = stats.anonymous ?? '0';
  }

  function badge(text, type = 'default') {
    const colorMap = {
      default: 'rgba(201,168,76,.14)',
      danger: 'rgba(224,92,92,.14)',
      success: 'rgba(88,163,112,.14)',
      muted: 'rgba(255,255,255,.08)',
    };
    const textMap = {
      default: 'var(--gold)',
      danger: 'var(--danger)',
      success: 'var(--success)',
      muted: 'var(--text-dim)',
    };
    return `<span style="display:inline-flex;align-items:center;padding:2px 10px;border-radius:999px;background:${colorMap[type]};color:${textMap[type]};font-size:12px;line-height:20px;">${escapeHtml(text)}</span>`;
  }

  function renderList(messages = []) {
    const { wrap } = els();
    if (!wrap) return;

    if (!messages.length) {
      wrap.innerHTML = '<div class="empty-state"><span class="icon">💬</span><p>暂无符合条件的留言</p></div>';
      return;
    }

    wrap.innerHTML = `
      <div style="display:grid;gap:12px;">
        ${messages.map(item => {
          const hiddenFor = Array.isArray(item.hiddenFor) ? item.hiddenFor : [];
          const statusBadge = item.status === 'deleted' ? badge('已删除', 'danger') : badge('正常显示', 'success');
          const anonymousBadge = item.anonymous ? badge('匿名发送', 'default') : badge('实名发送', 'muted');
          const hiddenBadge = hiddenFor.length ? badge('不给 ' + hiddenFor.join('、') + ' 看', 'default') : badge('全员可见', 'muted');
          const deleteBtn = item.status === 'deleted'
            ? '<button class="btn btn-secondary btn-sm" disabled>已删除</button>'
            : `<button class="btn btn-danger btn-sm" data-action="delete-danmaku" data-id="${escapeHtml(item.id)}">删除留言</button>`;
          return `
            <article class="card" style="margin:0;">
              <div class="card-body" style="display:grid;gap:12px;">
                <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap;">
                  <div style="display:grid;gap:8px;min-width:0;">
                    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                      <strong style="font-size:15px;color:var(--text);">${escapeHtml(item.author || '未知同学')}</strong>
                      ${anonymousBadge}
                      ${statusBadge}
                    </div>
                    <div style="font-size:12px;color:var(--text-dim);line-height:1.8;word-break:break-all;">
                      展示名：${escapeHtml(item.displayName || '匿名同学')}<br>
                      创建时间：${escapeHtml(fmtDate(item.createdAt || ''))}
                    </div>
                  </div>
                  <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                    <span style="display:inline-flex;align-items:center;justify-content:center;min-width:48px;height:32px;padding:0 10px;border-radius:10px;background:rgba(255,255,255,.06);color:${escapeHtml(item.color || '#C9A84C')};font-size:${Number(item.fontSize || 18)}px;border:1px solid rgba(255,255,255,.08);">Aa</span>
                    ${deleteBtn}
                  </div>
                </div>
                <div style="padding:14px 16px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);font-size:15px;line-height:1.8;color:var(--text);word-break:break-word;">
                  ${escapeHtml(item.content || '')}
                </div>
                <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                  ${hiddenBadge}
                  ${badge('字号 ' + Number(item.fontSize || 18) + 'px', 'muted')}
                  ${badge('日期 ' + escapeHtml(item.createdDate || '—'), 'muted')}
                </div>
              </div>
            </article>`;
        }).join('')}
      </div>`;
  }

  async function load() {
    const { wrap, refresh } = els();
    if (!wrap || loading) return;
    loading = true;
    if (refresh) btnLoading(refresh, true, '刷新列表');
    wrap.innerHTML = '<div class="empty-state"><span class="icon">💬</span><p>留言加载中…</p></div>';
    try {
      const data = await API.getDanmakuMessages(getParams());
      renderStats(data.stats || {});
      renderList(data.messages || []);
    } catch (e) {
      wrap.innerHTML = `<div class="empty-state"><span class="icon">⚠</span><p>留言加载失败：${escapeHtml(e.message)}</p></div>`;
      Toast.error('留言加载失败：' + e.message);
    } finally {
      loading = false;
      if (refresh) btnLoading(refresh, false, '刷新列表');
    }
  }

  async function remove(id) {
    if (!id) return;
    if (!confirmDialog('确认删除这条留言？删除后前台立即不可见。')) return;
    try {
      // ── 立即物理移除 DOM 元素，消除空占位 ──
      const { wrap } = els();
      const articleEl = wrap?.querySelector(`[data-action="delete-danmaku"][data-id="${id}"]`)?.closest('article.card');
      if (articleEl) {
        articleEl.style.transition = 'opacity 0.2s, max-height 0.3s';
        articleEl.style.opacity = '0';
        articleEl.style.overflow = 'hidden';
        articleEl.style.maxHeight = articleEl.offsetHeight + 'px';
        requestAnimationFrame(() => { articleEl.style.maxHeight = '0'; });
        setTimeout(() => articleEl.remove(), 320);
      }
      await API.deleteDanmakuMessage(id);
      Toast.success('留言已删除');
      // 异步刷新统计数字（不重建列表 DOM）
      try {
        const data = await API.getDanmakuMessages(getParams());
        renderStats(data.stats || {});
      } catch(_) {}
    } catch (e) {
      Toast.error('删除失败：' + e.message);
      // 删除失败时重新加载列表恢复显示
      await load();
    }
  }

  function bind() {
    const { author, status, search, refresh, wrap } = els();
    author?.addEventListener('change', load);
    status?.addEventListener('change', load);
    refresh?.addEventListener('click', load);
    search?.addEventListener('input', debounce(load, 250));
    wrap?.addEventListener('click', e => {
      const btn = e.target.closest('[data-action="delete-danmaku"]');
      if (!btn) return;
      remove(btn.dataset.id || '');
    });
    document.querySelectorAll('.nav-item[data-page="danmaku"]').forEach(btn => {
      btn.addEventListener('click', () => setTimeout(load, 50));
    });
  }

  return { loadAuthors, load, bind };
})();
