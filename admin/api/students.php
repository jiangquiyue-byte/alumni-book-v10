<?php
require_once __DIR__ . '/_init.php';
require_once dirname(dirname(__FILE__)) . '/config.php';
requireAuth();

// 方法覆盖：PUT/DELETE 通过 POST + ?_method=XXX 传递（兼容Nginx）
$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'POST' && !empty($_GET['_method'])) {
    $method = strtoupper($_GET['_method']);
}

// ── 读取学生数据库 ──
function loadStudents() {
    $data = readJson(STUDENTS_JSON);
    if (!$data) {
        $data = ['students' => []];
        writeJson(STUDENTS_JSON, $data);
    }
    return $data;
}

// ── 默认学生数据结构 ──
function defaultStudent($name, $id, $slug = '') {
    $fileKey = $slug ?: $id;
    return [
        'id'         => $id,
        'name'       => $name,
        'slug'       => $slug,
        'hasAvatar'  => false,
        'avatar'     => 'students/avatars/' . $fileKey . '.jpg',
        'music'      => [
            'enabled'  => false,
            'src'      => '',
            'title'    => '',
            'autoplay' => true,
            'loop'     => true,
        ],
        'background' => [
            'type' => 'default',
            'src'  => '',
            'color'=> '',
        ],
        'particles'  => 'sakura',
        'stickers'   => [],
        'photos'     => [],
        'info'       => [
            // 基础信息
            'name'           => $name,
            'nickname'       => '',
            'gender'         => '',
            'birthday'       => '',
            'school'         => '',
            'class'          => '',
            'studentId'      => '',
            'seatNo'         => '',
            'dormNo'         => '',
            'graduationYear' => '',
            // 联系方式
            'qq'             => '',
            'wechat'         => '',
            'weibo'          => '',
            'phone'          => '',
            'email'          => '',
            'address'        => '',
            // 个性标签
            'mbti'           => '',
            'bloodType'      => '',
            'astro'          => '',
            'strengths'      => '',
            'weaknesses'     => '',
            'bestSubject'    => '',
            'worstSubject'   => '',
            'motto'          => '',
            // 兴趣爱好
            'favoriteIdol'   => '',
            'favoriteAnime'  => '',
            'favoriteMovie'  => '',
            'favoriteSong'   => '',
            'favoriteGame'   => '',
            'favoriteFood'   => '',
            'favoriteColor'  => '',
            'favoriteSport'  => '',
            // 校园回忆
            'bestMemory'          => '',
            'bestLesson'          => '',
            'deskmateFun'         => '',
            'classMeme'           => '',
            'embarrassingMoment'  => '',
            'proudestAchievement' => '',
            // 未来规划
            'targetUniversity' => '',
            'targetMajor'      => '',
            'futureCareer'     => '',
            'futureCity'       => '',
            'futureSelf'       => '',
            'letterToFuture'   => '',
            // 给同学们的话
            'letterToClassmates' => '',
        ],
        'createdAt'  => date('Y-m-d H:i:s'),
        'updatedAt'  => date('Y-m-d H:i:s'),
    ];
}

// ── GET: 获取所有学生 / 单个学生 ──
if ($method === 'GET') {
    $id = $_GET['id'] ?? null;
    $data = loadStudents();

    // 实时检测头像文件是否存在（按 slug 命名）
    foreach ($data['students'] as &$s) {
        $slug = $s['slug'] ?? '';
        if ($slug) {
            $avatarPath = DIR_AVATARS . $slug . '.jpg';
            $s['hasAvatar'] = file_exists($avatarPath);
            $s['avatar']    = 'students/avatars/' . $slug . '.jpg';
        }
    }
    unset($s);

    if ($id) {
        foreach ($data['students'] as $s) {
            if ($s['id'] === $id) {
                jsonResponse(['success' => true, 'student' => $s]);
            }
        }
        jsonResponse(['success' => false, 'message' => '学生不存在'], 404);
    }

    jsonResponse(['success' => true, 'students' => $data['students'], 'total' => count($data['students'])]);
}

