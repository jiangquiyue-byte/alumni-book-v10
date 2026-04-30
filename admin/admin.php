<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>同学录 · 后台管理</title>
<link rel="stylesheet" href="assets/css/admin.css">
<link rel="stylesheet" href="assets/css/admin-responsive-fix.css">
<link rel="stylesheet" href="assets/css/exclusive-styles.css">
</head>
<body>

<!-- ═════════════════════════════════════════════
     APP LAYOUT
═════════════════════════════════════════════ -->
<div class="app-layout" id="app-layout">

  <!-- 移动端遮罩 -->
  <div class="sidebar-backdrop" id="sidebar-backdrop"></div>

  <!-- SIDEBAR -->
  <aside class="sidebar">
    <div class="sidebar-brand">
      <span class="brand-icon">📚</span>
      <span class="brand-text">同学录管理</span>
    </div>
    <nav class="sidebar-nav">
      <div class="nav-section-label">总览</div>
      <button class="nav-item active" data-page="dashboard">
        <span class="nav-icon">🏠</span>控制台
      </button>

      <div class="nav-section-label">学生管理</div>
      <button class="nav-item" data-page="students">
        <span class="nav-icon">👥</span>学生列表
      </button>
      <button class="nav-item" data-page="info_editor">
        <span class="nav-icon">✏️</span>信息编辑
      </button>

      <div class="nav-section-label">个性配置</div>
      <button class="nav-item" data-page="background">
        <span class="nav-icon">🖼</span>背景管理
      </button>
      <button class="nav-item" data-page="stickers">
        <span class="nav-icon">🎀</span>贴纸编辑
      </button>
      <button class="nav-item" data-page="music">
        <span class="nav-icon">🎵</span>音乐设置
      </button>
      <button class="nav-item" data-page="particles">
        <span class="nav-icon">✨</span>粒子效果
      </button>
      <button class="nav-item" data-page="custom-particles">
        <span class="nav-icon">🎨</span>自定义粒子
      </button>

      <div class="nav-section-label">相册</div>
      <button class="nav-item" data-page="album">
        <span class="nav-icon">📷</span>班级相册
      </button>
      <button class="nav-item" data-page="panorama">
        <span class="nav-icon">🌐</span>360° 全景
      </button>
      <button class="nav-item" data-page="photos">
        <span class="nav-icon">🖼</span>照片墙管理
      </button>
      <button class="nav-item" data-page="danmaku">
        <span class="nav-icon">💬</span>留言管理
      </button>

      <div class="nav-section-label">专属</div>
      <button class="nav-item" data-page="exclusive">
        <span class="nav-icon">🌟</span>专属模板
      </button>

      <div class="nav-section-label">设置</div>
      <button class="nav-item" data-page="content">
        <span class="nav-icon">📝</span>内容管理
      </button>
      <button class="nav-item" data-page="site-settings">
        <span class="nav-icon">⚙️</span>站点设置
      </button>
    </nav>
    <div class="sidebar-footer">
      <button class="nav-item" id="logoutBtn">
        <span class="nav-icon">🚪</span>退出登录
      </button>
    </div>
  </aside>

  <!-- TOPBAR -->
  <header class="topbar">
    <button class="hamburger-btn" id="hamburger-btn" title="菜单">☰</button>
    <div class="topbar-title" id="topbar-title">控制台</div>
    <div class="topbar-actions">
      <button class="btn btn-primary btn-sm" id="btn-new-student">+ 新建学生</button>
      <a class="btn btn-secondary btn-sm" href="../roster.html" target="_blank">👁 预览前台</a>
    </div>
  </header>

  <!-- MAIN -->
  <main class="main-content">

    <!-- ══════════════ 控制台 ══════════════ -->
    <section id="page-dashboard" class="page active">
      <div class="stats-row" id="stats-row">
        <div class="stat-card">
          <div class="stat-label">学生总数</div>
          <div class="stat-value" id="stat-total">—</div>
          <div class="stat-sub">已建档学生</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">已有头像</div>
          <div class="stat-value" id="stat-avatar">—</div>
          <div class="stat-sub">已上传头像</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">班级相册</div>
          <div class="stat-value" id="stat-album">—</div>
          <div class="stat-sub">相册照片数</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">专属模板</div>
          <div class="stat-value" id="stat-owner">—</div>
          <div class="stat-sub">Owner 标记</div>
        </div>
      </div>

      <div class="card" style="margin-top:20px;">
        <div class="card-header">
          <span class="card-title">⚙ 网站全局设置</span>
          <button class="btn btn-primary btn-sm" onclick="Router.go('site-settings');SiteSettings.load();">前往设置 →</button>
        </div>
        <div class="card-body">
          <div style="font-size:13px;color:var(--text-dim);line-height:2;">
            管理各页面（首页 / 前言 / 花名册 / 相册）的粒子飘落效果。<br>
            点击右上角「前往设置」进入详细配置页面。
          </div>
        </div>
      </div>

      <div class="card" style="margin-top:16px;">
        <div class="card-header">
          <span class="card-title">🔧 服务器环境检测</span>
          <button class="btn btn-secondary btn-sm" id="btn-check-php" onclick="checkPhpConfig()">运行检测</button>
        </div>
        <div class="card-body">
          <div id="php-check-result" style="font-size:12px;color:var(--text-dim);line-height:2;">
            点击「运行检测」查看 PHP 上传限制和目录权限状态。如果上传文件失败，请先运行此检测。
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title">最近更新</span>
        </div>
        <div class="card-body">
          <div id="recent-list" class="student-list"></div>
        </div>
      </div>
    </section>

    <!-- ══════════════ 学生列表 ══════════════ -->
    <section id="page-students" class="page">
      <div class="section-header">
        <div class="section-title-h">所有学生</div>
        <div style="display:flex;gap:8px;">
          <input class="form-control" id="student-search" placeholder="搜索姓名…" style="width:180px;padding:7px 12px;">
          <button class="btn btn-primary" id="btn-new-student2">+ 新建学生</button>
        </div>
      </div>
      <div class="student-list" id="student-list-full">
        <div class="empty-state"><span class="icon">👥</span><p>加载中…</p></div>
      </div>
    </section>

    <!-- ══════════════ 信息编辑 ══════════════ -->
    <section id="page-info_editor" class="page">
      <div class="section-header">
        <div class="section-title-h">信息编辑</div>
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <span style="font-size:12px;color:var(--text-muted);">当前编辑：</span>
          <select class="form-control" id="info-student-select" style="width:160px;">
            <option value="">请选择学生</option>
          </select>
          <button class="btn btn-secondary btn-sm" id="btn-regen-page-top" style="display:none;">重新生成</button>
          <button class="btn btn-primary btn-sm" id="btn-save-info-top" style="display:none;">保存信息</button>
        </div>
      </div>

      <div id="info-editor-wrap">
        <div class="empty-state"><span class="icon">✏️</span><p>请先选择一位学生</p></div>
      </div>
    </section>

    <!-- ══════════════ 背景管理 ══════════════ -->
    <section id="page-background" class="page">
      <div class="section-header">
        <div class="section-title-h">背景管理</div>
        <select class="form-control" id="bg-student-select" style="width:160px;">
          <option value="">请选择学生</option>
        </select>
      </div>
      <div id="bg-editor-wrap">
        <div class="empty-state"><span class="icon">🖼</span><p>请先选择一位学生</p></div>
      </div>
    </section>

    <!-- ══════════════ 贴纸编辑 ══════════════ -->
    <section id="page-stickers" class="page">
      <div class="section-header">
        <div class="section-title-h">贴纸编辑器</div>
        <div style="display:flex;align-items:center;gap:10px;">
          <select class="form-control" id="sticker-student-select" style="width:160px;">
            <option value="">请选择学生</option>
          </select>
          <button class="btn btn-secondary btn-sm" id="btn-upload-sticker">上传贴纸</button>
          <button class="btn btn-primary btn-sm" id="btn-save-stickers">保存贴纸</button>
        </div>
      </div>
      <div id="sticker-editor-wrap">
        <div class="empty-state"><span class="icon">🎀</span><p>请先选择一位学生</p></div>
      </div>
    </section>

    <!-- ══════════════ 音乐设置 ══════════════ -->
    <section id="page-music" class="page">
      <div class="section-header">
        <div class="section-title-h">音乐设置</div>
        <select class="form-control" id="music-student-select" style="width:160px;">
          <option value="">请选择学生</option>
        </select>
      </div>
      <div id="music-editor-wrap">
        <div class="empty-state"><span class="icon">🎵</span><p>请先选择一位学生</p></div>
      </div>
    </section>

    <!-- ══════════════ 粒子效果 ══════════════ -->
    <section id="page-particles" class="page">
      <div class="section-header">
        <div class="section-title-h">粒子效果</div>
        <select class="form-control" id="particle-student-select" style="width:160px;">
          <option value="">请选择学生</option>
        </select>
      </div>
      <div id="particle-editor-wrap">
        <div class="empty-state"><span class="icon">✨</span><p>请先选择一位学生</p></div>
      </div>
    </section>

    <!-- ══════════════ 自定义粒子 ══════════════ -->
    <section id="page-custom-particles" class="page">
      <div class="section-header">
        <div class="section-title-h">自定义粒子效果</div>
        <button class="btn btn-primary" id="btn-add-custom-particle">+ 上传粒子图片</button>
      </div>
      <div style="font-size:12px;color:var(--text-muted);padding:0 0 18px;line-height:1.9;">
        上传透明底 PNG / GIF / WebP 图片作为飘落粒子素材。上传后会出现在所有同学页面的「粒子效果」选项中。
        <br>推荐尺寸：32×32px ~ 64×64px，透明背景，文件 ≤ 5MB。
      </div>
      <div id="custom-particle-grid">
        <div class="empty-state"><span class="icon">🎨</span><p>暂无自定义粒子<br>上传图片后自动出现在粒子选择器中</p></div>
      </div>
    </section>

    <!-- ══════════════ 班级相册 ══════════════ -->
    <section id="page-album" class="page">
      <div class="section-header">
        <div class="section-title-h">班级相册管理</div>
        <button class="btn btn-primary" id="btn-album-add">+ 上传照片</button>
      </div>
      <div id="album-grid-wrap">
        <div class="empty-state"><span class="icon">📷</span><p>加载中…</p></div>
      </div>
    </section>

    <!-- ══════════════ 360° 全景管理 ══════════════ -->
    <section id="page-panorama" class="page">
      <div class="section-header">
        <div class="section-title-h">360° 全景管理</div>
        <button class="btn btn-primary" id="btn-pano-add">+ 上传全景图</button>
      </div>
      <div style="font-size:12px;color:var(--text-muted);padding:0 0 16px;line-height:1.8;">
        支持谷歌相机拍摄的 360° 全景照片（等距圆柱投影 JPEG/PNG）。上传后可在相册页顶部的全景入口进入查看。
      </div>
      <div id="pano-grid-wrap">
        <div class="empty-state"><span class="icon">🌐</span><p>暂无全景图<br>点击右上角「上传全景图」添加</p></div>
      </div>
    </section>

    <!-- ══════════════ 照片墙 ══════════════ -->
    <section id="page-photos" class="page">
      <div class="section-header">
        <div class="section-title-h">照片墙管理</div>
        <div style="display:flex;align-items:center;gap:10px;">
          <select class="form-control" id="photos-student-select" style="width:160px;">
            <option value="">请选择学生</option>
          </select>
          <button class="btn btn-primary" id="btn-photo-add">+ 上传照片</button>
        </div>
      </div>
      <div id="photos-grid-wrap">
        <div class="empty-state"><span class="icon">🖼</span><p>请先选择一位学生</p></div>
      </div>
    </section>

    <!-- ══════════════ 留言管理 ══════════════ -->
    <section id="page-danmaku" class="page">
      <div class="section-header">
        <div class="section-title-h">留言管理</div>
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <select class="form-control" id="danmaku-filter-author" style="width:160px;">
            <option value="">全部同学</option>
          </select>
          <select class="form-control" id="danmaku-filter-status" style="width:140px;">
            <option value="all">全部状态</option>
            <option value="active">仅显示正常</option>
            <option value="deleted">仅显示已删除</option>
          </select>
          <input class="form-control" id="danmaku-search" placeholder="搜索留言内容 / 姓名 / 屏蔽对象…" style="width:260px;">
          <button class="btn btn-secondary" id="btn-refresh-danmaku">刷新列表</button>
        </div>
      </div>

      <div class="stats-row" id="danmaku-stats-row" style="margin-bottom:16px;">
        <div class="stat-card"><div class="stat-label">留言总数</div><div class="stat-value" id="danmaku-stat-total">—</div><div class="stat-sub">含已删除</div></div>
        <div class="stat-card"><div class="stat-label">正常显示</div><div class="stat-value" id="danmaku-stat-active">—</div><div class="stat-sub">当前有效留言</div></div>
        <div class="stat-card"><div class="stat-label">今日新增</div><div class="stat-value" id="danmaku-stat-today">—</div><div class="stat-sub">按创建日期统计</div></div>
        <div class="stat-card"><div class="stat-label">匿名留言</div><div class="stat-value" id="danmaku-stat-anonymous">—</div><div class="stat-sub">实名与匿名混合管理</div></div>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title">💬 留言列表</span>
          <span style="font-size:12px;color:var(--text-muted);">可删除指定同学留言；删除后前台立即不可见，但仍保留审计状态。</span>
        </div>
        <div class="card-body" id="danmaku-list-wrap">
          <div class="empty-state"><span class="icon">💬</span><p>留言加载中…</p></div>
        </div>
      </div>
    </section>

    <!-- ══════════════ 内容管理 ══════════════ -->
    <section id="page-content" class="page">
      <div class="section-header">
        <div class="section-title-h">内容管理</div>
        <button class="btn btn-primary" id="btn-save-content">保存所有修改</button>
      </div>

      <!-- 备案与底部 -->
      <div class="card">
        <div class="card-header"><span class="card-title">🏛 备案与底部信息</span></div>
        <div class="card-body">
          <div class="form-row">
            <div class="form-group" style="flex:2;">
              <label class="form-label">ICP 备案号（留空则不显示）</label>
              <input type="text" class="form-control" id="ct-beian" placeholder="如：京ICP备12345678号-1">
            </div>
            <div class="form-group" style="flex:1;">
              <label class="form-label">备案链接</label>
              <input type="text" class="form-control" id="ct-beian-url" value="https://beian.miit.gov.cn/" placeholder="https://beian.miit.gov.cn/">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">底部版权文字</label>
            <input type="text" class="form-control" id="ct-copyright" value="同学录 · 青春回忆" placeholder="同学录 · 青春回忆">
          </div>
        </div>
      </div>

      <!-- 前言内容 -->
      <div class="card">
        <div class="card-header"><span class="card-title">📖 前言页内容</span></div>
        <div class="card-body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">前言标题</label>
              <input type="text" class="form-control" id="ct-preface-title" value="致青春岁月">
            </div>
            <div class="form-group">
              <label class="form-label">前言副标题</label>
              <input type="text" class="form-control" id="ct-preface-subtitle" value="写在翻开同学录之前">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">前言正文（换行用回车）</label>
            <textarea class="form-control" id="ct-preface-content" rows="5" placeholder="写一段话给同学们…"></textarea>
          </div>
        </div>
      </div>

      <!-- 特别致谢 -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">🙏 特别致谢人物（3 人）</span>
        </div>
        <div class="card-body">
          <p style="font-size:12px;color:var(--text-muted);margin-bottom:14px;">显示在前言页的「特别致谢」区域，固定 3 个位置。留空的位置前台不会显示。</p>
          <div id="ack-editor-list"></div>
        </div>
      </div>
    </section>

    <!-- ════════════ 专属模板 ════════════ -->
    <section id="page-exclusive" class="page">
      <div class="section-header">
        <div class="section-title-h">专属模板管理</div>
        <select id="exclusive-student-select" class="form-control" style="width:auto;min-width:180px;margin-left:12px;"></select>
      </div>
      <div class="card" style="margin-bottom:16px;">
        <div class="card-header">
          <span class="card-title">🌟 专属页面资源管理</span>
        </div>
        <div class="card-body">
          <p style="font-size:12px;color:var(--text-muted);margin-bottom:12px;">
            专属模板允许为学生创建完全自定义的个人页面。上传 HTML 代码和资源文件，然后点击“部署”即可发布到同学录。<br>
            资源存放在 <code>exclusive/{slug}/</code> 目录下，在 HTML 中使用相对路径引用（如 <code>../exclusive/{slug}/avatar/avatar.jpg</code>）。
          </p>
          <div id="exclusive-resources">
            <div class="empty-state"><span class="icon">📦</span><p>请先选择一个专属模板学生</p></div>
          </div>
        </div>
      </div>
    </section>

    <!-- ════════════ 站点设置 ════════════ -->
    <section id="page-site-settings" class="page">
      <div class="section-header">
        <div class="section-title-h">站点设置</div>
        <button class="btn btn-primary" id="btn-save-site-settings">保存设置</button>
      </div>

      <!-- 页面粒子效果开关 -->
      <div class="card" style="margin-bottom:16px;">
        <div class="card-header"><span class="card-title">✨ 各页面粒子飘落效果</span></div>
        <div class="card-body">
          <p style="font-size:12px;color:var(--text-muted);margin-bottom:16px;">控制前台各页面的飘落粒子效果，关闭后该页面不显示任何粒子</p>
          <div id="site-particle-settings">
            <div class="empty-state"><span class="icon">⚙️</span><p>加载中…</p></div>
          </div>
        </div>
      </div>

      <!-- 全局字体配置 -->
      <div class="card" style="margin-bottom:16px;">
        <div class="card-header"><span class="card-title">🔤 全局字体配置</span></div>
        <div class="card-body">
          <p style="font-size:12px;color:var(--text-muted);margin-bottom:16px;">设置后前台所有页面实时同步，无需手动刷新。字体配置全局生效，所有同学页面一致。</p>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">字体风格</label>
              <select class="form-control" id="site-font-family">
                <option value="default">默认（系统字体）</option>
                <option value="Ma Shan Zheng">马山正 （毛笔书法）</option>
                <option value="ZCOOL XiaoWei">小威 （优雅宋体）</option>
                <option value="Noto Serif SC">思源宋体 （正式宋体）</option>
                <option value="Noto Sans SC">思源黑体 （清晰黑体）</option>
                <option value="ZCOOL QingKe HuangYou">轻松黄油 （手写风）</option>
                <option value="Liu Jian Mao Cao">流费小草 （草书风）</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">字体大小</label>
              <div style="display:flex;align-items:center;gap:10px;">
                <input type="range" id="site-font-size" min="12" max="22" value="15" style="flex:1;">
                <span id="site-font-size-val" style="font-size:12px;color:var(--gold);min-width:36px;text-align:right;font-family:monospace;">15px</span>
              </div>
            </div>
          </div>
          <!-- 实时预览 -->
          <div style="margin-top:14px;padding:14px;background:var(--bg3);border-radius:8px;border:1px solid var(--border);">
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px;">字体预览</div>
            <div id="font-preview-text" style="color:var(--text);line-height:1.8;transition:all 0.3s;">
              青春岁月，那些年少时光。我们共同走过的日子，永远将在记忆中闪光。<br>
              <span style="font-size:12px;opacity:0.6;">The years of youth, those days we shared together, will forever shine in memory.</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 修改登录密码 -->
      <div class="card" style="margin-bottom:16px;">
        <div class="card-header"><span class="card-title">🔒 修改登录密码</span></div>
        <div class="card-body">
          <p style="font-size:12px;color:var(--text-muted);margin-bottom:16px;">密码将使用 bcrypt 加密存储，修改成功后将自动退出并要求重新登录。</p>
          <div class="form-row">
            <div class="form-group full">
              <label class="form-label">原密码</label>
              <input type="password" class="form-control" id="pwd-old" placeholder="请输入当前登录密码" autocomplete="current-password">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">新密码</label>
              <input type="password" class="form-control" id="pwd-new" placeholder="至少 6 位" autocomplete="new-password">
            </div>
            <div class="form-group">
              <label class="form-label">确认新密码</label>
              <input type="password" class="form-control" id="pwd-confirm" placeholder="再次输入新密码" autocomplete="new-password">
            </div>
          </div>
          <div style="display:flex;justify-content:flex-end;margin-top:8px;">
            <button class="btn btn-primary" id="btn-change-password">修改密码</button>
          </div>
        </div>
      </div>
    </section>

  </main><!-- /main -->
