# 北京中轴线 · 时空漫游 — GitHub Pages 部署可行性论证与实施方案

## 一、技术可行性分析

### 1.1 项目静态资源评估

| 指标 | 数值 | 评估 |
|------|------|------|
| 项目总大小 | 80.1 MB | GitHub 仓库软限制 1 GB，完全满足 |
| 最大单文件 | 18.1 MB（手绘地图） | GitHub Pages 无单文件大小限制，但建议优化 |
| HTML 文件数 | 1 | 无额外页面依赖 |
| CSS 文件数 | 1 | 单文件无外部样式依赖 |
| JS 文件数 | 3（data.js / gallery-data.js / app.js） | 纯浏览器端 JS，无 Node.js 依赖 |
| 图片文件数 | 约 95 张 | 全部为本地静态资源 |
| 外部依赖 | Google Fonts（CDN） | 非关键依赖，加载失败有系统字体回退 |

### 1.2 GitHub Pages 兼容性

| 检查项 | 结果 | 说明 |
|--------|------|------|
| 纯静态网站 | ✅ 是 | 零服务器端代码，零数据库，零 API 调用 |
| 无服务端渲染 | ✅ 是 | 所有渲染在浏览器端完成 |
| 无动态路由 | ✅ 是 | 单页应用，URL 无 hash/query 依赖 |
| 无环境变量 | ✅ 是 | 无 `process.env` 或类似依赖 |
| HTTPS 支持 | ✅ 是 | GitHub Pages 默认提供 `*.github.io` SSL |
| 自定义域名 | ✅ 可选 | 支持绑定自定义域名（如 `zhongzhouxian.cn`） |
| 文件大小限制 | ✅ 通过 | 单文件上限 100 MB，仓库上限 1 GB |

### 1.3 潜在风险点

| 风险 | 等级 | 缓解措施 |
|------|------|----------|
| 初加载时间长（80 MB 整体） | 🟡 中 | 图片懒加载已实现；浏览器缓存策略；后续可启用 Gzip |
| 手绘地图 18 MB 加载慢 | 🟡 中 | 可拆分为瓦片图（Tile Map）渐进加载；或压缩为 WebP |
| Google Fonts 被墙（国内访问） | 🟡 中 | 已设系统字体回退；可自托管字体文件 |
| gallery-data.js 体积 | 🟢 低 | 约 5 KB，可忽略 |

---

## 二、部署实施步骤

### 2.1 仓库创建与初始化

```bash
# 步骤 1：在 GitHub 创建新仓库
# 仓库名建议：beijing-central-axis  或  zhongzhouxian
# 可见性：Public（GitHub Pages 免费版要求公开仓库）

# 步骤 2：本地初始化 Git
cd "d:\myapps\Central Axis of Beijing"
git init
git checkout -b main

# 步骤 3：创建 .gitignore
echo "scripts/" > .gitignore
echo "*.py" >> .gitignore

# 步骤 4：添加远程仓库
git remote add origin https://github.com/你的用户名/beijing-central-axis.git

# 步骤 5：首次提交
git add .
git commit -m "初始提交：北京中轴线时空漫游 v1.0"
git push -u origin main
```

### 2.2 启用 GitHub Pages

1. 进入仓库 → **Settings** → **Pages**
2. **Source**: Deploy from a branch
3. **Branch**: `main` → `/(root)` → Save
4. 等待 1-2 分钟，项目将部署在：
   `https://你的用户名.github.io/beijing-central-axis/`

### 2.3 分支管理策略

```
main          ★ 生产分支（GitHub Pages 部署来源）
  │
  ├── develop   开发分支（日常开发合并目标）
  │     │
  │     ├── feature/xxx    功能分支
  │     └── fix/xxx        修复分支
  │
  └── gh-pages  备用部署分支（如不使用 main 部署）
```

**推荐工作流**：
- `main` 分支：稳定版本，直接部署
- `develop` 分支：开发中的代码
- `feature/*` 分支：新功能开发完成后合并到 `develop`
- `fix/*` 分支：Bug 修复后合并到 `develop` 和 `main`

