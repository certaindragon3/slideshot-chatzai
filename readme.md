# SlideShot · HTML 幻灯片一键截图为 PNG/PDF

[![Node](https://img.shields.io/badge/node-%3E=18.0-brightgreen)](https://nodejs.org)
[![Puppeteer](https://img.shields.io/badge/puppeteer-24.x-40B5A4)](https://pptr.dev/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](./LICENSE)

将 HTML 幻灯片精准裁切为无白边的高分辨率图片（PNG/JPEG），并可合并为 PDF。默认自动等待图片与 Web 字体加载、支持 2x 清晰度、可设置 Referer 与 cookies，适配 AI 生成的网页幻灯片（如智谱 AI GLM 系列）。

> 适用场景：用 AI 生成的每页 HTML 幻灯片文件（如 1.html ~ N.html），需要批量导出为图片/PDF 进行分享、打印或归档。

---

## 预览

下图示例为本仓库内的导出结果之一：

![sample](./1.png)

---

## 特性

- 按选择器裁切：优先裁切 `.slide` 元素区域，找不到时回退到 `body`，避免白边与变形。
- 高清导出：通过 `SCALE` 控制像素密度，推荐 2x。
- 资源就绪：自动触发懒加载并等待图片和字体加载完成，避免糊图/丢字形。
- 反盗链支持：可设置 `REFERER` 头部；支持注入 `cookies.json`。
- 灵活输出：支持 PNG/JPEG，JPEG 可调画质。
- 多场景兼容：支持本地 `http://` 服务与离线 `file://`（后者不推荐，仅临时使用）。

---

## 前置要求

- Node.js 18 或更高版本（Puppeteer 24.x 适配）。
- Python 3（可选，用于 `img2pdf` 合并图片为 PDF）。

---

## 快速开始

1) 安装依赖（首次）：

```bash
npm install
```

2) 在包含 `1.html ~ N.html` 的目录启动本地静态服务（推荐 8000 端口）：

```bash
python3 -m http.server 8000
```

3) 执行截图（推荐 2 倍清晰度）：

```bash
SCALE=2 node shot.js
```

导出文件默认为同名 PNG：`1.png … N.png`。

或使用 CLI（会自动扫描当前目录的 `*.html`）：

```bash
npx slideshot -s 2
```

---

## 配置项（环境变量）

- BASE：默认 `http://localhost:8000/`。用于拼接 HTML 的访问地址；若需离线，可设为 `file://`。
- SCALE：默认 `1`。像素密度，推荐设为 `2` 获得更清晰的图像。
- REFERER：默认空。部分图床或 CDN 有防盗链时设置，如 `REFERER="https://example.com/"`。
- OUT_EXT：默认 `png`。可设为 `jpg`/`jpeg`。
- QUALITY：默认 `90`。仅对 `jpg/jpeg` 生效。

默认自动扫描 `*.html` 作为输入。你也可以通过 `--pattern` 指定匹配（如 `*.htm` 或 `1.html,2.html,4.html`）。

---

## 高级用法

- 注入 cookies：在项目根目录放置 `cookies.json`（数组形式，每项为标准 Puppeteer cookie 对象），脚本会在每页打开前自动注入。
- 设置 Referer：

```bash
REFERER="https://your-site.example" node shot.js
```

- JPEG 输出并控制画质：

```bash
OUT_EXT=jpg QUALITY=85 SCALE=2 node shot.js
```

- 离线 `file://` 模式（临时）：

```bash
BASE="file://" node shot.js
```

或 CLI：

```bash
slideshot -b file:// 1.html 2.html
```

> 注：`file://` 模式会放宽浏览器安全策略，仅在可信本地环境下临时使用，不建议作为常态方案。

---

## 合并为 PDF（可选）

使用 Python 工具 `img2pdf` 将导出的 PNG/JPEG 合并为单个 PDF：

```bash
pip3 install img2pdf
python3 -m img2pdf 1.png 2.png 3.png 4.png -o slides_combined.pdf
```

或使用通配符（注意顺序）：

```bash
python3 -m img2pdf $(printf "%s\n" ./*.png | sort) -o slides_combined.pdf
```

---

## 常见问题（FAQ）

- 图片没加载/截图空白？请确保使用本地 HTTP 服务打开页面；若图床有防盗链，设置 `REFERER`；必要时检查网络与资源 URL。
- 截图出现白边？请在 HTML 中为幻灯片容器使用 `.slide` 类；找不到该元素时会回退到 `body`，可能包含不需要的留白。
- 中文或特殊字体变成默认字形？目标系统需安装相应字体；Linux 可尝试安装 Noto Sans CJK 系列。
- 需要登录后才能访问资源？在根目录放 `cookies.json` 并重试。
- 一页很长/存在懒加载？脚本已模拟滚动并等待图片/字体加载，仍异常时可适当增大 `waitUntil` 或在 HTML 侧禁用懒加载。

---

## 路线图

- 自动发现 `*.html` 并按自然顺序批量处理。
- CLI 方式传参与更友好的日志/进度条。
- 一次性导出 PDF（Node 端合并）。
- 补充示例模板与更多用法示例。

---

## 贡献

欢迎 Issue 与 PR：

- 提交问题时尽量包含系统、Node 版本、示例 HTML 与控制台日志。
- 代码风格保持一致；若涉及行为变更，请补充 README 片段或使用示例。

---

## 许可证

本项目采用 ISC 许可证发布，详见仓库中的 LICENSE 文件。

---

## 致谢

- 智谱 AI（GLM 系列）用于生成 HTML 幻灯片内容。
- Picui 公益图床用于托管示例图片。

如果这个工具对你有帮助，欢迎 Star 支持！

