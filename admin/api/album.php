<?php
require_once __DIR__ . '/_init.php';
require_once dirname(dirname(__FILE__)) . '/config.php';
requireAuth();

// 方法覆盖：PUT/DELETE 通过 POST + ?_method=XXX 传递（兼容Nginx）
$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'POST' && !empty($_GET['_method'])) {
    $method = strtoupper($_GET['_method']);
}

// GET
if ($method === 'GET') {
    $data = readJson(ALBUM_JSON);
    if (!$data) $data = ['photos' => []];
    jsonResponse(['success' => true, 'photos' => $data['photos'] ?? []]);
}

// POST
if ($method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    $photo = [
        'file'    => basename($body['file'] ?? ''),
        'caption' => trim($body['caption'] ?? ''),
        'wide'    => !empty($body['wide']),
        'tall'    => !empty($body['tall']),
        'frame'   => $body['frame'] ?? 'none',
        'addedAt' => date('Y-m-d H:i:s'),
    ];
    if (!$photo['file']) jsonResponse(['success' => false, 'message' => '文件名不能为空'], 400);

    $data = readJson(ALBUM_JSON) ?? ['photos' => []];
    $data['photos'][] = $photo;
    if (!writeJson(ALBUM_JSON, $data)) {
        jsonResponse(['success' => false, 'message' => '写入 photos.json 失败'], 500);
    }
    jsonResponse(['success' => true, 'photo' => $photo, 'message' => '照片已添加']);
}

// PUT
if ($method === 'PUT') {
    $body = json_decode(file_get_contents('php://input'), true);
    $photos = $body['photos'] ?? null;
    if (!is_array($photos)) jsonResponse(['success' => false, 'message' => '数据格式错误'], 400);
    $data = readJson(ALBUM_JSON) ?? ['photos' => []];
    $data['photos'] = $photos;
    if (!writeJson(ALBUM_JSON, $data)) {
        jsonResponse(['success' => false, 'message' => '保存失败'], 500);
    }
    jsonResponse(['success' => true, 'message' => '相册已更新']);
}

// DELETE
if ($method === 'DELETE') {
    $filename = $_GET['file'] ?? '';
    if (!$filename) jsonResponse(['success' => false, 'message' => '缺少文件名'], 400);
    $data = readJson(ALBUM_JSON) ?? ['photos' => []];
    $newPhotos = [];
    foreach ($data['photos'] as $p) {
        if ($p['file'] !== $filename) $newPhotos[] = $p;
    }
    $data['photos'] = $newPhotos;
    if (!writeJson(ALBUM_JSON, $data)) {
        jsonResponse(['success' => false, 'message' => '保存失败'], 500);
    }
    if (!empty($_GET['deleteFile'])) {
        $fp = DIR_ALBUM . basename($filename);
        if (file_exists($fp)) @unlink($fp);
    }
    jsonResponse(['success' => true, 'message' => '照片已删除']);
}

jsonResponse(['success' => false, 'message' => '不支持的方法: ' . $method], 405);
