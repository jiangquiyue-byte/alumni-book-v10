<?php
require_once __DIR__ . '/_init.php';
require_once dirname(dirname(__FILE__)) . '/config.php';
requireAuth();

$checks = [];
$warnings = [];
$errors = [];

// ── 1. PHP 基础信息 ──
$checks['PHP 版本'] = phpversion();
$checks['同学录版本'] = 'v9.0';
$checks['服务器软件'] = $_SERVER['SERVER_SOFTWARE'] ?? '未知';

// ── 2. PHP 扩展 ──
$checks['fileinfo 扩展'] = extension_loaded('fileinfo') ? '✅ 已加载' : '❌ 未加载（上传文件类型检测需要）';
$checks['gd 扩展'] = extension_loaded('gd') ? '✅ 已加载' : '⚠️ 未加载（头像裁剪需要，不影响基本功能）';
$checks['json 扩展'] = extension_loaded('json') ? '✅ 已加载' : '❌ 未加载（必需）';
$checks['session 扩展'] = extension_loaded('session') ? '✅ 已加载' : '❌ 未加载（必需）';

if (!extension_loaded('fileinfo')) {
    $errors[] = 'fileinfo 扩展未安装 → 宝塔面板 → PHP → 安装扩展 → 安装 fileinfo → 重启 PHP';
}

// ── 3. PHP 上传配置 ──
$checks['upload_max_filesize'] = ini_get('upload_max_filesize');
$checks['post_max_size'] = ini_get('post_max_size');
$checks['max_execution_time'] = ini_get('max_execution_time') . '秒';
$checks['memory_limit'] = ini_get('memory_limit');

$uploadMax = return_bytes(ini_get('upload_max_filesize'));
$postMax = return_bytes(ini_get('post_max_size'));
if ($uploadMax < 10 * 1024 * 1024) {
    $warnings[] = "upload_max_filesize 太小（当前 " . ini_get('upload_max_filesize') . "），建议改为 60M";
}
if ($postMax < 16 * 1024 * 1024) {
    $warnings[] = "post_max_size 太小（当前 " . ini_get('post_max_size') . "），建议改为 64M";
}

// ── 4. 关键路径检查 ──
$checks['ROOT_PATH'] = ROOT_PATH;
$checks['ROOT_PATH 存在'] = is_dir(ROOT_PATH) ? '✅ 是' : '❌ 目录不存在！';

$dirs = [
    'data/'                    => ROOT_PATH . 'data/',
    'students/'                => DIR_STUDENTS,
    'students/avatars/'        => DIR_AVATARS,
    'students/backgrounds/'    => DIR_BACKGROUNDS,
    'students/music/'          => DIR_MUSIC,
    'students/stickers/'       => DIR_STICKERS,
    'students/photos/'         => DIR_PHOTOS,
    'album/photos/'            => DIR_ALBUM,
    'album/panoramas/'         => ROOT_PATH . 'album/panoramas/',
    'assets/images/overlays/'  => ROOT_PATH . 'assets/images/overlays/',
];

foreach ($dirs as $label => $path) {
    $exists = is_dir($path);
    $writable = $exists && is_writable($path);
    if (!$exists) {
        $checks["目录 {$label}"] = "❌ 不存在 ({$path})";
        $errors[] = "目录 {$label} 不存在: {$path}";
    } elseif (!$writable) {
        $checks["目录 {$label}"] = "❌ 不可写 ({$path})";
        $errors[] = "目录 {$label} 没有写入权限: {$path} → 执行 chmod 755 {$path} 和 chown www:www {$path}";
    } else {
        $checks["目录 {$label}"] = "✅ 可写";
    }
}

// ── 5. 关键数据文件检查 ──
$files = [
    'students.json'     => STUDENTS_JSON,
    'classmates.json'   => CLASSMATES_JSON,
    'site_config.json'  => ROOT_PATH . 'data/site_config.json',
];

