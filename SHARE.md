# 分享給朋友 — 兩種方式

## 方式 A：臨時連結（最快，約 1 分鐘）

適合：今天先給朋友試，你電腦開著、已跑 `npm run dev`。

```bash
cd "/Users/derekchan/US stock"
npm run dev
```

另開一個終端：

```bash
npx localtunnel --port 3000
```

終端會顯示類似 `https://xxxx.loca.lt` 的網址，把這個連結傳給朋友即可。

注意：

- 你關機或關掉 dev server，連結會失效
- 首次打開可能要先掃描 S&P 500（約 3–8 分鐘）

---

## 方式 B：永久網址（Vercel，24/7 在線）

適合：長期分享，不需一直開著電腦。

### 步驟

1. 把專案推到 GitHub（私有或公開皆可）

```bash
cd "/Users/derekchan/US stock"
git init
git add .
git commit -m "US stock screener"
# 在 GitHub 新建 repo 後：
git remote add origin https://github.com/你的帳號/us-stock.git
git push -u origin main
```

2. 打開 [vercel.com](https://vercel.com) → **Add New Project** → 選你的 repo → Deploy

3. 部署完成後會得到網址，例如：`https://us-stock-xxx.vercel.app`

### 雲端版說明

| 功能 | 本機 | Vercel 免費版 |
|------|------|----------------|
| 單股詳情 / 自選 | 完整 | 完整 |
| S&P 500 全量掃描 | 503 檔 | 預設約 **40 檔**（避免超時） |

若要在雲端掃更多，在 Vercel 專案 **Settings → Environment Variables** 新增：

- `SCAN_LIMIT` = `80`（數字越大越慢，免費方案建議 ≤ 50）

---

## 給朋友的入口

- 篩選器：`https://你的網址/screener`
- 自選監控：`https://你的網址/watchlist`
