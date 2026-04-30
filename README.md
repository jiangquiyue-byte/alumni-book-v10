# 同学录系统 v10.0

> **一份可持续维护的校园纪念站点**：前台静态展示、后台可视化管理、JSON 数据驱动、模板自动生成。

---

## 📢 开源说明与作者信息

本项目由原作者重新开启并开源。欢迎大家下载、使用及进行二次开发。

*   **原作者**: qiu_xi
*   **联系邮箱**: [qiu_xi@outlook.com](mailto:qiu_xi@outlook.com)
*   **开源协议**: [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh) (署名-非商业性使用-相同方式共享)

**二次修改要求：**
如果您对本项目代码进行二次修改或分发，**必须在显著位置添加原作者相关信息（qiu_xi）并介绍这份代码的来源**。

---

## 一、项目简介

同学录系统 v10.0 是一套面向校园纪念场景的轻量级网站方案。系统以前台静态页面为展示层，以 PHP 接口与 JSON 文件为数据层，以后台管理界面为内容维护入口，从而在不依赖数据库和大型框架的前提下，实现学生资料管理、页面生成、站点内容维护、贴纸装饰、背景音乐、班级相册、全景展示与粒子效果配置等完整能力。

10.0 版本的重点不是单纯增加功能数量，而是进一步提升 **结构一致性、视觉表现力与后续维护效率**。本版本新增了枫叶、银杏、羽毛、心形、光泡、书页等多种粒子效果，对前后台粒子预设进行了统一注册化整理，并同步优化了模板运行时、全局字体联动与资源版本参数策略，使系统在长期迭代中更稳定、更容易排障。

---

## 二、10.0 版本核心更新

| 类别 | 10.0 更新内容 |
|---|---|
| 粒子系统 | 新增 `maple`、`ginkgo`、`feather`、`hearts`、`bubbles`、`paper` 等内置粒子效果 |
| 粒子架构 | 前后台统一使用同一套粒子注册思路，减少“后台可选、前台无定义”的不一致问题 |
| 公共运行时 | `common.js` 增强粒子参数支持，统一更多页面级逻辑 |
| 模板一致性 | 普通模板页与专属模板页统一全局字体同步与脚本缓存参数策略 |
| 后台体验 | 后台登录页已更新为古朴书籍风格，视觉更贴合整站气质 |
| 文档体系 | README、开发文档与服务器说明重写为 10.0 版本现状 |

---

## 三、系统架构概览

同学录系统采用“**后台维护数据，前台静态展示页面**”的架构。管理员在后台进行资料编辑、上传资源或修改站点配置，PHP 接口将变更写入 JSON 文件，并在需要时重新生成学生页面。最终用户访问到的则是生成完成的 HTML 页面与公共静态资源。

| 层级 | 组成 | 作用 |
|---|---|---|
| 展示层 | `index.html`、`preface.html`、`roster.html`、`album.html`、`students/*.html` | 对外展示封面、前言、名册、相册与学生页 |
| 公共前端层 | `assets/css/*`、`assets/js/common.js`、`assets/js/overlay.js` | 统一处理样式、字体、粒子、页面交互 |
| 后台层 | `admin/index.php`、`admin/admin.php`、`admin/assets/js/*.js` | 管理内容、资源、配置与生成过程 |
| 接口层 | `admin/api/*.php` | 处理登录、保存、上传、生成、配置读取 |
| 数据层 | `data/*.json`、`album/*.json` | 存储学生、站点、相册、粒子等数据 |
| 资源层 | `students/`、`album/`、`assets/images/overlays/` | 存放头像、背景、贴纸、音乐、粒子素材和照片 |

---

## 四、目录结构

```text
site/
├── index.html
├── preface.html
├── roster.html
├── album.html
├── README.md
├── LICENSE
├── ADMIN_GUIDE.md
├── 服务器配置说明.md
├── assets/
│   ├── css/
│   ├── js/
│   │   ├── common.js
│   │   └── overlay.js
│   └── images/
│       └── overlays/
├── data/
│   ├── students.json
│   ├── classmates.json
│   ├── site_config.json
│   ├── site_settings.json
│   └── custom_particles.json
├── students/
│   ├── *.html
│   ├── avatars/
│   ├── backgrounds/
│   ├── stickers/
│   ├── music/
│   └── photos/
├── album/
│   ├── photos/
│   ├── panoramas/
│   └── photos.json
└── admin/
    ├── index.php
    ├── admin.php
    ├── setup.php
    ├── templates/
    │   ├── student.tpl.html
    │   └── student_owner.tpl.html
    ├── api/
    └── assets/
```

---

## 五、部署要求

### 5.1 环境要求

| 项目 | 要求 |
|---|---|
| Web 服务器 | Apache 或 Nginx |
| PHP | 7.4 及以上 |
| 推荐环境 | 宝塔面板 / 常见 LNMP、LAMP 环境 |
| 数据库 | 不需要 |

### 5.2 写入权限建议

系统通过 PHP 接口写入 JSON 文件和上传目录，因此必须保证 `data/`、`students/`、`album/` 以及粒子资源目录具有可写权限。

---

## 六、结语

同学录系统 v10.0 的目标，是在保留“纯手写、轻依赖、可长期保存”的基础上，让系统真正具备持续维护能力。

*同学录系统 v10.0*
