<?php
/**
 * 同学录后台 · 修改登录密码接口
 * POST /admin/api/change_password.php
 * Body: { "oldPassword": "...", "newPassword": "...", "confirmPassword": "..." }
 */
require_once __DIR__ . '/_init.php';
require_once dirname(__DIR__) . '/config.php';
header('Content-Type: application/json; charset=utf-8');

requireAuth();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'message' => '仅支持 POST 请求'], 405);
}

$body = json_decode(file_get_contents('php://input'), true);
$oldPassword    = trim($body['oldPassword']    ?? '');
$newPassword    = trim($body['newPassword']    ?? '');
$confirmPassword = trim($body['confirmPassword'] ?? '');

// ── 基础校验 ──
if (!$oldPassword || !$newPassword || !$confirmPassword) {
    jsonResponse(['success' => false, 'message' => '请填写所有密码字段'], 400);
}
if ($newPassword !== $confirmPassword) {
    jsonResponse(['success' => false, 'message' => '新密码与确认密码不一致'], 400);
}
if (mb_strlen($newPassword) < 6) {
    jsonResponse(['success' => false, 'message' => '新密码长度不能少于 6 位'], 400);
}
if (mb_strlen($newPassword) > 64) {
    jsonResponse(['success' => false, 'message' => '新密码长度不能超过 64 位'], 400);
}

// ── 读取当前密码（优先读取 site_settings.json 中的哈希，降级到 config.php 明文常量）──
$settingsPath = ROOT_PATH . 'data/site_settings.json';
$settings = readJson($settingsPath) ?: [];
$storedHash = $settings['admin_password_hash'] ?? null;

if ($storedHash) {
    // 已迁移到 bcrypt 哈希
    $oldValid = password_verify($oldPassword, $storedHash);
} else {
    // 首次修改：对比 config.php 明文常量
    $oldValid = ($oldPassword === ADMIN_PASSWORD);
}

if (!$oldValid) {
    jsonResponse(['success' => false, 'message' => '原密码错误'], 401);
}

// ── 生成新哈希并持久化 ──
$newHash = password_hash($newPassword, PASSWORD_BCRYPT, ['cost' => 12]);
$settings['admin_password_hash'] = $newHash;
$settings['password_updated_at'] = date('Y-m-d H:i:s');

if (!writeJson($settingsPath, $settings)) {
    jsonResponse(['success' => false, 'message' => '密码保存失败，请检查服务器文件权限'], 500);
}

// ── 强制退出当前 Session（要求重新登录）──
session_destroy();

jsonResponse(['success' => true, 'message' => '密码已修改，请重新登录']);
