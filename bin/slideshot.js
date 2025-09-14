#!/usr/bin/env node
/* eslint-disable no-console */
// CLI 入口：解析命令行参数并调用 runSlideshot

const { runSlideshot } = require('../shot.js');

function parseArgs(argv) {
  const args = argv.slice(2);
  const cfg = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    const next = args[i + 1];
    const eatNext = () => { i++; return next; };

    switch (a) {
      case '--base':
      case '-b':
        cfg.base = eatNext();
        break;
      case '--scale':
      case '-s':
        cfg.scale = parseFloat(eatNext());
        break;
      case '--referer':
      case '--ref':
        cfg.referer = eatNext();
        break;
      case '--out-ext':
      case '--ext':
        cfg.outExt = eatNext();
        break;
      case '--quality':
      case '-q':
        cfg.quality = parseInt(eatNext(), 10);
        break;
      case '--pattern':
      case '-p':
        cfg.pattern = eatNext();
        break;
      case '--selector':
      case '-c':
        cfg.selector = eatNext();
        break;
      case '--dry-run':
        cfg.dryRun = true;
        break;
      case '--help':
      case '-h':
        cfg.help = true;
        break;
      default:
        // 直接给定文件名
        if (!cfg.files) cfg.files = [];
        cfg.files.push(a);
    }
  }
  return cfg;
}

function printHelp() {
  console.log(`SlideShot - HTML 幻灯片一键截图

用法：
  slideshot [选项] [文件...]

无参数时将自动扫描当前目录下的 *.html

选项：
  -b, --base <url>        访问基址（默认 http://localhost:8000/，可用 file://）
  -s, --scale <n>         像素密度（默认 1，推荐 2）
      --referer <url>     设置 Referer 头（处理防盗链）
      --out-ext <ext>     输出格式 png|jpg|jpeg（默认 png）
  -q, --quality <0-100>   JPEG 画质（默认 90，仅 jpg/jpeg 有效）
  -p, --pattern <glob>    匹配模式（默认 *.html，可用逗号分隔多个）
  -c, --selector <css>    裁切元素选择器（默认 .slide，找不到回退 body）
      --dry-run           仅打印将要处理的文件与配置，不实际截图
  -h, --help              显示帮助

示例：
  slideshot -s 2                    # 扫描 *.html 并以 2x 导出 PNG
  slideshot -s 2 --out-ext jpg -q 85
  slideshot -b file:// 1.html 2.html
  slideshot --referer https://example.com/
`);
}

(async () => {
  const cfg = parseArgs(process.argv);
  if (cfg.help) {
    printHelp();
    process.exit(0);
  }
  try {
    await runSlideshot(cfg);
  } catch (err) {
    console.error('❌ 运行失败：', err);
    process.exit(1);
  }
})();
