// main.js
// Works in "double-click mode" (data.js defines window.GRAPHS).
// If you switched back to module mode, replace the next line with:
// import { GRAPHS } from "./data.js";
const GRAPHS = window.GRAPHS;

const container = document.getElementById("graphs");

// Base + optional bar highlight colors
const COLORS = [
  "#7dd3fc", // default bars (series 1)
  "#a7f3d0", // series 2
  "#fda4af", // series 3
  "#c4b5fd", // series 4
  "#fde68a", // series 5
];

const BAR_DEFAULT = COLORS[0];
const BAR_GREEN = "#34d399";
const BAR_RED = "#fb7185";

function extent(arr) {
  let min = Infinity, max = -Infinity;
  for (const v of arr) {
    if (Number.isFinite(v)) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 1 };
  if (min === max) return { min: min - 1, max: max + 1 };
  return { min, max };
}

function makeScaler(values, topPx, bottomPx) {
  const { min, max } = extent(values);
  const range = max - min;
  return (v) => {
    const t = (v - min) / range; // 0..1
    return bottomPx - t * (bottomPx - topPx);
  };
}

function formatNum(n) {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (abs >= 1_000) return (n / 1_000).toFixed(2) + "K";
  if (abs < 1 && abs > 0) return n.toPrecision(2);
  return Number.isFinite(n) ? n.toFixed(2).replace(/\.00$/, "") : "";
}

// Build quick lookup sets for which x values should be green/red.
// Numbers are matched *exactly* to x-axis values.
function toValueSet(arr) {
  if (!Array.isArray(arr)) return null;
  const set = new Set();
  for (const v of arr) {
    if (Number.isFinite(v)) set.add(v);
  }
  return set;
}

function createGraphCard(graph) {
  const { title, leftLabel, rightLabel, data } = graph;

  const card = document.createElement("section");
  card.className = "graph-card";

  const head = document.createElement("div");
  head.className = "graph-head";

  const hTitle = document.createElement("div");
  hTitle.className = "graph-title";
  hTitle.textContent = title ?? "Graph";

  const meta = document.createElement("div");
  meta.className = "graph-meta";
  const seriesCount = Math.max(0, data.length - 1);
  meta.textContent = `${seriesCount} series`;

  head.appendChild(hTitle);
  head.appendChild(meta);

  const wrap = document.createElement("div");
  wrap.className = "graph-canvas-wrap";

  const canvas = document.createElement("canvas");
  canvas.className = "graph";
  wrap.appendChild(canvas);

  card.appendChild(head);
  card.appendChild(wrap);

  container.appendChild(card);

  const render = () => drawGraph(canvas, graph);
  window.addEventListener("resize", render);
  render();
}

