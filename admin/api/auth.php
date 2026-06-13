<?php
require_once __DIR__ . '/_init.php';
require_once dirname(__DIR__) . '/config.php';
header('Content-Type: application/json; charset=utf-8');

// 方法覆盖：PUT/DELETE 通过 POST + ?_method=XXX 传递（兼容Nginx）
$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'POST' && !empty($_GET['_method'])) {
    $method = strtoupper($_GET['_method']);
}

if ($method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    $password = $body['password'] ?? '';

    // ── 读取存储的密码 ──
    $settingsPath = ROOT_PATH . 'data/site_settings.json';
    $settings = readJson($settingsPath) ?: [];
    $storedHash = $settings['admin_password_hash'] ?? null;

    $valid = false;

    // 当管理员忘记后台修改的密码时，系统允许他们通过手动修改 config.php 里的常量来恢复登录。
    // 但是，为了防止出现“默认密码成为永久后门”的安全漏洞，
    // 只有当常量已被明确修改，并且不再是 'admin888' 时，它才被当作合法的备用密码。
    if ($storedHash) {
        // 优先验证前端修改后保存的 bcrypt 哈希
        $valid = password_verify($password, $storedHash);

        // 如果哈希验证失败，但输入的密码与当前的 ADMIN_PASSWORD 常量一致，
        // 且该常量已被修改（不等于初始的 'admin888'），则允许登录。
        if (!$valid && $password === ADMIN_PASSWORD && ADMIN_PASSWORD !== 'admin888') {
            $valid = true;
        }
    } else {
        // 尚未在后台修改过密码，直接使用 config.php 明文常量
        $valid = ($password === ADMIN_PASSWORD);
    }

    if ($valid) {
        $_SESSION['admin_logged_in'] = true;
        $_SESSION['login_time'] = time();
        jsonResponse(['success' => true, 'message' => '登录成功']);
    } else {
        jsonResponse(['success' => false, 'message' => '密码错误'], 401);
    }
}

if ($method === 'DELETE') {
    session_destroy();
    jsonResponse(['success' => true, 'message' => '已退出登录']);
}

// GET - 检查登录状态
if ($method === 'GET') {
    $loggedIn = !empty($_SESSION['admin_logged_in']);
    jsonResponse(['success' => true, 'logged_in' => $loggedIn]);
}