### 2.4 CI/CD 自动化部署（GitHub Actions）

创建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: '.'

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

**说明**：由于项目是纯静态文件，CI 流程只是复制源文件，无需构建步骤。如后续需要压缩图片、打包优化，可在上述流程中添加 `- name: Optimize` 步骤。

---

## 三、访问性能评估

### 3.1 CDN 分发效果

| 指标 | 预期 |
|------|------|
| CDN 提供商 | Fastly（GitHub Pages 全球 CDN） |
| 边缘节点数 | 全球 80+ 节点 |
| 国内访问延迟 | 约 200-500ms（受 GFW 影响，CDN 节点在海外） |
| 海外访问延迟 | 约 50-150ms |
| 缓存策略 | 静态资源自动缓存，TTL 约 10 分钟 |

> **国内访问注意**：GitHub Pages 的 CDN 节点均在海外，国内（特别是大陆）直接访问可能较慢。如果目标用户主要在国内，建议：
> - 方案 A：绑定自定义域名 + 国内 CDN（如又拍云、阿里云 CDN）回源到 GitHub Pages
> - 方案 B：同时部署到 Gitee Pages（国内访问快）作为镜像

### 3.2 页面加载速度优化建议

| 优化项 | 当前状态 | 建议 |
|--------|----------|------|
| 图片懒加载 | ✅ 底部缩略图已懒加载 | 考虑对手绘地图使用 `loading="lazy"`（但在首屏不应懒加载） |
| 图片压缩 | ⚠️ shejitan 图库 29 MB | 压缩至 200-500 KB/张，节省约 25 MB |
| WebP 格式 | ❌ 未使用 | 将 JPG/PNG 转为 WebP，可减小 30-50% |
| 地图瓦片化 | ❌ 未使用 | 18 MB 地图可分块加载，初始仅加载可视区域 |
| Gzip 压缩 | 由 CDN 自动处理 | GitHub Pages 支持 gzip，无需额外配置 |
| 缓存头 | 由 CDN 自动处理 | 静态资源有强缓存 |
| 关键 CSS 内联 | ❌ 未使用 | 非必需（style.css 仅 8 KB） |
| JS 代码压缩 | ❌ 未使用 | 非必需（JS 总量约 25 KB） |
| HTTP/2 | ✅ CDN 支持 | 多路复用，无需合并文件 |

### 3.3 移动端访问保障

| 措施 | 状态 |
|------|------|
| Viewport meta 标签 | ✅ `width=device-width, initial-scale=1.0, user-scalable=no` |
| 响应式布局 | ✅ @media 断点：640px / 1200px |
| 触屏手势 | ✅ 双指缩放、拖拽平移、触摸点击 |
| 图片适屏 | ✅ `max-width: 100%; object-fit: cover` |
| 底部导航条滚动 | ✅ 横向滚动 + 隐藏滚动条 |
| 点击目标大小 | ⚠️ 部分按钮 30px（建议 ≥ 44px 符合 WCAG） |

> **移动端改进建议**：图标按钮从 30px 增大到 40-44px（仅 @media (max-width: 640px) 下调整）。

---

## 四、维护与更新机制

### 4.1 版本控制策略

采用 **语义化版本**（Semantic Versioning）：

```
v1.0.0  →  初始发布版本
v1.1.0  →  新增功能（如添加新地标、语言切换）
v1.0.1  →  问题修复（如坐标修正、错字修正）
v2.0.0  →  重大改动（如框架重写、架构变更）
```

**Git Tag 规范**：
```bash
git tag -a v1.0.0 -m "首次发布"
git push origin v1.0.0
```

### 4.2 内容更新流程

```
发现内容问题
    │
    ├── 文字/数据修改 → 直接修改 data.js → commit → push → 自动部署
    │
    ├── 图片修改/添加 → 放入对应目录 → 更新 gallery-data.js → commit → push
    │
    └── 功能改进 → 创建 feature 分支 → 开发测试 → PR → merge → 部署
```