</div><!-- /app-layout -->

<!-- ═════════════════════════════════════════════
     MODALS
═════════════════════════════════════════════ -->

<!-- 新建学生 Modal -->
<div class="modal-overlay" id="modal-new-student">
  <div class="modal">
    <div class="modal-header">
      <span class="modal-title">新建学生</span>
      <button class="modal-close" onclick="Modal.close('modal-new-student')">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-row" style="gap:10px;">
        <div class="form-group" style="flex:1;">
          <label class="form-label">学生姓名 *</label>
          <input type="text" class="form-control" id="new-student-name" placeholder="如：王小明" maxlength="20">
        </div>
        <div class="form-group" style="flex:1;">
          <label class="form-label">拼音代号 * <span style="font-size:10px;color:var(--text-muted);font-weight:300;">（用作文件名）</span></label>
          <input type="text" class="form-control" id="new-student-slug" placeholder="如：wangxiaoming" maxlength="40"
                 style="font-family:monospace;letter-spacing:0.05em;">
        </div>
      </div>
      <div style="font-size:11px;color:var(--text-muted);margin-top:4px;margin-bottom:12px;">
        页面将保存为 <code id="slug-preview" style="color:var(--gold);background:rgba(0,0,0,0.18);padding:1px 6px;border-radius:2px;">students/wangxiaoming.html</code>
      </div>
      <div class="form-group">
        <label class="form-label">
          <input type="checkbox" id="new-student-owner" style="margin-right:6px;">
          设为专属模板（Owner）
        </label>
        <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">
          启用后将使用专属 HTML 模板，与其他同学外观不同
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="Modal.close('modal-new-student')">取消</button>
      <button class="btn btn-primary" id="btn-confirm-new-student">创建学生</button>
    </div>
  </div>
