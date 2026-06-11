<?php
require_once __DIR__ . '/_init.php';
/**
 * 同学录后台 · 全局网站设置 API
 * admin/api/site_settings.php
 */
require_once dirname(dirname(__FILE__)) . '/config.php';
requireAuth();

define('SITE_SETTINGS_JSON', ROOT_PATH . 'data/site_settings.json');

function readSettings() {
    $data = readJson(SITE_SETTINGS_JSON);
    return $data ?? ['index_particle' => ['enabled' => true, 'preset' => 'sakura']];
}

// 方法覆盖：PUT/DELETE 通过 POST + ?_method=XXX 传递（兼容Nginx）
$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'POST' && !empty($_GET['_method'])) {
    $method = strtoupper($_GET['_method']);
}

if ($method === 'GET') {
    jsonResponse(['success' => true, 'settings' => readSettings()]);
}

if ($method === 'PUT') {
    $body = json_decode(file_get_contents('php://input'), true);
    if (!$body) jsonResponse(['success' => false, 'message' => '数据格式错误'], 400);

    $settings = readSettings();

    // 首页粒子设置
    if (isset($body['index_particle'])) {
        $settings['index_particle'] = [
            'enabled' => (bool)($body['index_particle']['enabled'] ?? true),
            'preset'  => trim($body['index_particle']['preset'] ?? 'sakura'),
        ];
    }

    // 支持更新其他可能的设置字段，而不只是 index_particle
    foreach ($body as $key => $value) {
        if ($key !== 'index_particle' && $key !== 'admin_password_hash' && $key !== 'password_updated_at') {
            $settings[$key] = $value;
        }
    }

    writeJson(SITE_SETTINGS_JSON, $settings);
    jsonResponse(['success' => true, 'settings' => $settings]);
}
