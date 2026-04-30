<?php
require_once __DIR__ . '/_init.php';
/**
 * 同学录后台 · 文件上传 API
 */
require_once dirname(dirname(__FILE__)) . '/config.php';
requireAuth();

/**
 * 安全检测文件 MIME 类型（三级兜底）
 * 1. 尝试 finfo（需要 fileinfo 扩展）
 * 2. 尝试 mime_content_type（内置函数）
 * 3. 兜底：根据扩展名推断
 */
function detectMime($tmpPath, $originalName, $browserMime = '') {
    $mime = '';

    // 方法1: finfo（最准确，但需要 fileinfo 扩展）
    try {
        if (extension_loaded('fileinfo')) {
            $fi = @new \finfo(16); // 16 = FILEINFO_MIME_TYPE
            if ($fi) {
                $mime = @$fi->file($tmpPath);
            }
        }
    } catch (\Throwable $e) {
        // 扩展不可用，跳过
    } catch (\Exception $e) {
        // PHP 5 兼容
    }

    // 方法2: mime_content_type
    if (empty($mime)) {
        try {
            if (function_exists('mime_content_type')) {
                $mime = @mime_content_type($tmpPath);
            }
        } catch (\Throwable $e) {}
    }

    // 方法3: 根据文件头魔数判断
    if (empty($mime) && is_readable($tmpPath)) {
        $header = @file_get_contents($tmpPath, false, null, 0, 12);
        if ($header !== false) {
            if (substr($header, 0, 3) === "\xFF\xD8\xFF")                 $mime = 'image/jpeg';
            elseif (substr($header, 0, 8) === "\x89PNG\r\n\x1A\n")       $mime = 'image/png';
            elseif (substr($header, 0, 4) === "GIF8")                     $mime = 'image/gif';
            elseif (substr($header, 0, 4) === "RIFF" && substr($header, 8, 4) === "WEBP") $mime = 'image/webp';
            elseif (substr($header, 0, 3) === "ID3" || substr($header, 0, 2) === "\xFF\xFB") $mime = 'audio/mpeg';
            elseif (substr($header, 0, 4) === "OggS")                     $mime = 'audio/ogg';
            elseif (substr($header, 4, 4) === "ftyp")                     $mime = 'audio/mp4';
        }
    }

    // 方法4: 兜底，根据扩展名推断
    if (empty($mime)) {
        $extMap = [
            'jpg'=>'image/jpeg','jpeg'=>'image/jpeg','png'=>'image/png',
            'gif'=>'image/gif','webp'=>'image/webp',
            'mp3'=>'audio/mpeg','ogg'=>'audio/ogg','m4a'=>'audio/x-m4a','mp4'=>'audio/mp4',
        ];
        $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
        $mime = $extMap[$ext] ?? $browserMime;
    }

    return $mime ?: 'application/octet-stream';
}

$type = $_GET['type'] ?? '';
$id   = $_GET['id'] ?? '';

// 允许的上传类型配置
$uploadConfig = [
    'avatar' => [
        'dir'       => DIR_AVATARS,
        'types'     => ['image/jpeg','image/png','image/webp'],
        'maxSize'   => 5 * 1024 * 1024,
        'circle'    => true,  // 裁剪为圆形
        'resize'    => 200,   // 最大尺寸
    ],
    'background' => [
        'dir'       => DIR_BACKGROUNDS,
        'types'     => ['image/jpeg','image/png','image/webp','image/gif'],
        'maxSize'   => 120 * 1024 * 1024,   // 背景图最大120MB
        'circle'    => false,
        'resize'    => 0,
    ],
    'sticker' => [
        'dir'       => DIR_STICKERS,
        'types'     => ['image/png','image/gif','image/webp'],
        'maxSize'   => 20 * 1024 * 1024,
        'circle'    => false,
        'resize'    => 0,
    ],
    'music' => [
        'dir'       => DIR_MUSIC,
        'types'     => ['audio/mpeg','audio/ogg','audio/mp3','audio/x-m4a','audio/mp4'],
        'maxSize'   => 50 * 1024 * 1024,
        'circle'    => false,
        'resize'    => 0,
    ],
    'photo' => [
        'dir'       => DIR_PHOTOS,
        'types'     => ['image/jpeg','image/png','image/webp'],
        'maxSize'   => 20 * 1024 * 1024,
        'circle'    => false,
        'resize'    => 0,
    ],
    'album' => [
        'dir'       => DIR_ALBUM,
        'types'     => ['image/jpeg','image/png','image/webp','image/gif'],
        'maxSize'   => 30 * 1024 * 1024,   // 相册图最大30MB
        'circle'    => false,
        'resize'    => 0,
    ],
    'overlay' => [
        'dir'       => ROOT_PATH . 'assets/images/overlays/',
        'types'     => ['image/png','image/gif','image/webp','image/jpeg'],
        'maxSize'   => 5 * 1024 * 1024,
        'circle'    => false,
        'resize'    => 0,
    ],
    'panorama' => [
        'dir'       => ROOT_PATH . 'album/panoramas/',
        'types'     => ['image/jpeg','image/png','image/webp'],
        'maxSize'   => 100 * 1024 * 1024,   // 全景图最大100MB
        'circle'    => false,
        'resize'    => 0,
    ],
    'ack-avatar' => [
        'dir'       => ROOT_PATH . 'assets/ack/',
        'types'     => ['image/jpeg','image/png','image/webp'],
        'maxSize'   => 5 * 1024 * 1024,
        'circle'    => true,
        'resize'    => 200,
    ],
];

