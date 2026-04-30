<?php
require_once __DIR__ . '/_init.php';
/**
 * 同学录后台 · 专属模板管理 API
 * 
 * GET    ?id=xxx           获取某学生的专属模板信息（资源列表）
 * POST   ?id=xxx&action=deploy   部署HTML到students/{slug}.html
 * POST   ?id=xxx&action=upload&res=avatar|music|bg|sticker|photo|asset|html
 *                          上传资源到 exclusive/{slug}/{子目录}
 * DELETE ?id=xxx&file=xxx  删除某个资源文件
 */
require_once dirname(dirname(__FILE__)) . '/config.php';
requireAuth();

define('DIR_EXCLUSIVE', ROOT_PATH . 'exclusive/');

$method = $_SERVER['REQUEST_METHOD'];
// 支持 POST + ?_method=DELETE/PUT 覆盖（与 api.js 的 request 函数一致）
if ($method === 'POST' && !empty($_GET['_method'])) {
    $override = strtoupper($_GET['_method']);
    if (in_array($override, ['PUT', 'DELETE', 'PATCH'])) {
        $method = $override;
    }
}
$id     = $_GET['id'] ?? '';
$action = $_GET['action'] ?? '';

// ── GET: 获取专属模板信息 ──
if ($method === 'GET') {
    if (!$id) {
        // 返回所有isOwner学生列表
        $data = readJson(STUDENTS_JSON);
        $owners = [];
        foreach (($data['students'] ?? []) as $s) {
            if (!empty($s['isOwner'])) {
                $slug = $s['slug'] ?? '';
                $exclusiveDir = DIR_EXCLUSIVE . $slug . '/';
                $owners[] = [
                    'id'   => $s['id'],
                    'name' => $s['name'],
                    'slug' => $slug,
                    'hasExclusiveDir' => is_dir($exclusiveDir),
                    'hasPage' => file_exists(DIR_STUDENTS . $slug . '.html'),
                ];
            }
        }
        jsonResponse(['success' => true, 'owners' => $owners]);
    }

    // 获取某学生的专属资源列表
    $data = readJson(STUDENTS_JSON);
    $student = null;
    foreach (($data['students'] ?? []) as $s) {
        if ($s['id'] === $id) { $student = $s; break; }
    }
    if (!$student) jsonResponse(['success' => false, 'message' => '学生不存在'], 404);
    if (empty($student['isOwner'])) jsonResponse(['success' => false, 'message' => '该学生不是专属模板'], 400);

    $slug = $student['slug'] ?? '';
    $base = DIR_EXCLUSIVE . $slug . '/';

    // 确保目录存在
    $subdirs = ['avatar', 'stickers', 'music', 'photos', 'backgrounds', 'assets'];
    foreach ($subdirs as $sub) {
        $d = $base . $sub . '/';
        if (!is_dir($d)) @mkdir($d, 0777, true);
    }

    // 扫描资源
    $htmlFile = $base . 'index.html';
    $htmlEntry = file_exists($htmlFile) ? [[
        'name' => 'index.html',
        'size' => filesize($htmlFile),
        'time' => date('Y-m-d H:i:s', filemtime($htmlFile)),
    ]] : [];
    $resources = [
        'html'        => $htmlEntry,
        'avatar'      => scanFiles($base . 'avatar/'),
        'stickers'    => scanFiles($base . 'stickers/'),
        'music'       => scanFiles($base . 'music/'),
        'photos'      => scanFiles($base . 'photos/'),
        'backgrounds' => scanFiles($base . 'backgrounds/'),
        'assets'      => scanFiles($base . 'assets/'),
    ];

    // 检查是否已部署
    $deployed = file_exists(DIR_STUDENTS . $slug . '.html');

    jsonResponse([
        'success'   => true,
        'student'   => ['id' => $student['id'], 'name' => $student['name'], 'slug' => $slug],
        'resources' => $resources,
        'deployed'  => $deployed,
        'basePath'  => 'exclusive/' . $slug . '/',
    ]);
}

