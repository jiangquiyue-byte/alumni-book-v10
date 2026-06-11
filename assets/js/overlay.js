/**
 * 同学录 v10.5 · 粒子预设注册表
 *
 * 说明：
 * 1. 所有内置粒子预设统一在此注册，前台模板与后台生成器共用同一套命名。
 * 2. 自定义粒子依旧通过 custom_particles.json 动态注入，不破坏旧数据兼容性。
 */

const BuiltinParticleRegistry = (() => {
  const catalog = [
    {
      value: 'sakura',
      label: '🌸 樱花',
      preset: {
        type: 'petal',
        count: 32,
        spawnDelay: 90,
        driftRange: [-90, 90],
        duration: [8, 18],
        size: [8, 16],
      },
    },
    {
      value: 'stars',
      label: '⭐ 星星',
      preset: {
        type: 'star',
        count: 28,
        spawnDelay: 120,
        driftRange: [-70, 70],
        duration: [7, 14],
        size: [5, 10],
      },
    },
    {
      value: 'snow',
      label: '❄️ 雪花',
      preset: {
        type: 'snow',
        count: 42,
        spawnDelay: 70,
        driftRange: [-60, 60],
        duration: [8, 16],
        size: [4, 9],
        opacityPeak: [0.72, 0.95],
      },
    },
    {
      value: 'confetti',
      label: '🎊 彩纸',
      preset: {
        type: 'confetti',
        count: 46,
        colors: ['#f9a8d4', '#fcd34d', '#6ee7b7', '#93c5fd', '#c4b5fd', '#fca5a5'],
        spawnDelay: 55,
        driftRange: [-110, 110],
        duration: [6, 12],
        size: [6, 12],
      },
    },
    {
      value: 'fireflies',
      label: '🌟 萤火虫',
      preset: {
        type: 'firefly',
        count: 32,
        spawnDelay: 120,
        driftRange: [-40, 40],
        duration: [10, 20],
        size: [4, 10],
        opacityPeak: [0.6, 0.95],
      },
    },
    {
      value: 'bamboo',
      label: '🎋 竹叶',
      preset: {
        type: 'bamboo',
        count: 30,
        spawnDelay: 110,
        driftRange: [-75, 75],
        duration: [8, 18],
        size: [20, 38],
      },
    },
    {
      value: 'maple',
      label: '🍁 枫叶',
      preset: {
        type: 'maple',
        count: 24,
        spawnDelay: 160,
        driftRange: [-130, 130],
        duration: [10, 20],
        size: [18, 34],
      },
    },
    {
      value: 'ginkgo',
      label: '🍂 银杏',
      preset: {
        type: 'ginkgo',
        count: 26,
        spawnDelay: 150,
        driftRange: [-110, 110],
        duration: [9, 18],
        size: [18, 32],
      },
    },
    {
      value: 'feather',
      label: '🪶 羽毛',
      preset: {
        type: 'feather',
        count: 18,
        spawnDelay: 220,
        driftRange: [-140, 140],
        duration: [12, 24],
        size: [24, 44],
        opacityPeak: [0.55, 0.86],
      },
    },
    {
      value: 'hearts',
      label: '❤️ 心形',
      preset: {
        type: 'heart',
        count: 26,
        spawnDelay: 130,
        driftRange: [-95, 95],
        duration: [8, 16],
        size: [12, 24],
      },
    },
    {
      value: 'bubbles',
      label: '🫧 光泡',
      preset: {
        type: 'bubble',
        count: 22,
        spawnDelay: 180,
        driftRange: [-65, 65],
        duration: [9, 18],
        size: [12, 28],
        opacityPeak: [0.2, 0.5],
      },
    },
    {
      value: 'paper',
      label: '📜 书页',
      preset: {
        type: 'paper',
        count: 18,
        spawnDelay: 190,
        driftRange: [-100, 100],
        duration: [10, 22],
        size: [18, 30],
        opacityPeak: [0.68, 0.92],
      },
    },
    {
      value: 'lite',
      label: '✦ 轻量',
      preset: {
        type: 'petal',
        count: 10,
        spawnDelay: 300,
        driftRange: [-60, 60],
        duration: [8, 16],
        size: [8, 14],
      },
    },
    {
      value: 'none',
      label: '○ 关闭',
      preset: false,
    },
  ];

  function clonePreset(value) {
    const item = catalog.find(entry => entry.value === value);
    if (!item) return null;
    if (item.preset === false) return false;
    return JSON.parse(JSON.stringify(item.preset));
  }

  function presetMap() {
    const map = {};
    catalog.forEach(item => {
      map[item.value] = clonePreset(item.value);
    });
    return map;
  }

  function list(includeNone = true) {
    return catalog
      .filter(item => includeNone || item.value !== 'none')
      .map(item => ({ value: item.value, label: item.label }));
  }

  return { catalog, clonePreset, list, presetMap };
})();

const OverlayPresets = BuiltinParticleRegistry.presetMap();

OverlayPresets.loadCustom = function(basePath) {
  basePath = basePath || '';
  return fetch(basePath + 'data/custom_particles.json')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      (data.particles || []).forEach(function(p) {
        OverlayPresets[p.id] = {
          type: 'custom',
          imageSrc: basePath + 'assets/images/overlays/' + p.file,
          count: p.count || 20,
          imageSize: p.size || [12, 32],
          spawnDelay: 180,
          driftRange: [-90, 90],
          duration: [8, 18],
        };
      });
    })
    .catch(function() {});
};

window.BuiltinParticleRegistry = BuiltinParticleRegistry;
window.OverlayPresets = OverlayPresets;

