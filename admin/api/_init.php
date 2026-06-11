<?php
/**
 * 同学录后台 · API 全局初始化 · v10.5
 * 所有 API 入口文件都必须在最开头引入此文件
 * 确保任何 PHP 错误/异常都以 JSON 格式返回
 */

// ── 1. 强制 JSON 响应头 ──
header('Content-Type: application/json; charset=utf-8');

// ── 2. 关闭 HTML 错误输出 ──
ini_set('display_errors', 0);
ini_set('html_errors', 0);
error_reporting(E_ALL);

// ── 3. 尝试提升上传/执行限制 ──
@ini_set('upload_max_filesize', '100M');
@ini_set('post_max_size', '105M');
@ini_set('max_execution_time', 120);
@ini_set('memory_limit', '256M');

// ── 4. 全局错误处理器 → JSON ──
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    // 忽略被 @ 压制的错误
    if (!(error_reporting() & $errno)) return false;
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => "服务器错误: {$errstr}",
        'debug'   => basename($errfile) . ":{$errline}"
    ], JSON_UNESCAPED_UNICODE);
    exit;
});

// ── 5. 全局异常处理器 → JSON ──
set_exception_handler(function($e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => "服务器异常: " . $e->getMessage(),
        'debug'   => basename($e->getFile()) . ":" . $e->getLine()
    ], JSON_UNESCAPED_UNICODE);
    exit;
});

// ── 6. 致命错误兜底（OOM / parse error）→ JSON ──
register_shutdown_function(function() {
    $error = error_get_last();
    if ($error && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        // 清空之前可能输出的任何内容
        if (ob_get_level()) ob_end_clean();
        if (!headers_sent()) {
            http_response_code(500);
            header('Content-Type: application/json; charset=utf-8');
        }
        echo json_encode([
            'success' => false,
            'message' => "PHP 致命错误: " . $error['message'],
            'debug'   => basename($error['file']) . ":" . $error['line']
        ], JSON_UNESCAPED_UNICODE);
    }
});

// ── 7. 开启输出缓冲（防止意外输出破坏 JSON）──
ob_start();

// ── 8. CSRF 防护（简单验证 Referer/Origin，防止跨站请求）──
if (in_array($_SERVER['REQUEST_METHOD'], ['POST', 'PUT', 'DELETE'])) {
    $referer = $_SERVER['HTTP_REFERER'] ?? '';
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $host = $_SERVER['HTTP_HOST'] ?? '';

    // 简单的 Referer 检查，确保请求来自本站
    // 如果没有 Referer 且没有 Origin，且不是来自命令行，则可能存在风险
    if (PHP_SAPI !== 'cli') {
        $allowed = false;

        // 解析当前 Host 供对比
        $hostParts = explode(':', $host);
        $currentDomain = $hostParts[0];

        if ($origin) {
            $originHost = parse_url($origin, PHP_URL_HOST);
            if ($originHost === $currentDomain) $allowed = true;
        }

        if (!$allowed && $referer) {
            $refererHost = parse_url($referer, PHP_URL_HOST);
            if ($refererHost === $currentDomain) $allowed = true;
        }

        // 如果有来源但都不匹配当前域名，则拒绝
        if (!$allowed && ($origin || $referer)) {
             http_response_code(403);
             echo json_encode(['success' => false, 'message' => 'CSRF 验证失败：非法来源请求'], JSON_UNESCAPED_UNICODE);
             exit;
        }
    }
}

// ── 9. HTTP 方法覆盖（解决 Nginx 不转发 DELETE/PUT）──
// 支持三种方式：URL参数 > Header > POST字段
$_REAL_METHOD = $_SERVER['REQUEST_METHOD'];
if ($_REAL_METHOD === 'POST') {
    $override = '';
    // 方式1：URL参数（最可靠，Nginx不会拦截）
    if (!empty($_GET['_method'])) {
        $override = strtoupper($_GET['_method']);
    }
    // 方式2：自定义Header
    elseif (!empty($_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE'])) {
        $override = strtoupper($_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE']);
    }
    // 方式3：POST字段
    elseif (!empty($_POST['_method'])) {
        $override = strtoupper($_POST['_method']);
    }
    if (in_array($override, ['PUT', 'DELETE', 'PATCH'])) {
        $_SERVER['REQUEST_METHOD'] = $override;
    }
}

// ── 10. 预检 PHP 扩展 ──
if (!extension_loaded('fileinfo')) {
    define('FILEINFO_MISSING', true);
}


// ── 11. 数据自愈机制 ──
// 检测 students/ 下的HTML文件，如果JSON数据库中缺失则自动补回
function autoHealData() {
    if (!defined('ROOT_PATH')) return;
    $studentsJson = ROOT_PATH . 'data/students.json';
    $classmatesJson = ROOT_PATH . 'data/classmates.json';
    if (!file_exists($studentsJson) || !file_exists($classmatesJson)) return;

    $stData = @json_decode(@file_get_contents($studentsJson), true);
    $cmData = @json_decode(@file_get_contents($classmatesJson), true);
    if (!$stData || !$cmData) return;

    $existingSlugs = [];
    foreach ($stData['students'] ?? [] as $s) {
        if (!empty($s['slug'])) $existingSlugs[$s['slug']] = true;
    }

    // 扫描students目录下的HTML文件
    $htmlFiles = glob(ROOT_PATH . 'students/*.html');
    $changed = false;
    foreach ($htmlFiles as $f) {
        $slug = pathinfo($f, PATHINFO_FILENAME);
        if ($slug === 'template') continue;
        if (isset($existingSlugs[$slug])) continue;

        // 尝试从HTML title提取姓名
        $html = @file_get_contents($f, false, null, 0, 2000);
        $name = $slug;
        if (preg_match('/<title>同学录 · ([^<]+)<\/title>/', $html, $m)) {
            $name = trim($m[1]);
        }

        // 补充到students.json
        $stData['students'][] = [
            'id' => 'stu_heal_' . $slug,
            'name' => $name, 'slug' => $slug,
            'hasAvatar' => file_exists(ROOT_PATH . 'students/avatars/' . $slug . '.jpg'),
            'avatar' => 'students/avatars/' . $slug . '.jpg',
            'music' => ['enabled'=>false,'src'=>'','title'=>'','autoplay'=>true,'loop'=>true],
            'background' => ['type'=>'default','src'=>'','color'=>''],
            'particles' => 'sakura', 'stickers' => [], 'photos' => [],
            'info' => ['name'=>$name],
            'createdAt' => date('Y-m-d H:i:s'),
            'updatedAt' => date('Y-m-d H:i:s'),
        ];

        // 补充到classmates.json
        if (!in_array($name, $cmData['classmates'] ?? [])) {
            $cmData['classmates'][] = $name;
        }
        if (!in_array($name, $cmData['pages'] ?? [])) {
            $cmData['pages'][] = $name;
        }
        $cmData['slugs'][$name] = $slug;
        $changed = true;
    }

    if ($changed) {
        @file_put_contents($studentsJson, json_encode($stData, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT), LOCK_EX);
        @file_put_contents($classmatesJson, json_encode($cmData, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT), LOCK_EX);
    }
}

// 仅在 GET students 时触发自愈（不在每次请求都跑）
if (basename($_SERVER['SCRIPT_FILENAME'] ?? '') === 'students.php' && ($_SERVER['REQUEST_METHOD'] === 'GET')) {
    autoHealData();
}
