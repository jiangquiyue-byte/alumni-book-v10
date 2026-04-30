<?php
/**
 * 同学录后台管理系统 · 配置文件
 * 修改此文件中的配置项以适应你的环境
 */

// ── 管理员凭据 ──────────────────────────────────────
// 登录密码（请修改为强密码）
define('ADMIN_PASSWORD', 'admin888');
// Session 有效期（秒），默认 8 小时
define('SESSION_LIFETIME', 28800);

// ── 路径配置 ──────────────────────────────────────
// 项目根目录（相对于网站根目录）
// 如果网站部署在 /var/www/html/yearbook/，则此处为空 ''
// 如果部署在域名根目录，则为 '/'
define('ROOT_PATH', dirname(dirname(__FILE__)) . '/');
define('ROOT_URL', '/'); // 前端访问的根 URL

// ── 数据文件路径 ──────────────────────────────────────
define('STUDENTS_JSON',   ROOT_PATH . 'data/students.json');
define('CLASSMATES_JSON', ROOT_PATH . 'data/classmates.json');
define('ALBUM_JSON',      ROOT_PATH . 'album/photos.json');

// ── 资源目录 ──────────────────────────────────────
define('DIR_AVATARS',     ROOT_PATH . 'students/avatars/');
define('DIR_BACKGROUNDS', ROOT_PATH . 'students/backgrounds/');
define('DIR_STICKERS',    ROOT_PATH . 'students/stickers/');
define('DIR_MUSIC',       ROOT_PATH . 'students/music/');
define('DIR_PHOTOS',      ROOT_PATH . 'students/photos/');
define('DIR_ALBUM',       ROOT_PATH . 'album/photos/');
define('DIR_STUDENTS',    ROOT_PATH . 'students/');

// ── 文件上传限制 ──────────────────────────────────────
define('MAX_UPLOAD_SIZE', 10 * 1024 * 1024); // 10MB
define('ALLOWED_IMAGE_TYPES', ['image/jpeg','image/png','image/gif','image/webp']);
define('ALLOWED_AUDIO_TYPES', ['audio/mpeg','audio/ogg','audio/mp3','audio/x-m4a']);

// ── 页面生成模板 ──────────────────────────────────────
define('STUDENT_TEMPLATE', dirname(__FILE__) . '/templates/student.tpl.html');

// ── 安全配置 ──────────────────────────────────────
define('CSRF_TOKEN_KEY', 'yearbook_csrf');

// 初始化 Session（兼容多种服务器环境）
if (session_status() === PHP_SESSION_NONE) {
    // 确保 session 保存路径可写
    $sessionPath = session_save_path();
    if (empty($sessionPath) || !is_writable($sessionPath)) {
        $tmpDir = sys_get_temp_dir();
        if (is_writable($tmpDir)) {
            session_save_path($tmpDir);
        }
    }
    ini_set('session.gc_maxlifetime', SESSION_LIFETIME);
    session_start();
}

// 通用 JSON 响应函数
function jsonResponse($data, $code = 200) {
    // 清空之前可能的意外输出
    if (ob_get_level()) ob_end_clean();
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

// 验证管理员是否已登录
function requireAuth() {
    if (empty($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
        jsonResponse(['success' => false, 'message' => '未授权，请先登录'], 401);
    }
}

// 读取 JSON 文件
function readJson($path) {
    if (!file_exists($path)) return null;
    $content = file_get_contents($path);
    return json_decode($content, true);
}

// 写入 JSON 文件（先尝试原子写入，失败则直接写入）
function writeJson($path, $data) {
    $dir = dirname($path);
    if (!is_dir($dir)) {
        if (!@mkdir($dir, 0755, true)) {
            error_log("[同学录] 无法创建目录: {$dir}");
            return false;
        }
    }
    $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    if ($json === false) {
        error_log("[同学录] JSON 编码失败: " . json_last_error_msg());
        return false;
    }

    // 方法1: 原子写入（先写临时文件再重命名）
    $tmp = $path . '.tmp.' . uniqid();
    $result = @file_put_contents($tmp, $json);
    if ($result !== false) {
        if (@rename($tmp, $path)) return true;
        // rename 失败（跨文件系统等），删除临时文件
        @unlink($tmp);
    }

    // 方法2: 直接写入（降级方案）
    $result = @file_put_contents($path, $json, LOCK_EX);
    if ($result === false) {
        error_log("[同学录] 写入文件失败: {$path} (is_writable=" . (is_writable($dir) ? 'yes' : 'NO') . ")");
        return false;
    }
    return true;
}

// 生成唯一学生 ID
function generateStudentId() {
    return 'stu_' . date('Ymd') . '_' . substr(uniqid(), -6);
}

// 确保目录存在
function ensureDir($path) {
    if (!is_dir($path)) {
        if (!@mkdir($path, 0755, true)) {
            error_log("[同学录] 无法创建目录: {$path}");
        }
    }
}

// 清理文件名（防止路径穿越）
function sanitizeFilename($name) {
    $name = preg_replace('/[\/\\\\:*?"<>|]/', '_', $name);
    $name = trim($name, '. ');
    return $name ?: 'file';
}

// ══════ 自动初始化（上传即用，无需手动命令）══════
function autoInit() {
    // 创建必要目录
    $dirs = [
        ROOT_PATH.'data', ROOT_PATH.'students', ROOT_PATH.'students/avatars',
        ROOT_PATH.'students/backgrounds', ROOT_PATH.'students/stickers',
        ROOT_PATH.'students/music', ROOT_PATH.'students/photos',
        ROOT_PATH.'album/photos', ROOT_PATH.'album/panoramas',
        ROOT_PATH.'assets/images/overlays',
    ];
    foreach ($dirs as $d) {
        if (!is_dir($d)) @mkdir($d, 0777, true);
        if (is_dir($d) && !is_writable($d)) @chmod($d, 0777);
    }

    // 初始化数据文件（仅在不存在时创建）
    $defaults = [
        STUDENTS_JSON    => '{"students":[]}',
        CLASSMATES_JSON  => '{"classmates":[],"slugs":{},"pages":[]}',
        ROOT_PATH.'data/site_config.json' => json_encode([
            "particles"=>["index"=>["enabled"=>true,"preset"=>"sakura"],"preface"=>["enabled"=>true,"preset"=>"sakura"],"roster"=>["enabled"=>true,"preset"=>"sakura"],"album"=>["enabled"=>true,"preset"=>"sakura"]],
            "footer"=>["beian"=>"","beianUrl"=>"https://beian.miit.gov.cn/","copyright"=>"同学录 · 青春回忆"],
            "preface"=>["title"=>"致青春岁月","subtitle"=>"写在翻开同学录之前","content"=>""],
            "acknowledgments"=>[["name"=>"","role"=>"","tip"=>""],["name"=>"","role"=>"","tip"=>""],["name"=>"","role"=>"","tip"=>""]]
        ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT),
        ROOT_PATH.'data/custom_particles.json' => '{"particles":[]}',
        ROOT_PATH.'data/site_settings.json' => '{}',
        ROOT_PATH.'album/photos.json' => '{"photos":[]}',
        ROOT_PATH.'album/panoramas.json' => '{"panoramas":[]}',
    ];
    foreach ($defaults as $path => $content) {
        if (!file_exists($path)) {
            @file_put_contents($path, $content);
            @chmod($path, 0666);
        } elseif (!is_writable($path)) {
            @chmod($path, 0666);
        }
    }
}

// 每次加载config.php时自动执行
autoInit();
