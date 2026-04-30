<?php
require_once __DIR__ . '/_init.php';
require_once dirname(dirname(__FILE__)) . '/config.php';
requireAuth();

define('ADMIN_DANMAKU_JSON', ROOT_PATH . 'data/danmaku_messages.json');

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'POST' && !empty($_GET['_method'])) {
    $method = strtoupper($_GET['_method']);
}

function nowDateTimeAdmin() {
    return date('Y-m-d H:i:s');
}

function todayDateAdmin() {
    return date('Y-m-d');
}

function cleanAdminText($text) {
    $text = is_string($text) ? $text : '';
    $text = trim($text);
    $text = preg_replace('/\s+/u', ' ', $text);
    return trim($text);
}

function loadDanmakuStoreAdmin() {
    $data = readJson(ADMIN_DANMAKU_JSON);
    if (!is_array($data)) {
        $data = [
            'messages' => [],
            'meta' => [
                'version' => '2.0.0',
                'updatedAt' => nowDateTimeAdmin(),
            ],
        ];
        writeJson(ADMIN_DANMAKU_JSON, $data);
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
        $data['meta']['updatedAt'] = nowDateTimeAdmin();
    }
    return $data;
}

function saveDanmakuStoreAdmin($data) {
    $data['meta'] = is_array($data['meta'] ?? null) ? $data['meta'] : [];
    $data['meta']['version'] = '2.0.0';
    $data['meta']['updatedAt'] = nowDateTimeAdmin();
    return writeJson(ADMIN_DANMAKU_JSON, $data);
}

function normalizeAdminMessage($item) {
    return [
        'id' => $item['id'] ?? '',
        'author' => $item['author'] ?? '',
        'displayName' => $item['displayName'] ?? '匿名同学',
        'anonymous' => !empty($item['anonymous']),
        'content' => $item['content'] ?? '',
        'color' => $item['color'] ?? '#C9A84C',
        'fontSize' => intval($item['fontSize'] ?? 18),
        'hiddenFor' => array_values($item['hiddenFor'] ?? []),
        'createdAt' => $item['createdAt'] ?? '',
        'createdDate' => $item['createdDate'] ?? '',
        'status' => $item['status'] ?? 'active',
        'deletedAt' => $item['deletedAt'] ?? '',
        'deletedBy' => $item['deletedBy'] ?? '',
    ];
}

function buildStatsAdmin($messages) {
    $stats = [
        'total' => 0,
        'active' => 0,
        'deleted' => 0,
        'today' => 0,
        'anonymous' => 0,
    ];
    $today = todayDateAdmin();
    foreach ($messages as $item) {
        $stats['total']++;
        if (($item['status'] ?? 'active') === 'active') {
            $stats['active']++;
        } else {
            $stats['deleted']++;
        }
        if (($item['createdDate'] ?? '') === $today) {
            $stats['today']++;
        }
        if (!empty($item['anonymous'])) {
            $stats['anonymous']++;
        }
    }
    return $stats;
}

if ($method === 'GET') {
    $store = loadDanmakuStoreAdmin();
    $author = cleanAdminText($_GET['author'] ?? '');
    $keyword = cleanAdminText($_GET['keyword'] ?? '');
    $status = cleanAdminText($_GET['status'] ?? 'all');

    $messages = [];
    foreach ($store['messages'] as $item) {
        $itemStatus = $item['status'] ?? 'active';
        if ($status !== 'all' && $itemStatus !== $status) {
            continue;
        }
        if ($author !== '' && ($item['author'] ?? '') !== $author) {
            continue;
        }
        if ($keyword !== '') {
            $haystack = implode(' ', [
                $item['author'] ?? '',
                $item['displayName'] ?? '',
                $item['content'] ?? '',
                implode(' ', $item['hiddenFor'] ?? []),
            ]);
            if (mb_stripos($haystack, $keyword, 0, 'UTF-8') === false) {
                continue;
            }
        }
        $messages[] = normalizeAdminMessage($item);
    }

    usort($messages, function($a, $b) {
        return strcmp((string)($b['createdAt'] ?? ''), (string)($a['createdAt'] ?? ''));
    });

    jsonResponse([
        'success' => true,
        'messages' => $messages,
        'total' => count($messages),
        'stats' => buildStatsAdmin($store['messages']),
        'updatedAt' => $store['meta']['updatedAt'] ?? nowDateTimeAdmin(),
    ]);
}

if ($method === 'DELETE') {
    $id = cleanAdminText($_GET['id'] ?? '');
    if ($id === '') {
        jsonResponse(['success' => false, 'message' => '缺少留言 ID'], 400);
    }

    $store = loadDanmakuStoreAdmin();
    $found = false;
    $deletedItem = null;

    foreach ($store['messages'] as &$item) {
        if (($item['id'] ?? '') !== $id) {
            continue;
        }
        $found = true;
        if (($item['status'] ?? 'active') === 'deleted') {
            jsonResponse(['success' => false, 'message' => '该留言已删除'], 409);
        }
        $item['status'] = 'deleted';
        $item['deletedAt'] = nowDateTimeAdmin();
        $item['deletedBy'] = 'admin';
        $deletedItem = normalizeAdminMessage($item);
        break;
    }
    unset($item);

    if (!$found) {
        jsonResponse(['success' => false, 'message' => '留言不存在'], 404);
    }

    if (!saveDanmakuStoreAdmin($store)) {
        jsonResponse(['success' => false, 'message' => '删除失败，数据文件无法写入'], 500);
    }

    jsonResponse([
        'success' => true,
        'message' => '留言已删除',
        'item' => $deletedItem,
        'stats' => buildStatsAdmin($store['messages']),
        'updatedAt' => $store['meta']['updatedAt'] ?? nowDateTimeAdmin(),
    ]);
}

jsonResponse(['success' => false, 'message' => '不支持的请求方法'], 405);
