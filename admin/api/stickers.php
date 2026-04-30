<?php
require_once __DIR__ . '/_init.php';
require_once dirname(dirname(__FILE__)) . '/config.php';
requireAuth();

// 方法覆盖：PUT/DELETE 通过 POST + ?_method=XXX 传递（兼容Nginx）
$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'POST' && !empty($_GET['_method'])) {
    $method = strtoupper($_GET['_method']);
}

// GET: 列出 stickers 目录文件
if ($method === 'GET') {
    $studentId = $_GET['student_id'] ?? null;
    ensureDir(DIR_STICKERS);
    $files = glob(DIR_STICKERS . '*.{png,gif,webp,PNG,GIF,WEBP}', GLOB_BRACE);
    $list = [];
    foreach ($files as $f) {
        $fname = basename($f);
        $list[] = [
            'filename' => $fname,
            'path'     => 'students/stickers/' . $fname,
            'url'      => '/students/stickers/' . $fname,
            'size'     => filesize($f),
            'mtime'    => filemtime($f),
        ];
    }
    // 排序：最新在前
    usort($list, function($a,$b) { return $b['mtime'] - $a['mtime']; });
    jsonResponse(['success' => true, 'stickers' => $list]);
}

// PUT: 更新某学生的贴纸配置
if ($method === 'PUT') {
    $id   = $_GET['id'] ?? null;
    if (!$id) jsonResponse(['success' => false, 'message' => '缺少学生 ID'], 400);

    $body = json_decode(file_get_contents('php://input'), true);
    $stickers = $body['stickers'] ?? null;
    if (!is_array($stickers)) jsonResponse(['success' => false, 'message' => '贴纸数据格式错误'], 400);

    $data = readJson(STUDENTS_JSON);
    if (!$data) jsonResponse(['success' => false, 'message' => '数据文件不存在'], 500);

    $found = false;
    foreach ($data['students'] as &$s) {
        if ($s['id'] === $id) {
            $s['stickers']  = $stickers;
            $s['updatedAt'] = date('Y-m-d H:i:s');
            $found = true;
            $student = $s;
            break;
        }
    }
    if (!$found) jsonResponse(['success' => false, 'message' => '学生不存在'], 404);

    if (!writeJson(STUDENTS_JSON, $data)) jsonResponse(['success'=>false,'message'=>'写入失败'],500);

    // 重新生成页面
    require_once __DIR__ . '/generate.php';
    generateStudentPage($student);

    jsonResponse(['success' => true, 'message' => '贴纸配置已保存']);
}

// DELETE: 删除贴纸文件
if ($method === 'DELETE') {
    $filename = $_GET['file'] ?? '';
    if (!$filename) jsonResponse(['success' => false, 'message' => '缺少文件名'], 400);

    $filename = basename($filename); // 防止路径穿越
    $filepath = DIR_STICKERS . $filename;
    if (!file_exists($filepath)) {
        jsonResponse(['success' => false, 'message' => '文件不存在'], 404);
    }
    unlink($filepath);
    jsonResponse(['success' => true, 'message' => '贴纸已删除']);
}
