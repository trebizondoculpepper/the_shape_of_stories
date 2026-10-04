// @ts-nocheck -- JSX migrated without changing the original event and state logic.
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { filterByChapter, chronoOrderMap } from '../domain/story';
import { parseWords, fmtWords, wordStats } from '../domain/words';
import { HelpNote } from '../components/EditorControls';
import { btnStyle } from '../components/styles';

export function WordMeter({ cards, goal, onGoal, onOpen }) {
  const total = cards.reduce((n, c) => n + (c.words || 0), 0);
  const pct = goal > 0 ? Math.round(total / goal * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 16px', borderBottom: '1px solid #eee', fontSize: 12, color: '#555', flexWrap: 'wrap' }}>
      <span style={{ whiteSpace: 'nowrap' }}><b style={{ fontSize: 14, color: '#222' }}>{fmtWords(total)}</b>{goal > 0 ? ` / ${fmtWords(goal)}` : ''} words</span>
      {goal > 0 && (
        <>
          <div style={{ flex: 1, minWidth: 80, maxWidth: 420, height: 6, borderRadius: 3, background: '#eee', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', background: '#378ADD' }} />
          </div>
          <span>{pct}%</span>
        </>
      )}
      <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Goal
        <input type="number" min="0" value={goal || ''} placeholder="e.g. 80000" onChange={e => onGoal(parseWords(e.target.value))}
          style={{ width: 84, fontSize: 12 }} />
      </label>
      <button onClick={onOpen} style={{ ...btnStyle, fontSize: 11 }}>Word count</button>
    </div>
  );
}

export function WordCountView({ state, setState, chapterFilter, help }) {
  const { cards, chapters } = state;
  const goal = state.wordGoal || 0;
  const st = useMemo(() => wordStats(cards, goal), [cards, goal]);
  const order = useMemo(() => chronoOrderMap(cards, chapters), [cards, chapters]);
  const ordered = useMemo(() => [...cards].sort((a, b) => (order[a.id] ?? 1e9) - (order[b.id] ?? 1e9)), [cards, order]);
  const rows = filterByChapter(ordered, chapterFilter);
  const chapterTitle = (id) => (chapters.find(ch => ch.id === id) || {}).title || '';
  const updateCard = (id, patch) => setState(s => ({ ...s, cards: s.cards.map(c => c.id === id ? { ...c, ...patch } : c) }));
  const maxWords = Math.max(1, ...rows.map(c => c.words || 0));

  const n = ordered.length;
  let run = 0;
  const cum = ordered.map(c => (run += (c.words || 0)));
  const ymax = Math.max(goal, st.total, 1);
  const px = (i) => 10 + (n > 1 ? i / (n - 1) : 0) * 620;
  const py = (v) => 80 - (v / ymax) * 70;

  const metric = (label, value) => (
    <div style={{ background: '#f7f6f4', borderRadius: 8, padding: '10px 12px', flex: 1, minWidth: 120 }}>
      <div style={{ fontSize: 11, color: '#777' }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 600 }}>{value}</div>
    </div>
  );
  const th = { textAlign: 'left', fontSize: 11, color: '#777', fontWeight: 400, padding: '6px 8px', borderBottom: '1px solid #eee' };
  const td = { padding: '5px 8px', borderBottom: '1px solid #f0f0f0', fontSize: 13 };

  return (
    <div style={{ padding: 16 }}>
      <HelpNote on={help}>Enter each scene's word count as you write it in your other software. Scenes you haven't written yet share what's left of the goal equally, so their targets re-balance as written scenes run long or short. Type a target on any scene to set its share yourself.</HelpNote>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        {metric('Total', fmtWords(st.total))}
        <div style={{ background: '#f7f6f4', borderRadius: 8, padding: '10px 12px', flex: 1, minWidth: 120 }}>
          <div style={{ fontSize: 11, color: '#777' }}>Goal</div>
          <input type="number" min="0" value={goal || ''} placeholder="not set" onChange={e => setState(s => ({ ...s, wordGoal: parseWords(e.target.value) }))}
            style={{ width: 110, fontSize: 18, fontWeight: 600, border: 'none', background: 'transparent' }} />
        </div>
        {metric('Remaining', goal > 0 ? fmtWords(st.remaining) : '—')}
        {metric('Avg per written scene', st.writtenCount ? fmtWords(st.total / st.writtenCount) : '—')}
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={th}>Scene</th><th style={th}>Chapter</th>
            <th style={th}>Words</th><th style={th}>Target</th><th style={{ ...th, width: '26%' }}>Progress</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(c => {
            const target = st.targetOf(c);
            const manual = (c.wordTarget || 0) > 0;
            const denom = manual ? c.wordTarget : (target || maxWords);
            const pct = Math.min(100, Math.round(((c.words || 0) / Math.max(1, denom)) * 100));
            return (
              <tr key={c.id}>
                <td style={td}>{c.title || 'Untitled'}</td>
                <td style={{ ...td, color: '#777' }}>{chapterTitle(c.chapterId)}</td>
                <td style={td}>
                  <input type="number" min="0" value={c.words ?? ''} onChange={e => updateCard(c.id, { words: parseWords(e.target.value) })} style={{ width: 80, fontSize: 12 }} />
                </td>
                <td style={td}>
                  <input type="number" min="0" value={c.wordTarget ?? ''} placeholder={target != null && !manual ? `~${fmtWords(target)}` : 'auto'}
                    onChange={e => updateCard(c.id, { wordTarget: parseWords(e.target.value) })} style={{ width: 80, fontSize: 12 }} />
                </td>
                <td style={td}>
                  <div style={{ height: 8, borderRadius: 4, background: '#eee', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: '#378ADD' }} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {goal > 0 && st.autoCount > 0 && (
        <div style={{ fontSize: 12, color: '#777', marginTop: 8 }}>
          {st.autoCount} unwritten scene{st.autoCount === 1 ? '' : 's'} share the remaining {fmtWords(st.remaining)} words: about {fmtWords(st.autoEach)} each.
        </div>
      )}

      {n > 1 && (goal > 0 || st.total > 0) && (
        <div style={{ marginTop: 14, background: '#f7f6f4', borderRadius: 8, padding: '8px 12px' }}>
          <div style={{ fontSize: 11, color: '#777', marginBottom: 4 }}>Cumulative words by scene order{goal > 0 ? ' vs. even pace to goal' : ''}</div>
          <svg viewBox="0 0 640 90" width="100%" role="img">
            <title>Cumulative word count by scene order</title>
            {goal > 0 && <line x1={px(0)} y1={py(goal / n)} x2={px(n - 1)} y2={py(goal)} stroke="#aaa" strokeWidth="1" strokeDasharray="4 4" />}
            <polyline points={cum.map((v, i) => `${px(i)},${py(v)}`).join(' ')} fill="none" stroke="#378ADD" strokeWidth="2" />
          </svg>
        </div>
      )}
    </div>
  );
}

