<?php
/**
 * 同学录 v10.5 · 一键部署配置
 * 访问此页面自动配置服务器环境
 * 配置完成后请删除此文件
 */
header('Content-Type: text/html; charset=utf-8');
$root = dirname(dirname(__FILE__)) . '/';
echo "<pre style='font-family:monospace;background:#111;color:#e0d8cc;padding:20px;max-width:700px;margin:20px auto;border-radius:8px;line-height:2;'>\n";
echo "===== 同学录 v10.5 一键部署 =====\n\n";

// 1. 创建必要目录
$dirs = [
    'data', 'students', 'students/avatars', 'students/backgrounds',
    'students/stickers', 'students/music', 'students/photos',
    'album/photos', 'album/panoramas', 'assets/images/overlays',
];
foreach ($dirs as $d) {
    $path = $root . $d;
    if (!is_dir($path)) {
        @mkdir($path, 0777, true);
        echo "创建目录: {$d}\n";
    }
}

// 2. 设置目录权限
$writeDirs = ['data','students','album','assets/images'];
foreach ($writeDirs as $d) {
    $path = $root . $d;
    if (is_dir($path)) {
        @chmod($path, 0777);
        // 递归设权限
        $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($path));
        foreach ($it as $file) {
            @chmod($file->getPathname(), is_dir($file->getPathname()) ? 0777 : 0666);
        }
        echo "设置权限: {$d}/ → 777\n";
    }
}

// 3. 初始化数据文件（如果不存在）
$dataFiles = [
    'data/students.json' => '{"students":[]}',
    'data/classmates.json' => '{"classmates":[],"slugs":{},"pages":[]}',
    'data/site_config.json' => json_encode([
        "particles"=>["index"=>["enabled"=>true,"preset"=>"sakura"],"preface"=>["enabled"=>true,"preset"=>"sakura"],"roster"=>["enabled"=>true,"preset"=>"sakura"],"album"=>["enabled"=>true,"preset"=>"sakura"]],
        "footer"=>["beian"=>"","beianUrl"=>"https://beian.miit.gov.cn/","copyright"=>"同学录 · 青春回忆"],
        "preface"=>["title"=>"致青春岁月","subtitle"=>"写在翻开同学录之前","content"=>""],
        "acknowledgments"=>[["name"=>"","role"=>"","tip"=>""],["name"=>"","role"=>"","tip"=>""],["name"=>"","role"=>"","tip"=>""]]
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT),
    'data/custom_particles.json' => '{"particles":[]}',
    'data/site_settings.json' => '{"index_particle":{"enabled":true,"preset":"sakura"}}',
    'album/photos.json' => '{"photos":[]}',
    'album/panoramas.json' => '{"panoramas":[]}',
];
foreach ($dataFiles as $f => $default) {
    $path = $root . $f;
    if (!file_exists($path)) {
        @file_put_contents($path, $default);
        @chmod($path, 0666);
        echo "初始化: {$f}\n";
    } else {
        @chmod($path, 0666);
        echo "已存在: {$f} (" . filesize($path) . " bytes)\n";
    }
}

// 4. 测试写入
$testFile = $root . 'data/.setup_test';
$ok = @file_put_contents($testFile, 'ok');
if ($ok) { @unlink($testFile); echo "\n✅ 写入测试通过\n"; }
else { echo "\n❌ 写入测试失败！请手动执行: chown -R www:www " . $root . "\n"; }

// 5. PHP环境信息
echo "\nPHP版本: " . phpversion() . "\n";
echo "upload_max_filesize: " . ini_get('upload_max_filesize') . "\n";
echo "post_max_size: " . ini_get('post_max_size') . "\n";
echo "max_execution_time: " . ini_get('max_execution_time') . "\n";
echo "memory_limit: " . ini_get('memory_limit') . "\n";
echo "GD扩展: " . (extension_loaded('gd') ? '✅' : '❌') . "\n";
echo "fileinfo扩展: " . (extension_loaded('fileinfo') ? '✅' : '⚠️ 缺失(不影响基本功能)') . "\n";

echo "\n===== 部署完成 =====\n";
echo "请删除此文件: rm " . __FILE__ . "\n";
echo "后台入口: /admin/index.php\n";
echo "</pre>\n";
