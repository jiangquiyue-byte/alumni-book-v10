<?php
require_once dirname(__DIR__) . '/admin/api/_init.php';
require_once dirname(__DIR__) . '/admin/config.php';

define('DANMAKU_JSON', ROOT_PATH . 'data/danmaku_messages.json');
define('DANMAKU_DAILY_LIMIT', 3);
define('DANMAKU_MAX_LEN', 50);
define('DANMAKU_LIMIT_DEFAULT', 120);
define('DANMAKU_LIMIT_MAX', 300);

autoInitDanmakuStore();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

function nowDateTime() {
    return date('Y-m-d H:i:s');
}

function todayDate() {
    return date('Y-m-d');
}

function dailySeedKey() {
    return date('Y-m-d');
}

function autoInitDanmakuStore() {
    if (!file_exists(DANMAKU_JSON)) {
        writeJson(DANMAKU_JSON, [
            'messages' => [],
            'meta' => [
                'version' => '2.0.0',
                'updatedAt' => nowDateTime(),
            ],
        ]);
        @chmod(DANMAKU_JSON, 0666);
    }
}

function cleanText($text) {
    $text = is_string($text) ? $text : '';
    $text = trim($text);
    $text = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $text);
    $text = preg_replace('/\s+/u', ' ', $text);
    // 强制过滤 HTML 标签，防止 XSS
    $text = strip_tags($text);
    return trim($text);
}

function textLength($text) {
    if (function_exists('mb_strlen')) {
        return mb_strlen($text, 'UTF-8');
    }
    preg_match_all('/./us', $text, $matches);
    return count($matches[0]);
}

function generateDanmakuId() {
    return 'dmk_' . date('Ymd_His') . '_' . substr(bin2hex(random_bytes(4)), 0, 8);
}

function loadStore() {
    $data = readJson(DANMAKU_JSON);
    if (!is_array($data)) {
        $data = [];
    }
    if (!isset($data['messages']) || !is_array($data['messages'])) {
        $data['messages'] = [];
    }
    if (!isset($data['meta']) || !is_array($data['meta'])) {
        $data['meta'] = [];
    }
    if (empty($data['meta']['version'])) {
        $data['meta']['version'] = '2.0.0';
    }
    if (empty($data['meta']['updatedAt'])) {
        $data['meta']['updatedAt'] = nowDateTime();
    }
    return $data;
}

function saveStore($data) {
    $data['meta'] = is_array($data['meta'] ?? null) ? $data['meta'] : [];
    $data['meta']['version'] = '2.0.0';
    $data['meta']['updatedAt'] = nowDateTime();
    return writeJson(DANMAKU_JSON, $data);
}

function loadClassmateNames() {
    $data = readJson(CLASSMATES_JSON);
    $names = [];
    foreach (($data['classmates'] ?? []) as $name) {
        $name = cleanText($name);
        if ($name !== '') {
            $names[$name] = true;
        }
    }
    return $names;
}

function normalizeViewerName($name, $classmateMap) {
    $name = cleanText($name);
    if ($name === '') {
        jsonResponse(['success' => false, 'message' => '缺少访问者身份'], 400);
    }
    if (!isset($classmateMap[$name])) {
        jsonResponse(['success' => false, 'message' => '访问者身份无效'], 403);
    }
    return $name;
}

function normalizeColor($color) {
    $color = strtoupper(cleanText($color));
    if (!preg_match('/^#([0-9A-F]{3}|[0-9A-F]{6})$/', $color)) {
        jsonResponse(['success' => false, 'message' => '字体颜色格式无效'], 400);
    }
    return $color;
}

function normalizeFontSize($size) {
    $size = intval($size);
    if ($size < 14 || $size > 28) {
        jsonResponse(['success' => false, 'message' => '字体大小必须在 14 到 28 之间'], 400);
    }
    return $size;
}

function normalizeHiddenFor($input, $author, $classmateMap) {
    if (!is_array($input)) {
        return [];
    }
    $normalized = [];
    foreach ($input as $name) {
        $name = cleanText($name);
        if ($name === '' || $name === $author) {
            continue;
        }
        if (!isset($classmateMap[$name])) {
            continue;
        }
        $normalized[$name] = true;
    }
    return array_values(array_keys($normalized));
}

