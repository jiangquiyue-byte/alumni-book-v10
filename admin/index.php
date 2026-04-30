<?php
require_once __DIR__ . '/config.php';

// 如果已登录，重定向到管理后台
if (!empty($_SESSION['admin_logged_in'])) {
    header('Location: admin.php');
    exit;
}
?>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>同学录 · 后台管理</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --paper: #eadfca;
    --paper-dark: #d7c4a4;
    --ink: #2f2418;
    --ink-soft: rgba(47, 36, 24, 0.72);
    --gold: #9a7238;
    --gold-deep: #6e4f26;
    --line: rgba(88, 62, 30, 0.18);
    --shadow: rgba(33, 23, 12, 0.28);
    --seal: #8f2f25;
  }

  body {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 32px;
    overflow: hidden;
    color: var(--ink);
    background:
      radial-gradient(circle at 20% 18%, rgba(255,243,211,0.32), transparent 34%),
      radial-gradient(circle at 78% 25%, rgba(255,231,184,0.16), transparent 26%),
      radial-gradient(circle at 50% 120%, rgba(77,49,25,0.24), transparent 44%),
      linear-gradient(135deg, #2b1d12 0%, #4c3420 38%, #24160d 100%);
    font-family: "Noto Serif SC", "Songti SC", "STSong", serif;
    position: relative;
  }

  body::before {
    content: "";
    position: fixed;
    inset: 0;
    background:
      repeating-linear-gradient(
        0deg,
        transparent 0,
        transparent 2px,
        rgba(255,255,255,0.02) 3px
      ),
      repeating-linear-gradient(
        90deg,
        transparent 0,
        transparent 180px,
        rgba(0,0,0,0.035) 181px,
        rgba(0,0,0,0.035) 182px
      );
    opacity: 0.34;
    pointer-events: none;
  }

  .scene-glow {
    position: fixed;
    width: 520px;
    height: 520px;
    border-radius: 50%;
    filter: blur(90px);
    pointer-events: none;
    opacity: 0.18;
    z-index: 0;
  }

  .scene-glow.left {
    left: -120px;
    top: -100px;
    background: #d1a55a;
  }

  .scene-glow.right {
    right: -140px;
    bottom: -120px;
    background: #8a5f33;
  }

  .login-shell {
    position: relative;
    z-index: 1;
    width: min(920px, 100%);
    display: grid;
    grid-template-columns: 1.08fr 0.92fr;
    border-radius: 20px;
    overflow: hidden;
    border: 1px solid rgba(211, 185, 141, 0.22);
    box-shadow:
      0 28px 60px rgba(0, 0, 0, 0.34),
      0 8px 18px rgba(0, 0, 0, 0.16);
    background: linear-gradient(180deg, rgba(47, 30, 16, 0.55), rgba(22, 14, 8, 0.62));
    backdrop-filter: blur(8px);
  }

  .book-panel {
    position: relative;
    min-height: 620px;
    padding: 56px 54px 52px;
    background:
      radial-gradient(circle at top left, rgba(255,255,255,0.4), transparent 28%),
      linear-gradient(180deg, rgba(255,255,255,0.1), rgba(255,255,255,0.02)),
      linear-gradient(90deg, rgba(96,63,28,0.12) 0, rgba(96,63,28,0.05) 8%, transparent 15%),
      linear-gradient(180deg, #efe3cb 0%, #e7d7bb 52%, #ddc8a3 100%);
  }

  .book-panel::before {
    content: "";
    position: absolute;
    inset: 16px;
    border: 1px solid rgba(122, 88, 42, 0.18);
    border-radius: 14px;
    pointer-events: none;
  }

  .book-panel::after {
    content: "";
    position: absolute;
    top: 0;
    right: -1px;
    width: 28px;
    height: 100%;
    background:
      linear-gradient(90deg, rgba(105, 73, 36, 0.04), rgba(66, 45, 21, 0.18), rgba(22, 13, 8, 0.28));
  }

  .login-side {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 22px;
  }

  .eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    color: var(--gold-deep);
    letter-spacing: 0.24em;
    font-size: 12px;
  }

  .eyebrow::before,
  .eyebrow::after {
    content: "";
    width: 34px;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(110,79,38,0.75), transparent);
  }

  .main-title {
    font-size: 38px;
    line-height: 1.25;
    letter-spacing: 0.18em;
    color: var(--ink);
    text-shadow: 0 1px 0 rgba(255,255,255,0.4);
  }

  .subtitle {
    font-size: 15px;
    line-height: 1.95;
    color: var(--ink-soft);
    max-width: 430px;
  }

  .quote-box {
    margin-top: 6px;
    padding: 18px 18px 18px 22px;
    border-left: 3px solid rgba(122, 88, 42, 0.45);
    background: rgba(255,255,255,0.22);
    box-shadow: inset 0 0 0 1px rgba(122, 88, 42, 0.08);
  }

  .quote-box p {
    font-size: 14px;
    line-height: 2;
    color: rgba(47, 36, 24, 0.82);
  }

  .quote-sign {
    margin-top: 10px;
    font-size: 12px;
    letter-spacing: 0.18em;
    color: rgba(111, 80, 41, 0.82);
  }

  .seal {
    align-self: flex-start;
    margin-top: 12px;
    width: 72px;
    height: 72px;
    border-radius: 18px;
    border: 2px solid rgba(143, 47, 37, 0.82);
    color: var(--seal);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    letter-spacing: 0.2em;
    writing-mode: vertical-rl;
    text-orientation: mixed;
    background: rgba(255, 246, 237, 0.18);
    box-shadow: inset 0 0 0 1px rgba(143, 47, 37, 0.16);
    transform: rotate(6deg);
  }

  .form-panel {
    position: relative;
    min-height: 620px;
    padding: 52px 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    background:
      radial-gradient(circle at top, rgba(255,224,160,0.06), transparent 24%),
      linear-gradient(180deg, rgba(30,19,11,0.88), rgba(20,13,8,0.95));
  }

  .form-panel::before {
    content: "";
    position: absolute;
    inset: 26px;
    border-radius: 18px;
    border: 1px solid rgba(196, 157, 91, 0.12);
    pointer-events: none;
  }

  .login-card {
    position: relative;
    width: min(360px, 100%);
    padding: 34px 30px 28px;
    border-radius: 18px;
    background: linear-gradient(180deg, rgba(244,226,191,0.08), rgba(99,65,29,0.08));
    border: 1px solid rgba(213, 175, 109, 0.18);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.08),
      0 20px 40px rgba(0,0,0,0.2);
  }

  .card-title {
    text-align: center;
    color: #ebd8b0;
    font-size: 24px;
    letter-spacing: 0.18em;
    margin-bottom: 8px;
  }

  .card-subtitle {
    text-align: center;
    color: rgba(235,216,176,0.52);
    font-size: 12px;
    letter-spacing: 0.18em;
    margin-bottom: 28px;
  }

  .form-group { margin-bottom: 20px; }

  .form-group label {
    display: block;
    margin-bottom: 10px;
    color: rgba(235,216,176,0.78);
    font-size: 12px;
    letter-spacing: 0.18em;
  }

  .form-group input {
    width: 100%;
    padding: 14px 16px;
    border-radius: 12px;
    border: 1px solid rgba(214, 176, 110, 0.22);
    background:
      linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.08));
    color: #f0dfbc;
    font-size: 15px;
    outline: none;
    transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
  }

  .form-group input::placeholder {
    color: rgba(240,223,188,0.35);
  }

  .form-group input:focus {
    border-color: rgba(214, 176, 110, 0.5);
    box-shadow: 0 0 0 4px rgba(214, 176, 110, 0.08);
    transform: translateY(-1px);
  }

  .tips {
    margin: -4px 0 18px;
    font-size: 12px;
    line-height: 1.9;
    color: rgba(235,216,176,0.5);
  }

  .btn-login {
    width: 100%;
    padding: 14px 18px;
    border: none;
    border-radius: 12px;
    background: linear-gradient(180deg, #cda76a 0%, #9f7339 100%);
    color: #24170f;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 0.22em;
    cursor: pointer;
    transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
    box-shadow: 0 12px 22px rgba(134, 93, 38, 0.28);
  }

  .btn-login:hover {
    transform: translateY(-1px);
    box-shadow: 0 14px 28px rgba(134, 93, 38, 0.34);
    filter: brightness(1.03);
  }

  .btn-login:active {
    transform: translateY(0);
  }

  .btn-login:disabled {
    cursor: not-allowed;
    opacity: 0.78;
  }

  .error-msg {
    min-height: 22px;
    margin-top: 14px;
    text-align: center;
    font-size: 13px;
    color: #ff9e91;
    display: none;
  }

  .error-msg.show { display: block; }

  .footer-note {
    margin-top: 18px;
    text-align: center;
    color: rgba(235,216,176,0.42);
    font-size: 12px;
    letter-spacing: 0.12em;
    line-height: 1.8;
  }

  @media (max-width: 860px) {
    .login-shell {
      grid-template-columns: 1fr;
    }

    .book-panel,
    .form-panel {
      min-height: auto;
    }

    .book-panel {
      padding: 40px 30px 34px;
    }

    .form-panel {
      padding: 18px 22px 28px;
    }

    .main-title {
      font-size: 30px;
    }
  }

  @media (max-width: 480px) {
    body { padding: 16px; }
    .book-panel { padding: 30px 22px 26px; }
    .form-panel { padding: 14px; }
    .login-card { padding: 28px 20px 22px; }
    .main-title { font-size: 26px; }
    .subtitle { font-size: 14px; }
  }
</style>
</head>
<body>
<div class="scene-glow left"></div>
<div class="scene-glow right"></div>

<div class="login-shell">
  <section class="book-panel">
    <div class="login-side">
      <div class="eyebrow">古卷启封</div>
      <h1 class="main-title">同学录后台书阁</h1>
      <p class="subtitle">
        此处存放全站的名册、前言、贴纸、粒子与回忆页配置。界面风格已调整为更接近古朴书册与卷轴的视觉气质，保留原有登录逻辑不变。
      </p>

      <div class="quote-box">
        <p>
          旧时纸页承载笔墨，如今屏上存放同窗姓名。愿每一次登录，不只是进入后台，而像翻开一本仍有温度的旧书。
        </p>
        <div class="quote-sign">同学录 · 管理卷</div>
      </div>

      <div class="seal">同窗录印</div>
    </div>
  </section>

  <section class="form-panel">
    <div class="login-card">
      <div class="card-title">入阁验印</div>
      <div class="card-subtitle">YEARBOOK ADMIN ACCESS</div>

      <div class="form-group">
        <label for="password">管理员密码</label>
        <input type="password" id="password" placeholder="请输入管理密码" autofocus>
      </div>

      <div class="tips">
        请输入当前后台管理口令。验证通过后，将进入同学录配置总台。
      </div>

      <button class="btn-login" id="loginBtn">进 入 书 阁</button>
      <div class="error-msg" id="errorMsg">密码错误，请重试</div>
      <div class="footer-note">
        若页面样式已更新但未显示，请刷新缓存后重试。<br>
        本页仅改造视觉表现，不影响原有鉴权接口。
      </div>
    </div>
  </section>
</div>

<script>
const btn = document.getElementById('loginBtn');
const pwd = document.getElementById('password');
const err = document.getElementById('errorMsg');

async function doLogin() {
  err.classList.remove('show');
  err.textContent = '密码错误，请重试';
  btn.textContent = '验 证 中 …';
  btn.disabled = true;
  try {
    const res = await fetch('api/auth.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pwd.value })
    });
    const data = await res.json();
    if (data.success) {
      window.location.href = 'admin.php';
    } else {
      err.classList.add('show');
      btn.textContent = '进 入 书 阁';
      btn.disabled = false;
      pwd.focus();
    }
  } catch (e) {
    err.textContent = '网络错误，请刷新后重试';
    err.classList.add('show');
    btn.textContent = '进 入 书 阁';
    btn.disabled = false;
  }
}

btn.addEventListener('click', doLogin);
pwd.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
</script>
</body>
</html>
