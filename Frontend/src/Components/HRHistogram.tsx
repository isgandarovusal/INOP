import { memo } from 'react';
// Small bounded SVG: no chart runtime, observer or animated mounting costs.
const HRHistogram = memo(function HRHistogram({ title, rows }: { title: string; rows: { label: string; count: number }[] }) {
  if (!rows.length || rows.length > 20 || rows.some(r => !Number.isSafeInteger(r.count) || r.count < 0)) return null;
  const empty = rows.every(r => r.count === 0), baseline = empty ? 48 : 122;
  const max = Math.max(1, ...rows.map(r => r.count)), slot = 400 / rows.length;
  return <figure className="hr-histogram" data-hr-histogram><svg viewBox={`0 0 400 ${empty ? 80 : 154}`} role="img" aria-label={title}>
    <title>{title}: {rows.map(r => `${r.label}: ${r.count}`).join(', ')}</title>
    <line x1="0" y1={baseline} x2="400" y2={baseline} stroke="#e2e8f0" />
    {rows.map((r, index) => { const height = r.count / max * 90; return <g key={r.label}>
      <rect data-chart-count={r.count} x={index * slot + slot * .2} y={baseline - height} width={slot * .6} height={height} rx="4" fill="var(--hr-blue, #1761cf)" />
      {r.count > 0 && <text x={index * slot + slot / 2} y={112 - height} textAnchor="middle" fontSize="12" fill="#334155">{r.count}</text>}
      <text x={index * slot + slot / 2} y={baseline + 22} textAnchor="middle" fontSize="11" fill="#5c6878">{r.label}</text>
    </g>; })}
  </svg></figure>;
});
export default HRHistogram;