function countTodayMessages($messages, $author, $date) {
    $count = 0;
    foreach ($messages as $item) {
        if (($item['status'] ?? 'active') !== 'active') {
            continue;
        }
        if (($item['author'] ?? '') === $author && ($item['createdDate'] ?? '') === $date) {
            $count++;
        }
    }
    return $count;
}

function buildPublicMessage($item) {
    return [
        'id' => $item['id'] ?? '',
        'displayName' => $item['displayName'] ?? '匿名同学',
        'anonymous' => !empty($item['anonymous']),
        'content' => $item['content'] ?? '',
        'color' => $item['color'] ?? '#C9A84C',
        'fontSize' => intval($item['fontSize'] ?? 18),
        'createdAt' => $item['createdAt'] ?? '',
        'createdDate' => $item['createdDate'] ?? '',
        'hiddenCount' => is_array($item['hiddenFor'] ?? null) ? count($item['hiddenFor']) : 0,
    ];
}

function filterVisibleMessages($messages, $viewer) {
    $visible = [];
    foreach ($messages as $item) {
        if (($item['status'] ?? 'active') !== 'active') {
            continue;
        }
        $hiddenFor = $item['hiddenFor'] ?? [];
        if (is_array($hiddenFor) && in_array($viewer, $hiddenFor, true)) {
            continue;
        }
        $visible[] = buildPublicMessage($item);
    }
    return $visible;
}

function getMineMessages($messages, $viewer) {
    $mine = [];
    foreach ($messages as $item) {
        if (($item['author'] ?? '') !== $viewer) {
            continue;
        }
        if (($item['status'] ?? 'active') !== 'active') {
            continue;
        }
        $mine[] = [
            'id' => $item['id'] ?? '',
            'displayName' => $item['displayName'] ?? '匿名同学',
            'anonymous' => !empty($item['anonymous']),
            'content' => $item['content'] ?? '',
            'color' => $item['color'] ?? '#C9A84C',
            'fontSize' => intval($item['fontSize'] ?? 18),
            'createdAt' => $item['createdAt'] ?? '',
            'createdDate' => $item['createdDate'] ?? '',
            'hiddenFor' => array_values($item['hiddenFor'] ?? []),
        ];
    }
    usort($mine, function($a, $b) {
        return strcmp((string)($b['createdAt'] ?? ''), (string)($a['createdAt'] ?? ''));
    });
    return $mine;
}

function stableShuffleMessages($messages, $viewer, $seedKey) {
    $decorated = [];
    foreach ($messages as $index => $item) {
        $id = (string)($item['id'] ?? '');
        $decorated[] = [
            'sortKey' => md5($seedKey . '|' . $viewer . '|' . $id),
            'createdAt' => (string)($item['createdAt'] ?? ''),
            'index' => $index,
            'item' => $item,
        ];
    }
    usort($decorated, function($a, $b) {
        $cmp = strcmp($a['sortKey'], $b['sortKey']);
        if ($cmp !== 0) return $cmp;
        $cmp = strcmp($a['createdAt'], $b['createdAt']);
        if ($cmp !== 0) return $cmp;
        return $a['index'] <=> $b['index'];
    });
    return array_values(array_map(function($row) {
        return $row['item'];
    }, $decorated));
}

function buildVisiblePayload($store, $viewer, $limit) {
    $visible = filterVisibleMessages($store['messages'], $viewer);
    $shuffled = stableShuffleMessages($visible, $viewer, dailySeedKey());
    if ($limit > 0 && count($shuffled) > $limit) {
        $shuffled = array_slice($shuffled, 0, $limit);
    }
    return $shuffled;
}

function validatePayload($body, $classmateMap) {
    if (!is_array($body)) {
        jsonResponse(['success' => false, 'message' => '请求数据格式错误'], 400);
    }

    $author = cleanText($body['author'] ?? '');
    if ($author === '') {
        jsonResponse(['success' => false, 'message' => '发送者不能为空'], 400);
    }
    if (!isset($classmateMap[$author])) {
        jsonResponse(['success' => false, 'message' => '发送者身份无效'], 403);
    }

    $content = cleanText($body['content'] ?? '');
    if ($content === '') {
        jsonResponse(['success' => false, 'message' => '留言内容不能为空'], 400);
    }
    if (textLength($content) > DANMAKU_MAX_LEN) {
        jsonResponse(['success' => false, 'message' => '留言内容不能超过 50 个字'], 400);
    }

    $anonymous = !empty($body['anonymous']);
    $color = normalizeColor($body['color'] ?? '#C9A84C');
    $fontSize = normalizeFontSize($body['fontSize'] ?? 18);
    $hiddenFor = normalizeHiddenFor($body['hiddenFor'] ?? [], $author, $classmateMap);

    return [
        'author' => $author,
        'displayName' => $anonymous ? '匿名同学' : $author,
        'anonymous' => $anonymous,
        'content' => $content,
        'color' => $color,
        'fontSize' => $fontSize,
        'hiddenFor' => $hiddenFor,
    ];
}