**日常更新（无需重新部署）**：
- 修改地标坐标 → 用户使用校准模式在线调整 → localStorage 保存
- 用户可自行校准所有标记位置，无需改代码

### 4.3 问题反馈与修复机制

| 渠道 | 说明 |
|------|------|
| GitHub Issues | 仓库 Issues 板块，用户可提交 bug 报告和功能建议 |
| GitHub Discussions | 用于交流讨论、展示使用截图 |
| Pull Requests | 接受社区贡献（如翻译、内容修正） |

**Issue 模板建议**（`.github/ISSUE_TEMPLATE/bug_report.md`）：
```markdown
---
name: 问题报告
about: 报告项目中的 bug 或内容错误
---

## 问题描述
（简要描述你遇到的问题）

## 复现步骤
1. 打开网站
2. 点击...
3. 观察到...

## 期望行为
（描述你期望的正确行为）

## 设备信息
- 浏览器：Chrome 126
- 设备：iPhone 15
- 屏幕宽度：390px
```

---

## 五、自定义域名（可选）

如需使用自定义域名（如 `www.zhongzhouxian.top`）：

### 5.1 GitHub 侧配置
1. 在仓库根目录创建 `CNAME` 文件，内容为域名
2. Settings → Pages → Custom domain → 填入域名 → Save
3. GitHub 自动申请 Let's Encrypt SSL 证书

### 5.2 DNS 配置
在域名 DNS 管理中添加：

| 类型 | 名称 | 值 |
|------|------|------|
| CNAME | `www` | `你的用户名.github.io` |
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |

### 5.3 成本估算

| 项目 | 费用 |
|------|------|
| GitHub 仓库 | 免费 |
| GitHub Pages 托管 | 免费 |
| GitHub Actions | 免费（公开仓库 2000 分钟/月） |
| `.github.io` 域名 | 免费 |
| 自定义域名（如 .top） | 约 10-50 元/年 |
| 国内 CDN（可选） | 按流量计费，约 0.2 元/GB |

> **总成本**：使用 `github.io` 免费域名时 **0 元**。使用自定义域名 + 国内 CDN 时约 **50-200 元/年**。

---

## 六、部署检查清单

| 序号 | 检查项 | 状态 |
|------|--------|------|
| 1 | 仓库创建（Public） | ☐ |
| 2 | `.gitignore` 排除 scripts/ | ☐ |
| 3 | 代码提交到 main 分支 | ☐ |
| 4 | GitHub Pages 启用（Settings → Pages） | ☐ |
| 5 | 访问 `https://用户名.github.io/仓库名/` 验证 | ☐ |
| 6 | 所有图片正常加载 | ☐ |
| 7 | 地图缩放/拖拽正常 | ☐ |
| 8 | 15 个标记点正常显示 | ☐ |
| 9 | 点击标记弹出详情卡片 | ☐ |
| 10 | 图片轮播自动播放 | ☐ |
| 11 | 移动端访问正常 | ☐ |
| 12 | 版权信息显示正确 | ☐ |
| 13 | (可选) 配置自定义域名 | ☐ |
| 14 | (可选) 配置 GitHub Actions 自动部署 | ☐ |

---

## 七、总结

### 结论：✅ 完全适合 GitHub Pages 部署

项目为纯静态网站，无任何服务器端依赖：

- **代码层面**：HTML + CSS + JS，浏览器原生渲染
- **资源层面**：95 张本地图片，无 API 调用
- **部署层面**：零配置即可部署，支持自定义域名 + HTTPS
- **成本层面**：使用免费域名和托管，**完全免费**
- **维护层面**：Git 版本控制，内容更新即部署

### 建议的部署路线图

```
第一阶段（立即）    → 创建 GitHub 仓库 + 启用 Pages
第二阶段（当天）    → 验证所有功能 + 修复发现的问题
第三阶段（本周）    → 图片压缩优化 + 加载性能提升
第四阶段（可选）    → 自定义域名 + 国内 CDN 加速
第五阶段（持续）    → 收集反馈 + 内容迭代更新
```

---

*部署方案编制日期：2026-05-04*
