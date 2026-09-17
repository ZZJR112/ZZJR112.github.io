# 发布到 GitHub Pages

> ✅ **已完成** —— 站点已上线：<https://zzjr112.github.io/>
> 仓库：`ZZJR112/ZZJR112.github.io`（Public，Pages 源 master 分支根目录）
> 下面保留完整步骤，方便你以后重建或换仓库时照着做。

## 你的在线地址

| 仓库名 | 访问地址 |
|---|---|
| `ZZJR112.github.io`（当前使用的） | `https://zzjr112.github.io/` ✅ |
| `portfolio` 等其它名字 | `https://zzjr112.github.io/portfolio/` |

> 仓库名必须叫 `用户名.github.io` 才能用根域名；一个账号只能有一个这样的仓库。
> 建议就用它，链接短、好看、适合放个人作品集。

---

## 方式一：GitHub Desktop（推荐，不用敲命令）

1. 下载安装 <https://desktop.github.com/>，用 GitHub 账号登录
2. `File → Add Local Repository`，选择 `D:\WB\WZ\portfolio`
3. 点左上角 `Publish repository`
   - Name 填 `ZZJR112.github.io`
   - 勾选 **Keep this code private** 先**不要**勾（Pages 免费版需要 Public）
   - 点 Publish
4. 浏览器打开 <https://github.com/ZZJR112/ZZJR112.github.io> → `Settings` → 左侧 `Pages`
5. `Build and deployment` → `Source` 选 **Deploy from a branch**
6. `Branch` 选 `main`，目录选 `/ (root)`，点 Save
7. 等 1–2 分钟，刷新页面，顶部会出现 `Your site is live at https://zzjr112.github.io/`

---

## 方式二：网页拖拽（零安装，最快看到效果）

1. 打开 <https://github.com/new>
2. Repository name 填 `ZZJR112.github.io`，选 **Public**，勾 **Add a README file**，点 Create repository
3. 进仓库后点 `Add file → Upload files`
4. 把 `D:\WB\WZ\portfolio` 里的这些**整个拖进去**：
   - `index.html` `works.html` `work.html` `resume.html` `contact.html`
   - `assets/` 整个文件夹
   - `data.json`
   - `admin.html`（可选项，线上用不了后台，但留着无妨）
5. 点 Commit changes
6. `Settings → Pages` → Source 选 `Deploy from a branch` → `main` / `/ (root)` → Save

> 注意：网页上传会漏掉点开头的文件（`.gitignore`、`.nojekyll`），不影响访问。

---

## 方式三：命令行（需要 Personal Access Token）

1. GitHub → 右上角头像 → `Settings → Developer settings → Personal access tokens → Tokens (classic)`
2. `Generate new token (classic)`，勾选 `repo`，生成后**复制保存**（只显示一次）
3. 在项目目录执行：

```bash
git remote add origin https://github.com/ZZJR112/ZZJR112.github.io.git
git branch -M main
git push -u origin main
```

弹出登录时：用户名填 `ZZJR112`，密码填**刚才的 token**（不是账号密码）。

4. 然后按方式一的第 4–7 步开启 Pages。

---

## 之后怎么更新内容

**改作品内容**（作品名、封面、视频）：
- 本地跑 `node server.js`，打开 `http://localhost:8321/admin.html` 后台改 → 保存
- 后台会写进 `data.json`
- 然后把 `data.json`（和新上传的封面图）重新推一次：
  - GitHub Desktop：填个 Summary → `Commit to main` → `Push origin`
  - 命令行：`git add -A && git commit -m "更新作品" && git push`

**改页面文案/样式**：改完同样 push，一分钟内线上生效。

---

## 关于视频文件

`.gitignore` 里排除了 `uploads/*.mp4` 等视频 —— GitHub 单文件限 100MB，仓库也别撑太大。
线上要放视频的话建议：
1. 传到 B 站 / 腾讯视频 / 阿里云 OSS，拿外链
2. 在后台「编辑作品」里把链接填进 **视频 / VIDEO** 字段

封面图（jpg/png）体积小，可以直接提交进仓库。

---

## 安全提示

`admin-config.json` 存着 Gitee 令牌，已经写进 `.gitignore`，**不会被提交**。
如果哪天你改动了 `.gitignore`，确认这一行还在：

```
admin-config.json
```
