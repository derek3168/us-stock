# 選股神器

美股 + 港股短線技術分析 Web App（MA / MACD / KDJ / RSI · 多週期共振）。

## 功能

| 市場 | 成分 | 策略 |
|------|------|------|
| S&P 500 | 503 檔 | 加權評分、五線開花、綜合訊號 |
| NASDAQ 100 | 101 檔 | 同上 |
| 恒生指數 | 78 檔 | 15/30/60 分 + 日/週 · EMA8/114 · MACD(5,26,6) |

- **儀表板**：KPI、訊號分布、分數分布圖
- **篩選 / 排序 / 搜尋 / 匯出 CSV**
- **單股詳情**：`/stock/AAPL` 或 `/stock/0700?market=hk`
- **監控自選**：支援 US / HK
- **定時掃描**（Vercel Cron，可選）

## 本機啟動

```bash
npm install
npm run dev
```

打開 http://localhost:3000/screener

## 部署（Vercel）

1. Push 到 GitHub，連接 Vercel
2. **Storage → Blob → Connect**（必須，否則線上無法保存掃描）
3. 環境變數（Settings → Environment Variables）：

| 變數 | 說明 |
|------|------|
| `BLOB_READ_WRITE_TOKEN` | 連 Blob 後自動注入 |
| `CRON_SECRET` | 隨機長字串，供定時掃描驗證 |

4. Redeploy

### 定時掃描（少維護）

`vercel.json` 已配置工作日 UTC 定時呼叫 `/api/cron/scan`：

- 13:00 UTC — 恒生指數
- 13:20 UTC — NASDAQ 100
- 14:00 / 15:00 UTC — S&P 500（兩輪，掃完約 500 檔）

手動觸發（需帶 Secret）：

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://你的域名/api/cron/scan?universe=sp500&restart=1"
```

朋友打開網站即可看到上次掃描結果，無需自己掃 10 分鐘。

## 成分列表

- `data/sp500.json` → `public/sp500-symbols.json`
- `data/nasdaq100.json` → `public/nasdaq100-symbols.json`
- `data/hk-hsi.json` → `public/hk-hsi-symbols.json`

更新成分後執行：

```bash
node -e "const d=require('./data/sp500.json');require('fs').writeFileSync('public/sp500-symbols.json',JSON.stringify({count:d.symbols.length,symbols:d.symbols}))"
```

## 架構摘要

- `src/lib/scanner.ts` — 批量掃描（美股 1 年日線）
- `src/lib/hk-market.ts` — 港股五時間框架
- `src/lib/yahoo-fetch.ts` — Yahoo 請求重試退避
- `src/app/api/cache` — 快取讀寫（Blob / 本機）
- `src/app/api/cron/scan` — 定時掃描

## 免責聲明

僅供學習與個人研究，不構成投資建議。行情數據來自 Yahoo，可能有延時。
