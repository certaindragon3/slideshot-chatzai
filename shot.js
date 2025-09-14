// shot.js — Puppeteer 按 .slide 元素矩形裁切截图（无白边、不变形）
//
// 用法（方式一，兼容老用法）：
//   python3 -m http.server 8000
//   SCALE=2 node shot.js
//
// 用法（方式二，推荐 CLI）：
//   node bin/slideshot.js --scale 2 --pattern "*.html"
//
// 环境变量（方式一）：
//   BASE, SCALE, REFERER, OUT_EXT, QUALITY
//
// 备注：如需登录态，在同目录放 cookies.json（数组），脚本会自动注入。

const fs = require('fs');
const path = require('path');

// 延迟加载 puppeteer（便于 dry-run/测试在未安装 puppeteer 的环境执行）
let _puppeteer = null;
function getPuppeteer() {
  if (!_puppeteer) {
    // eslint-disable-next-line global-require
    _puppeteer = require('puppeteer');
  }
  return _puppeteer;
}

// 默认配置（可被参数/环境变量覆盖）
const DEFAULTS = {
  base: process.env.BASE || 'http://localhost:8000/',
  scale: parseFloat(process.env.SCALE || '1'), // 1 或 2（推荐 2 更清晰）
  referer: process.env.REFERER || '',
  outExt: (process.env.OUT_EXT || 'png').toLowerCase(), // png | jpg | jpeg
  quality: parseInt(process.env.QUALITY || '90', 10),
  pattern: '*.html',
  selector: '.slide',
  dryRun: false,
};

function useFileScheme(base) {
  return (base || '').startsWith('file://');
}

// 视口仅用于渲染密度；不贴合元素，避免影响布局
function getViewport(scale) {
  return { width: 1920, height: 1080, deviceScaleFactor: scale };
}

async function loadCookiesIfAny(page) {
  const cookiesPath = path.resolve(__dirname, 'cookies.json');
  if (!fs.existsSync(cookiesPath)) return;
  try {
    const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf8'));
    if (Array.isArray(cookies) && cookies.length) {
      await page.setCookie(...cookies);
      console.log(`✔ 已注入 ${cookies.length} 条 cookies`);
    }
  } catch (e) {
    console.warn('⚠ 读取 cookies.json 失败（忽略）：', e.message);
  }
}

async function waitForImagesFontsAndLazy(page) {
  // 触发懒加载：滚到最底再回到顶部
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let y = 0;
      const step = Math.max(200, Math.floor(window.innerHeight * 0.6));
      const id = setInterval(() => {
        y += step;
        window.scrollTo(0, y);
        if (y >= document.body.scrollHeight) {
          clearInterval(id);
          resolve();
        }
      }, 40);
    });
    window.scrollTo(0, 0);
  });

  // 等待所有 <img> 与 web 字体
  await page.evaluate(async () => {
    const imgPromises = Array.from(document.images).map(img => {
      if (img.complete) return null;
      return new Promise(res => {
        img.addEventListener('load', res, { once: true });
        img.addEventListener('error', res, { once: true });
      });
    }).filter(Boolean);

    const fontPromise = (document.fonts && document.fonts.ready)
      ? document.fonts.ready.catch(() => {})
      : Promise.resolve();

    await Promise.all([...imgPromises, fontPromise]);
  });
}

function resolveTargetUrl(base, htmlFile) {
  if (useFileScheme(base)) {
    // file:// 情况：拼绝对路径
    return base + path.resolve(htmlFile);
  }
  // http(s):// 情况：确保 BASE 末尾有 /
  return base.replace(/\/?$/, '/') + htmlFile;
}

