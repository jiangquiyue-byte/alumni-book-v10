/**
 * 同学录后台管理系统 · API 模块 v2
 * 所有后端接口调用 + 带进度条的文件上传
 */
const API = (() => {
  const BASE = './api/';

  async function request(url, options = {}) {
    try {
      const realMethod = (options.method || 'GET').toUpperCase();
      const needOverride = (realMethod === 'PUT' || realMethod === 'DELETE');

      // PUT/DELETE → POST + URL参数 _method（最可靠，Nginx不会拦截URL参数）
      let finalUrl = BASE + url;
      if (needOverride) {
        finalUrl += (finalUrl.includes('?') ? '&' : '?') + '_method=' + realMethod;
      }

      const res = await fetch(finalUrl, {
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
        credentials: 'include',
        method: needOverride ? 'POST' : realMethod,
        body: options.body || undefined,
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('[API] 非JSON响应 (HTTP ' + res.status + '):', text.substring(0, 300));
        throw new Error(
          res.status === 405 ? '请求方法被拒绝(405)，请检查Nginx配置' :
          res.status === 413 ? '文件太大' :
          res.status === 401 ? '登录已过期，请刷新页面' :
          res.status === 404 ? '接口不存在(404)' :
          res.status >= 500 ? '服务器错误(500)' :
          '响应异常，HTTP ' + res.status
        );
      }
      if (!res.ok && !data.success) {
        throw new Error(data.message || 'HTTP ' + res.status);
      }
      return data;
    } catch (err) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        throw new Error('网络连接失败');
      }
      throw err;
    }
  }

  /**
   * 文件上传（XMLHttpRequest 实现实时进度）
   * @param {string} type
   * @param {File} file
   * @param {string} studentId
   * @param {object} extraData
   * @param {function} onProgress - (percent: 0~100)
   */
  function upload(type, file, studentId, extraData, onProgress) {
    // 兼容旧调用方式（3参数无 extraData/onProgress）
    if (typeof extraData === 'function') { onProgress = extraData; extraData = {}; }
    if (!extraData) extraData = {};

    return new Promise((resolve, reject) => {
      const fd = new FormData();
      fd.append('file', file);
      for (const [k, v] of Object.entries(extraData)) fd.append(k, v);

      let url = BASE + 'upload.php?type=' + encodeURIComponent(type);
      if (studentId) url += '&id=' + encodeURIComponent(studentId);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', url, true);
      xhr.withCredentials = true;
      xhr.timeout = 180000;

      if (onProgress) {
        xhr.upload.addEventListener('progress', e => {
          if (e.lengthComputable) onProgress(Math.round(e.loaded / e.total * 100));
        });
      }

      xhr.addEventListener('load', () => {
        let data;
        try { data = JSON.parse(xhr.responseText); }
        catch (e) {
          console.error('[Upload] 非 JSON:', xhr.responseText.substring(0, 500));
          reject(new Error(
            xhr.status === 413 ? '文件太大，请在宝塔面板增大 upload_max_filesize 和 post_max_size 后重启 PHP' :
            xhr.status === 401 ? '登录过期，请刷新页面' :
            '上传失败：服务器返回异常(HTTP ' + xhr.status + ')，可能是 PHP 配置问题'
          ));
          return;
        }
        data.success ? resolve(data) : reject(new Error(data.message || '上传失败'));
      });

      xhr.addEventListener('error', () => reject(new Error('网络错误')));
      xhr.addEventListener('timeout', () => reject(new Error('上传超时')));
      xhr.addEventListener('abort', () => reject(new Error('已取消')));
      xhr.send(fd);
    });
  }

  return {
    checkAuth:   () => request('auth.php'),
    logout:      () => request('auth.php', { method: 'DELETE' }),
    getStudents: () => request('students.php'),
    getStudent:  id => request('students.php?id=' + encodeURIComponent(id)),
    createStudent: (name, info, slug) => request('students.php', { method: 'POST', body: JSON.stringify({ name, info: info || {}, slug: slug || '' }) }),
    updateStudent: (id, data) => request('students.php?id=' + encodeURIComponent(id), { method: 'PUT', body: JSON.stringify(data) }),
    deleteStudent: id => request('students.php?id=' + encodeURIComponent(id), { method: 'DELETE' }),
    upload,
    getStickers: () => request('stickers.php'),
    saveStudentStickers: (id, stickers) => request('stickers.php?id=' + encodeURIComponent(id), { method: 'PUT', body: JSON.stringify({ stickers }) }),
    deleteSticker: fn => request('stickers.php?file=' + encodeURIComponent(fn), { method: 'DELETE' }),
    getAlbum: () => request('album.php'),
    addAlbumPhoto: p => request('album.php', { method: 'POST', body: JSON.stringify(p) }),
    updateAlbum: photos => request('album.php', { method: 'PUT', body: JSON.stringify({ photos }) }),
    deleteAlbumPhoto: (fn, del) => request('album.php?file=' + encodeURIComponent(fn) + (del ? '&deleteFile=1' : ''), { method: 'DELETE' }),
    getSiteConfig: () => request('site_config.php'),
    updateSiteConfig: d => request('site_config.php', { method: 'PUT', body: JSON.stringify(d) }),
    getSiteSettings: () => request('site_settings.php'),
    updateSiteSettings: d => request('site_settings.php', { method: 'PUT', body: JSON.stringify(d) }),
    getCustomParticles: () => request('custom_particles.php'),
    addCustomParticle: i => request('custom_particles.php', { method: 'POST', body: JSON.stringify(i) }),
    updateCustomParticle: (id, d) => request('custom_particles.php?id=' + encodeURIComponent(id), { method: 'PUT', body: JSON.stringify(d) }),
    deleteCustomParticle: (id, del) => request('custom_particles.php?id=' + encodeURIComponent(id) + (del ? '&deleteFile=1' : ''), { method: 'DELETE' }),
    getPanoramas: () => request('panorama.php'),
    addPanorama: i => request('panorama.php', { method: 'POST', body: JSON.stringify(i) }),
    updatePanoramas: p => request('panorama.php', { method: 'PUT', body: JSON.stringify({ panoramas: p }) }),
    deletePanorama: (fn, del) => request('panorama.php?file=' + encodeURIComponent(fn) + (del ? '&deleteFile=1' : ''), { method: 'DELETE' }),
    getStudentPhotos: id => request('photos.php?id=' + encodeURIComponent(id)),
    addStudentPhoto: (id, p) => request('photos.php?id=' + encodeURIComponent(id), { method: 'POST', body: JSON.stringify(p) }),
    updateStudentPhotos: (id, p) => request('photos.php?id=' + encodeURIComponent(id), { method: 'PUT', body: JSON.stringify({ photos: p }) }),
    deleteStudentPhoto: (id, fn, del) => request('photos.php?id=' + encodeURIComponent(id) + '&file=' + encodeURIComponent(fn) + (del ? '&deleteFile=1' : ''), { method: 'DELETE' }),
    getDanmakuMessages: params => request('danmaku.php' + (params ? ('?' + new URLSearchParams(params).toString()) : '')),
    deleteDanmakuMessage: id => request('danmaku.php?id=' + encodeURIComponent(id), { method: 'DELETE' }),
    changePassword: (oldPassword, newPassword, confirmPassword) => request('change_password.php', { method: 'POST', body: JSON.stringify({ oldPassword, newPassword, confirmPassword }) }),
    request,
  };
})();
