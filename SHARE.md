# 分享給朋友 — 永久網址（Vercel）+ 完整 503 檔掃描

## 部署步驟

### 1. 推到 GitHub

```bash
cd "/Users/derekchan/US stock"
git add .
git commit -m "US stock screener with full S&P 500 scan"
# 在 github.com 新建 repository
git remote add origin https://github.com/你的帳號/us-stock.git
git branch -M main
git push -u origin main
```

### 2. 部署到 Vercel

1. 打開 [vercel.com](https://vercel.com) 並登入  
2. **Add New → Project** → 選你的 `us-stock` repo  
3. 直接點 **Deploy**（無需改設定）  
4. 部署完成後會自動建立 **Blob** 儲存（掃描結果用），並得到網址，例如：  
   `https://us-stock-xxx.vercel.app`

### 3. 分享給朋友

| 頁面 | 網址 |
|------|------|
| S&P 500 篩選 | `https://你的網址/screener` |
| 監控自選 | `https://你的網址/watchlist` |
| 單股例：AAPL | `https://你的網址/stock/AAPL` |

---

## 503 檔掃描（雲端版）

Vercel 單次請求有時間上限，因此改為 **分批掃描**（每批約 20 檔，共約 26 批）：

1. 打開 `/screener`  
2. 點 **「開始掃描 S&P 500」**  
3. **保持頁面開啟** 約 5–10 分鐘，進度條會走到 503/503  
4. 完成後結果會保存在 Vercel Blob，之後訪客無需重掃即可篩選  

若關閉頁面中斷了掃描，重新打開 `/screener` 會自動從上次進度繼續。

### 可選環境變數（Vercel → Settings → Environment Variables）

| 變數 | 說明 | 預設 |
|------|------|------|
| `SCAN_CHUNK_SIZE` | 每批掃描檔數（越大越快，但易超時） | `20` |

---

## 本機開發

```bash
npm install
npm run dev
```

本機 `localhost` 仍會一次掃完 503 檔（較快）。

---

## 免責

本工具僅供學習與研究，不構成投資建議。行情來自 Yahoo Finance，可能有延時。
