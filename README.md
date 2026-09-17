# 张君睿的个人作品集

剪辑作品集网站 —— 信息流、混剪、vlog、口播。

- 在线地址：发布后见仓库 Settings → Pages
- 纯静态站点，零构建、零依赖，双击 `index.html` 也能看

## 页面

| 文件 | 说明 |
|---|---|
| `index.html` | 首页：开场、精选 4 支、能力矩阵、联系 |
| `works.html` | 作品页：全部分类筛选与完整作品列表 |
| `work.html` | 作品详情：`?id=` 动态读取，含创作说明与下一支 |
| `resume.html` | 简历 |
| `contact.html` | 联系我 |
| `admin.html` | 后台管理（需本地服务，见下） |

## 本地运行

**只看网站**（最简单）：直接双击 `index.html`。

**用后台管理内容**：

```bash
node server.js
```

然后打开：

- 前台 <http://localhost:8787/index.html>
- 后台 <http://localhost:8787/admin.html>

后台可以增删改作品、上传封面与视频、改站点信息、增删分类。
数据写入 `data.json`，上传的文件进 `uploads/`。

## 数据源

页面按三级回退取数据，所以在任何环境都能正常显示：

1. 本地服务在线 → `/api/works`（后台实时数据）
2. 静态托管 → `data.json`
3. 都不行 → `assets/js/data.js` 内置数据

因此在 GitHub Pages 这类静态托管上，作品能正常展示，不需要服务器。

## 目录结构

```
portfolio/
├── index.html  works.html  work.html  resume.html  contact.html
├── admin.html                 # 后台（SPA）
├── data.json                  # 作品数据（后台读写）
├── server.js                  # 零依赖 Node 服务
├── assets/
│   ├── css/main.css           # 站点设计系统
│   ├── css/admin.css          # 后台样式
│   ├── js/data.js             # 内置兜底数据
│   ├── js/main.js             # 前台逻辑
│   └── js/admin.js            # 后台逻辑
└── uploads/                   # 后台上传的封面与视频
```

## 设计

暗色系：近黑底 `#0A0A0B` + 暖白字 `#EDEAE4`，钢蓝 `#7C8FB8` 只用于极少量点缀。
中文标题思源宋体，正文思源黑体，英文小标签用等宽字体。
分隔靠 1px 细线与留白，不用卡片阴影堆叠。

## 更新作品

1. `node server.js`，进后台改内容并保存
2. 提交 `data.json`（以及新上传的封面图）并推送
3. 一分钟内线上生效

视频文件默认不入库（`.gitignore` 已排除），建议上传 B 站等平台后在后台填外链。

---

© 2026 张君睿
