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

    // ── 读取存储的密码（优先 bcrypt 哈希，降级到 config.php 明文常量）──
    $settingsPath = ROOT_PATH . 'data/site_settings.json';
    $settings = readJson($settingsPath) ?: [];
    $storedHash = $settings['admin_password_hash'] ?? null;

    $valid = false;
    if ($storedHash) {
        // 已迁移到 bcrypt 哈希
        $valid = password_verify($password, $storedHash);
    } else {
        // 尚未修改过密码，使用 config.php 明文常量
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