// ── POST: 上传资源或部署 ──
if ($method === 'POST') {
    if (!$id) jsonResponse(['success' => false, 'message' => '缺少学生ID'], 400);

    $data = readJson(STUDENTS_JSON);
    $student = null;
    $studentIdx = -1;
    foreach (($data['students'] ?? []) as $i => $s) {
        if ($s['id'] === $id) { $student = $s; $studentIdx = $i; break; }
    }
    if (!$student) jsonResponse(['success' => false, 'message' => '学生不存在'], 404);

    $slug = $student['slug'] ?? '';
    if (!$slug) jsonResponse(['success' => false, 'message' => '学生缺少slug'], 400);

    $base = DIR_EXCLUSIVE . $slug . '/';
    // 确保目录存在
    $subdirs = ['avatar', 'stickers', 'music', 'photos', 'backgrounds', 'assets'];
    foreach ($subdirs as $sub) {
        $d = $base . $sub . '/';
        if (!is_dir($d)) @mkdir($d, 0777, true);
    }

    // ── 部署操作 ──
    if ($action === 'deploy') {
        $srcFile = $base . 'index.html';
        if (!file_exists($srcFile)) {
            jsonResponse(['success' => false, 'message' => '请先上传HTML文件'], 400);
        }
        $destFile = DIR_STUDENTS . $slug . '.html';
        // 读取HTML内容
        $html = file_get_contents($srcFile);
        // 写入到students目录
        if (file_put_contents($destFile, $html) === false) {
            jsonResponse(['success' => false, 'message' => '部署失败：无法写入文件'], 500);
        }
        // 确保isOwner标记
        if (empty($student['isOwner'])) {
            $data['students'][$studentIdx]['isOwner'] = true;
            writeJson(STUDENTS_JSON, $data);
        }
        // 同步classmates.json
        $name = $student['name'];
        $cmFile = CLASSMATES_JSON;
        $cm = readJson($cmFile) ?? ['classmates' => [], 'slugs' => [], 'pages' => []];
        if (!isset($cm['classmates'])) $cm['classmates'] = [];
        if (!isset($cm['slugs']))      $cm['slugs'] = [];
        if (!isset($cm['pages']))      $cm['pages'] = [];
        if (!in_array($name, $cm['classmates'])) $cm['classmates'][] = $name;
        if (!in_array($name, $cm['pages']))      $cm['pages'][] = $name;
        $cm['slugs'][$name] = $slug;
        writeJson($cmFile, $cm);

        jsonResponse(['success' => true, 'message' => '部署成功', 'url' => 'students/' . $slug . '.html']);
    }

    // ── 上传资源 ──
    $resType = $_GET['res'] ?? '';
    if (!$resType) jsonResponse(['success' => false, 'message' => '缺少资源类型参数 res'], 400);

    if (empty($_FILES['file'])) {
        jsonResponse(['success' => false, 'message' => '没有接收到文件'], 400);
    }
    $file = $_FILES['file'];
    if ($file['error'] !== UPLOAD_ERR_OK) {
        $errMap = [1=>'超过PHP限制',2=>'超过表单限制',3=>'只上传了部分',4=>'没有文件',6=>'缺少临时目录',7=>'写入失败'];
        jsonResponse(['success' => false, 'message' => '上传错误: ' . ($errMap[$file['error']] ?? '未知')], 400);
    }

    // 自定义文件名
    $customName = trim($_POST['name'] ?? '');

    // 资源类型配置
    $resConfig = [
        'html' => [
            'dir'     => $base,
            'types'   => ['text/html', 'application/octet-stream'],
            'exts'    => ['html', 'htm'],
            'maxSize' => 5 * 1024 * 1024,
            'rename'  => 'index.html',  // 固定文件名
        ],
        'avatar' => [
            'dir'     => $base . 'avatar/',
            'types'   => ['image/jpeg', 'image/png', 'image/webp'],
            'exts'    => ['jpg', 'jpeg', 'png', 'webp'],
            'maxSize' => 10 * 1024 * 1024,
            'rename'  => 'avatar',  // 自动加扩展名
        ],
        'music' => [
            'dir'     => $base . 'music/',
            'types'   => ['audio/mpeg', 'audio/ogg', 'audio/mp3', 'audio/x-m4a', 'audio/mp4'],
            'exts'    => ['mp3', 'ogg', 'm4a'],
            'maxSize' => 50 * 1024 * 1024,
            'rename'  => 'bgm',  // 自动加扩展名
        ],
        'bg' => [
            'dir'     => $base . 'backgrounds/',
            'types'   => ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
            'exts'    => ['jpg', 'jpeg', 'png', 'webp', 'gif'],
            'maxSize' => 120 * 1024 * 1024,
            'rename'  => 'bg',  // 自动加扩展名
        ],
        'sticker' => [
            'dir'     => $base . 'stickers/',
            'types'   => ['image/png', 'image/gif', 'image/webp'],
            'exts'    => ['png', 'gif', 'webp'],
            'maxSize' => 20 * 1024 * 1024,
            'rename'  => null,  // 保留原名或自定义
        ],
        'photo' => [
            'dir'     => $base . 'photos/',
            'types'   => ['image/jpeg', 'image/png', 'image/webp'],
            'exts'    => ['jpg', 'jpeg', 'png', 'webp'],
            'maxSize' => 20 * 1024 * 1024,
            'rename'  => null,  // 保留原名或自定义
        ],
        'asset' => [
            'dir'     => $base . 'assets/',
            'types'   => null,  // 允许所有类型
            'exts'    => null,
            'maxSize' => 50 * 1024 * 1024,
            'rename'  => null,  // 保留原名或自定义
        ],
    ];

    if (!isset($resConfig[$resType])) {
        jsonResponse(['success' => false, 'message' => '不支持的资源类型: ' . $resType], 400);
    }

    $cfg = $resConfig[$resType];
    $dir = $cfg['dir'];

    // 检查文件大小
    if ($file['size'] > $cfg['maxSize']) {
        $maxMB = round($cfg['maxSize'] / 1024 / 1024);
        jsonResponse(['success' => false, 'message' => "文件太大，最大 {$maxMB}MB"], 400);
    }

    // 检查文件扩展名
    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if ($cfg['exts'] !== null && !in_array($ext, $cfg['exts'])) {
        jsonResponse(['success' => false, 'message' => '不支持的文件格式: .' . $ext . '，允许: ' . implode(', ', $cfg['exts'])], 400);
    }

    // 确定文件名
    if ($cfg['rename']) {
        // 固定文件名
        if ($cfg['rename'] === 'index.html') {
            $filename = 'index.html';
        } else {
            $filename = $cfg['rename'] . '.' . $ext;
        }
    } elseif ($customName) {
        // 自定义文件名
        $safeName = sanitizeFilename($customName);
        $filename = $safeName . '.' . $ext;
    } else {
        // 保留原名
        $filename = sanitizeFilename(pathinfo($file['name'], PATHINFO_FILENAME)) . '.' . $ext;
    }

    $destPath = $dir . $filename;

    // 移动文件
    if (!move_uploaded_file($file['tmp_name'], $destPath)) {
        jsonResponse(['success' => false, 'message' => '文件保存失败'], 500);
    }
    @chmod($destPath, 0644);

    // 如果是头像，同时复制到 students/avatars/{slug}.{ext}
    if ($resType === 'avatar') {
        $avatarDest = DIR_AVATARS . $slug . '.' . $ext;
        @copy($destPath, $avatarDest);
        @chmod($avatarDest, 0644);
        // 更新学生数据中的avatar路径
        $data['students'][$studentIdx]['hasAvatar'] = true;
        $data['students'][$studentIdx]['avatar'] = 'students/avatars/' . $slug . '.' . $ext;
        writeJson(STUDENTS_JSON, $data);
    }

    // 如果是音乐，更新学生数据
    if ($resType === 'music') {
        $data['students'][$studentIdx]['music'] = [
            'enabled' => true,
            'src'     => 'exclusive/' . $slug . '/music/' . $filename,
            'title'   => $customName ?: pathinfo($file['name'], PATHINFO_FILENAME),
            'autoplay'=> true,
            'loop'    => true,
        ];
        writeJson(STUDENTS_JSON, $data);
    }

    $relativePath = 'exclusive/' . $slug . '/' . str_replace($base, '', $dir) . $filename;

    jsonResponse([
        'success'  => true,
        'message'  => '上传成功',
        'filename' => $filename,
        'path'     => $relativePath,
        'resType'  => $resType,
    ]);
}