if (!isset($uploadConfig[$type])) {
    jsonResponse(['success' => false, 'message' => '未知上传类型: ' . $type], 400);
}

$cfg = $uploadConfig[$type];

// 预检：当文件超出 post_max_size 时，PHP 会静默丢弃所有 POST 数据
if (empty($_FILES) && empty($_POST) && isset($_SERVER['CONTENT_LENGTH']) && $_SERVER['CONTENT_LENGTH'] > 0) {
    $postMax = ini_get('post_max_size');
    jsonResponse([
        'success' => false,
        'message' => "文件太大，超出了服务器 post_max_size 限制（当前：{$postMax}）。请在宝塔面板 → PHP管理 → 配置文件中将 post_max_size 改为 64M、upload_max_filesize 改为 60M，然后重启 PHP"
    ], 413);
}

if (!isset($_FILES['file'])) {
    jsonResponse(['success' => false, 'message' => '未收到文件，请重试'], 400);
}

$file = $_FILES['file'];
if ($file['error'] !== UPLOAD_ERR_OK) {
    $uploadErrors = [
        UPLOAD_ERR_INI_SIZE   => '文件超出 PHP 配置的 upload_max_filesize 限制（当前限制：' . ini_get('upload_max_filesize') . '）。请在宝塔面板 → PHP管理 → 配置文件中将 upload_max_filesize 改为 60M',
        UPLOAD_ERR_FORM_SIZE  => '文件超出表单限制',
        UPLOAD_ERR_PARTIAL    => '文件只上传了一部分，可能是 post_max_size 太小（当前：' . ini_get('post_max_size') . '）。请在宝塔面板 → PHP管理 → 配置文件中将 post_max_size 改为 64M',
        UPLOAD_ERR_NO_FILE    => '没有选择文件',
        UPLOAD_ERR_NO_TMP_DIR => '服务器缺少临时文件目录，请联系管理员',
        UPLOAD_ERR_CANT_WRITE => '服务器磁盘写入失败，请检查磁盘空间',
        UPLOAD_ERR_EXTENSION  => '上传被 PHP 扩展阻止',
    ];
    $msg = $uploadErrors[$file['error']] ?? '未知上传错误（错误码: ' . $file['error'] . '）';
    jsonResponse(['success' => false, 'message' => $msg], 400);
}

// 验证文件大小
if ($file['size'] > $cfg['maxSize']) {
    jsonResponse(['success' => false, 'message' => '文件过大，最大允许 ' . ($cfg['maxSize'] / 1024 / 1024) . 'MB'], 400);
}

// 验证 MIME 类型（三级兜底，不依赖任何扩展）
$realMime = detectMime($file['tmp_name'], $file['name'], $file['type'] ?? '');
if (!in_array($realMime, $cfg['types'])) {
    jsonResponse(['success' => false, 'message' => '不支持的文件类型: ' . $realMime . '（允许: ' . implode(', ', $cfg['types']) . '）'], 400);
}

