// @ts-nocheck -- JSX migrated without changing the original event and state logic.
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { hashColorIndex, THREAD_COLORS, CIRCLE_STAGES, uid, filterByChapter, GENERIC_PLACEHOLDER, resolveColor, resolveBorder, chronoOrderMap, numberThreadSteps, nudgeWithActAdoption } from '../domain/story';
import { HelpNote, CardEditModal } from '../components/EditorControls';
import { btnStyle, chipStyle, chipActiveStyle } from '../components/styles';
import { ZoomControls, ChipStack, ThreadsPanel, ThreadEditPopup, RemoteControl } from '../components/ThreadControls';
import { polar, autoDistributeGaps } from '../domain/circle';

/* ============================== STORY CIRCLE VIEW ============================== */

function angleForGapCard(gapIndex, posInGap, totalInGap) {
  const gapStart = -90 + gapIndex * 45; // 12 o'clock start, clockwise
  const span = 40; // leave small margin within 45deg gap
  if (totalInGap <= 1) return gapStart + 22.5;
  return gapStart + 2.5 + (span * posInGap) / (totalInGap - 1);
}

export function CircleView({ state, setState, pinnedIds, setPinnedIds, chapterFilter, onBackToRing, help }) {
  const { cards: allCards, characters, threads, values, chapters, tagTypes, threadNotes, threadColors } = state;
  const cards = useMemo(() => filterByChapter(allCards, chapterFilter), [allCards, chapterFilter]);
  const stages = (state.circleStages && state.circleStages.length === 8) ? state.circleStages : CIRCLE_STAGES;
  const stagesHidden = !!state.circleStagesHidden;
  const [stagesOpen, setStagesOpen] = useState(false);
  const [stagesDraft, setStagesDraft] = useState(stages);
  const [stagesHiddenDraft, setStagesHiddenDraft] = useState(stagesHidden);
  const openStagesEditor = () => { setStagesDraft(stages); setStagesHiddenDraft(stagesHidden); setStagesOpen(true); };
  const saveStages = () => {
    setState(s => ({ ...s, circleStages: stagesDraft.map(x => x.trim() || 'Untitled'), circleStagesHidden: stagesHiddenDraft }));
    setStagesOpen(false);
  };
  const [zoom, setZoom] = useState('full'); // full | compact
  const [hoveredId, setHoveredId] = useState(null);
  const [popupCard, setPopupCard] = useState(null);
  const [chipStack, setChipStack] = useState(null); // array of card ids, or null when closed
  const [mode, setMode] = useState('story'); // story | threads
  const [lockedThreads, setLockedThreads] = useState([]); // persisted locked thread names, no cap
  const [hoverThread, setHoverThread] = useState(null);
  const [threadPopup, setThreadPopup] = useState(null);
  const [ringRotation, setRingRotation] = useState(0); // degrees; cards/labels stay upright, only position moves

  const togglePin = (id) => setPinnedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const size = 1100;
  const cx = size / 2, cy = size / 2;
  const anchorR = 178;
  const cardR = 400;
  const cardW = zoom === 'compact' ? 150 : 200;

  const gapIndexById = useMemo(() => autoDistributeGaps(cards), [cards]);
  const gaps = Array.from({ length: 8 }, (_, g) => cards.map((c, i) => ({ c, i })).filter(({ c }) => gapIndexById[c.id] === g));

  const updateCard = (id, patch) => setState(s => ({ ...s, cards: s.cards.map(c => c.id === id ? { ...c, ...patch } : c) }));
  const removeCard = (id) => { setState(s => ({ ...s, cards: s.cards.filter(c => c.id !== id) })); setChipStack(prev => prev ? prev.filter(x => x !== id) : prev); };
  const addLib = (key) => (item) => setState(s => s[key].includes(item) ? s : { ...s, [key]: [...s[key], item] });
  const nudgeCard = (cardId, dir) => setState(s => {
    const idx = s.cards.findIndex(c => c.id === cardId);
    if (idx === -1) return s;
    return { ...s, cards: nudgeWithActAdoption(s.cards, idx, dir) };
  });
  const insertIntoStack = (pos) => {
    if (!chipStack) return;
    const newId = uid();
    setState(s => {
      const refId = pos < chipStack.length ? chipStack[pos] : chipStack[chipStack.length - 1];
      const idx = s.cards.findIndex(c => c.id === refId);
      if (idx === -1) return s;
      const ref = s.cards[idx];
      const insertAt = pos < chipStack.length ? idx : idx + 1;
      const arr = [...s.cards];
      arr.splice(insertAt, 0, { id: newId, act: ref.act, gapIndex: null, chapterId: ref.chapterId, title: 'New Card', text: '', notes: '', tags: [], values: [], placeholder: GENERIC_PLACEHOLDER, customColor: null, major: false });
      return { ...s, cards: arr };
    });
    let newStack = [...chipStack];
    newStack.splice(pos, 0, newId);
    if (newStack.length > 3) {
      if (pos === 0) newStack.pop(); else newStack.shift();
    }
    setChipStack(newStack);
  };


  // Angle for every card, resolved once from gap position — stable regardless of
  // pin/hover-driven paint-order changes below, and reused for the thread hub lines.
  const angleById = {};
  gaps.forEach((gapCards, g) => { gapCards.forEach(({ c }, pos) => { angleById[c.id] = angleForGapCard(g, pos, gapCards.length) + ringRotation; }); });
  const cardPos = {};
  cards.forEach(c => { cardPos[c.id] = polar(cx, cy, cardR, angleById[c.id]); });

  // Thread setups/payoffs derived from card tags, plus a stable colour and hub point per thread.
  const threadData = useMemo(() => {
    const map = {};
    threads.forEach(name => { map[name] = { setups: [], payoffs: [], steps: [] }; });
    cards.forEach(c => {
      (c.tags || []).forEach(t => {
        if (t.type === 'Thread') {
          if (!map[t.note]) map[t.note] = { setups: [], payoffs: [], steps: [] };
          if (t.role === 'setup') map[t.note].setups.push(c.id);
          else if (t.role === 'step') map[t.note].steps.push({ cardId: c.id });
          else map[t.note].payoffs.push(c.id);
        }
      });
    });
    const order = chronoOrderMap(allCards, chapters);
    Object.values(map).forEach(d => { d.steps = numberThreadSteps(d.steps, order); });
    return map;
  }, [allCards, cards, threads, chapters]);
  const threadNames = threads;
  const threadColor = (name) => (threadColors && threadColors[name]) || THREAD_COLORS[hashColorIndex(name) % THREAD_COLORS.length] || '#888780';
  const threadHub = (name) => {
    const i = threadNames.indexOf(name);
    const n = threadNames.length;
    const off = i - (n - 1) / 2;
    return { x: cx + off * 30, y: cy + off * 15 };
  };
  const cardThreadsOf = (cardId) => {
    const names = [];
    for (const name of threadNames) {
      const d = threadData[name];
      if (d && (d.setups.includes(cardId) || d.payoffs.includes(cardId) || d.steps.some(s => s.cardId === cardId))) names.push(name);
    }
    return names;
  };
  const toggleLockedThread = (name) => setLockedThreads(prev =>
    prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  const ensureLockedThread = (name) => setLockedThreads(prev =>
    prev.includes(name) ? prev : [...prev, name]);
  const effectiveThreads = hoverThread && !lockedThreads.includes(hoverThread) ? [...lockedThreads, hoverThread] : lockedThreads;

  // Thread editorial helpers — operate on the global card array (threads can span chapters).
  const addThreadRole = (threadName, cardId, role, stepNum) => setState(s => ({
    ...s, cards: s.cards.map(c => c.id === cardId
      ? { ...c, tags: [...c.tags, { id: uid(), type: 'Thread', role, note: threadName }] }
      : c),
  }));
  const createAndAddRole = (threadName, title, role, stepNum) => {
    const defaultChapterId = (chapterFilter && chapterFilter !== 'all') ? chapterFilter
      : ((chapters[chapters.length - 1] && chapters[chapters.length - 1].id) || null);
    setState(s => ({
      ...s, cards: [...s.cards, {
        id: uid(), act: null, gapIndex: null, chapterId: defaultChapterId, title, text: '', notes: '',
        tags: [{ id: uid(), type: 'Thread', role, note: threadName }],
        values: [], placeholder: GENERIC_PLACEHOLDER, customColor: null, major: false,
      }],
    }));
  };
  const removeThreadTag = (cardId, tagId) => setState(s => ({
    ...s, cards: s.cards.map(c => c.id === cardId ? { ...c, tags: c.tags.filter(t => t.id !== tagId) } : c),
  }));
  const renameThread = (oldName, newName) => setState(s => {
    if (!newName.trim() || newName === oldName) return s;
    const notes = { ...s.threadNotes };
    if (oldName in notes) { notes[newName] = notes[oldName]; delete notes[oldName]; }
    const colors = { ...(s.threadColors || {}) };
    if (oldName in colors) { colors[newName] = colors[oldName]; delete colors[oldName]; }
    const lanes = { ...(s.threadLanes || {}) };
    if (oldName in lanes) { lanes[newName] = lanes[oldName]; delete lanes[oldName]; }
    return {
      ...s,
      threads: s.threads.map(t => t === oldName ? newName : t),
      cards: s.cards.map(c => ({ ...c, tags: c.tags.map(t => (t.type === 'Thread' && t.note === oldName) ? { ...t, note: newName } : t) })),
      threadNotes: notes,
      threadColors: colors,
      threadLanes: lanes,
    };
  });
  const setThreadColorOverride = (name, hex) => setState(s => ({ ...s, threadColors: { ...(s.threadColors || {}), [name]: hex } }));
  const deleteThread = (name) => {
    setState(s => {
      const notes = { ...s.threadNotes };
      delete notes[name];
      const colors = { ...(s.threadColors || {}) };
      delete colors[name];
      const lanes = { ...(s.threadLanes || {}) };
      delete lanes[name];
      return {
        ...s,
        threads: s.threads.filter(t => t !== name),
        cards: s.cards.map(c => ({ ...c, tags: c.tags.filter(t => !(t.type === 'Thread' && t.note === name)) })),
        threadNotes: notes,
        threadColors: colors,
        threadLanes: lanes,
      };
    });
    setThreadPopup(null);
    setLockedThreads(prev => prev.filter(n => n !== name));
  };
  const updateThreadNotes = (name, text) => setState(s => ({ ...s, threadNotes: { ...s.threadNotes, [name]: text } }));

  // Flat, angle-resolved render order (matches Scene order). SVG paints elements in
  // document order and does not respect CSS z-index between sibling <foreignObject>s,
  // so "bring to front" is done by moving a card to the END of this render list rather
  // than via z-index — this also fixes the first card being unable to front the last.
  let renderList = gaps.flatMap((gapCards, g) => gapCards.map(({ c, i }, pos) => ({
    c, i, angle: angleForGapCard(g, pos, gapCards.length) + ringRotation,
  })));
  if (pinnedIds.length > 0) {
    pinnedIds.forEach(id => {
      const idx = renderList.findIndex(o => o.c.id === id);
      if (idx !== -1) renderList.push(renderList.splice(idx, 1)[0]);
    });
  }
  if (hoveredId && !pinnedIds.includes(hoveredId)) {
    const idx = renderList.findIndex(o => o.c.id === hoveredId);
    if (idx !== -1) renderList.push(renderList.splice(idx, 1)[0]);
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 2, background: '#f4f4f4', borderRadius: 8, padding: 2 }}>
          <button onClick={() => setMode('story')} style={{ ...btnStyle, border: 'none', background: mode === 'story' ? '#fff' : 'transparent', fontWeight: mode === 'story' ? 600 : 400 }}>Story</button>
          <button onClick={() => setMode('threads')} style={{ ...btnStyle, border: 'none', background: mode === 'threads' ? '#fff' : 'transparent', fontWeight: mode === 'threads' ? 600 : 400 }}>Threads</button>
        </div>
        {/* Compact zoom toggle removed (wasn't doing anything distinct from full) — zoom stays 'full'.
            ZoomControls + the 'compact' branches (cardW, etc.) are left in place below in case
            a real compact layout gets built later. */}
        <button onClick={() => setPinnedIds([])} style={btnStyle} title="Unpin everything and restore cascading stack order">Reset stacking</button>
        {mode === 'story' && (
          <button onClick={openStagesEditor} style={btnStyle} title="Rename or hide the eight stage labels around the ring">✎ Stage labels</button>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} title="Spin the ring — cards and labels stay upright, only their position moves">
          <span style={{ fontSize: 12, color: '#888' }}>Rotate</span>
          <input type="range" min={0} max={359} step={1} value={ringRotation}
            onChange={e => setRingRotation(Number(e.target.value))} style={{ width: 100 }} />
          {ringRotation !== 0 && (
            <button onClick={() => setRingRotation(0)} style={{ ...btnStyle, padding: '2px 8px' }} title="Reset rotation">Reset</button>
          )}
        </div>
        {onBackToRing && (
          <button onClick={onBackToRing} style={{ border: 'none', background: 'none', color: '#999', textDecoration: 'underline', cursor: 'pointer', fontSize: 12, marginLeft: 'auto' }}>
            ← Back to Ring view
          </button>
        )}
      </div>
      <HelpNote on={help}>This is the simple version of the ring layout — cards sit at a fixed distance from the center and can overlap once a stage gets crowded. Switch to Ring for a layout that never overlaps.</HelpNote>

      {stagesOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setStagesOpen(false)}>
          <div style={{ background: '#fff', borderRadius: 10, width: 340, padding: 20, boxShadow: '0 8px 30px rgba(0,0,0,0.25)' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 14px', fontSize: 15 }}>Stage labels</h3>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, marginBottom: 12 }}>
              <input type="checkbox" checked={stagesHiddenDraft} onChange={e => setStagesHiddenDraft(e.target.checked)} />
              Hide stage labels on the ring
            </label>
            {!stagesHiddenDraft && stagesDraft.map((label, i) => (
              <input key={i} value={label}
                onChange={e => setStagesDraft(prev => prev.map((x, j) => j === i ? e.target.value : x))}
                style={{ fontSize: 13, border: '1px solid #ddd', borderRadius: 8, padding: '5px 9px', width: '100%', boxSizing: 'border-box', marginBottom: 6 }} />
            ))}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
              <button onClick={() => setStagesOpen(false)} style={btnStyle}>Cancel</button>
              <button onClick={saveStages} style={{ ...btnStyle, border: 'none', background: '#222', color: '#fff' }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {mode === 'threads' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '10px 0' }}>
          <button onClick={() => setLockedThreads([])}
            style={{ ...chipStyle, ...(lockedThreads.length === 0 ? chipActiveStyle : {}) }}>All threads</button>
          {threadNames.map(name => (
            <button key={name} onClick={() => { ensureLockedThread(name); setThreadPopup(name); }}
              style={{ ...chipStyle, display: 'flex', alignItems: 'center', gap: 5, ...(lockedThreads.includes(name) ? chipActiveStyle : {}) }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: threadColor(name), display: 'inline-block' }} />
              {name}
            </button>
          ))}
          {threadNames.length === 0 && <span style={{ fontSize: 12, color: '#999' }}>No threads yet — tag a card as a Thread setup or payoff first.</span>}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
        <div style={{ flex: 1, minWidth: 0, overflow: 'auto', border: '1px solid #eee', borderRadius: 10 }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
            onClick={() => { if (mode === 'threads') setLockedThreads([]); }}>
          {mode === 'story' && (
            <>
              <circle cx={cx} cy={cy} r={anchorR} fill="none" stroke="#ddd" />
              {!stagesHidden && stages.map((stage, i) => {
                const angle = -90 + i * 45 + ringRotation;
                const p = polar(cx, cy, anchorR, angle);
                const lozW = stage.length * 9 + 26;
                const lozH = 28;
                return (
                  <foreignObject key={i} x={p.x - lozW / 2} y={p.y - lozH / 2} width={lozW} height={lozH} style={{ overflow: 'visible' }}>
                    <div style={{
                      width: '100%', height: '100%', background: '#e8e6e2', border: '1px solid #d2cfc9',
                      borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 600, color: '#555',
                    }}>{stage}</div>
                  </foreignObject>
                );
              })}
            </>
          )}
          {mode === 'threads' && threadNames.map(name => {
            const color = threadColor(name);
            const hub = threadHub(name);
            const isActive = effectiveThreads.length === 0 || effectiveThreads.includes(name);
            const lineOp = isActive ? 0.85 : 0.08;
            const hubOp = isActive ? 1 : 0.15;
            const enter = () => setHoverThread(name);
            const leave = () => setHoverThread(null);
            const lock = (e) => { e.stopPropagation(); toggleLockedThread(name); };
            const d = threadData[name] || { setups: [], payoffs: [] };
            return (
              <React.Fragment key={name}>
                {d.setups.map(cid => cardPos[cid] && (
                  <React.Fragment key={'s' + cid}>
                    <path d={`M${cardPos[cid].x} ${cardPos[cid].y} L${hub.x} ${hub.y}`} stroke={color} strokeWidth={10} opacity={0} style={{ cursor: 'pointer' }}
                      onMouseEnter={enter} onMouseLeave={leave} onClick={lock} />
                    <path d={`M${cardPos[cid].x} ${cardPos[cid].y} L${hub.x} ${hub.y}`} stroke={color} strokeWidth={2} opacity={lineOp} fill="none" />
                  </React.Fragment>
                ))}
                {d.payoffs.map(cid => cardPos[cid] && (
                  <React.Fragment key={'p' + cid}>
                    <path d={`M${hub.x} ${hub.y} L${cardPos[cid].x} ${cardPos[cid].y}`} stroke={color} strokeWidth={10} opacity={0} style={{ cursor: 'pointer' }}
                      onMouseEnter={enter} onMouseLeave={leave} onClick={lock} />
                    <path d={`M${hub.x} ${hub.y} L${cardPos[cid].x} ${cardPos[cid].y}`} stroke={color} strokeWidth={2} opacity={lineOp} fill="none" />
                  </React.Fragment>
                ))}
                <circle cx={hub.x} cy={hub.y} r={16} fill="transparent" style={{ cursor: 'pointer' }}
                  onMouseEnter={enter} onMouseLeave={leave}
                  onClick={(e) => { e.stopPropagation(); if (lockedThreads.includes(name)) setHoverThread(null); toggleLockedThread(name); }}
                  onDoubleClick={(e) => { e.stopPropagation(); ensureLockedThread(name); setThreadPopup(name); }} />
                <circle cx={hub.x} cy={hub.y} r={9} fill={color} opacity={hubOp} style={{ pointerEvents: 'none' }} />
              </React.Fragment>
            );
          })}
          {renderList.map(({ c, angle }) => {
            const p = polar(cx, cy, cardR, angle);
            const isFront = pinnedIds.includes(c.id) || hoveredId === c.id;
            const cardThreads = mode === 'threads' ? cardThreadsOf(c.id) : [];
            const dimmed = mode === 'threads' && effectiveThreads.length > 0 && !cardThreads.some(t => effectiveThreads.includes(t));
            return (
              <foreignObject key={c.id} x={p.x - cardW / 2} y={p.y - 30} width={cardW} height={60}
                style={{ overflow: 'visible' }}>
                <div
                  onMouseEnter={() => { setHoveredId(c.id); if (mode === 'threads' && cardThreads.length) setHoverThread(cardThreads[0]); }}
                  onMouseLeave={() => { setHoveredId(null); if (mode === 'threads') setHoverThread(null); }}
                  onClick={(e) => { e.stopPropagation(); if (mode === 'threads' && cardThreads.length) { const ct = cardThreads[0]; if (lockedThreads.includes(ct)) setHoverThread(null); toggleLockedThread(ct); } else togglePin(c.id); }}
                  onDoubleClick={(e) => { e.stopPropagation(); setPopupCard(c.id); }}
                  style={{
                    background: resolveColor(c), border: `1px solid ${resolveBorder(c)}`, borderRadius: 8,
                    padding: '6px 8px', fontSize: 12, cursor: 'pointer', position: 'relative',
                    transform: isFront ? 'scale(1.15)' : 'scale(1)',
                    boxShadow: isFront ? '0 4px 14px rgba(0,0,0,0.25)' : 'none',
                    opacity: dimmed ? 0.25 : 1,
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {zoom === 'full' && (
                      <button onClick={(e) => { e.stopPropagation(); nudgeCard(c.id, 1); }}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, padding: '0 2px', flexShrink: 0 }} title="Move clockwise">↻</button>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flex: 1, minWidth: 0 }}>
                      <span>{c.major ? '★ ' : ''}{c.title}</span>
                      <button onClick={(e) => { e.stopPropagation(); zoom === 'full' ? setChipStack([c.id]) : setPopupCard(c.id); }}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, padding: '0 2px', flexShrink: 0 }} title={zoom === 'full' ? 'Quick edit' : 'Open details'}>✎</button>
                    </div>
                    {zoom === 'full' && (
                      <button onClick={(e) => { e.stopPropagation(); nudgeCard(c.id, -1); }}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, padding: '0 2px', flexShrink: 0 }} title="Move anticlockwise">↺</button>
                    )}
                  </div>
                </div>
              </foreignObject>
            );
          })}
        </svg>
        </div>

        {mode === 'threads' && (
          <ThreadsPanel threadNames={threadNames} threadData={threadData} cards={cards} threadColor={threadColor}
            lockedThreads={lockedThreads} hoverThread={hoverThread} onToggle={toggleLockedThread}
            onOpenPopup={name => { ensureLockedThread(name); setThreadPopup(name); }} />
        )}
      </div>

      {mode === 'threads' && (
        <div style={{ fontSize: 12, color: '#999', marginTop: 6 }}>Hover a line, hub, or card to preview its thread. Click to lock the dimming. Click a hub to edit that thread.</div>
      )}

      <RemoteControl cards={cards} updateCard={updateCard} setState={setState} chapterFilter={chapterFilter} chapters={chapters} />

      {popupCard && (
        <CardEditModal
          card={cards.find(c => c.id === popupCard)} cards={cards} onClose={() => setPopupCard(null)}
          updateCard={p => updateCard(popupCard, p)} onNudge={dir => nudgeCard(popupCard, dir)}
          onDelete={() => removeCard(popupCard)}
          characters={characters} threads={threads} valuesLib={values} onAddThread={addLib('threads')}
          tagTypes={tagTypes} onAddTagType={addLib('tagTypes')}
        />
      )}

      {chipStack && (
        <ChipStack
          ids={chipStack} cards={cards} gapIndexById={gapIndexById} stages={stages} stagesHidden={stagesHidden}
          updateCard={updateCard} onInsert={insertIntoStack} onDelete={removeCard} onNudge={nudgeCard}
          onOpenFull={id => { setChipStack(null); setPopupCard(id); }}
          onClose={() => setChipStack(null)}
        />
      )}

      {threadPopup && (
        <ThreadEditPopup
          name={threadPopup} data={threadData[threadPopup] || { setups: [], payoffs: [], steps: [] }}
          cards={cards} color={threadColor(threadPopup)}
          colorOverride={(threadColors && threadColors[threadPopup]) || null}
          onColorChange={hex => setThreadColorOverride(threadPopup, hex)}
          notes={(threadNotes && threadNotes[threadPopup]) || ''}
          onClose={() => setThreadPopup(null)}
          onRename={newName => { renameThread(threadPopup, newName); setThreadPopup(newName); setLockedThreads(prev => prev.map(n => n === threadPopup ? newName : n)); }}
          onAddRole={(cardId, role, stepNum) => addThreadRole(threadPopup, cardId, role, stepNum)}
          onCreateAndAddRole={(title, role, stepNum) => createAndAddRole(threadPopup, title, role, stepNum)}
          onRemoveTag={(cardId, tagId) => removeThreadTag(cardId, tagId)}
          onDelete={() => deleteThread(threadPopup)}
          onNotesChange={text => updateThreadNotes(threadPopup, text)}
        />
      )}
    </div>
  );
}
