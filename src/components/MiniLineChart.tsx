// @ts-nocheck -- JSX migrated without changing the original event and state logic.
import React, { useState, useEffect, useRef, useMemo } from 'react';

export function MiniLineChart({ data, keys, height = 280, zones = null, dimmed = [], onToggleDim = null }) {
  const width = 760;
  const padL = 40, padR = 16, padT = 16, padB = 30;
  const innerW = width - padL - padR, innerH = height - padT - padB;
  if (!data || data.length === 0) return null;

  let allVals = [];
  data.forEach(row => keys.forEach(k => { if (typeof row[k.key] === 'number') allVals.push(row[k.key]); }));
  if (allVals.length === 0) allVals = [0, 1];
  let min = Math.min(...allVals, 0), max = Math.max(...allVals, 0);
  if (min === max) { min -= 1; max += 1; }
  const xForI = (i) => padL + (data.length <= 1 ? 0 : (innerW * i) / (data.length - 1));
  const yForV = (v) => padT + innerH - ((v - min) / (max - min)) * innerH;
  const xForFrac = (f) => padL + innerW * f;

  const [hoverIdx, setHoverIdx] = useState(null);

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg width={width} height={height} onMouseLeave={() => setHoverIdx(null)}>
        {zones && data.length > 1 && zones.map(z => (
          <g key={z.label}>
            {z.fill !== 'transparent' && (
              <rect x={xForFrac(z.from)} y={padT} width={xForFrac(z.to) - xForFrac(z.from)} height={innerH} fill={z.fill} />
            )}
            <text x={(xForFrac(z.from) + xForFrac(z.to)) / 2} y={padT + 12} fontSize={9} textAnchor="middle" fill="#999"
              style={{ textTransform: 'uppercase', letterSpacing: '.02em' }}>{z.label}</text>
          </g>
        ))}
        {[0, 0.25, 0.5, 0.75, 1].map((f, i) => {
          const y = padT + innerH * f;
          const val = (max - (max - min) * f).toFixed(1);
          return (
            <g key={i}>
              <line x1={padL} y1={y} x2={width - padR} y2={y} stroke="#eee" />
              <text x={padL - 6} y={y + 3} fontSize={10} textAnchor="end" fill="#999">{val}</text>
            </g>
          );
        })}
        {data.map((row, i) => (
          <rect key={i} x={xForI(i) - (innerW / data.length) / 2} y={padT} width={innerW / data.length} height={innerH}
            fill="transparent" onMouseEnter={() => setHoverIdx(i)} />
        ))}
        {keys.map(k => {
          const path = data.map((row, i) => {
            if (row[k.key] == null) return null;
            return `${i === 0 || data[i - 1][k.key] == null ? 'M' : 'L'} ${xForI(i)} ${yForV(row[k.key])}`;
          }).filter(Boolean).join(' ');
          return <path key={k.key} d={path} fill="none" stroke={k.color} strokeWidth={2} strokeDasharray={k.dash || undefined}
            opacity={dimmed.includes(k.key) ? 0.2 : 1} />;
        })}
        {hoverIdx != null && (
          <line x1={xForI(hoverIdx)} y1={padT} x2={xForI(hoverIdx)} y2={padT + innerH} stroke="#ccc" strokeDasharray="3 3" />
        )}
      </svg>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12, marginTop: 4 }}>
        {keys.map(k => (
          <span key={k.key} onClick={() => onToggleDim && onToggleDim(k.key)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: onToggleDim ? 'pointer' : 'default', opacity: dimmed.includes(k.key) ? 0.35 : 1, userSelect: 'none' }}>
            <span style={{ width: 10, height: 10, background: k.color, display: 'inline-block', borderRadius: 2 }} />
            {k.name || k.key}
          </span>
        ))}
      </div>
      {hoverIdx != null && data[hoverIdx] && (
        <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
          {data[hoverIdx].name}: {keys.map(k => `${k.name || k.key}=${data[hoverIdx][k.key] ?? '—'}`).join('  ')}
        </div>
      )}
    </div>
  );
}

