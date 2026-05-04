# 🏯 北京中轴线 · 时空漫游

> **纵贯千年，一轴万象** — 互动式北京中轴线文化遗产探索平台

[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-在线访问-red?style=flat-square&logo=github)](https://你的用户名.github.io/beijing-central-axis/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

---

## 📖 项目简介

北京中轴线全长约 **7.8 公里**，南起永定门、北至钟鼓楼，纵贯北京老城南北，是全世界现存最长、保存最完整的古代城市轴线，被誉为"北京老城的灵魂和脊梁"。**2024 年 7 月 27 日**，北京中轴线正式列入联合国教科文组织《世界遗产名录》。

本项目以手绘地图为基底，通过 **15 个核心地标** 的互动探索，融合实景图片轮播、详实文字介绍、浮动导航等交互体验，打造沉浸式的中轴线文化遗产数字漫游平台。

[访问地址](https://70921992.github.io/beijing-central-axis/ "点击打开更精彩")

---

## ✨ 功能特性

### 地图交互

- 🖱️ **无极缩放** — 鼠标滚轮 / 双指捏合，支持 20%~600% 范围
- 🖐️ **拖拽平移** — 自由探索 7087×7424 像素高精度手绘地图
- 🔍 **智能定位** — 点击地标或导航列表，平滑飞行到目标位置
- 📍 **15 个地标标记** — 反向缩放保持视觉大小一致，悬停/活跃状态视觉反馈

### 图片画廊

- 🎞️ **自动轮播** — 4 秒间隔自动切换，淡入淡出过渡（0.45s）
- ⚡ **预加载机制** — 提前加载所有图片，3 秒安全超时避免卡顿
- 🖼️ **错误容错** — 图片加载失败显示 SVG 占位图，不影响功能
- 🔲 **灯箱模式** — 点击画廊进入全屏大图浏览

### 信息呈现

- 🏷️ **悬浮信息层** — 名称 + 始建年代 + "距今×年"动态计算
- 📝 **详实描述** — 每地标 300-500 字，涵盖【历史背景】【文化价值】【建筑特色】三大板块
- 📱 **响应式排版** — PC ≥14px / 移动端 ≥12px，行高 1.6-1.65

### 特色功能

- 🧭 **左侧浮动导航** — 可展开/收缩的纵向地标列表，上北下南有序排列
- 🔐 **管理员校准** — 密码保护（`000000`），可在线拖拽调整标记位置
- ©️ **版权信息** — 页面底部固定版权栏
- 📖 **游览指南** — 内置操作说明 + 中轴线申遗简介

---

## 🛠️ 技术栈

| 类别     | 技术                                      |
| -------- | ----------------------------------------- |
| 标记语言 | HTML5                                     |
| 样式     | CSS3（Flex + Grid + 自定义属性 + 毛玻璃） |
| 脚本     | Vanilla JavaScript（零框架依赖）          |
| 字体     | Noto Serif SC（Google Fonts，有系统回退） |
| 存储     | localStorage（校准数据持久化）            |
| 部署     | GitHub Pages（纯静态，零服务器依赖）      |

---

## 📁 项目结构

```
beijing-central-axis/
├── index.html                       # 主页面（SPA 单页应用）
├── css/
│   └── style.css                    # 全局样式（含响应式断点 640/1200px）
├── js/
│   ├── data.js                      # 15 个地标数据（坐标/年代/描述）
│   ├── gallery-data.js              # 图库图片清单（自动扫描生成）
│   └── app.js                       # 核心逻辑（地图/画廊/校准/导航）
├── assets/
│   └── images/
│       ├── 北京中轴线手绘地图.png    # 主地图（7087×7424px）
│       ├── 手绘图标-*.jpg            # 15 个地标手绘图标
│       └── gallery/
│           ├── yongdingmen/          # 各点位实景图库
│           ├── tiantan/
│           └── ...（共 15 个目录，70 张图片）
├── scripts/
│   ├── update_gallery.py             # 图库自动扫描脚本
│   └── download_images.py            # 图片下载脚本（已归档）
├── 测试报告.md                       # 功能 + 兼容性测试报告
├── GitHub部署方案.md                 # 部署可行性分析与方案
└── README.md                         # 本文件
```

---

## 🚀 快速启动

### 本地运行

双击 `index.html` 即可在浏览器中打开（file:// 协议兼容）。

### 更新图库

如果增删了 `gallery/` 目录下的图片，运行：

```bash
python scripts/update_gallery.py
```

脚本会自动扫描 15 个子目录，重新生成 `js/gallery-data.js` 和 `manifest.json`。

---

## 🌐 GitHub Pages 部署

```bash
# 安装 GitHub CLI（一次性）
winget install GitHub.cli

# 认证（按提示在浏览器中授权）
gh auth login

# 创建仓库
gh repo create beijing-central-axis --public --push --source . --remote origin

# 开启 Pages（从 main 分支部署）
gh api /repos/$(gh repo view --json nameWithOwner -q .nameWithOwner)/pages -X POST -F "source[branch]=main" -F "source[path]=/"

# 访问（完成后等待 1-2 分钟）
https://你的用户名.github.io/beijing-central-axis/
```

---

## 👤 作者

**郭俊麟** — 北京市八一学校 初一 11 班

本作品为中轴线文化遗产教育项目，旨在以数字技术手段传播中华优秀传统文化，让更多人了解北京中轴线的历史价值与文化魅力。

---

## © 版权

© 2026 北京市八一学校初一11班 郭俊麟 版权所有

实景图库图片来源于公开网络资源，仅供学习交流使用。

---

*愿千年中轴线，在数字世界永续传承。*
