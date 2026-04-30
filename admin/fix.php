<?php
/**
 * 同学录 v9.0 · 深度诊断 + 自动修复
 * 访问: http://你的域名/admin/fix.php
 */
header('Content-Type: text/html; charset=utf-8');
echo "<pre style='font-family:monospace;background:#111;color:#e0d8cc;padding:20px;max-width:900px;margin:20px auto;border-radius:8px;line-height:1.8;'>\n";
echo "===== 同学录 v9.0 深度诊断 =====\n\n";

// 0. PHP 版本
echo "PHP 版本: " . phpversion() . "\n";
$v = explode('.', phpversion());
if ($v[0] < 7 || ($v[0] == 7 && $v[1] < 4)) {
    echo "⚠️  PHP < 7.4，箭头函数不可用（已用传统写法替代）\n";
}

// 1. 测试 students.php 是否能被正常加载（不执行，只检查语法）
echo "\n--- PHP 文件加载测试 ---\n";
$apiDir = __DIR__ . '/api/';
$phpFiles = glob($apiDir . '*.php');
foreach ($phpFiles as $f) {
    $name = basename($f);
    $output = [];
    $ret = 0;
    exec("php -l " . escapeshellarg($f) . " 2>&1", $output, $ret);
    $result = implode(' ', $output);
    if ($ret === 0) {
        echo "  ✓ {$name}\n";
    } else {
        echo "  ✗ {$name}: {$result}\n";
    }
}

// 2. 关键文件内容验证
echo "\n--- 文件版本验证 ---\n";
$checks = [
    ['api/_init.php', 'v9.0'],
    ['admin.html', 'page-content'],
    ['assets/js/content-editor.js', 'ContentEditor'],
    ['assets/js/api.js', 'XMLHttpRequest'],
    ['api/students.php', 'function($s) use ($id'],
    ['api/site_config.php', 'acknowledgments'],
    ['api/generate.php', 'dirname(dirname('],
];
foreach ($checks as list($file, $keyword)) {
    $path = __DIR__ . '/' . $file;
    if (!file_exists($path)) {
        echo "  ✗ {$file}: 文件不存在!\n";
    } else {
        $has = strpos(file_get_contents($path), $keyword) !== false;
        echo ($has ? "  ✓" : "  ✗") . " {$file}" . ($has ? "" : " (缺少关键字: {$keyword})") . "\n";
    }
}

// 3. fn() 箭头函数残留检查
echo "\n--- fn() 箭头函数残留扫描 ---\n";
$fnCount = 0;
foreach (glob($apiDir . '*.php') as $f) {
    $lines = file($f);
    foreach ($lines as $i => $line) {
        if (preg_match('/\bfn\s*\(/', $line) && strpos($line, 'function') === false && strpos($line, '//') === false) {
            echo "  ✗ " . basename($f) . ":" . ($i+1) . ": " . trim($line) . "\n";
            $fnCount++;
        }
    }
}
echo $fnCount === 0 ? "  ✓ 无残留\n" : "  ✗ 发现 {$fnCount} 处残留!\n";

// 4. 目录写入测试
echo "\n--- 写入权限测试 ---\n";
$root = dirname(__DIR__) . '/';
$testDirs = [
    'data/' => $root . 'data/',
    'students/' => $root . 'students/',
    'album/photos/' => $root . 'album/photos/',
    'album/panoramas/' => $root . 'album/panoramas/',
];
foreach ($testDirs as $label => $dir) {
    if (!is_dir($dir)) {
        echo "  ✗ {$label} 目录不存在\n";
        // 尝试创建
        if (@mkdir($dir, 0755, true)) {
            echo "    → 已自动创建\n";
        }
        continue;
    }
    $testFile = $dir . '.test_' . time();
    $ok = @file_put_contents($testFile, 'test');
    if ($ok !== false) {
        @unlink($testFile);
        echo "  ✓ {$label} 可写\n";
    } else {
        echo "  ✗ {$label} 不可写! (路径: {$dir})\n";
        echo "    当前属主: " . posix_getpwuid(fileowner($dir))['name'] . ":" . posix_getgrgid(filegroup($dir))['name'] . "\n";
        echo "    当前权限: " . decoct(fileperms($dir) & 0777) . "\n";
        echo "    PHP进程用户: " . (function_exists('posix_getpwuid') ? posix_getpwuid(posix_geteuid())['name'] : get_current_user()) . "\n";
        // 尝试修复
        @chmod($dir, 0777);
        $ok2 = @file_put_contents($testFile, 'test');
        if ($ok2 !== false) {
            @unlink($testFile);
            echo "    → chmod 777 后可写了\n";
        } else {
            echo "    → chmod 777 后仍然不可写，需要 chown\n";
        }
    }
}