// ── POST: 创建学生 ──
if ($method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    $name = trim($body['name'] ?? '');

    if (!$name) {
        jsonResponse(['success' => false, 'message' => '姓名不能为空'], 400);
    }

    $data = loadStudents();

    // 检查重名
    foreach ($data['students'] as $s) {
        if ($s['name'] === $name) {
            jsonResponse(['success' => false, 'message' => '已存在同名学生'], 409);
        }
    }

    $id = generateStudentId();
    // 保存拼音 slug（文件名用）
    $slug = preg_replace('/[^a-z0-9_-]/i', '', strtolower(trim($body['info']['slug'] ?? $body['slug'] ?? '')));
    $student = defaultStudent($name, $id, $slug);

    // 如果设置了 isOwner 标记（专属模板学生）
    if (!empty($body['isOwner'])) {
        $student['isOwner'] = true;
    }

    // 合并额外字段
    if (!empty($body['info'])) {
        $student['info'] = array_merge($student['info'], $body['info']);
    }

    $data['students'][] = $student;

    if (!writeJson(STUDENTS_JSON, $data)) {
        jsonResponse(['success' => false, 'message' => '保存 students.json 失败，请检查 data/ 目录写入权限。路径: ' . STUDENTS_JSON], 500);
    }

    // 生成学生页面
    require_once dirname(__FILE__) . '/generate.php';
    $genResult = generateStudentPage($student);
    $genMsg = '';
    if (!$genResult) {
        $genMsg = '（警告：HTML 页面生成失败，请检查 students/ 目录权限）';
    }

    // 同步 classmates.json
    $syncResult = syncClassmates($data['students']);
    if (!$syncResult) {
        $genMsg .= '（警告：classmates.json 同步失败）';
    }

    jsonResponse(['success' => true, 'student' => $student, 'message' => '学生创建成功' . $genMsg]);
}

// ── PUT: 更新学生 ──
if ($method === 'PUT') {
    $id = $_GET['id'] ?? null;
    if (!$id) jsonResponse(['success' => false, 'message' => '缺少学生 ID'], 400);

    $body = json_decode(file_get_contents('php://input'), true);
    $data = loadStudents();

    $found = false;
    foreach ($data['students'] as &$s) {
        if ($s['id'] === $id) {
            // 合并更新（深度合并 info 字段）
            foreach ($body as $key => $val) {
                if ($key === 'info' && is_array($val)) {
                    $s['info'] = array_merge($s['info'] ?? [], $val);
                } elseif ($key === 'music' && is_array($val)) {
                    $s['music'] = array_merge($s['music'] ?? [], $val);
                } elseif ($key === 'background' && is_array($val)) {
                    $s['background'] = array_merge($s['background'] ?? [], $val);
                } elseif ($key !== 'id' && $key !== 'createdAt') {
                    $s[$key] = $val;
                }
            }
            $s['updatedAt'] = date('Y-m-d H:i:s');
            $found = true;
            $updatedStudent = $s;
            break;
        }
    }

    if (!$found) jsonResponse(['success' => false, 'message' => '学生不存在'], 404);

    if (!writeJson(STUDENTS_JSON, $data)) {
        jsonResponse(['success' => false, 'message' => '保存 students.json 失败，路径: ' . STUDENTS_JSON], 500);
    }

    // 重新生成页面
    require_once dirname(__FILE__) . '/generate.php';
    $genResult = generateStudentPage($updatedStudent);
    $warn = $genResult ? '' : '（警告：页面重新生成失败，请检查 students/ 目录权限）';

    jsonResponse(['success' => true, 'student' => $updatedStudent, 'message' => '保存成功' . $warn]);
}

