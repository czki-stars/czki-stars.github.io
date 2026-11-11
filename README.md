# 春知星图

纯稚学文献关联网络：<https://czki-stars.github.io>

每颗星是一篇文献。文献收录自春知网（purezhi.com），版权归原作者。

- `index.html`：网页本体，由 `build/build.py` 生成，不要手改。
- `build/head.html`、`build/tail.html`：页面的样式和脚本。
- `build/data.txt`：文献数据，每行一篇。
- `build/scrape.mjs`：从春知网读取最新文献列表，重写 `data.txt`。
- `.github/workflows/update.yml`：每天两次自动更新并发布。
