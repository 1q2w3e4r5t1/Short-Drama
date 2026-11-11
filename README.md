# Soc 606 短剧研究程序（jsPsych 7 + Vercel）

一个在线问卷加实验程序：知情同意 → 筛查和人口学 → 观看实验（短剧 vs 普通短视频，前后情绪）→ 短剧使用与媒体使用 → 心理健康 → 压力与无聊 → 可选的屏幕时间截图 → 结束页。手机竖屏、手机横屏、平板和电脑都可以用。

## 文件说明

```
public/                  网页（Vercel 直接发布这个文件夹）
  index.html             入口
  css/style.css          样式（自适应布局）
  js/config.js           ★ 你主要改这里：研究者信息、视频、示例图
  js/consent.js          知情同意书文字（按 Syracuse 模板顺序）
  js/items.js            ★ 所有题目的措辞和选项
  js/main.js             流程（页面顺序、显示逻辑、保存）
  js/utils.js            保存数据、表单组件、软提醒
  js/plugin-video.js     视频播放插件（YouTube 片段或本地视频）
  stimuli/               放视频（可选）和短剧示例图（可选）
api/save.js              保存数据到 Vercel Blob
api/upload.js            保存截图到 Vercel Blob
scripts/download-data.mjs 下载数据并生成 CSV
```

## 一、本地测试（VS Code）

1. 用 VS Code 打开整个文件夹，安装扩展 **Live Server**。
2. 右键 `public/index.html` → **Open with Live Server**。
3. 在 localhost 上程序自动进入**测试模式**：占位视频缩短为 3 秒，开始页显示分到的条件，结束页有 **Download JSON / Download CSV** 按钮。本地没有服务器，所以保存数据会失败，这是正常的，控制台会出现 `save failed` 的提示。
4. 网址参数：
   - `?full=1`：测试模式下占位视频也用完整的 20 秒
   - `?condition=drama` 或 `?condition=shortvideo`：指定观看条件，方便分别检查两种条件
   - `?debug=1`：在正式网址上打开测试模式
5. 测手机布局：Chrome 按 F12 → 点左上角手机图标 → 选 iPhone，再点旋转按钮测横屏。

## 二、发布到 GitHub 和 Vercel

1. 在 GitHub 新建一个仓库（可以设为 Private），把整个文件夹上传。`data/` 和 `.env.local` 已在 `.gitignore` 里，不会被上传。
2. 登录 https://vercel.com （可用 GitHub 账号登录）→ **Add New → Project** → 选择这个仓库 → Framework Preset 选 **Other** → **Deploy**。`vercel.json` 已经指定发布 `public` 文件夹。
3. 建数据库：项目页面 → **Storage** → **Create** → 选 **Blob** → 访问方式选 **Private** → 连接到这个项目（会自动加入环境变量 `BLOB_READ_WRITE_TOKEN`）。
4. 回到 **Deployments**，对最新一次部署点 **Redeploy**，让环境变量生效。
5. 打开 Vercel 给的网址（例如 `https://xxx.vercel.app`），自己完整做一遍，然后在 Storage → Blob 里应该能看到 `sessions/…` 文件。
6. 把这个网址交给老师。老师以参与者身份打开即可。若想让老师看到代码，可以把 GitHub 仓库设为 Public 或邀请老师为仓库协作者。

注意：如果 Blob 存储选了 Public，需要在 Vercel 的 Environment Variables 里加 `BLOB_ACCESS=public`。参与者数据建议使用 Private。

## 三、下载数据

在电脑终端（项目文件夹内）运行：

```bash
npm install
npm i -g vercel          # 只需要一次
vercel link              # 连接到 Vercel 上的项目
vercel env pull .env.local
npm run download
```

生成 `data/` 文件夹：

| 文件 | 内容 |
|---|---|
| `participants.csv` | 每人一行：所有答案、视频观看情况、量表得分、情绪变化 |
| `raw/<session_id>.json` | 原始数据 |
| `screenshots/<session_id>/` | 上传的屏幕时间截图 |

主要计算变量：

- `score_phq9`（0–27）、`score_gad7`（0–21）、`score_ucla3`（3–9）、`score_bsmas`（6–30）：所有题目都回答才计算总分。
- `score_escapism`、`score_emo_comp`、`score_connect`、`score_belong`、`score_boredom`、`score_emptiness`：至少答一半题目时计算平均分；`conn_3` 和 `bel_3` 已反向计分。
- `mood_change_*` = 看后 − 看前（0–100）。
- `attn_1_pass`、`attn_2_pass`：注意力检查是否通过。
- `stressor_count`：过去 12 个月发生的生活压力事件数。
- 多选题（种族、同住者、观看平台）每个选项一列，选中为 1，没选为空白。
- 每个人在中途会多次保存，下载脚本只取每人最远的一次。`furthest_stage` 显示停在哪一步（`final` 表示完成）。
- `debug` 为 true 的是测试数据，分析前删除。

## 四、换成真实材料

**视频**（`config.js` 的 `VIDEOS`）：
每个条件约 3 分钟。YouTube 片段用 `id`（网址中 `v=` 后面或 `/shorts/` 后面的部分）加开始和结束秒数；竖屏视频加 `aspect: "9:16"`。两种条件的长度应尽量相同。

```js
VIDEOS: {
  drama: [{ type: "youtube", id: "XXXXXXXXXXX", start: 0, end: 180, aspect: "9:16" }],
  shortvideo: [
    { type: "youtube", id: "AAAAAAAAAAA", aspect: "9:16" },
    { type: "youtube", id: "BBBBBBBBBBB", aspect: "9:16" },
  ],
},
```

视频列表为空时显示 20 秒的占位视频。YouTube 播放需要联网，在 Live Server 上也能测试。

**研究者信息**：`config.js` 里的 `RESEARCHER_EMAIL`、`DEPARTMENT`、`INSTRUCTOR`。

## 五、已知限制

- Vercel 免费版（Hobby）仅限非商业用途，适合课程作业。正式研究需按 IRB 要求选择数据存储方式。
- 未联网测试过 YouTube 播放（开发环境无法访问 YouTube），请在本地用真实视频 ID 测一遍，特别是在 iPhone 上。