foreach ($files as $label => $path) {
    $exists = file_exists($path);
    $readable = $exists && is_readable($path);
    $writable = $exists && is_writable($path);
    $size = $exists ? filesize($path) : 0;

    if (!$exists) {
        $checks["文件 {$label}"] = "❌ 不存在 ({$path})";
        $errors[] = "数据文件 {$label} 不存在: {$path}";
    } elseif (!$writable) {
        $checks["文件 {$label}"] = "❌ 不可写 ({$size} bytes)";
        $errors[] = "数据文件 {$label} 无写入权限: {$path}";
    } else {
        $checks["文件 {$label}"] = "✅ 可读写 ({$size} bytes)";
    }
}

// ── 6. 实际写入测试 ──
$testFile = ROOT_PATH . 'data/.write_test_' . time();
$testResult = @file_put_contents($testFile, 'test');
if ($testResult !== false) {
    @unlink($testFile);
    $checks['写入测试 (data/)'] = '✅ 成功';
} else {
    $checks['写入测试 (data/)'] = '❌ 失败！无法写入 data/ 目录';
    $errors[] = '无法写入 data/ 目录，这会导致所有保存操作失败';
}

$testFile2 = DIR_STUDENTS . '.write_test_' . time();
$testResult2 = @file_put_contents($testFile2, 'test');
if ($testResult2 !== false) {
    @unlink($testFile2);
    $checks['写入测试 (students/)'] = '✅ 成功';
} else {
    $checks['写入测试 (students/)'] = '❌ 失败！无法写入 students/ 目录';
    $errors[] = '无法写入 students/ 目录，这会导致页面生成失败';
}

// ── 7. classmates.json 内容预览 ──
$cmData = readJson(CLASSMATES_JSON);
if ($cmData) {
    $checks['classmates 总数'] = count($cmData['classmates'] ?? []) . ' 人';
    $checks['已生成页面数'] = count($cmData['pages'] ?? []) . ' 个';
    $checks['classmates 名单'] = implode(', ', $cmData['classmates'] ?? []);
    $checks['pages 列表'] = implode(', ', $cmData['pages'] ?? []);
    $checks['slugs 映射'] = json_encode($cmData['slugs'] ?? [], JSON_UNESCAPED_UNICODE);
}

// ── 8. students.json 内容预览 ──
$stData = readJson(STUDENTS_JSON);
if ($stData) {
    $checks['students.json 学生数'] = count($stData['students'] ?? []);
    foreach (($stData['students'] ?? []) as $s) {
        $slug = $s['slug'] ?? '?';
        $htmlPath = DIR_STUDENTS . $slug . '.html';
        $htmlExists = file_exists($htmlPath);
        $checks["学生 {$s['name']}"] = "slug={$slug}, hasAvatar=" . ($s['hasAvatar'] ? '是' : '否') . ", HTML=" . ($htmlExists ? '✅存在' : '❌不存在');
    }
}

// ── 9. 模板文件检查 ──
$tplPath = dirname(dirname(__FILE__)) . '/templates/student.tpl.html';
$checks['学生模板文件'] = file_exists($tplPath) ? '✅ 存在 (' . filesize($tplPath) . ' bytes)' : '❌ 不存在: ' . $tplPath;

// ── 汇总 ──
$status = count($errors) === 0 ? '✅ 所有检查通过' : '❌ 发现 ' . count($errors) . ' 个错误';

jsonResponse([
    'success' => true,
    'status'  => $status,
    'checks'  => $checks,
    'errors'  => $errors,
    'warnings'=> $warnings,
    'fix_commands' => count($errors) > 0 ? "SSH 执行以下命令修复权限:\ncd " . ROOT_PATH . "\nchown -R www:www .\nchmod -R 755 data students album assets/images" : '',
]);

function return_bytes($val) {
    $val = trim($val);
    $unit = strtolower(substr($val, -1));
    $num = (int)$val;
    switch ($unit) {
        case 'g': $num *= 1024;
        case 'm': $num *= 1024;
        case 'k': $num *= 1024;
    }
    return $num;
}