async function screenshotSlideOnly(page, htmlFile, selector, scale, outExt, quality) {
  // 1) 找到目标元素，找不到退回 body
  const handle = (selector ? await page.$(selector) : null) || await page.$('body');

  // 2) 确保元素在视口内，避免测量异常
  await handle.evaluate(el => el.scrollIntoView({ block: 'center', inline: 'center' }));

  // 3) 测量元素矩形（CSS 像素）
  const box = await handle.boundingBox();
  if (!box) throw new Error('没有检测到可见的目标元素（或 body）区域');

  // 4) 用 clip 按元素矩形裁切；不调整 viewport，避免触发布局变化
  const clip = {
    x: Math.max(0, Math.floor(box.x)),
    y: Math.max(0, Math.floor(box.y)),
    width: Math.ceil(box.width),
    height: Math.ceil(box.height),
  };

  const resolvedExt = outExt === 'jpeg' ? 'jpg' : outExt;
  const outPath = path.resolve(`${path.basename(htmlFile, '.html')}.${resolvedExt}`);
  const options = { path: outPath, clip };

  if (outExt === 'jpg' || outExt === 'jpeg') {
    options.type = 'jpeg';
    options.quality = quality; // 仅对 jpeg 有效
  } else {
    options.type = 'png';
  }

  await page.screenshot(options);
  console.log(`✔ 保存：${outPath}  （裁切 ${clip.width}×${clip.height} @x${scale}）`);
}

function discoverHtmlFiles(pattern = '*.html') {
  const all = fs.readdirSync(process.cwd(), { withFileTypes: true })
    .filter(d => d.isFile())
    .map(d => d.name);

  let list = [];
  if (pattern.includes(',')) {
    list = pattern.split(',').map(s => s.trim()).filter(Boolean);
  } else if (pattern.includes('*')) {
    // 仅支持简单后缀模式，如 *.html / *.htm
    const m = pattern.match(/^\*\.(\w+)$/);
    const ext = m ? `.${m[1].toLowerCase()}` : '.html';
    list = all.filter(n => n.toLowerCase().endsWith(ext));
  } else {
    list = [pattern];
  }

  // 自然排序（1,2,10）
  list.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  return list;
}

async function runSlideshot(options = {}) {
  const cfg = { ...DEFAULTS, ...options };
  const {
    base, scale, referer, outExt, quality, selector, pattern, dryRun,
  } = cfg;

  const files = Array.isArray(cfg.files) && cfg.files.length
    ? cfg.files
    : discoverHtmlFiles(pattern);

  if (!files.length) {
    console.warn('未发现待处理的 HTML 文件。请确认 --pattern 或在当前目录放置 *.html');
    return { files: [], dryRun };
  }

  if (dryRun) {
    console.log('【Dry Run】将处理以下文件：');
    files.forEach(f => console.log(` - ${f}`));
    console.log(`配置：base=${base} scale=${scale} outExt=${outExt} quality=${quality} selector=${selector}`);
    return { files, dryRun };
  }

  const launchArgs = [];
  if (useFileScheme(base)) {
    // file:// 时放宽限制（仅本机安全环境）
    launchArgs.push('--disable-web-security', '--allow-file-access-from-files');
  }

  const puppeteer = getPuppeteer();
  const browser = await puppeteer.launch({
    headless: true,
    args: launchArgs,
    // 如需复用登录态可启用：
    // userDataDir: path.resolve(__dirname, 'profile'),
  });

  try {
    for (const f of files) {
      const page = await browser.newPage();
      await page.setViewport(getViewport(scale));

      if (referer) {
        await page.setExtraHTTPHeaders({ referer });
      }
      await loadCookiesIfAny(page);

      const url = resolveTargetUrl(base, f);
      console.log(`→ 打开：${url}`);
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 120000 });

      await waitForImagesFontsAndLazy(page);

      await screenshotSlideOnly(page, f, selector, scale, outExt, quality);

      await page.close();
    }
  } finally {
    await browser.close();
  }

  console.log('✅ 全部完成');
  return { files, dryRun };
}

module.exports = { runSlideshot, discoverHtmlFiles };

// 直接运行（兼容旧环境变量方式）
if (require.main === module) {
  runSlideshot().catch(err => {
    console.error('❌ 出错：', err);
    process.exit(1);
  });
}