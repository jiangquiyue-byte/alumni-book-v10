/**
 * 同学录后台 · 手机端交互修复脚本
 * admin/assets/js/admin-mobile-fix.js
 *
 * 功能：
 * 1. 折叠面板（Accordion）手机端展开/收起
 * 2. 表格横向滚动提示
 * 3. 触摸优化（防抖、防误触）
 * 4. 贴纸编辑器手机端专项修复
 * 5. 网格配置面板联动
 *
 * 在 admin.php 的 </body> 前引入，位于其他 JS 之后。
 */
(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════
     一、折叠面板（Collapsible Panels）
  ══════════════════════════════════════════════════════════ */

  /**
   * 初始化所有带 data-collapsible 属性的面板
   * 用法：
   *   <div data-collapsible>
   *     <div class="collapsible-header card-header">标题 <span class="collapsible-arrow">▼</span></div>
   *     <div class="collapsible-body card-body">内容</div>
   *   </div>
   */
  function initCollapsibles() {
    document.querySelectorAll('[data-collapsible]').forEach(function (panel) {
      var header = panel.querySelector('.collapsible-header');
      var body   = panel.querySelector('.collapsible-body');
      if (!header || !body) return;

      // 默认展开状态由 data-open 属性控制
      var isOpen = panel.hasAttribute('data-open');
      if (isOpen) {
        header.classList.add('open');
        body.classList.add('open');
      }

      header.addEventListener('click', function () {
        isOpen = !isOpen;
        header.classList.toggle('open', isOpen);
        body.classList.toggle('open', isOpen);
      });

      // 触摸端防止双击缩放
      header.addEventListener('touchend', function (e) {
        e.preventDefault();
        header.click();
      }, { passive: false });
    });
  }

  /* ══════════════════════════════════════════════════════════
     二、表格横向滚动提示
  ══════════════════════════════════════════════════════════ */

  function initTableScroll() {
    if (window.innerWidth > 768) return;

    document.querySelectorAll('table').forEach(function (table) {
      var wrap = table.parentElement;
      if (!wrap) return;

      // 如果表格宽度超过容器，添加横向滚动包装
      if (!wrap.classList.contains('table-responsive')) {
        var div = document.createElement('div');
        div.className = 'table-responsive';
        table.parentNode.insertBefore(div, table);
        div.appendChild(table);
      }
    });
  }

  /* ══════════════════════════════════════════════════════════
     三、触摸优化
  ══════════════════════════════════════════════════════════ */

  function initTouchOptimize() {
    // 防止 iOS 双击缩放
    var lastTouchEnd = 0;
    document.addEventListener('touchend', function (e) {
      var now = Date.now();
      if (now - lastTouchEnd <= 300) {
        // 如果是按钮或链接，阻止双击缩放
        var tag = e.target.tagName.toLowerCase();
        if (['button', 'a', 'input', 'select'].indexOf(tag) !== -1) {
          e.preventDefault();
        }
      }
      lastTouchEnd = now;
    }, { passive: false });

    // 修复 iOS Safari 下 position:fixed 元素内滚动
    document.querySelectorAll('.sidebar-nav, .sticker-library, .modal-body').forEach(function (el) {
      el.style.webkitOverflowScrolling = 'touch';
    });
  }

  /* ══════════════════════════════════════════════════════════
     四、贴纸编辑器手机端专项修复
  ══════════════════════════════════════════════════════════ */

  function initStickerEditorMobileFix() {
    // 监听贴纸编辑器加载
    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (node) {
          if (node.nodeType !== 1) return;

          // 检查是否是贴纸编辑器容器
          if (node.id === 'sticker-editor-wrap' || node.querySelector && node.querySelector('#sticker-scroll-wrap')) {
            onStickerEditorLoaded();
          }
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // 如果编辑器已经存在
    if (document.getElementById('sticker-scroll-wrap')) {
      onStickerEditorLoaded();
    }
  }

  function onStickerEditorLoaded() {
    var scrollWrap = document.getElementById('sticker-scroll-wrap');
    if (!scrollWrap) return;

    // 手机端：防止贴纸编辑器内的触摸事件导致页面滚动
    scrollWrap.addEventListener('touchmove', function (e) {
      // 仅在有贴纸被拖拽时阻止页面滚动
      if (scrollWrap.dataset.dragging === '1') {
        e.preventDefault();
      }
    }, { passive: false });

    // 手机端：双指缩放时阻止页面缩放
    scrollWrap.addEventListener('touchstart', function (e) {
      if (e.touches.length >= 2) {
        e.preventDefault();
      }
    }, { passive: false });

    // 修复手机端贴纸库滚动
    var stickerLibrary = document.querySelector('.sticker-library');
    if (stickerLibrary) {
      stickerLibrary.style.webkitOverflowScrolling = 'touch';
      stickerLibrary.style.overflowY = 'auto';
    }
  }

  /* ══════════════════════════════════════════════════════════
     五、网格配置面板联动
  ══════════════════════════════════════════════════════════ */

  function initGridConfigPanel() {
    var colsInput    = document.getElementById('grid-cols-input');
    var rowsInput    = document.getElementById('grid-rows-input');
    var snapToggle   = document.getElementById('grid-snap-toggle');
    var gridToggle   = document.getElementById('grid-visible-toggle');
    var applyBtn     = document.getElementById('btn-apply-grid');

    if (!colsInput && !rowsInput) return;

    // 应用网格配置
    function applyGridConfig() {
      var cols = parseInt(colsInput ? colsInput.value : 20) || 20;
      var rows = parseInt(rowsInput ? rowsInput.value : 40) || 40;
      var snap    = snapToggle   ? snapToggle.checked   : true;
      var visible = gridToggle   ? gridToggle.checked   : false;

      // 调用 GridSystem 模块（如果已加载）
      if (typeof GridSystem !== 'undefined') {
        GridSystem.setSize(cols, rows);
        GridSystem.setSnap(snap);
        GridSystem.setVisible(visible);
      }

      // 通知 StickerEditor 更新网格
      if (typeof StickerEditor !== 'undefined' && StickerEditor.updateGrid) {
        StickerEditor.updateGrid({ cols: cols, rows: rows, snap: snap, visible: visible });
      }
    }

    if (applyBtn) {
      applyBtn.addEventListener('click', applyGridConfig);
    }

    // 实时更新网格显示
    if (gridToggle) {
      gridToggle.addEventListener('change', function () {
        if (typeof GridSystem !== 'undefined') {
          GridSystem.setVisible(gridToggle.checked);
        }
      });
    }

    if (snapToggle) {
      snapToggle.addEventListener('change', function () {
        if (typeof GridSystem !== 'undefined') {
          GridSystem.setSnap(snapToggle.checked);
        }
      });
    }
  }

  /* ══════════════════════════════════════════════════════════
     六、汉堡菜单增强（补充 app.js 中的逻辑）
  ══════════════════════════════════════════════════════════ */

  function initHamburgerEnhance() {
    var appLayout  = document.getElementById('app-layout');
    var hamburger  = document.getElementById('hamburger-btn');
    var backdrop   = document.getElementById('sidebar-backdrop');

    if (!hamburger || !appLayout) return;

    // 侧边栏关闭时恢复页面滚动
    function closeSidebar() {
      appLayout.classList.remove('sidebar-open');
      document.body.style.overflow = '';
    }

    function openSidebar() {
      appLayout.classList.add('sidebar-open');
      // 阻止背景滚动
      document.body.style.overflow = 'hidden';
    }

    // 重新绑定（覆盖 app.js 中的绑定）
    hamburger.addEventListener('click', function () {
      if (appLayout.classList.contains('sidebar-open')) {
        closeSidebar();
      } else {
        openSidebar();
      }
    });

    if (backdrop) {
      backdrop.addEventListener('click', closeSidebar);
      backdrop.addEventListener('touchend', function (e) {
        e.preventDefault();
        closeSidebar();
      }, { passive: false });
    }

    // 导航项目点击后自动关闭侧边栏（手机端）
    document.querySelectorAll('.nav-item').forEach(function (item) {
      item.addEventListener('click', function () {
        if (window.innerWidth <= 768) {
          setTimeout(closeSidebar, 150);
        }
      });
    });

    // ESC 键关闭侧边栏
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && appLayout.classList.contains('sidebar-open')) {
        closeSidebar();
      }
    });
  }

  /* ══════════════════════════════════════════════════════════
     七、音乐上传区域修复
  ══════════════════════════════════════════════════════════ */

  function initMusicUploadFix() {
    // 监听音乐编辑器加载
    var observer = new MutationObserver(function () {
      var uploadSection = document.getElementById('music-upload-section');
      if (uploadSection) {
        fixMusicUploadArea(uploadSection);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    var existing = document.getElementById('music-upload-section');
    if (existing) fixMusicUploadArea(existing);
  }

  function fixMusicUploadArea(section) {
    if (section._fixed) return;
    section._fixed = true;

    // 确保上传区域不受 pointer-events:none 影响
    section.style.pointerEvents = 'auto';
    section.style.position = 'relative';
    section.style.zIndex = '1';

    var uploadArea = section.querySelector('.upload-area');
    var fileInput  = section.querySelector('input[type="file"]');

    if (uploadArea && fileInput) {
      // 点击上传区域触发文件选择
      uploadArea.addEventListener('click', function (e) {
        if (e.target !== fileInput) {
          fileInput.click();
        }
      });

      // 触摸端
      uploadArea.addEventListener('touchend', function (e) {
        e.preventDefault();
        fileInput.click();
      }, { passive: false });
    }
  }

  /* ══════════════════════════════════════════════════════════
     八、窗口大小变化时重新计算
  ══════════════════════════════════════════════════════════ */

  function initResizeHandler() {
    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        // 重绘网格
        if (typeof GridSystem !== 'undefined') {
          GridSystem.onResize();
        }
        // 通知 StickerEditor 重新计算画布尺寸
        if (typeof StickerEditor !== 'undefined' && StickerEditor.onResize) {
          StickerEditor.onResize();
        }
      }, 200);
    });
  }

  /* ══════════════════════════════════════════════════════════
     九、初始化入口
  ══════════════════════════════════════════════════════════ */

  function init() {
    initCollapsibles();
    initTableScroll();
    initTouchOptimize();
    initStickerEditorMobileFix();
    initGridConfigPanel();
    initHamburgerEnhance();
    initMusicUploadFix();
    initResizeHandler();
  }

  // DOM 加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