</div>

<!-- 上传贴纸 Modal -->
<div class="modal-overlay" id="modal-upload-sticker">
  <div class="modal">
    <div class="modal-header">
      <span class="modal-title">上传贴纸</span>
      <button class="modal-close" onclick="Modal.close('modal-upload-sticker')">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-group" style="margin-bottom:14px;">
        <label class="form-label">贴纸名称（可选）</label>
        <input type="text" class="form-control" id="sticker-upload-name" placeholder="留空自动命名">
      </div>
      <div class="upload-area" id="sticker-upload-area">
        <input type="file" id="sticker-file-input" accept=".png,.gif,.webp">
        <div class="upload-icon">🎀</div>
        <div class="upload-text">点击或拖拽上传贴纸</div>
        <div class="upload-hint">支持 PNG / GIF / WebP，最大 20MB</div>
      </div>
      <div id="sticker-file-hint" style="font-size:12px;color:var(--text-dim);margin-top:6px;text-align:center;"></div>
      <img class="preview-img" id="sticker-preview" alt="">
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="Modal.close('modal-upload-sticker')">取消</button>
      <button class="btn btn-primary" id="btn-confirm-sticker-upload">上传</button>
    </div>
  </div>
</div>

<!-- 上传班级相册照片 Modal -->
<div class="modal-overlay" id="modal-album-upload">
  <div class="modal">
    <div class="modal-header">
      <span class="modal-title">上传班级相册照片</span>
      <button class="modal-close" onclick="Modal.close('modal-album-upload')">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-group" style="margin-bottom:14px;">
        <label class="form-label">照片说明（可选）</label>
        <input type="text" class="form-control" id="album-photo-caption" placeholder="为这张照片起个名字">
      </div>
      <div class="form-row" style="gap:10px;margin-bottom:14px;">
        <div class="form-group" style="flex:1;">
          <label class="form-label">相框样式</label>
          <select class="form-control" id="album-frame">
            <option value="none">⬜ 无边框</option>
            <option value="retro">🖼 复古木框</option>
            <option value="polaroid">📸 拍立得白框</option>
            <option value="film">🎞 胶片黑框</option>
          </select>
        </div>
        <div class="form-group" style="flex:1;">
          <label class="form-label">显示比例</label>
          <select class="form-control" id="album-ratio-select">
            <option value="normal">正常（1:1）</option>
            <option value="wide">宽图（占两列）</option>
            <option value="tall">长图（占两行）</option>
          </select>
        </div>
      </div>
      <div class="upload-area" id="album-upload-area">
        <input type="file" id="album-file-input" accept=".jpg,.jpeg,.png,.webp,.gif">
        <div class="upload-icon">📷</div>
        <div class="upload-text">点击或拖拽上传照片</div>
        <div class="upload-hint">支持 JPG / PNG / WebP / GIF，最大 15MB</div>
      </div>
      <img class="preview-img" id="album-preview" style="margin-top:12px;" alt="">
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="Modal.close('modal-album-upload')">取消</button>
      <button class="btn btn-primary" id="btn-confirm-album-upload">上传并添加</button>
    </div>
  </div>
