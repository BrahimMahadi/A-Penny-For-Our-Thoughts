// charts.jsx — Tiny dependency-free SVG chart primitives with hover tooltips.
// Shared across all 3 dashboard directions; each direction passes its own
// colors and stroke widths.

const { useState, useRef, useMemo, useEffect } = React;

// ─── Sparkline ────────────────────────────────────────────────────
function Sparkline({ data, width = 120, height = 32, color = '#22d3ee', fill = true, strokeWidth = 1.5, showDot = false }) {
  const [hover, setHover] = useState(null);
  const points = useMemo(() => {
    if (!data?.length) return [];
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;
    const step = width / (data.length - 1 || 1);
    return data.map((v, i) => ({
      x: i * step,
      y: height - ((v - min) / range) * (height - 4) - 2,
      v,
      i,
    }));
  }, [data, width, height]);
  if (!points.length) return null;
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
  const area = `${path} L${width},${height} L0,${height} Z`;
  return (
    <div style={{ position: 'relative', width, height, lineHeight: 0 }}>
      <svg width={width} height={height} style={{ overflow: 'visible' }}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const idx = Math.max(0, Math.min(points.length - 1, Math.round(x / (width / (points.length - 1 || 1)))));
          setHover(points[idx]);
        }}>
        {fill && (
          <>
            <defs>
              <linearGradient id={`spk-${color.replace(/[^a-z0-9]/gi, '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.28" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={area} fill={`url(#spk-${color.replace(/[^a-z0-9]/gi, '')})`} />
          </>
        )}
        <path d={path} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" />
        {(showDot || hover) && (
          <circle cx={(hover || points[points.length - 1]).x} cy={(hover || points[points.length - 1]).y}
            r="2.5" fill={color} stroke="#fff" strokeWidth="1" />
        )}
        <rect x="0" y="0" width={width} height={height} fill="transparent" />
      </svg>
      {hover && (
        <div style={{
          position: 'absolute', left: Math.min(width - 50, Math.max(0, hover.x - 22)),
          top: -22, fontSize: 10, padding: '2px 6px', borderRadius: 4,
          background: 'rgba(0,0,0,0.85)', color: '#fff', whiteSpace: 'nowrap',
          fontFamily: 'ui-monospace, "JetBrains Mono", monospace', pointerEvents: 'none',
        }}>${hover.v}</div>
      )}
    </div>
  );
}

