"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
} from "lightweight-charts";
import type { OHLCV } from "@/lib/types";
import { sma } from "@/lib/indicators";

type Props = {
  bars: OHLCV[];
  symbol: string;
};

export function StockChart({ bars, symbol }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || bars.length === 0) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#121820" },
        textColor: "#8b9cb3",
      },
      grid: {
        vertLines: { color: "#1e2a38" },
        horzLines: { color: "#1e2a38" },
      },
      width: containerRef.current.clientWidth,
      height: 380,
      timeScale: { borderColor: "#1e2a38" },
      rightPriceScale: { borderColor: "#1e2a38" },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    const timeData = bars.map((b) => ({
      time: b.date as string,
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
    }));
    candleSeries.setData(timeData);

    const closes = bars.map((b) => b.close);
    const maConfigs = [
      { period: 5, color: "#f59e0b", title: "MA5" },
      { period: 10, color: "#3b82f6", title: "MA10" },
      { period: 20, color: "#a855f7", title: "MA20" },
      { period: 50, color: "#ec4899", title: "MA50" },
    ];

    for (const cfg of maConfigs) {
      const line = chart.addSeries(LineSeries, {
        color: cfg.color,
        lineWidth: 1,
        title: cfg.title,
      });
      const values = sma(closes, cfg.period);
      const lineData = bars
        .map((b, i) => (values[i] != null ? { time: b.date as string, value: values[i]! } : null))
        .filter((d): d is { time: string; value: number } => d != null);
      line.setData(lineData);
    }

    const volSeries = chart.addSeries(HistogramSeries, {
      color: "#3b82f680",
      priceFormat: { type: "volume" },
      priceScaleId: "vol",
    });
    chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
    volSeries.setData(
      bars.map((b) => ({
        time: b.date as string,
        value: b.volume,
        color: b.close >= b.open ? "#22c55e55" : "#ef444455",
      }))
    );

    chart.timeScale().fitContent();

    const onResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      chart.remove();
    };
  }, [bars, symbol]);

  return <div ref={containerRef} className="w-full rounded-xl overflow-hidden" />;
}