</div>

<!-- 编辑照片信息 Modal -->
<div class="modal-overlay" id="modal-album-edit">
  <div class="modal">
    <div class="modal-header">
      <span class="modal-title">编辑照片信息</span>
      <button class="modal-close" onclick="Modal.close('modal-album-edit')">✕</button>
    </div>
    <div class="modal-body">
      <input type="hidden" id="edit-photo-idx">
      <div style="text-align:center;margin-bottom:16px;">
        <img id="edit-photo-thumb" src="" alt="" style="max-height:140px;max-width:100%;border-radius:4px;box-shadow:0 3px 12px rgba(0,0,0,0.18);">
        <div style="margin-top:6px;font-size:11px;color:rgba(120,80,30,0.5);" id="edit-photo-filename"></div>
      </div>
      <div class="form-group" style="margin-bottom:14px;">
        <label class="form-label">照片说明</label>
        <input type="text" class="form-control" id="edit-photo-caption" placeholder="为这张照片起个名字">
      </div>
      <div class="form-row" style="gap:10px;">
        <div class="form-group" style="flex:1;">
          <label class="form-label">相框样式</label>
          <select class="form-control" id="edit-photo-frame">
            <option value="none">⬜ 无边框</option>
            <option value="retro">🖼 复古木框</option>
            <option value="polaroid">📸 拍立得白框</option>
            <option value="film">🎞 胶片黑框</option>
          </select>
        </div>
        <div class="form-group" style="flex:1;">
          <label class="form-label">显示比例</label>
          <select class="form-control" id="edit-photo-ratio">
            <option value="normal">正常（1:1）</option>
            <option value="wide">宽图（占两列）</option>
            <option value="tall">长图（占两行）</option>
          </select>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="Modal.close('modal-album-edit')">取消</button>
      <button class="btn btn-primary" id="btn-confirm-album-edit">保存修改</button>
    </div>
  </div>
