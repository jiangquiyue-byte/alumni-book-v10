<?php
require_once __DIR__ . '/_init.php';
require_once dirname(dirname(__FILE__)) . '/config.php';
requireAuth();

// 方法覆盖：PUT/DELETE 通过 POST + ?_method=XXX 传递（兼容Nginx）
$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'POST' && !empty($_GET['_method'])) {
    $method = strtoupper($_GET['_method']);
}
$studentId = $_GET['id'] ?? '';

if (!$studentId) jsonResponse(['success' => false, 'message' => '缺少学生 ID'], 400);

function loadStudent($id) {
    $data = readJson(STUDENTS_JSON);
    if (!$data) return null;
    foreach ($data['students'] as $s) {
        if ($s['id'] === $id) return $s;
    }
    return null;
}

function saveStudentPhotos($id, $photos) {
    $data = readJson(STUDENTS_JSON);
    if (!$data) return false;
    foreach ($data['students'] as &$s) {
        if ($s['id'] === $id) {
            $s['photos']    = $photos;
            $s['updatedAt'] = date('Y-m-d H:i:s');
            break;
        }
    }
    if (!writeJson(STUDENTS_JSON, $data)) return false;
    // 重新生成页面
    require_once __DIR__ . '/generate.php';
    foreach ($data['students'] as $s) {
        if ($s['id'] === $id) { generateStudentPage($s); break; }
    }
    return true;
}

if ($method === 'GET') {
    $student = loadStudent($studentId);
    if (!$student) jsonResponse(['success' => false, 'message' => '学生不存在'], 404);
    jsonResponse(['success' => true, 'photos' => $student['photos'] ?? []]);
}

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

    $student = loadStudent($studentId);
    if (!$student) jsonResponse(['success' => false, 'message' => '学生不存在'], 404);

    $photos = $student['photos'] ?? [];
    $photos[] = $photo;
    saveStudentPhotos($studentId, $photos);
    jsonResponse(['success' => true, 'photo' => $photo]);
}

if ($method === 'PUT') {
    $body   = json_decode(file_get_contents('php://input'), true);
    $photos = $body['photos'] ?? [];
    saveStudentPhotos($studentId, $photos);
    jsonResponse(['success' => true, 'message' => '照片墙已更新']);
}

if ($method === 'DELETE') {
    $filename = $_GET['file'] ?? '';
    $student  = loadStudent($studentId);
    if (!$student) jsonResponse(['success' => false, 'message' => '学生不存在'], 404);

    $photos = array_values(array_filter(
        $student['photos'] ?? [],
        function($p) use ($filename) { return $p['file'] !== $filename; }
    ));
    saveStudentPhotos($studentId, $photos);

    if (!empty($_GET['deleteFile'])) {
        $fp = DIR_PHOTOS . basename($filename);
        if (file_exists($fp)) unlink($fp);
    }
    jsonResponse(['success' => true, 'message' => '照片已删除']);
}