if ($method === 'GET') {
    $classmateMap = loadClassmateNames();
    $viewer = normalizeViewerName($_GET['viewer'] ?? '', $classmateMap);
    $scope = cleanText($_GET['scope'] ?? 'feed');
    $limit = intval($_GET['limit'] ?? DANMAKU_LIMIT_DEFAULT);
    if ($limit <= 0) {
        $limit = DANMAKU_LIMIT_DEFAULT;
    }
    if ($limit > DANMAKU_LIMIT_MAX) {
        $limit = DANMAKU_LIMIT_MAX;
    }

    $store = loadStore();
    $todaySent = countTodayMessages($store['messages'], $viewer, todayDate());

    if ($scope === 'mine') {
        $mine = getMineMessages($store['messages'], $viewer);
        jsonResponse([
            'success' => true,
            'scope' => 'mine',
            'viewer' => $viewer,
            'messages' => $mine,
            'total' => count($mine),
            'remainingToday' => max(0, DANMAKU_DAILY_LIMIT - $todaySent),
            'updatedAt' => $store['meta']['updatedAt'] ?? nowDateTime(),
        ]);
    }

    $visible = buildVisiblePayload($store, $viewer, $limit);
    jsonResponse([
        'success' => true,
        'scope' => 'feed',
        'messages' => array_values($visible),
        'total' => count(filterVisibleMessages($store['messages'], $viewer)),
        'viewer' => $viewer,
        'remainingToday' => max(0, DANMAKU_DAILY_LIMIT - $todaySent),
        'dailyKey' => dailySeedKey(),
        'updatedAt' => $store['meta']['updatedAt'] ?? nowDateTime(),
    ]);
}

if ($method === 'POST') {
    $classmateMap = loadClassmateNames();
    $body = json_decode(file_get_contents('php://input'), true);
    $payload = validatePayload($body, $classmateMap);

    $store = loadStore();
    $today = todayDate();
    $sentToday = countTodayMessages($store['messages'], $payload['author'], $today);
    if ($sentToday >= DANMAKU_DAILY_LIMIT) {
        jsonResponse([
            'success' => false,
            'message' => '今日留言次数已达上限（3 条）',
            'remainingToday' => 0,
        ], 429);
    }

    $item = [
        'id' => generateDanmakuId(),
        'author' => $payload['author'],
        'displayName' => $payload['displayName'],
        'anonymous' => $payload['anonymous'],
        'content' => $payload['content'],
        'color' => $payload['color'],
        'fontSize' => $payload['fontSize'],
        'hiddenFor' => $payload['hiddenFor'],
        'createdDate' => $today,
        'createdAt' => nowDateTime(),
        'status' => 'active',
        'deletedAt' => '',
        'deletedBy' => '',
    ];

    $store['messages'][] = $item;
    if (!saveStore($store)) {
        jsonResponse(['success' => false, 'message' => '留言保存失败，请检查 data 目录写入权限'], 500);
    }

    $visible = buildVisiblePayload($store, $payload['author'], DANMAKU_LIMIT_MAX);
    jsonResponse([
        'success' => true,
        'message' => '留言发送成功',
        'item' => buildPublicMessage($item),
        'messages' => array_values($visible),
        'total' => count(filterVisibleMessages($store['messages'], $payload['author'])),
        'remainingToday' => max(0, DANMAKU_DAILY_LIMIT - $sentToday - 1),
        'dailyKey' => dailySeedKey(),
        'updatedAt' => $store['meta']['updatedAt'] ?? nowDateTime(),
    ]);
}

jsonResponse(['success' => false, 'message' => '不支持的请求方法'], 405);