</div>

<!-- 上传个人照片 Modal -->
<div class="modal-overlay" id="modal-photo-upload">
  <div class="modal">
    <div class="modal-header">
      <span class="modal-title">上传个人照片</span>
      <button class="modal-close" onclick="Modal.close('modal-photo-upload')">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-group" style="margin-bottom:14px;">
        <label class="form-label">照片说明（可选）</label>
        <input type="text" class="form-control" id="photo-caption" placeholder="为这张照片起个名字">
      </div>
      <div class="form-row" style="gap:10px;margin-bottom:14px;">
        <div class="form-group" style="flex:1;">
          <label class="form-label">相框样式</label>
          <select class="form-control" id="photo-frame">
            <option value="none">⬜ 无边框</option>
            <option value="retro">🖼 复古木框</option>
            <option value="polaroid">📸 拍立得白框</option>
            <option value="film">🎞 胶片黑框</option>
          </select>
        </div>
        <div class="form-group" style="flex:1;">
          <label class="form-label">显示比例</label>
          <select class="form-control" id="photo-ratio-select">
            <option value="normal">正常（1:1）</option>
            <option value="wide">宽图（占两列）</option>
            <option value="tall">长图（占两行）</option>
          </select>
        </div>
      </div>
      <div class="upload-area" id="photo-upload-area">
        <input type="file" id="photo-file-input" accept=".jpg,.jpeg,.png,.webp">
        <div class="upload-icon">🖼</div>
        <div class="upload-text">点击或拖拽上传照片</div>
        <div class="upload-hint">支持 JPG / PNG / WebP，最大 15MB</div>
      </div>
      <img class="preview-img" id="photo-preview" style="margin-top:12px;" alt="">
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="Modal.close('modal-photo-upload')">取消</button>
      <button class="btn btn-primary" id="btn-confirm-photo-upload">上传并添加</button>
    </div>
  </div>
