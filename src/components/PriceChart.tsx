import { Box } from "@mantine/core";
import { useMemo, useState } from "react";

interface PricePoint {
  price: number | null;
  current_bid: number | null;
  currency: string;
  recorded_at: string;
}

interface PriceChartProps {
  data: PricePoint[];
  currency: string;
  height?: number;
}

function formatCurrency(val: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val);
}

function formatDate(iso: string, locale: "zh" | "en") {
  return new Date(iso).toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(iso: string, locale: "zh" | "en") {
  return new Date(iso).toLocaleString(locale === "zh" ? "zh-CN" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PriceChart({ data, currency, height = 220 }: PriceChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  // Detect locale from document
  const locale = typeof document !== "undefined" && document.documentElement.lang === "en" ? "en" : "zh";

  const chart = useMemo(() => {
    if (data.length < 2) return null;

    const pts = data.map((p) => ({
      val: p.current_bid ?? p.price ?? 0,
      label: formatDate(p.recorded_at, locale),
      full: formatDateTime(p.recorded_at, locale),
    }));

    const minV = Math.min(...pts.map((p) => p.val));
    const maxV = Math.max(...pts.map((p) => p.val));
    const range = maxV - minV || 1;

    // Nice round Y ticks — ensure at least 3 distinct values
    const pad = Math.max(range * 0.1, 1);
    const lo = minV - pad;
    const hi = maxV + pad;
    const rawStep = (hi - lo) / 4;
    const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const step = rawStep / mag <= 1 ? mag : rawStep / mag <= 2 ? 2 * mag : rawStep / mag <= 5 ? 5 * mag : 10 * mag;
    const floor = Math.floor(lo / step) * step;
    const ceil = Math.ceil(hi / step) * step;
    const ticks: number[] = [];
    for (let v = floor; v <= ceil + step * 0.01; v += step) ticks.push(v);

    // Chart dimensions
    const padL = 60;
    const padR = 12;
    const padT = 12;
    const padB = 28;
    const W = 600;
    const H = height;
    const cw = W - padL - padR;
    const ch = H - padT - padB;

    const x = (i: number) => padL + (i / Math.max(pts.length - 1, 1)) * cw;
    const y = (v: number) => padT + ch - ((v - floor) / (ceil - floor || 1)) * ch;

    const line = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.val).toFixed(1)}`).join(" ");
    const area = `${line} L ${x(pts.length - 1).toFixed(1)} ${padT + ch} L ${padL} ${padT + ch} Z`;

    return { pts, ticks, padL, padR, padT, padB, W, H, cw, ch, x, y, line, area, minV, maxV, floor, ceil };
  }, [data, height, locale]);

  if (!chart) return null;

  const { pts, ticks, padL, padR, padT, padB, W, H, cw, ch, x, y, line, area } = chart;

  // Show date labels: first, every Nth, last
  const labelStep = Math.max(1, Math.floor(pts.length / 6));
  const xLabels = pts.map((p, i) => ({ ...p, i, show: i === 0 || i === pts.length - 1 || i % labelStep === 0 }));

  return (
    <Box
      sx={(theme) => ({
        background: theme.colorScheme === "dark"
          ? "rgba(255,255,255,0.02)"
          : "rgba(0,0,0,0.015)",
        borderRadius: 8,
        border: `1px solid ${theme.colorScheme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
        overflow: "visible",
      })}
    >
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
        {/* Grid + Y labels */}
        {ticks.map((tv, i) => (
          <g key={i}>
            <line x1={padL} y1={y(tv)} x2={W - padR} y2={y(tv)} stroke="rgba(128,128,128,0.12)" strokeDasharray="4 4" />
            <text x={padL - 8} y={y(tv) + 4} textAnchor="end" fontSize={11} fill="rgba(128,128,128,0.6)">
              {formatCurrency(tv, currency)}
            </text>
          </g>
        ))}

        {/* Area */}
        <path d={area} fill="rgba(196,162,85,0.07)" />

        {/* Line */}
        <path d={line} fill="none" stroke="#c4a255" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

        {/* Dots + hover */}
        {pts.map((p, i) => (
          <g key={i}>
            <circle
              cx={x(i)} cy={y(p.val)} r={hoverIdx === i ? 5 : 2.5}
              fill={hoverIdx === i ? "#c4a255" : "rgba(196,162,85,0.45)"}
              stroke={hoverIdx === i ? "#fff" : "none"}
              strokeWidth={2}
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
            />
          </g>
        ))}

        {/* Hover tooltip */}
        {hoverIdx !== null && (() => {
          const hx = x(hoverIdx);
          const hy = y(pts[hoverIdx].val);
          const tw = 120;
          const labelX = hx > W / 2 ? hx - tw - 10 : hx + 10;
          const labelY = Math.max(padT + 4, hy - 16);
          return (
            <g>
              <line x1={hx} y1={padT} x2={hx} y2={padT + ch} stroke="rgba(196,162,85,0.25)" strokeWidth={1} />
              <rect x={labelX} y={labelY} width={tw} height={38} rx={4} fill="rgba(0,0,0,0.78)" />
              <text x={labelX + 6} y={labelY + 15} fill="#fff" fontSize={11} fontWeight={500}>
                {formatCurrency(pts[hoverIdx].val, currency)}
              </text>
              <text x={labelX + 6} y={labelY + 30} fill="rgba(255,255,255,0.6)" fontSize={10}>
                {pts[hoverIdx].full}
              </text>
            </g>
          );
        })()}

        {/* X-axis labels */}
        {xLabels.map((p) => (
          <text
            key={p.i}
            x={x(p.i)}
            y={H - 6}
            textAnchor={p.i === 0 ? "start" : p.i === pts.length - 1 ? "end" : "middle"}
            fontSize={10}
            fill="rgba(128,128,128,0.6)"
          >
            {p.label}
          </text>
        ))}

        {/* Axis titles */}
        <text x={padL - 8} y={12} textAnchor="start" fontSize={10} fill="rgba(128,128,128,0.4)">
          {locale === "zh" ? "价格" : "Price"}
        </text>
      </svg>
    </Box>
  );
}