// ── DELETE: 删除资源 或 删除整个专属模板 ──
if ($method === 'DELETE') {
    if (!$id) jsonResponse(['success' => false, 'message' => '缺少学生ID'], 400);

    $data = readJson(STUDENTS_JSON);
    $student = null;
    $studentIdx = -1;
    foreach (($data['students'] ?? []) as $i => $s) {
        if ($s['id'] === $id) { $student = $s; $studentIdx = $i; break; }
    }
    if (!$student) jsonResponse(['success' => false, 'message' => '学生不存在'], 404);

    $slug = $student['slug'] ?? '';
    $base = DIR_EXCLUSIVE . $slug . '/';
    $action = $_GET['action'] ?? '';

    // ── 删除整个专属模板 ──
    if ($action === 'delete_template') {
        // 1. 删除 exclusive/{slug}/ 目录及其所有内容
        if (is_dir($base)) {
            deleteDir($base);
        }
        // 2. 删除已部署的学生页面
        $deployedFile = DIR_STUDENTS . $slug . '.html';
        if (file_exists($deployedFile)) {
            @unlink($deployedFile);
        }
        // 3. 取消 isOwner 标记
        if ($studentIdx >= 0) {
            unset($data['students'][$studentIdx]['isOwner']);
            $data['students'] = array_values($data['students']);
            writeJson(STUDENTS_JSON, $data);
        }
        // 4. 从 classmates.json 中移除
        $cmFile = CLASSMATES_JSON;
        $cm = readJson($cmFile) ?? ['classmates' => [], 'slugs' => [], 'pages' => []];
        $name = $student['name'];
        $cm['classmates'] = array_values(array_filter($cm['classmates'] ?? [], fn($n) => $n !== $name));
        $cm['pages']      = array_values(array_filter($cm['pages'] ?? [], fn($n) => $n !== $name));
        if (isset($cm['slugs'][$name])) unset($cm['slugs'][$name]);
        writeJson($cmFile, $cm);

        jsonResponse(['success' => true, 'message' => '专属模板已删除']);
    }

    $file = $_GET['file'] ?? '';
    if (!$file) jsonResponse(['success' => false, 'message' => '缺少文件名或操作类型'], 400);

    // 安全检查：防止路径穿越
    if (!is_dir($base)) {
        jsonResponse(['success' => false, 'message' => '专属目录不存在'], 404);
    }
    $realBase = realpath($base);
    $targetPath = $base . $file;
    $realTarget = realpath($targetPath);

    if ($realTarget === false || strpos($realTarget, $realBase) !== 0) {
        jsonResponse(['success' => false, 'message' => '非法文件路径'], 403);
    }

    if (!file_exists($targetPath)) {
        jsonResponse(['success' => false, 'message' => '文件不存在'], 404);
    }

    if (!@unlink($targetPath)) {
        jsonResponse(['success' => false, 'message' => '删除失败'], 500);
    }

    jsonResponse(['success' => true, 'message' => '已删除']);
}

jsonResponse(['success' => false, 'message' => '不支持的请求方法'], 405);

// ── 辅助函数 ──

// 递归删除目录
function deleteDir($dir) {
    if (!is_dir($dir)) return;
    $items = scandir($dir);
    foreach ($items as $item) {
        if ($item === '.' || $item === '..') continue;
        $path = $dir . $item;
        if (is_dir($path)) {
            deleteDir($path . '/');
        } else {
            @unlink($path);
        }
    }
    @rmdir(rtrim($dir, '/'));
}

function scanFiles($dir) {
    if (!is_dir($dir)) return [];
    $files = [];
    $items = scandir($dir);
    foreach ($items as $item) {
        if ($item === '.' || $item === '..' || $item === '.gitkeep') continue;
        $path = $dir . $item;
        if (is_file($path)) {
            $files[] = [
                'name' => $item,
                'size' => filesize($path),
                'time' => date('Y-m-d H:i:s', filemtime($path)),
            ];
        }
    }
    return $files;
}