</div>

<!-- 上传 360° 全景图 Modal -->
<div class="modal-overlay" id="modal-pano-upload">
  <div class="modal">
    <div class="modal-header">
      <span class="modal-title">上传 360° 全景图</span>
      <button class="modal-close" onclick="Modal.close('modal-pano-upload')">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-group" style="margin-bottom:14px;">
        <label class="form-label">场景名称</label>
        <input type="text" class="form-control" id="pano-title" placeholder="如：教学楼正门 / 操场全景">
      </div>
      <div class="upload-area" id="pano-upload-area">
        <input type="file" id="pano-file-input" accept=".jpg,.jpeg,.png,.webp">
        <div class="upload-icon">🌐</div>
        <div class="upload-text">点击或拖拽上传全景图</div>
        <div class="upload-hint">支持谷歌相机拍摄的 360° 图片（JPG/PNG），建议 8000×4000px 以上，最大 50MB</div>
      </div>
      <img class="preview-img" id="pano-preview" style="margin-top:12px;" alt="">
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="Modal.close('modal-pano-upload')">取消</button>
      <button class="btn btn-primary" id="btn-confirm-pano-upload">上传并添加</button>
    </div>
  </div>
</div>

<!-- 上传自定义粒子 Modal -->
<div class="modal-overlay" id="modal-custom-particle">
  <div class="modal">
    <div class="modal-header">
      <span class="modal-title">上传自定义粒子图片</span>
      <button class="modal-close" onclick="Modal.close('modal-custom-particle')">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-group" style="margin-bottom:12px;">
        <label class="form-label">粒子名称</label>
        <input type="text" class="form-control" id="cp-name" placeholder="如：枫叶、花瓣、雪花">
      </div>
      <div class="form-row" style="gap:10px;margin-bottom:14px;">
        <div class="form-group" style="flex:1;">
          <label class="form-label">数量</label>
          <input type="number" class="form-control" id="cp-count" value="20" min="5" max="60">
        </div>
        <div class="form-group" style="flex:1;">
          <label class="form-label">最小尺寸 (px)</label>
          <input type="number" class="form-control" id="cp-size-min" value="12" min="4" max="80">
        </div>
        <div class="form-group" style="flex:1;">
          <label class="form-label">最大尺寸 (px)</label>
          <input type="number" class="form-control" id="cp-size-max" value="32" min="8" max="120">
        </div>
      </div>
      <div class="upload-area" id="cp-upload-area">
        <input type="file" id="cp-file-input" accept=".png,.gif,.webp,.jpg,.jpeg">
        <div class="upload-icon">🎨</div>
        <div class="upload-text">点击或拖拽上传粒子图片</div>
        <div class="upload-hint">推荐透明底 PNG / GIF（支持动态），最大 5MB</div>
      </div>
      <img class="preview-img" id="cp-preview" style="margin-top:12px;max-height:80px;" alt="">
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="Modal.close('modal-custom-particle')">取消</button>
      <button class="btn btn-primary" id="btn-confirm-custom-particle">上传并添加</button>
    </div>
  </div>