// 确定扩展名
$mimeExtMap = [
    'image/jpeg' => 'jpg',
    'image/png'  => 'png',
    'image/gif'  => 'gif',
    'image/webp' => 'webp',
    'audio/mpeg' => 'mp3',
    'audio/mp3'  => 'mp3',
    'audio/ogg'  => 'ogg',
    'audio/x-m4a'=> 'm4a',
    'audio/mp4'  => 'm4a',
];
$ext = $mimeExtMap[$realMime] ?? pathinfo($file['name'], PATHINFO_EXTENSION);

// 构造保存文件名
if ($type === 'avatar' && $id) {
    // 优先用 slug（拼音），fallback 用 studentId
    $slug = '';
    $studentsData = readJson(STUDENTS_JSON);
    if ($studentsData) {
        foreach ($studentsData['students'] as $s) {
            if ($s['id'] === $id) { $slug = $s['slug'] ?? ''; break; }
        }
    }
    // 头像统一用 .jpg，保证 roster 能读到
    $filename = ($slug ? sanitizeFilename($slug) : sanitizeFilename($id)) . '.jpg';
} elseif ($type === 'background' && $id) {
    $filename = sanitizeFilename($id) . '_bg_' . time() . '.' . $ext;
} elseif ($type === 'music' && $id) {
    // 优先用 slug（拼音）命名，保证与 students.json 中路径一致
    $musicSlug = '';
    $studentsData2 = readJson(STUDENTS_JSON);
    if ($studentsData2) {
        foreach ($studentsData2['students'] as $s) {
            if ($s['id'] === $id) { $musicSlug = $s['slug'] ?? ''; break; }
        }
    }
    $filename = ($musicSlug ? sanitizeFilename($musicSlug) : sanitizeFilename($id)) . '.' . $ext;
} elseif ($type === 'photo' && $id) {
    $customName = trim($_POST['name'] ?? '');
    $filename = $customName
        ? sanitizeFilename($id) . '_' . sanitizeFilename($customName) . '.' . $ext
        : sanitizeFilename($id) . '_' . time() . '.' . $ext;
} elseif ($type === 'album') {
    $customName = trim($_POST['name'] ?? '');
    $filename = $customName
        ? sanitizeFilename($customName) . '.' . $ext
        : 'photo_' . time() . '.' . $ext;
} elseif ($type === 'sticker') {
    $customName = trim($_POST['name'] ?? '');
    $filename = $customName
        ? sanitizeFilename($customName) . '.' . $ext
        : 'sticker_' . time() . '.' . $ext;
} elseif ($type === 'ack-avatar' && $id !== null) {
    $filename = 'ack_' . intval($id) . '.jpg';
} else {
    $filename = sanitizeFilename(pathinfo($file['name'], PATHINFO_FILENAME)) . '_' . time() . '.' . $ext;
}

ensureDir($cfg['dir']);
$savePath = $cfg['dir'] . $filename;

// 头像：使用 GD 裁剪为圆形并压缩
if ($cfg['circle'] && extension_loaded('gd') && in_array($realMime, ['image/jpeg','image/png','image/webp'])) {
    $result = processAvatarCircle($file['tmp_name'], $savePath, $realMime, $cfg['resize']);
    if (!$result) {
        // 降级：直接移动
        move_uploaded_file($file['tmp_name'], $savePath);
    }
} else {
    if (!move_uploaded_file($file['tmp_name'], $savePath)) {
        jsonResponse(['success' => false, 'message' => '文件保存失败'], 500);
    }
}

// 全景图自动压缩（防止WebGL黑屏）
if ($type === 'panorama') {
    compressPanorama($savePath);
}

// 计算相对 URL（相对于网站根目录）
$relPath = str_replace(ROOT_PATH, '', $savePath);

// 如果是头像，更新 students.json
if ($type === 'avatar' && $id) {
    updateStudentAvatar($id, $relPath);
}

// 如果是致谢头像，更新 site_config.json
if ($type === 'ack-avatar' && $id !== null) {
    updateAckAvatar(intval($id), $relPath);
}

// 如果是音乐，更新 students.json 中的 music.src 并重新生成页面
if ($type === 'music' && $id) {
    updateStudentMusic($id, $relPath);
}

jsonResponse([
    'success'  => true,
    'message'  => '上传成功',
    'filename' => $filename,
    'path'     => $relPath,
    'url'      => '/' . ltrim($relPath, '/'),
]);