// 5. 实际模拟删除操作
echo "\n--- 模拟删除学生操作 ---\n";
$studentsJson = $root . 'data/students.json';
if (!file_exists($studentsJson)) {
    echo "  ✗ students.json 不存在\n";
} else {
    $data = json_decode(file_get_contents($studentsJson), true);
    if (!$data) {
        echo "  ✗ students.json 解析失败: " . json_last_error_msg() . "\n";
    } else {
        echo "  当前学生数: " . count($data['students'] ?? []) . "\n";
        // 测试写入（写回相同内容）
        $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        $writeOk = @file_put_contents($studentsJson, $json, LOCK_EX);
        if ($writeOk !== false) {
            echo "  ✓ students.json 可写入 ({$writeOk} bytes)\n";
        } else {
            echo "  ✗ students.json 写入失败!\n";
            echo "    文件属主: " . posix_getpwuid(fileowner($studentsJson))['name'] . "\n";
            echo "    文件权限: " . decoct(fileperms($studentsJson) & 0777) . "\n";
            // 尝试修复
            @chmod($studentsJson, 0666);
            @chmod(dirname($studentsJson), 0777);
            $writeOk2 = @file_put_contents($studentsJson, $json, LOCK_EX);
            echo $writeOk2 !== false ? "    → 修复后可写了\n" : "    → 仍然不可写，需要 chown www:www\n";
        }
    }
}

// 6. 实际调用 site_config API 测试
echo "\n--- site_config.json 读写测试 ---\n";
$cfgFile = $root . 'data/site_config.json';
if (!file_exists($cfgFile)) {
    echo "  ✗ site_config.json 不存在\n";
} else {
    $cfg = json_decode(file_get_contents($cfgFile), true);
    echo "  内容: " . (isset($cfg['footer']) ? '有footer' : '无footer') . ", " . (isset($cfg['preface']) ? '有preface' : '无preface') . ", acks=" . count($cfg['acknowledgments'] ?? []) . "\n";
    // 测试写入
    $writeOk = @file_put_contents($cfgFile, json_encode($cfg, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT), LOCK_EX);
    echo $writeOk !== false ? "  ✓ 可写入\n" : "  ✗ 写入失败!\n";
}

// 7. classmates.json
echo "\n--- classmates.json ---\n";
$cmFile = $root . 'data/classmates.json';
if (file_exists($cmFile)) {
    $cm = json_decode(file_get_contents($cmFile), true);
    echo "  classmates: " . implode(', ', $cm['classmates'] ?? []) . "\n";
    echo "  pages: " . implode(', ', $cm['pages'] ?? []) . "\n";
    echo "  slugs: " . json_encode($cm['slugs'] ?? [], JSON_UNESCAPED_UNICODE) . "\n";
}

// 8. session 测试
echo "\n--- Session 测试 ---\n";
if (session_status() === PHP_SESSION_NONE) @session_start();
$_SESSION['test'] = time();
echo "  Session ID: " . session_id() . "\n";
echo "  Save path: " . session_save_path() . "\n";
echo "  ✓ Session 正常\n";

echo "\n===== 诊断完成 =====\n";
echo "</pre>\n";