// ─── Bar chart (income vs expense) ────────────────────────────────
function BarChart({ data, width = 480, height = 180, colors = ['#22d3ee', '#475569'], showAxis = true, axisColor = '#94a3b8', currency = true }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(...data.flatMap((d) => [d.in || 0, d.out || 0]), 1);
  const padding = { l: 36, r: 8, t: 12, b: 22 };
  const plotW = width - padding.l - padding.r;
  const plotH = height - padding.t - padding.b;
  const groupW = plotW / data.length;
  const barW = Math.max(6, Math.min(14, groupW * 0.32));
  const gap = 3;

  return (
    <div style={{ position: 'relative', width, height }}>
      <svg width={width} height={height} style={{ display: 'block' }}>
        {/* Grid lines */}
        {showAxis && [0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}>
            <line x1={padding.l} x2={width - padding.r} y1={padding.t + plotH * (1 - t)} y2={padding.t + plotH * (1 - t)} stroke={axisColor} strokeOpacity="0.15" strokeDasharray="2 3" />
            <text x={padding.l - 6} y={padding.t + plotH * (1 - t) + 3} textAnchor="end" fontSize="9" fill={axisColor} fontFamily="ui-monospace, monospace">
              {currency ? '$' : ''}{Math.round(max * t).toLocaleString()}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = padding.l + i * groupW + groupW / 2;
          const hIn = (d.in / max) * plotH;
          const hOut = (d.out / max) * plotH;
          return (
            <g key={i}
              onMouseEnter={() => setHover({ d, x: cx, y: padding.t })}
              onMouseLeave={() => setHover(null)}>
              <rect x={cx - barW - gap / 2} y={padding.t + plotH - hIn} width={barW} height={hIn} fill={colors[0]} rx="2" />
              <rect x={cx + gap / 2} y={padding.t + plotH - hOut} width={barW} height={hOut} fill={colors[1]} rx="2" opacity="0.9" />
              <rect x={cx - groupW / 2} y={padding.t} width={groupW} height={plotH} fill="transparent" />
              {showAxis && (
                <text x={cx} y={height - 6} textAnchor="middle" fontSize="10" fill={axisColor}>{d.m}</text>
              )}
            </g>
          );
        })}
      </svg>
      {hover && (
        <div style={{
          position: 'absolute', left: hover.x, top: hover.y - 6, transform: 'translate(-50%, -100%)',
          background: 'rgba(0,0,0,0.92)', color: '#fff', borderRadius: 6, padding: '6px 10px',
          fontSize: 11, fontFamily: 'ui-monospace, monospace', whiteSpace: 'nowrap', pointerEvents: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}>
          <div style={{ fontWeight: 600, marginBottom: 2 }}>{hover.d.m}</div>
          <div style={{ color: colors[0] }}>In  ${hover.d.in.toLocaleString()}</div>
          <div style={{ color: colors[1] === '#475569' ? '#94a3b8' : colors[1] }}>Out ${hover.d.out.toLocaleString()}</div>
          <div style={{ marginTop: 2, paddingTop: 2, borderTop: '1px solid rgba(255,255,255,0.15)' }}>
            Net ${(hover.d.in - hover.d.out).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Donut (allocation) ───────────────────────────────────────────
function Donut({ segments, size = 160, thickness = 22, label, sublabel, bg = 'transparent', trackColor = 'rgba(0,0,0,0.06)' }) {
  const [hover, setHover] = useState(null);
  const r = size / 2 - thickness / 2 - 2;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  let acc = 0;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill={bg} stroke={trackColor} strokeWidth={thickness} />
        {segments.map((s, i) => {
          const frac = s.value / total;
          const dash = c * frac;
          const offset = -c * acc;
          acc += frac;
          return (
            <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none"
              stroke={s.color} strokeWidth={thickness}
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={offset}
              onMouseEnter={() => setHover(s)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: 'pointer', transition: 'stroke-width 0.15s' }} />
          );
        })}
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', textAlign: 'center', pointerEvents: 'none',
      }}>
        {hover ? (
          <>
            <div style={{ fontSize: 11, opacity: 0.6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{hover.name}</div>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'ui-monospace, monospace' }}>${Math.round(hover.value).toLocaleString()}</div>
            <div style={{ fontSize: 10, opacity: 0.5 }}>{((hover.value / total) * 100).toFixed(0)}%</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 11, opacity: 0.55, textTransform: 'uppercase', letterSpacing: 0.5 }}>{sublabel}</div>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'ui-monospace, monospace' }}>{label}</div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Progress bar with track ──────────────────────────────────────
function ProgressBar({ value, max, color = '#22d3ee', trackColor = 'rgba(0,0,0,0.08)', height = 6, radius = 999, showOver = true }) {
  const pct = Math.min(1, value / (max || 1));
  const over = value > max;
  return (
    <div style={{ width: '100%', height, background: trackColor, borderRadius: radius, overflow: 'hidden', position: 'relative' }}>
      <div style={{
        width: `${Math.min(100, pct * 100)}%`, height: '100%',
        background: over && showOver ? '#ef4444' : color, borderRadius: radius,
        transition: 'width 0.4s ease',
      }} />
    </div>
  );
}

// ─── Stacked bar (3-color allocation) ─────────────────────────────
function StackedBar({ segments, height = 8, radius = 999, gap = 2 }) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  return (
    <div style={{ display: 'flex', gap, width: '100%', height, borderRadius: radius, overflow: 'hidden' }}>
      {segments.map((s, i) => (
        <div key={i} title={`${s.name}: ${((s.value / total) * 100).toFixed(0)}%`}
          style={{ flex: s.value, background: s.color, transition: 'flex 0.4s ease' }} />
      ))}
    </div>
  );
}

window.Sparkline = Sparkline;
window.BarChart = BarChart;
window.Donut = Donut;
window.ProgressBar = ProgressBar;
window.StackedBar = StackedBar;
