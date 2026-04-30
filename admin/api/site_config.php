<?php
require_once __DIR__ . '/_init.php';
require_once dirname(dirname(__FILE__)) . '/config.php';
requireAuth();

define('SITE_CONFIG_JSON', ROOT_PATH . 'data/site_config.json');

function readConfig() {
    $data = readJson(SITE_CONFIG_JSON);
    return $data ?? [
        'particles' => [
            'index'   => ['enabled' => true, 'preset' => 'sakura'],
            'preface' => ['enabled' => true, 'preset' => 'sakura'],
            'roster'  => ['enabled' => true, 'preset' => 'sakura'],
            'album'   => ['enabled' => true, 'preset' => 'sakura'],
            'student' => ['enabled' => true, 'preset' => 'sakura'],
        ],
        'footer' => ['beian' => '', 'beianUrl' => 'https://beian.miit.gov.cn/', 'copyright' => '同学录 · 青春回忆'],
        'preface' => ['title' => '致青春岁月', 'subtitle' => '写在翻开同学录之前', 'content' => ''],
        'acknowledgments' => [],
        'typography' => ['fontFamily' => 'default', 'fontSize' => '15'],
    ];
}

// 方法覆盖：PUT/DELETE 通过 POST + ?_method=XXX 传递（兼容Nginx）
$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'POST' && !empty($_GET['_method'])) {
    $method = strtoupper($_GET['_method']);
}

if ($method === 'GET') {
    jsonResponse(['success' => true, 'config' => readConfig()]);
}

if ($method === 'PUT') {
    $body = json_decode(file_get_contents('php://input'), true);
    if (!$body) jsonResponse(['success' => false, 'message' => '数据格式错误'], 400);

    $cfg = readConfig();

    // 更新粒子设置
    if (isset($body['particles'])) {
        foreach ($body['particles'] as $page => $pcfg) {
            if (in_array($page, ['index','preface','roster','album','student'])) {
                if (isset($pcfg['enabled'])) $cfg['particles'][$page]['enabled'] = (bool)$pcfg['enabled'];
                if (isset($pcfg['preset']))  $cfg['particles'][$page]['preset']  = $pcfg['preset'];
            }
        }
    }

    // 更新备案/底部信息
    if (isset($body['footer'])) {
        $cfg['footer'] = [
            'beian'     => trim($body['footer']['beian'] ?? ''),
            'beianUrl'  => trim($body['footer']['beianUrl'] ?? 'https://beian.miit.gov.cn/'),
            'copyright' => trim($body['footer']['copyright'] ?? '同学录 · 青春回忆'),
        ];
    }

    // 更新前言内容
    if (isset($body['preface'])) {
        $cfg['preface'] = [
            'title'    => trim($body['preface']['title'] ?? '致青春岁月'),
            'subtitle' => trim($body['preface']['subtitle'] ?? ''),
            'content'  => trim($body['preface']['content'] ?? ''),
        ];
    }

    // 更新字体排版
    if (isset($body['typography'])) {
        $allowed_fonts = ['default','Ma Shan Zheng','ZCOOL XiaoWei','Noto Serif SC','Noto Sans SC','ZCOOL QingKe HuangYou','Liu Jian Mao Cao'];
        $font_family = trim($body['typography']['fontFamily'] ?? 'default');
        if (!in_array($font_family, $allowed_fonts)) $font_family = 'default';
        $font_size = intval($body['typography']['fontSize'] ?? 15);
        if ($font_size < 12) $font_size = 12;
        if ($font_size > 22) $font_size = 22;
        $cfg['typography'] = [
            'fontFamily' => $font_family,
            'fontSize'   => (string)$font_size,
        ];
    }

    // 更新致谢人物
    if (isset($body['acknowledgments'])) {
        $cfg['acknowledgments'] = [];
        foreach ($body['acknowledgments'] as $ack) {
            $cfg['acknowledgments'][] = [
                'name'   => trim($ack['name'] ?? ''),
                'role'   => trim($ack['role'] ?? ''),
                'tip'    => trim($ack['tip'] ?? ''),
                'avatar' => trim($ack['avatar'] ?? ''),
            ];
        }
    }

    $result = writeJson(SITE_CONFIG_JSON, $cfg);
    if (!$result) {
        jsonResponse(['success' => false, 'message' => '保存失败，请检查 data/ 目录权限'], 500);
    }
    jsonResponse(['success' => true, 'config' => $cfg]);
}
