<?php
require_once __DIR__ . '/_init.php';
/**
 * 同学录后台 · 自定义粒子效果 API
 * admin/api/custom_particles.php
 */
require_once dirname(dirname(__FILE__)) . '/config.php';
requireAuth();

define('CUSTOM_PARTICLES_JSON', ROOT_PATH . 'data/custom_particles.json');
define('DIR_OVERLAYS', ROOT_PATH . 'assets/images/overlays/');

function readParticles() {
    $data = readJson(CUSTOM_PARTICLES_JSON);
    return $data ?? ['particles' => []];
}

// 方法覆盖：PUT/DELETE 通过 POST + ?_method=XXX 传递（兼容Nginx）
$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'POST' && !empty($_GET['_method'])) {
    $method = strtoupper($_GET['_method']);
}

// GET: 获取自定义粒子列表
if ($method === 'GET') {
    jsonResponse(['success' => true, 'particles' => readParticles()['particles']]);
}

// POST: 新增粒子记录（文件由 upload.php 上传）
if ($method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    $item = [
        'id'       => 'custom_' . substr(uniqid(), -6),
        'name'     => trim($body['name'] ?? '自定义粒子'),
        'file'     => basename($body['file'] ?? ''),
        'count'    => intval($body['count'] ?? 20),
        'size'     => [intval($body['sizeMin'] ?? 12), intval($body['sizeMax'] ?? 32)],
        'addedAt'  => date('Y-m-d H:i:s'),
    ];
    if (!$item['file']) jsonResponse(['success' => false, 'message' => '文件名不能为空'], 400);

    $data = readParticles();
    $data['particles'][] = $item;
    writeJson(CUSTOM_PARTICLES_JSON, $data);
    jsonResponse(['success' => true, 'particle' => $item]);
}

// PUT: 更新粒子信息
if ($method === 'PUT') {
    $body = json_decode(file_get_contents('php://input'), true);
    $id   = $_GET['id'] ?? '';
    if (!$id) jsonResponse(['success' => false, 'message' => '缺少 id'], 400);

    $data = readParticles();
    $found = false;
    foreach ($data['particles'] as &$p) {
        if ($p['id'] === $id) {
            if (isset($body['name']))    $p['name']  = trim($body['name']);
            if (isset($body['count']))   $p['count'] = intval($body['count']);
            if (isset($body['sizeMin']) && isset($body['sizeMax'])) {
                $p['size'] = [intval($body['sizeMin']), intval($body['sizeMax'])];
            }
            $found = true; break;
        }
    }
    unset($p);
    if (!$found) jsonResponse(['success' => false, 'message' => '粒子不存在'], 404);
    writeJson(CUSTOM_PARTICLES_JSON, $data);
    jsonResponse(['success' => true]);
}

// DELETE: 删除粒子
if ($method === 'DELETE') {
    $id = $_GET['id'] ?? '';
    if (!$id) jsonResponse(['success' => false, 'message' => '缺少 id'], 400);

    $data    = readParticles();
    $deleted = null;
    $data['particles'] = array_values(array_filter($data['particles'], function($p) use ($id, &$deleted) {
        if ($p['id'] === $id) { $deleted = $p; return false; }
        return true;
    }));
    if (!$deleted) jsonResponse(['success' => false, 'message' => '粒子不存在'], 404);

    writeJson(CUSTOM_PARTICLES_JSON, $data);

    // 删除文件
    if (!empty($_GET['deleteFile'])) {
        $fp = DIR_OVERLAYS . basename($deleted['file']);
        if (file_exists($fp)) unlink($fp);
    }
    jsonResponse(['success' => true]);
}
