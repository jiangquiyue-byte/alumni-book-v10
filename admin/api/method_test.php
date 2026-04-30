<?php
require_once __DIR__ . '/_init.php';
// 不需要登录验证，纯测试用
header('Content-Type: application/json; charset=utf-8');
echo json_encode([
    'success'         => true,
    'original_method' => $_REAL_METHOD ?? 'unknown',
    'final_method'    => $_SERVER['REQUEST_METHOD'],
    'get_params'      => $_GET,
    'has_body'        => file_get_contents('php://input') ? true : false,
    'php_version'     => phpversion(),
    'message'         => $_SERVER['REQUEST_METHOD'] === 'DELETE'
        ? '✅ DELETE 方法覆盖成功！删除功能应该可以正常工作'
        : ($_SERVER['REQUEST_METHOD'] === 'PUT'
            ? '✅ PUT 方法覆盖成功！保存功能应该可以正常工作'
            : '收到 ' . $_SERVER['REQUEST_METHOD'] . ' 请求'),
], JSON_UNESCAPED_UNICODE);