function drawGraph(canvas, graph) {
  const { leftLabel, rightLabel, data, green, red } = graph;
  const [xVals, ...ySeries] = data;
  if (!Array.isArray(xVals) || ySeries.length === 0) return;

  // Match device pixels for crisp lines
  const cssW = canvas.clientWidth;
  const cssH = canvas.clientHeight;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(cssW * dpr);
  canvas.height = Math.floor(cssH * dpr);

  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const W = cssW;
  const H = cssH;

  // Layout paddings (room for left/right labels)
  const pad = { top: 14, bottom: 24, left: 58, right: 58 };

  const plot = {
    x0: pad.left,
    y0: pad.top,
    x1: W - pad.right,
    y1: H - pad.bottom,
    w: W - pad.left - pad.right,
    h: H - pad.top - pad.bottom,
  };

  ctx.clearRect(0, 0, W, H);

  // Background grid
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.beginPath();
  const gridRows = 4;
  for (let i = 0; i <= gridRows; i++) {
    const y = plot.y0 + (plot.h * i) / gridRows;
    ctx.moveTo(plot.x0, y);
    ctx.lineTo(plot.x1, y);
  }
  ctx.stroke();

  // Axis box
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.strokeRect(plot.x0, plot.y0, plot.w, plot.h);

  // Determine usable N (clip to shortest series length)
  const n = Math.min(xVals.length, ...ySeries.map((s) => s.length));
  if (n < 2) return;

  // Even x spacing by index
  const xAt = (i) => plot.x0 + (plot.w * i) / (n - 1);

  // Per-series scalers (independent scaling)
  const scalers = ySeries.map((ys) => makeScaler(ys.slice(0, n), plot.y0, plot.y1));

  // Build value sets for coloring (optional)
  const greenSet = toValueSet(green);
  const redSet = toValueSet(red);

  // Bars for series 1
  const y1 = ySeries[0].slice(0, n);
  const yScaleBars = scalers[0];

  const barStep = plot.w / n;
  const barW = Math.max(1, Math.min(18, barStep * 0.65));

  for (let i = 0; i < n; i++) {
    const xVal = xVals[i];

    // Priority: red overrides green if both include same xVal
    let fill = BAR_DEFAULT;
    if (greenSet && greenSet.has(xVal)) fill = BAR_GREEN;
    if (redSet && redSet.has(xVal)) fill = BAR_RED;

    ctx.fillStyle = fill + "CC"; // slightly transparent
    const x = xAt(i);
    const y = yScaleBars(y1[i]);
    const h = plot.y1 - y;
    ctx.fillRect(x - barW / 2, y, barW, h);
  }

  // Lines/ticks for series 2..k
  for (let s = 1; s < ySeries.length; s++) {
    const ys = ySeries[s].slice(0, n);
    const yScale = scalers[s];
    const col = COLORS[(s) % COLORS.length];

    // series 2 = line; series 3+ = ticks
    const useLine = (s === 1);

    ctx.strokeStyle = col;
    ctx.lineWidth = 1.5;

    if (useLine) {
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const x = xAt(i);
        const y = yScale(ys[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    } else {
      ctx.beginPath();
      const tick = 6;
      for (let i = 0; i < n; i++) {
        const x = xAt(i);
        const y = yScale(ys[i]);
        ctx.moveTo(x, y - tick / 2);
        ctx.lineTo(x, y + tick / 2);
      }
      ctx.stroke();
    }
  }

  // Labels for left (series 1) and right (series 2)
  ctx.font =
    '12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
  ctx.fillStyle = "rgba(230,237,247,0.9)";

  // Left axis: series 1 extent
  const e1 = extent(y1);
  const leftText = leftLabel
    ? `${leftLabel}: ${formatNum(e1.min)}–${formatNum(e1.max)}`
    : `${formatNum(e1.min)}–${formatNum(e1.max)}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(leftText, 10, plot.y0 + plot.h / 2);

  // Right axis: series 2 extent (if present)
  if (ySeries.length >= 2) {
    const y2 = ySeries[1].slice(0, n);
    const e2 = extent(y2);
    const rightText = rightLabel
      ? `${rightLabel}: ${formatNum(e2.min)}–${formatNum(e2.max)}`
      : `${formatNum(e2.min)}–${formatNum(e2.max)}`;
    ctx.textAlign = "right";
    ctx.fillText(rightText, W - 10, plot.y0 + plot.h / 2);
  }

  // Minimal x-axis ticks (start/mid/end)
  ctx.fillStyle = "rgba(155,176,204,0.9)";
  ctx.textBaseline = "alphabetic";
  const i0 = 0, iM = Math.floor((n - 1) / 2), i1 = n - 1;

  ctx.textAlign = "left";
  ctx.fillText(String(xVals[i0]), plot.x0, H - 8);

  ctx.textAlign = "center";
  ctx.fillText(String(xVals[iM]), xAt(iM), H - 8);

  ctx.textAlign = "right";
  ctx.fillText(String(xVals[i1]), plot.x1, H - 8);
}

// Build page
for (const g of GRAPHS) createGraphCard(g);