// ── 头像处理：裁正方形 + 压缩，保存为 JPEG ──
function processAvatarCircle($srcPath, $dstPath, $mime, $size) {
    if ($mime === 'image/jpeg') $src = imagecreatefromjpeg($srcPath);
    elseif ($mime === 'image/png') $src = imagecreatefrompng($srcPath);
    elseif ($mime === 'image/webp') $src = imagecreatefromwebp($srcPath);
    else return false;

    if (!$src) return false;

    $w   = imagesx($src);
    $h   = imagesy($src);
    $dim = min($w, $h, $size ?: 400);

    // 白色背景正方形画布（JPEG 不支持透明）
    $out = imagecreatetruecolor($dim, $dim);
    $white = imagecolorallocate($out, 255, 255, 255);
    imagefill($out, 0, 0, $white);

    // 裁剪居中正方形并缩放
    $sx = (int)(($w - min($w,$h)) / 2);
    $sy = (int)(($h - min($w,$h)) / 2);
    $sq = min($w, $h);
    imagecopyresampled($out, $src, 0, 0, $sx, $sy, $dim, $dim, $sq, $sq);

    imagedestroy($src);

    // 保存为 JPEG（质量 90）
    $result = imagejpeg($out, $dstPath, 90);
    imagedestroy($out);
    return $result;
}

// ── 更新学生头像路径 ──
function updateStudentAvatar($id, $path) {
    $data = readJson(STUDENTS_JSON);
    if (!$data) return;
    foreach ($data['students'] as &$s) {
        if ($s['id'] === $id) {
            $s['avatar']    = $path;
            $s['hasAvatar'] = true;
            $s['updatedAt'] = date('Y-m-d H:i:s');
            break;
        }
    }
    writeJson(STUDENTS_JSON, $data);
}

// ── 更新致谢头像到 site_config.json ──
function updateAckAvatar($index, $path) {
    $configPath = ROOT_PATH . 'data/site_config.json';
    $data = readJson($configPath);
    if (!$data) return;
    if (!isset($data['acknowledgments']) || !is_array($data['acknowledgments'])) return;
    if (isset($data['acknowledgments'][$index])) {
        $data['acknowledgments'][$index]['avatar'] = $path;
    }
    writeJson($configPath, $data);
}

// ── 更新学生音乐路径并重新生成页面 ──
function updateStudentMusic($id, $path) {
    $data = readJson(STUDENTS_JSON);
    if (!$data) return;
    $updatedStudent = null;
    foreach ($data['students'] as &$s) {
        if ($s['id'] === $id) {
            if (!isset($s['music'])) $s['music'] = [];
            $s['music']['src'] = $path;
            // 如果之前没有启用音乐，保持原状（不强制启用）
            $s['updatedAt'] = date('Y-m-d H:i:s');
            $updatedStudent = $s;
            break;
        }
    }
    if (!$updatedStudent) return;
    writeJson(STUDENTS_JSON, $data);
    // 重新生成页面
    require_once dirname(__FILE__) . '/generate.php';
    generateStudentPage($updatedStudent);
}

// ── 全景图自动压缩（3.2修复：防止WebGL纹理超限黑屏）──
function compressPanorama($filePath) {
    if (!extension_loaded('gd')) return; // 没有GD扩展就跳过

    $info = @getimagesize($filePath);
    if (!$info) return;
    $w = $info[0];
    $h = $info[1];
    $mime = $info['mime'];

    // 如果宽度 <= 6000，不需要压缩
    if ($w <= 6000) return;

    // 创建源图像
    switch ($mime) {
        case 'image/jpeg': $src = @imagecreatefromjpeg($filePath); break;
        case 'image/png':  $src = @imagecreatefrompng($filePath); break;
        case 'image/webp': $src = @imagecreatefromwebp($filePath); break;
        default: return;
    }
    if (!$src) return;

    // 计算新尺寸（保持比例，最大宽6000）
    $newW = 6000;
    $newH = intval($h * ($newW / $w));

    $dst = imagecreatetruecolor($newW, $newH);
    imagecopyresampled($dst, $src, 0, 0, 0, 0, $newW, $newH, $w, $h);
    imagedestroy($src);

    // 覆盖写入（JPEG质量85）
    imagejpeg($dst, $filePath, 85);
    imagedestroy($dst);

    error_log("[同学录] 全景图已压缩: {$w}x{$h} → {$newW}x{$newH}");
}
