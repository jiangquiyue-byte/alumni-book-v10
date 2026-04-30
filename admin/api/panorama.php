<?php
require_once __DIR__ . '/_init.php';
require_once dirname(dirname(__FILE__)) . '/config.php';
requireAuth();

define('PANORAMA_JSON', ROOT_PATH . 'album/panoramas.json');
define('DIR_PANORAMAS', ROOT_PATH . 'album/panoramas/');

function readPanoramas() {
    $data = readJson(PANORAMA_JSON);
    return $data ?? ['panoramas' => []];
}

// 方法覆盖：PUT/DELETE 通过 POST + ?_method=XXX 传递（兼容Nginx）
$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'POST' && !empty($_GET['_method'])) {
    $method = strtoupper($_GET['_method']);
}

// GET
if ($method === 'GET') {
    jsonResponse(['success' => true, 'panoramas' => readPanoramas()['panoramas']]);
}

// POST: 新增全景图记录
if ($method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    $item = [
        'file'     => basename($body['file'] ?? ''),
        'title'    => trim($body['title'] ?? ''),
        'addedAt'  => date('Y-m-d H:i:s'),
    ];
    if (!$item['file']) jsonResponse(['success' => false, 'message' => '文件名不能为空'], 400);

    // 验证文件确实存在
    $filePath = DIR_PANORAMAS . $item['file'];
    if (!file_exists($filePath)) {
        jsonResponse(['success' => false, 'message' => '全景图文件不存在: ' . $item['file'] . '，请确认上传成功'], 400);
    }

    $data = readPanoramas();
    $data['panoramas'][] = $item;
    if (!writeJson(PANORAMA_JSON, $data)) {
        jsonResponse(['success' => false, 'message' => '写入 panoramas.json 失败，请检查 album/ 目录权限'], 500);
    }
    jsonResponse(['success' => true, 'panorama' => $item, 'message' => '全景图已添加']);
}

// PUT
if ($method === 'PUT') {
    $body = json_decode(file_get_contents('php://input'), true);
    $panos = $body['panoramas'] ?? null;
    if (!is_array($panos)) jsonResponse(['success' => false, 'message' => '格式错误'], 400);
    $data = readPanoramas();
    $data['panoramas'] = $panos;
    if (!writeJson(PANORAMA_JSON, $data)) {
        jsonResponse(['success' => false, 'message' => '保存失败'], 500);
    }
    jsonResponse(['success' => true]);
}

// DELETE
if ($method === 'DELETE') {
    $filename = $_GET['file'] ?? '';
    if (!$filename) jsonResponse(['success' => false, 'message' => '缺少文件名'], 400);
    $data = readPanoramas();
    $newList = [];
    foreach ($data['panoramas'] as $p) {
        if ($p['file'] !== $filename) $newList[] = $p;
    }
    $data['panoramas'] = $newList;
    if (!writeJson(PANORAMA_JSON, $data)) {
        jsonResponse(['success' => false, 'message' => '保存失败'], 500);
    }
    if (!empty($_GET['deleteFile'])) {
        $fp = DIR_PANORAMAS . basename($filename);
        if (file_exists($fp)) @unlink($fp);
    }
    jsonResponse(['success' => true, 'message' => '全景图已删除']);
}

jsonResponse(['success' => false, 'message' => '不支持的请求方法: ' . $method], 405);
