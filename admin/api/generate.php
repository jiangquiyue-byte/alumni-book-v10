<?php
require_once __DIR__ . '/_init.php';
/**
 * 同学录 · 页面生成器
 * 根据 students.json 中的学生数据，动态生成/重新生成个人主页 HTML
 */

if (!defined('ROOT_PATH')) {
    require_once dirname(dirname(__FILE__)) . '/config.php';
}

/**
 * 生成单个学生的 HTML 页面
 */
function generateStudentPage($student) {
    $name    = $student['name'];
    $id      = $student['id'];
    $info    = $student['info'] ?? [];
    $music   = $student['music'] ?? [];
    $bg      = $student['background'] ?? [];
    $particles = $student['particles'] ?? 'sakura';
    $stickers  = $student['stickers'] ?? [];
    $photos    = $student['photos'] ?? [];

    // 判断是否是"我"的专属模板（使用特殊模板）
    $isOwner = ($student['isOwner'] ?? false) === true;

    // ── 专属页面保护：isOwner=true 且页面已存在时，跳过生成，保留手工编写的页面 ──
    if ($isOwner) {
        $protectedSlug = !empty($student['slug'])
            ? preg_replace('/[^a-z0-9_-]/i', '', strtolower($student['slug']))
            : sanitizeFilename($name);
        $protectedFile = DIR_STUDENTS . $protectedSlug . '.html';
        if (file_exists($protectedFile)) {
            // 仅同步 classmates.json，不覆盖页面文件
            $classmatesFile = CLASSMATES_JSON;
            $cmContent = @file_get_contents($classmatesFile);
            $cm = $cmContent ? (json_decode($cmContent, true) ?? []) : [];
            if (!isset($cm['classmates'])) $cm['classmates'] = [];
            if (!isset($cm['slugs']))      $cm['slugs'] = [];
            if (!isset($cm['pages']))      $cm['pages'] = [];
            if (!in_array($name, $cm['classmates'])) $cm['classmates'][] = $name;
            if (!in_array($name, $cm['pages']))      $cm['pages'][] = $name;
            $cm['slugs'][$name] = $protectedSlug;
            @file_put_contents($classmatesFile, json_encode($cm, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
            return true; // 跳过页面生成，保护专属页面
        }
    }

    $templateFile = $isOwner
        ? dirname(dirname(__FILE__)) . '/templates/student_owner.tpl.html'
        : dirname(dirname(__FILE__)) . '/templates/student.tpl.html';

    if (!file_exists($templateFile)) {
        // Fallback
        $templateFile = dirname(dirname(__FILE__)) . '/templates/student.tpl.html';
    }

    $tpl = file_get_contents($templateFile);
    if (!$tpl) return false;

    // ── 基础信息替换 ──
    $tpl = str_replace('{{STUDENT_NAME}}',    htmlspecialchars($name),                         $tpl);
    $tpl = str_replace('{{STUDENT_ID}}',      htmlspecialchars($id),                           $tpl);
    $tpl = str_replace('{{STUDENT_CHAR}}',    mb_substr($name, 0, 1),                          $tpl);
    $tpl = str_replace('{{NICKNAME}}',        hesc($info['nickname'] ?? ''),                    $tpl);
    $tpl = str_replace('{{MOTTO}}',           hesc($info['motto'] ?? ''),                       $tpl);

    // ── 头像 ──
    $avatarHtml = '';
    if (!empty($student['hasAvatar'])) {
        $avatarSrc = '../' . ltrim($student['avatar'], '/');
        $avatarHtml = '<img src="' . hesc($avatarSrc) . '" alt="头像">';
        $tpl = str_replace('{{AVATAR_CHAR_DISPLAY}}', 'display:none', $tpl);
    } else {
        $tpl = str_replace('{{AVATAR_CHAR_DISPLAY}}', '', $tpl);
    }
    $tpl = str_replace('{{AVATAR_HTML}}', $avatarHtml, $tpl);

    // ── 背景 ──
    $bgCss   = '';
    $bgStyle = '';
    if (!empty($bg['type']) && $bg['type'] === 'image' && !empty($bg['src'])) {
        $url      = "url('../" . hesc(ltrim($bg['src'],'/')) . "')";
        // 支持 posX/posY 独立字段（后台位置滑块）
        if (isset($bg['posX']) || isset($bg['posY'])) {
            $px = intval($bg['posX'] ?? 50);
            $py = intval($bg['posY'] ?? 50);
            $position = "{$px}% {$py}%";
        } else {
            $position = hesc($bg['position'] ?? 'center center');
        }
        $opacity  = isset($bg['opacity']) ? floatval($bg['opacity']) : 1;
        // 旋转 / 缩放
        $rotate   = isset($bg['rotate'])  ? floatval($bg['rotate'])  : 0;
        $scaleX   = isset($bg['scaleX'])  ? floatval($bg['scaleX'])  : 1;
        $scaleY   = isset($bg['scaleY'])  ? floatval($bg['scaleY'])  : 1;
        // 裁剪（前端确认的 0~1 比例区域）
        $crop     = $bg['crop'] ?? null;
        $bgSize   = 'cover';
        $bgPos    = $position;
        if ($crop && isset($crop['cx'], $crop['cy'], $crop['cw'], $crop['ch'])) {
            $cw = max(0.01, floatval($crop['cw']));
            $ch = max(0.01, floatval($crop['ch']));
            $cx = floatval($crop['cx']);
            $cy = floatval($crop['cy']);
            $sw = round(1 / $cw * 100, 2);
            $sh = round(1 / $ch * 100, 2);
            $px2 = round(-$cx / $cw * 100, 2);
            $py2 = round(-$cy / $ch * 100, 2);
            $bgSize = "{$sw}% {$sh}%";
            $bgPos  = "{$px2}% {$py2}%";
        }
        // 始终使用 CSS 变量 + 伪元素方式，支持任意透明度调节（不影响内容文字）
        $bgCss    = "--bg-img: {$url}; --bg-pos: {$bgPos}; --bg-opacity: {$opacity}; --bg-size: {$bgSize}; --bg-rotate: {$rotate}deg; --bg-scale-x: {$scaleX}; --bg-scale-y: {$scaleY};";
        $bgStyle  = 'style="' . $bgCss . '"';
    } elseif (!empty($bg['type']) && $bg['type'] === 'color' && !empty($bg['color'])) {
        $bgCss   = 'background-color: ' . hesc($bg['color']) . ';';
        $bgStyle = 'style="' . $bgCss . '"';
    }
    $tpl = str_replace('{{BG_CSS}}',   $bgCss,   $tpl);
    $tpl = str_replace('{{BG_STYLE}}', $bgStyle, $tpl);

    // ── 粒子效果 ──
    $particleMap = [
        'sakura'     => 'OverlayPresets.sakura',
        'stars'      => 'OverlayPresets.stars',
        'snow'       => 'OverlayPresets.snow',
        'confetti'   => 'OverlayPresets.confetti',
        'fireflies'  => 'OverlayPresets.fireflies',
        'bamboo'     => 'OverlayPresets.bamboo',
        'maple'      => 'OverlayPresets.maple',
        'ginkgo'     => 'OverlayPresets.ginkgo',
        'feather'    => 'OverlayPresets.feather',
        'hearts'     => 'OverlayPresets.hearts',
        'bubbles'    => 'OverlayPresets.bubbles',
        'paper'      => 'OverlayPresets.paper',
        'lite'       => 'OverlayPresets.lite',
        'none'       => 'OverlayPresets.none',
    ];
    // 内置预设
    if (isset($particleMap[$particles])) {
        $particleCode = $particleMap[$particles];
    } elseif (strpos($particles, 'custom_') === 0) {
        // 自定义粒子：从 custom_particles.json 读取配置
        $cpFile = ROOT_PATH . 'data/custom_particles.json';
        $cpData = readJson($cpFile);
        $cpFound = null;
        foreach (($cpData['particles'] ?? []) as $cp) {
            if ($cp['id'] === $particles) { $cpFound = $cp; break; }
        }
        if ($cpFound) {
            $src     = hesc('assets/images/overlays/' . $cpFound['file']);
            $count   = intval($cpFound['count'] ?? 20);
            $sizeMin = intval($cpFound['size'][0] ?? 12);
            $sizeMax = intval($cpFound['size'][1] ?? 32);
            $particleCode = "{ type:'custom', imageSrc:'../{$src}', count:{$count}, imageSize:[{$sizeMin},{$sizeMax}], spawnDelay:150 }";
        } else {
            $particleCode = 'OverlayPresets.sakura';
        }
    } else {
        $particleCode = 'OverlayPresets.sakura';
    }
    $tpl = str_replace('{{PARTICLE_PRESET}}', $particleCode, $tpl);

    // ── 音乐 ──
    if (!empty($music['enabled'])) {
        $musicSrc   = '../' . ltrim($music['src'] ?? '', '/');
        $musicTitle = hesc($music['title'] ?? '');
        $autoplay   = $music['autoplay'] ? 'true' : 'false';
        $loop       = $music['loop'] ? 'true' : 'false';
        $musicCode  = "Music.init({ src: '{$musicSrc}', title: '{$musicTitle}', autoplay: {$autoplay}, loop: {$loop} });";
    } else {
        $musicCode = '// 未启用背景音乐';
    }
    $tpl = str_replace('{{MUSIC_CODE}}', $musicCode, $tpl);

    // ── 贴纸层 ──
    $stickerHtml = '';
    $showcaseHtml = '';
    foreach ($stickers as $sticker) {
        if (empty($sticker['file'])) continue;
        $src     = '../' . ltrim(hesc($sticker['file']), '/');
        $top     = isset($sticker['top']) ? 'top:' . hesc($sticker['top']) . ';' : '';
        $left    = isset($sticker['left']) ? 'left:' . hesc($sticker['left']) . ';' : '';
        $right   = isset($sticker['right']) ? 'right:' . hesc($sticker['right']) . ';' : '';
        $bottom  = isset($sticker['bottom']) ? 'bottom:' . hesc($sticker['bottom']) . ';' : '';
        $width   = isset($sticker['width']) ? 'width:' . hesc($sticker['width']) . ';' : 'width:60px;';
        $rotate  = isset($sticker['rotate']) ? '--r:' . hesc($sticker['rotate']) . ';' : '';
        // ★ 兼容 animClass（新版编辑器）和 animation（旧版数据）两种字段名
        $anim    = $sticker['animClass'] ?? $sticker['animation'] ?? 'sticker--float';
        $anim    = hesc($anim);
        // 如果 animClass 为空字符串，使用默认动画
        if (trim($anim) === '') $anim = 'sticker--float';
        $style   = $top . $left . $right . $bottom . $width . $rotate;
        $stickerHtml .= "  <img class=\"sticker {$anim}\" src=\"{$src}\" style=\"{$style}\" alt=\"\">
";
        // ★ 同时生成贴纸展示区内容
        $showcaseHtml .= "<img class=\"sticker-item\" src=\"{$src}\" alt=\"\">
";
    }
    $tpl = str_replace('{{STICKERS_HTML}}', $stickerHtml, $tpl);
    // ★ 将贴纸展示区内容注入到 sticker-showcase 中（在占位提示之前插入）
    if (!empty($showcaseHtml)) {
        $tpl = str_replace(
            '<div class="sticker-showcase" id="sticker-showcase">',
            '<div class="sticker-showcase" id="sticker-showcase">' . "\n" . $showcaseHtml,
            $tpl
        );
    };

    // ── 照片墙 ──
    $photoHtml = '';
    foreach ($photos as $photo) {
        if (empty($photo['file'])) continue;
        $src     = '../students/photos/' . hesc($photo['file']);
        $caption = hesc($photo['caption'] ?? '');
        $cls     = '';
        if (!empty($photo['wide'])) $cls = ' wide';
        if (!empty($photo['tall'])) $cls = ' tall';
        $frame   = hesc($photo['frame'] ?? 'retro');
        $photoHtml .= "    <div class=\"photo-wall-item{$cls} frame-{$frame}\">\n";
        $photoHtml .= "      <img src=\"{$src}\" alt=\"{$caption}\">\n";
        if ($caption) $photoHtml .= "      <div class=\"photo-caption\">{$caption}</div>\n";
        $photoHtml .= "    </div>\n";
    }
    $photoPlaceholder = $photoHtml ? 'display:none' : '';
    $tpl = str_replace('{{PHOTOS_HTML}}', $photoHtml, $tpl);
    $tpl = str_replace('{{PHOTO_PLACEHOLDER_STYLE}}', $photoPlaceholder, $tpl);

    // ── 所有信息字段 ──
    $fields = [
        // 基础信息
        'FIELD_NAME'           => $info['name'] ?? $name,
        'FIELD_NICKNAME'       => $info['nickname'] ?? '',
        'FIELD_GENDER'         => $info['gender'] ?? '',
        'FIELD_BIRTHDAY'       => $info['birthday'] ?? '',
        'FIELD_SCHOOL'         => $info['school'] ?? '',
        'FIELD_CLASS'          => $info['class'] ?? '',
        'FIELD_GRAD_YEAR'      => $info['graduationYear'] ?? '',
        // 联系方式
        'FIELD_QQ'             => $info['qq'] ?? '',
        'FIELD_WECHAT'         => $info['wechat'] ?? '',
        'FIELD_WEIBO'          => $info['weibo'] ?? '',
        'FIELD_PHONE'          => $info['phone'] ?? '',
        'FIELD_EMAIL'          => $info['email'] ?? '',
        'FIELD_ADDRESS'        => $info['address'] ?? '',
        // 社交账号
        'FIELD_DOUYIN'         => $info['douyinId'] ?? '',
        'FIELD_KUAISHOU'       => $info['kuaishou'] ?? '',
        'FIELD_BILIBILI'       => $info['bilibili'] ?? '',
        // 个性标签
        'FIELD_MBTI'           => $info['mbti'] ?? '',
        'FIELD_BLOOD_TYPE'     => $info['bloodType'] ?? '',
        'FIELD_ASTRO'          => $info['astro'] ?? '',
        'FIELD_STRENGTHS'      => $info['strengths'] ?? '',
        'FIELD_WEAKNESSES'     => $info['weaknesses'] ?? '',
        'FIELD_BEST_SUBJECT'   => $info['bestSubject'] ?? '',
        'FIELD_WORST_SUBJECT'  => $info['worstSubject'] ?? '',
        'FIELD_MOTTO'          => $info['motto'] ?? '',
        // 兴趣
        'FIELD_FAV_IDOL'       => $info['favoriteIdol'] ?? '',
        'FIELD_FAV_ANIME'      => $info['favoriteAnime'] ?? '',
        'FIELD_FAV_MOVIE'      => $info['favoriteMovie'] ?? '',
        'FIELD_FAV_SONG'       => $info['favoriteSong'] ?? '',
        'FIELD_FAV_GAME'       => $info['favoriteGame'] ?? '',
        'FIELD_FAV_FOOD'       => $info['favoriteFood'] ?? '',
        'FIELD_FAV_COLOR'      => $info['favoriteColor'] ?? '',
        'FIELD_FAV_SPORT'      => $info['favoriteSport'] ?? '',
        // 校园回忆
        'FIELD_BEST_MEMORY'    => $info['bestMemory'] ?? '',
        'FIELD_BEST_LESSON'    => $info['bestLesson'] ?? '',
        'FIELD_DESKMATE_FUN'   => $info['deskmateFun'] ?? '',
        'FIELD_CLASS_MEME'     => $info['classMeme'] ?? '',
        'FIELD_EMBARRASSING'   => $info['embarrassingMoment'] ?? '',
        'FIELD_PROUDEST'       => $info['proudestAchievement'] ?? '',
        // 未来规划
        'FIELD_TARGET_UNI'     => $info['targetUniversity'] ?? '',
        'FIELD_TARGET_MAJOR'   => $info['targetMajor'] ?? '',
        'FIELD_FUTURE_CAREER'  => $info['futureCareer'] ?? '',
        'FIELD_FUTURE_CITY'    => $info['futureCity'] ?? '',
        'FIELD_FUTURE_SELF'    => $info['futureSelf'] ?? '',
        'FIELD_LETTER_FUTURE'  => $info['letterToFuture'] ?? '',
        // 结语
        'FIELD_LETTER_CLASS'   => $info['letterToClassmates'] ?? '',
    ];

    foreach ($fields as $placeholder => $value) {
        $token = '{{' . $placeholder . '}}';
        if ($value) {
            $tpl = str_replace(
                $token,
                '<span class="info-value">' . nl2br(hesc($value)) . '</span>',
                $tpl
            );
        } else {
            $tpl = str_replace(
                $token,
                '<span class="info-value empty">暂未填写</span>',
                $tpl
            );
        }
    }

    // ── 写入文件（使用拼音 slug 作为文件名） ──
    $slug = !empty($student['slug']) ? preg_replace('/[^a-z0-9_-]/i', '', strtolower($student['slug'])) : sanitizeFilename($name);
    $filename = DIR_STUDENTS . $slug . '.html';
    ensureDir(DIR_STUDENTS);

    // 写入 HTML 文件
    $writeResult = @file_put_contents($filename, $tpl);
    if ($writeResult === false) {
        // 记录错误日志方便排查
        error_log("[同学录] 页面生成失败: {$filename} (DIR_STUDENTS=" . DIR_STUDENTS . ", is_writable=" . (is_writable(DIR_STUDENTS) ? 'yes' : 'NO') . ")");
        return false;
    }

    // ── 同步更新 classmates.json 的 pages 和 slugs ──
    $classmatesFile = CLASSMATES_JSON;
    $cmContent = @file_get_contents($classmatesFile);
    $cm = $cmContent ? (json_decode($cmContent, true) ?? []) : [];
    if (!isset($cm['classmates'])) $cm['classmates'] = [];
    if (!isset($cm['slugs']))      $cm['slugs'] = [];
    if (!isset($cm['pages']))      $cm['pages'] = [];

    // 确保名字在 classmates 列表中
    if (!in_array($name, $cm['classmates'])) {
        $cm['classmates'][] = $name;
    }
    // 确保名字在 pages 列表中
    if (!in_array($name, $cm['pages'])) {
        $cm['pages'][] = $name;
    }
    // 更新 slug 映射
    $cm['slugs'][$name] = $slug;

    $cmResult = @file_put_contents($classmatesFile, json_encode($cm, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    if ($cmResult === false) {
        error_log("[同学录] classmates.json 同步失败: {$classmatesFile} (is_writable=" . (is_writable(dirname($classmatesFile)) ? 'yes' : 'NO') . ")");
    }

    return true;
}

function hesc($str) {
    return htmlspecialchars((string)$str, ENT_QUOTES | ENT_HTML5, 'UTF-8');
}
