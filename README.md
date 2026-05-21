# 選股神器

整合 **MA / MACD / KDJ / RSI** 四指標的 1–20 天短線分析 Web App。

## 功能（Phase 1）

- **S&P 500 批量掃描**：503 檔成分股四指標計算
- **預設篩選策略**：高勝率進場、偏多試單、續抱、減倉清倉、生命線回踩、動能加速
- **排序**：按評分、漲跌幅、代碼
- **單股詳情**：`/stock/AAPL` K 線 + 訊號面板
- **監控自選**：`/watchlist` 本地自選列表

## 啟動

```bash
npm install
npm run dev
```

瀏覽 [http://localhost:3000/screener](http://localhost:3000/screener) → 點「開始掃描」（首次約 3–8 分鐘）

## 架構

- `data/sp500.json` — S&P 500 成分列表
- `src/lib/scanner.ts` — 批量掃描引擎
- `src/lib/filters.ts` — 預設篩選策略
- `src/lib/signals.ts` — 四指標綜合評分
- `src/app/api/screener` — 篩選結果 API
- `src/app/api/scan` — 觸發/查詢掃描進度

## 免責聲明

僅供學習與個人研究，不構成投資建議。行情數據可能有延時，請以券商終端為準。