</div>

<!-- Toast 容器 -->
<div id="toast-container"></div>

<!-- ═════════════════════════════════════════════
     JS
═════════════════════════════════════════════ -->
<script>
async function checkPhpConfig() {
  const el = document.getElementById('php-check-result');
  el.innerHTML = '<span class="spinner"></span> 正在全面检测服务器环境…';
  try {
    const res = await fetch('./api/phpinfo_check.php', { credentials: 'include' });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch(e) {
      el.innerHTML = '<div style="color:var(--danger)">❌ 服务器返回了非 JSON 内容（PHP 可能报错了）：<pre style="margin-top:8px;padding:10px;background:var(--bg3);border-radius:6px;white-space:pre-wrap;font-size:11px;max-height:200px;overflow:auto;">' + text.substring(0,1000).replace(/</g,'&lt;') + '</pre></div>';
      return;
    }
    if (!data.success) { el.innerHTML = '<div style="color:var(--danger)">检测失败: ' + (data.message || '未知') + '</div>'; return; }

    const checks = data.checks || {};
    const errors = data.errors || [];
    const warnings = data.warnings || [];
    const fixCmd = data.fix_commands || '';

    let html = '<div style="font-size:13px;font-weight:600;margin-bottom:12px;color:' + (errors.length ? 'var(--danger)' : 'var(--success)') + '">' + data.status + '</div>';

    // 错误列表
    if (errors.length) {
      html += '<div style="margin-bottom:14px;padding:12px;background:rgba(224,92,92,0.08);border:1px solid rgba(224,92,92,0.2);border-radius:8px;">';
      html += '<div style="font-weight:600;margin-bottom:6px;color:var(--danger);">需要修复的问题：</div>';
      errors.forEach(e => { html += '<div style="color:var(--danger);font-size:12px;line-height:1.9;">• ' + e + '</div>'; });
      html += '</div>';
    }

    // 修复命令
    if (fixCmd) {
      html += '<div style="margin-bottom:14px;padding:12px;background:rgba(201,168,76,0.08);border:1px solid rgba(201,168,76,0.2);border-radius:8px;">';
      html += '<div style="font-weight:600;margin-bottom:6px;color:var(--gold);">修复命令（SSH 执行）：</div>';
      html += '<pre style="font-size:12px;color:var(--gold);white-space:pre-wrap;font-family:monospace;">' + fixCmd + '</pre>';
      html += '</div>';
    }

    // 详细检查项
    html += '<details style="margin-top:10px;"><summary style="cursor:pointer;color:var(--text-dim);font-size:12px;">展开详细检查结果（' + Object.keys(checks).length + ' 项）</summary>';
    html += '<div style="display:grid;grid-template-columns:auto 1fr;gap:4px 16px;margin-top:10px;font-size:12px;">';
    for (const [k, v] of Object.entries(checks)) {
      const s = String(v);
      const isOk = s.startsWith('✅');
      const isBad = s.startsWith('❌');
      const color = isBad ? 'var(--danger)' : isOk ? 'var(--success)' : 'var(--text-dim)';
      html += '<div style="color:var(--text-muted);white-space:nowrap;">' + k + '</div>';
      html += '<div style="color:' + color + ';font-family:monospace;word-break:break-all;">' + s + '</div>';
    }
    html += '</div></details>';

    el.innerHTML = html;
  } catch(e) {
    el.innerHTML = '<div style="color:var(--danger)">❌ 检测请求失败: ' + e.message + '<br><span style="font-size:11px;color:var(--text-muted);">可能是 PHP 未运行或 _init.php 文件缺失</span></div>';
  }
}
</script>
<script src="assets/js/api.js"></script>
<script src="assets/js/ui.js"></script>
<script src="assets/js/students.js"></script>
<script src="assets/js/info-editor.js"></script>
<script src="assets/js/background.js"></script>
<script src="assets/js/grid-system.js"></script>
<script src="assets/js/sticker-editor.js"></script>
<script src="assets/js/music-editor.js"></script>
<script src="assets/js/particle-editor.js"></script>
<script src="assets/js/album-manager.js"></script>
<script src="assets/js/panorama-manager.js"></script>
<script src="assets/js/custom-particles-manager.js"></script>
<script src="assets/js/photos-manager.js"></script>
<script src="assets/js/danmaku-manager.js"></script>
<script src="assets/js/content-editor.js"></script>
<script src="assets/js/exclusive-manager.js"></script>
<script src="assets/js/app.js"></script>
<script src="assets/js/admin-mobile-fix.js"></script>
</body>
</html>
