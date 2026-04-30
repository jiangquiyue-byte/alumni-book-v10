<?php
/**
 * 同学录 · 版本验证
 * 直接浏览器访问此文件确认部署是否成功
 * 地址: http://你的域名/admin/check.php
 * 确认无误后可删除此文件
 */
header('Content-Type: text/html; charset=utf-8');
$version = 'v9.0';

// 检查关键文件是否存在且为最新版本
$checks = [];

// _init.php
$f = __DIR__ . '/api/_init.php';
$checks['api/_init.php'] = file_exists($f) && strpos(file_get_contents($f), 'v9.0') !== false;

// content-editor.js
$f = __DIR__ . '/assets/js/content-editor.js';
$checks['content-editor.js'] = file_exists($f) && filesize($f) > 100;

// admin.html 包含内容管理
$f = __DIR__ . '/admin.html';
$checks['admin.html(内容管理)'] = file_exists($f) && strpos(file_get_contents($f), 'page-content') !== false;

// students.php 无 fn() 箭头函数
$f = __DIR__ . '/api/students.php';
$content = file_exists($f) ? file_get_contents($f) : '';
$checks['students.php(无fn箭头)'] = file_exists($f) && strpos($content, 'fn(') === false;

// site_config.php 支持 footer
$f = __DIR__ . '/api/site_config.php';
$checks['site_config.php(备案)'] = file_exists($f) && strpos(file_get_contents($f), 'footer') !== false;

// generate.php 模板路径正确
$f = __DIR__ . '/api/generate.php';
$checks['generate.php(路径)'] = file_exists($f) && strpos(file_get_contents($f), 'dirname(dirname(') !== false;

// site_config.json 包含 footer
$f = dirname(__DIR__) . '/data/site_config.json';
$checks['site_config.json(备案)'] = file_exists($f) && strpos(file_get_contents($f), 'footer') !== false;

$allOk = !in_array(false, $checks, true);
?>
<!DOCTYPE html>
<html>
<head><title>同学录 <?=$version?> 版本验证</title></head>
<body style="font-family:monospace;max-width:600px;margin:40px auto;padding:20px;background:#111;color:#e0d8cc;">
<h2 style="color:<?=$allOk?'#5cba8a':'#e05c5c'?>;"><?=$allOk ? '✅' : '❌'?> 同学录 <?=$version?></h2>
<p style="color:#888;">此页面验证服务器上的代码是否为最新版本</p>
<hr style="border-color:#333;">
<?php foreach ($checks as $label => $ok): ?>
<div style="padding:6px 0;color:<?=$ok?'#5cba8a':'#e05c5c'?>;">
  <?=$ok?'✓':'✗'?> <?=$label?>
</div>
<?php endforeach; ?>
<hr style="border-color:#333;">
<?php if ($allOk): ?>
<p style="color:#5cba8a;font-size:16px;">🎉 所有文件均为 <?=$version?> 最新版本，部署成功！</p>
<?php else: ?>
<p style="color:#e05c5c;font-size:16px;">⚠️ 部分文件不是最新版本！</p>
<p style="color:#c9a84c;">请按以下步骤重新部署：</p>
<ol style="color:#aaa;line-height:2;">
<li>宝塔 → 文件管理 → 进入网站根目录</li>
<li><b style="color:#e05c5c;">删除 admin 文件夹</b>（整个删除！）</li>
<li><b style="color:#e05c5c;">删除 data 文件夹</b></li>
<li><b style="color:#e05c5c;">删除 assets 文件夹</b></li>
<li>上传 同学录v9.0.zip</li>
<li>右键 → <b>解压到当前目录</b></li>
<li>全选 → 权限 → 755 → 勾「应用到子目录」</li>
<li>刷新此页面验证</li>
</ol>
<?php endif; ?>
<p style="color:#666;margin-top:20px;font-size:11px;">PHP <?=phpversion()?> · 验证时间: <?=date('Y-m-d H:i:s')?></p>
</body>
</html>
