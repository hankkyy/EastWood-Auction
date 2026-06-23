import { Box, Text, Tooltip } from "@mantine/core";
import { useState } from "react";

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

function formatPrice(val: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val);
}

export default function PriceChart({ data, currency, height = 200 }: PriceChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (data.length < 2) return null;

  // Normalize + reverse: newest first (left to right)
  const points = [...data].reverse().map((p) => ({
    val: p.current_bid ?? p.price ?? 0,
    label: new Date(p.recorded_at).toLocaleDateString("zh-CN", {
      month: "short",
      day: "numeric",
    }),
    fullLabel: new Date(p.recorded_at).toLocaleString("zh-CN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
  }));

  const minVal = Math.min(...points.map((p) => p.val));
  const maxVal = Math.max(...points.map((p) => p.val));
  const range = maxVal - minVal || 1;

  // Compute nice round tick values
  const tickCount = 4;
  const roughStep = range / (tickCount - 1);
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const niceStep = (() => {
    const ratio = roughStep / magnitude;
    if (ratio <= 1) return magnitude;
    if (ratio <= 2) return 2 * magnitude;
    if (ratio <= 5) return 5 * magnitude;
    return 10 * magnitude;
  })();
  const niceMin = Math.floor(minVal / niceStep) * niceStep;
  const niceMax = Math.ceil(maxVal / niceStep) * niceStep;
  const tickValues: number[] = [];
  for (let v = niceMin; v <= niceMax + niceStep * 0.1; v += niceStep) {
    tickValues.push(v);
  }

  const padH = 32;
  const padV = 20;
  const w = 600;
  const h = height;
  const chartW = w - padH * 2;
  const chartH = h - padV * 2;

  const xScale = (i: number) => padH + (i / Math.max(points.length - 1, 1)) * chartW;
  const yScale = (v: number) => {
    const displayRange = niceMax - niceMin || 1;
    return padV + chartH - ((v - niceMin) / displayRange) * chartH;
  };

  // Build SVG path
  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xScale(i).toFixed(1)} ${yScale(p.val).toFixed(1)}`)
    .join(" ");

  // Area fill
  const areaPath = `${linePath} L ${xScale(points.length - 1).toFixed(1)} ${padV + chartH} L ${padH} ${padV + chartH} Z`;

  return (
    <Box
      sx={(theme) => ({
        position: "relative",
        background: theme.colorScheme === "dark"
          ? "rgba(255,255,255,0.02)"
          : "rgba(0,0,0,0.01)",
        borderRadius: 8,
        border: `1px solid ${theme.colorScheme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
        overflow: "hidden",
      })}
    >
      <svg
        viewBox={`0 0 ${w} ${h}`}
        style={{ width: "100%", height: "auto", display: "block" }}
      >
        {/* Grid lines */}
        {tickValues.map((tv, i) => (
          <g key={i}>
            <line
              x1={padH} y1={yScale(tv)} x2={w - padH} y2={yScale(tv)}
              stroke="rgba(128,128,128,0.12)" strokeDasharray="4 4"
            />
            <text
              x={padH - 6} y={yScale(tv) + 4}
              textAnchor="end" fontSize={10} fill="rgba(128,128,128,0.6)"
            >
              ${formatPrice(tv, currency)}
            </text>
          </g>
        ))}

        {/* Area fill */}
        <path d={areaPath} fill="rgba(196,162,85,0.08)" />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke="#c4a255"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Dots */}
        {points.map((p, i) => (
          <g key={i}>
            <circle
              cx={xScale(i)} cy={yScale(p.val)} r={i === hoverIdx ? 6 : 3}
              fill={i === hoverIdx ? "#c4a255" : "rgba(196,162,85,0.5)"}
              stroke={i === hoverIdx ? "#fff" : "none"}
              strokeWidth={2}
              style={{ cursor: "pointer", transition: "r 0.15s" }}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
            />
            {hoverIdx === i && (
              <g>
                <rect
                  x={Math.max(padH, xScale(i) - 50)}
                  y={yScale(p.val) - 36}
                  width={100} height={28}
                  rx={4}
                  fill="rgba(0,0,0,0.75)"
                />
                <text
                  x={xScale(i)}
                  y={yScale(p.val) - 20}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize={11}
                >
                  {formatPrice(p.val, currency)}
                </text>
              </g>
            )}
          </g>
        ))}

        {/* X-axis labels */}
        {points.filter((_, i) => i % Math.max(1, Math.floor(points.length / 5)) === 0 || i === points.length - 1).map((p, idx, arr) => {
          const origIdx = points.indexOf(p);
          return (
            <text
              key={origIdx}
              x={xScale(origIdx)}
              y={h - 6}
              textAnchor="middle"
              fontSize={10}
              fill="rgba(128,128,128,0.6)"
            >
              {p.label}
            </text>
          );
        })}
      </svg>

      {/* Hover tooltip with full date */}
      {hoverIdx !== null && (
        <Tooltip label={points[hoverIdx].fullLabel} withArrow>
          <Box
            style={{
              position: "absolute",
              left: `${((hoverIdx / Math.max(points.length - 1, 1)) * 100).toFixed(1)}%`,
              top: 0,
              width: 1,
              height: "100%",
              pointerEvents: "none",
            }}
          />
        </Tooltip>
      )}
    </Box>
  );
}
