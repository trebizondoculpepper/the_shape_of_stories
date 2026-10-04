// @ts-nocheck -- JSX migrated without changing the original event and state logic.
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FREYTAG_ZONES, filterByChapter, getOrderedForValues, buildValueChain } from '../domain/story';
import { MiniLineChart } from '../components/MiniLineChart';
import { HelpNote } from '../components/EditorControls';

/* ============================== ARC CHART VIEW ============================== */

export function ArcChartView({ state, chapterFilter, help }) {
  const { characters, values, chapters } = state;
  const cards = filterByChapter(state.cards, chapterFilter);
  const chapterGrouping = chapterFilter === 'all' ? chapters : undefined;
  const ordered = getOrderedForValues(cards, chapterGrouping);
  const { chain } = buildValueChain(cards, chapterGrouping);

  const runningVals = {};
  values.forEach(v => { runningVals[v] = 0; });
  const valueChartData = ordered.map((c, i) => {
    const row = { index: i + 1, name: c.title };
    values.forEach(v => {
      if (chain[c.id] && chain[c.id][v]) runningVals[v] = chain[c.id][v].close;
      row[v] = runningVals[v];
    });
    return row;
  });

  const tagTypesList = (state.tagTypes && state.tagTypes.length)
    ? state.tagTypes
    : Array.from(new Set(cards.flatMap(c => (c.tags || []).filter(t => t.type !== 'Thread').map(t => t.type))));
  const dashPatterns = ['', '5 4', '2 2', '6 2 2 2', '1 3'];
  const dashForType = (type) => dashPatterns[Math.max(0, tagTypesList.indexOf(type)) % dashPatterns.length];

  const charCombos = [];
  const seenCombo = new Set();
  cards.forEach(c => (c.tags || []).forEach(t => {
    if (t.type !== 'Thread' && t.char && characters.includes(t.char)) {
      const key = t.char + '||' + t.type;
      if (!seenCombo.has(key)) { seenCombo.add(key); charCombos.push({ char: t.char, type: t.type, key }); }
    }
  }));

  const charTotals = {};
  charCombos.forEach(({ key }) => { charTotals[key] = 0; });
  const charChartData = ordered.map((c, i) => {
    const row = { index: i + 1, name: c.title };
    (c.tags || []).forEach(t => {
      if (t.type !== 'Thread' && t.char && characters.includes(t.char)) {
        charTotals[t.char + '||' + t.type] += t.direction === 'down' ? -1 : 1;
      }
    });
    charCombos.forEach(({ key }) => { row[key] = charTotals[key]; });
    return row;
  });

  const lineColors = ['#3b6fd4', '#3f9e4d', '#d4ab1f', '#d4791f', '#c93b3b', '#8a5fd4'];
  // Freytag zones are one continuous band for the whole book, but act numbers are chapter-scoped
  // (Act 1 in chapter 2 is not Act 1 of the book). This header strip groups act labels visibly by
  // chapter above the chart, so the two hierarchies read as separate rather than conflicting.
  const chapterSegs = (chapterGrouping || [])
    .map(ch => ({ id: ch.id, title: ch.title, count: ordered.filter(c => c.chapterId === ch.id).length }))
    .filter(seg => seg.count > 0);

  const [dimmedValues, setDimmedValues] = useState([]);
  const [dimmedChars, setDimmedChars] = useState([]);
  const toggleDim = (setter) => (key) => setter(s => s.includes(key) ? s.filter(k => k !== key) : [...s, key]);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '12px 16px' }}>
      <HelpNote on={help}>Story Value Arcs tracks how each value rises or falls as tagged cards go by. Character Arcs does the same per character and tag type; the shaded bands are the Freytag zones (setup / rising action / climax / falling action / resolution) for the whole book, while the dark strip above groups act numbers by chapter.</HelpNote>
      <h3 style={{ fontSize: 14 }}>Story Value Arcs</h3>
      {values.length === 0 ? <div style={{ fontSize: 13, color: '#999' }}>No values defined yet.</div> : (
        <MiniLineChart data={valueChartData} keys={values.map((v, i) => ({ key: v, color: lineColors[i % lineColors.length] }))}
          dimmed={dimmedValues} onToggleDim={toggleDim(setDimmedValues)} />
      )}

      <h3 style={{ fontSize: 14, marginTop: 24 }}>Character Arcs</h3>
      {characters.length === 0 ? <div style={{ fontSize: 13, color: '#999' }}>No characters defined yet.</div> :
       charCombos.length === 0 ? <div style={{ fontSize: 13, color: '#999' }}>No character tags yet.</div> : (
       <>
        {chapterSegs.length > 1 && (
          <div style={{ display: 'flex', width: 760, maxWidth: '100%', boxSizing: 'border-box', paddingLeft: 40, paddingRight: 16, marginBottom: 3 }}>
            {chapterSegs.map((seg, i) => (
              <div key={seg.id} title={seg.title} style={{
                flex: seg.count, minWidth: 0, borderLeft: i > 0 ? '1px dashed #999' : 'none',
                textAlign: 'center', fontSize: 10, fontWeight: 600, color: '#fff', background: '#2a2a2a',
                padding: '2px 4px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
              }}>{seg.title}</div>
            ))}
          </div>
        )}
        <MiniLineChart data={charChartData}
          keys={charCombos.map(({ char, type, key }) => ({
            key, name: `${char} — ${type}`,
            color: lineColors[characters.indexOf(char) % lineColors.length],
            dash: dashForType(type),
          }))}
          zones={FREYTAG_ZONES}
          dimmed={dimmedChars} onToggleDim={toggleDim(setDimmedChars)} />
       </>
      )}
    </div>
  );
}