// ── DELETE: 删除学生 ──
if ($method === 'DELETE') {
    $id = $_GET['id'] ?? null;
    if (!$id) jsonResponse(['success' => false, 'message' => '缺少学生 ID'], 400);

    $data = loadStudents();
    $deleted = null;

    $filtered = [];
    foreach ($data['students'] as $s) {
        if ($s['id'] === $id) {
            $deleted = $s;
        } else {
            $filtered[] = $s;
        }
    }
    $data['students'] = $filtered;

    if (!$deleted) jsonResponse(['success' => false, 'message' => '学生不存在'], 404);

    if (!writeJson(STUDENTS_JSON, $data)) {
        jsonResponse(['success' => false, 'message' => '保存 students.json 失败'], 500);
    }

    $slug = $deleted['slug'] ?? sanitizeFilename($deleted['name']);
    $deletedFiles = [];

    // 1. 删除 HTML 文件
    $htmlFile = DIR_STUDENTS . $slug . '.html';
    if (file_exists($htmlFile)) { @unlink($htmlFile); $deletedFiles[] = $slug . '.html'; }

    // 2. 删除头像文件（支持 .jpg/.png/.webp 多种格式）
    foreach (['jpg', 'png', 'webp'] as $ext) {
        $avatarFile = DIR_AVATARS . $slug . '.' . $ext;
        if (file_exists($avatarFile)) { @unlink($avatarFile); $deletedFiles[] = 'avatars/' . $slug . '.' . $ext; }
    }

    // 3. 删除背景文件（按 slug 前缀匹配，因背景文件名含时间戳）
    $bgFiles = glob(DIR_BACKGROUNDS . $slug . '_bg_*');
    if ($bgFiles) {
        foreach ($bgFiles as $f) { @unlink($f); $deletedFiles[] = 'backgrounds/' . basename($f); }
    }

    // 4. 删除音乐文件（支持 .mp3/.ogg/.m4a）
    foreach (['mp3', 'ogg', 'm4a'] as $ext) {
        $musicFile = DIR_MUSIC . $slug . '.' . $ext;
        if (file_exists($musicFile)) { @unlink($musicFile); $deletedFiles[] = 'music/' . $slug . '.' . $ext; }
    }

    // 5. 删除个人照片（按 slug 前缀匹配）
    $photoFiles = glob(DIR_PHOTOS . $slug . '_*');
    if ($photoFiles) {
        foreach ($photoFiles as $f) { @unlink($f); $deletedFiles[] = 'photos/' . basename($f); }
    }

    // 5b. 删除 exclusive/{slug}/ 目录（专属模板资源）
    if (!empty($deleted['isOwner'])) {
        $exclusiveDir = ROOT_PATH . 'exclusive/' . $slug . '/';
        if (is_dir($exclusiveDir)) {
            $deleteExclusiveDir = function($dir) use (&$deleteExclusiveDir, &$deletedFiles) {
                $items = @scandir($dir);
                if (!$items) return;
                foreach ($items as $item) {
                    if ($item === '.' || $item === '..') continue;
                    $path = $dir . $item;
                    if (is_dir($path)) {
                        $deleteExclusiveDir($path . '/');
                    } else {
                        @unlink($path);
                    }
                }
                @rmdir(rtrim($dir, '/'));
            };
            $deleteExclusiveDir($exclusiveDir);
            $deletedFiles[] = 'exclusive/' . $slug . '/ (目录)';
        }
    }

    // 6. 从 classmates.json 完整清理
    $cmFile = CLASSMATES_JSON;
    $cm = readJson($cmFile) ?? ['classmates' => [], 'slugs' => [], 'pages' => []];

    $newClassmates = [];
    foreach ($cm['classmates'] ?? [] as $n) {
        if ($n !== $deleted['name']) $newClassmates[] = $n;
    }
    $cm['classmates'] = $newClassmates;

    $newPages = [];
    foreach ($cm['pages'] ?? [] as $p) {
        if ($p !== $deleted['name']) $newPages[] = $p;
    }
    $cm['pages'] = $newPages;

    unset($cm['slugs'][$deleted['name']]);

    writeJson($cmFile, $cm);

    $msg = '学生「' . $deleted['name'] . '」已删除';
    if (!empty($deletedFiles)) {
        $msg .= '，已清理关联文件：' . implode('、', $deletedFiles);
    }

    jsonResponse(['success' => true, 'message' => $msg, 'deletedFiles' => $deletedFiles]);
}

// ── 同步 classmates.json ──
function syncClassmates($students) {
    $cmFile   = CLASSMATES_JSON;
    $existing = file_exists($cmFile) ? (json_decode(file_get_contents($cmFile), true) ?? []) : [];

    $studentNames = array_map(function($s) { return $s['name']; }, $students);
    $studentSlugs = [];
    foreach ($students as $s) {
        if (!empty($s['slug'])) $studentSlugs[$s['name']] = $s['slug'];
    }

    $existingNames = $existing['classmates'] ?? [];
    $merged = $existingNames;
    foreach ($studentNames as $n) {
        if (!in_array($n, $merged)) $merged[] = $n;
    }

    $mergedSlugs = array_merge($existing['slugs'] ?? [], $studentSlugs);

    $data = [
        'classmates' => array_values($merged),
        'slugs'      => $mergedSlugs,
        'pages'      => $existing['pages'] ?? [],
        '_comment'   => '由后台管理系统自动维护',
    ];
    return writeJson($cmFile, $data);
}
