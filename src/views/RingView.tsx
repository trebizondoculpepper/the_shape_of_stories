// @ts-nocheck -- JSX migrated without changing the original event and state logic.
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { hashColorIndex, ACT_NAMES, THREAD_COLORS, CIRCLE_STAGES, uid, filterByChapter, GENERIC_PLACEHOLDER, resolveColor, resolveBorder, chronoOrderMap, numberThreadSteps, nudgeWithActAdoption } from '../domain/story';
import { HelpNote, CardEditModal } from '../components/EditorControls';
import { btnStyle, chipStyle, chipActiveStyle } from '../components/styles';
import { ThreadsPanel, ThreadEditPopup, RemoteControl } from '../components/ThreadControls';
import { polar, autoDistributeGaps } from '../domain/circle';

/* ============================== STORY RING VIEW ============================== */

// Wedges tile a gap's 45° slice exactly (42° usable, 1.5° margin each side), so unlike
// Circle's fixed-width chips on a fixed radius, cards physically cannot overlap.
function wedgeSpanForGapCard(gapIndex, posInGap, totalInGap, ringRotation) {
  const gapStart = -90 + gapIndex * 45 + ringRotation;
  const usable = 42, margin = 1.5;
  const per = usable / totalInGap;
  const a0 = gapStart + margin + posInGap * per;
  return { a0, a1: a0 + per };
}

function sectorPath(cx, cy, ri, ro, aStart, aEnd) {
  const p1 = polar(cx, cy, ro, aStart), p2 = polar(cx, cy, ro, aEnd);
  const p3 = polar(cx, cy, ri, aEnd), p4 = polar(cx, cy, ri, aStart);
  return `M${p1.x},${p1.y} A${ro},${ro} 0 0 1 ${p2.x},${p2.y} L${p3.x},${p3.y} A${ri},${ri} 0 0 0 ${p4.x},${p4.y} Z`;
}

function ringLabelRotation(angleDeg) {
  let a = ((angleDeg % 360) + 540) % 360 - 180;
  if (a > 90) a -= 180;
  if (a < -90) a += 180;
  return a;
}

// Text runs radially (rotated to the wedge's spoke), so wrap length is the radial span
// and stacked lines consume tangential room (the wedge's chord width at mid-radius).
function fitRingLabel(title, radialLen, tangLen) {
  for (const fs of [12, 11, 10, 9, 8]) {
    const cw = fs * 0.56, lh = fs * 1.25;
    const maxChars = Math.floor(radialLen / cw);
    let lines = 1, cur = 0, ok = true;
    (title || '').split(/\s+/).filter(Boolean).forEach(word => {
      if (word.length > maxChars) { ok = false; return; }
      if (cur === 0) cur = word.length;
      else if (cur + 1 + word.length <= maxChars) cur += 1 + word.length;
      else { lines++; cur = word.length; }
    });
    if (ok && lines * lh <= tangLen) return { fs, lines, lh };
  }
  return null;
}

function wrapTrackTitle(title, maxChars) {
  const words = (title || 'Untitled').split(/\s+/).filter(Boolean);
  const lines = [''];
  words.forEach(w => {
    const cur = lines[lines.length - 1];
    if (!cur) lines[lines.length - 1] = w;
    else if (cur.length + 1 + w.length <= maxChars) lines[lines.length - 1] = cur + ' ' + w;
    else lines.push(w);
  });
  const clip = (s) => s.length > maxChars ? s.slice(0, Math.max(1, maxChars - 1)) + '\u2026' : s;
  if (lines.length > 2) return [clip(lines[0]), clip(lines.slice(1).join(' '))];
  return lines.map(clip);
}

export function RingView({ state, setState, chapterFilter, onOpenClassic, help }) {
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
  const [hoveredId, setHoveredId] = useState(null);
  const [popupCard, setPopupCard] = useState(null);
  const [mode, setMode] = useState('story'); // story | threads
  const [lockedThreads, setLockedThreads] = useState([]); // persisted locked thread names, no cap
  const [hoverThread, setHoverThread] = useState(null);
  const [threadPopup, setThreadPopup] = useState(null);
  const [ringRotation, setRingRotation] = useState(0);
  const [debug, setDebug] = useState(false);
  const svgRef = useRef(null);
  const dragRef = useRef(null);
  const justDragged = useRef(false);
  const [drag, setDrag] = useState(null); // { id, from, x, y, r, a } while a wedge is being dragged
  const [trackAngles, setTrackAngles] = useState({}); // view-only parking angles for unplaced scenes

  const size = 1100;
  const cx = size / 2, cy = size / 2;
  const ri = 190, ro = 460;
  const tri = ro + 14, tro = ro + 68, trc = (tri + tro) / 2; // outer track for unplaced scenes (fixed, never rotates)

  const ringCards = useMemo(() => cards.filter(c => c.act), [cards]);
  const trackCards = useMemo(() => cards.filter(c => !c.act), [cards]);
  const gapIndexById = useMemo(() => autoDistributeGaps(ringCards), [ringCards]);
  const gaps = Array.from({ length: 8 }, (_, g) => ringCards.map((c, i) => ({ c, i })).filter(({ c }) => gapIndexById[c.id] === g));

  const updateCard = (id, patch) => setState(s => ({ ...s, cards: s.cards.map(c => c.id === id ? { ...c, ...patch } : c) }));
  const removeCard = (id) => setState(s => ({ ...s, cards: s.cards.filter(c => c.id !== id) }));
  const addLib = (key) => (item) => setState(s => s[key].includes(item) ? s : { ...s, [key]: [...s[key], item] });
  const nudgeCard = (cardId, dir) => setState(s => {
    const idx = s.cards.findIndex(c => c.id === cardId);
    if (idx === -1) return s;
    return { ...s, cards: nudgeWithActAdoption(s.cards, idx, dir) };
  });

  // Wedge span for every card, resolved once from gap position.
  const wedgeById = {};
  gaps.forEach((gapCards, g) => { gapCards.forEach(({ c }, pos) => { wedgeById[c.id] = { ...wedgeSpanForGapCard(g, pos, gapCards.length, ringRotation), g, i: pos, n: gapCards.length }; }); });
  // Thread anchor: wedge's inner-edge midpoint, so connector lines live in the ring's empty
  // center hole and never cross the wedge band (unlike Circle's hub lines to chip centers).
  const anchorPos = {};
  cards.forEach(c => { const w = wedgeById[c.id]; if (w) anchorPos[c.id] = polar(cx, cy, ri, (w.a0 + w.a1) / 2); });

  // ---- Outer track (unplaced scenes) ----
  const perSlot = Math.min(28, 340 / Math.max(1, trackCards.length));
  const trackMid = (c, idx) => trackAngles[c.id] !== undefined ? trackAngles[c.id] : -90 + perSlot * (idx + 0.5);
  const normAngle = (a) => (a < -90 ? a + 360 : a);
  const circDist = (a, b) => Math.abs((((a - b) % 360) + 540) % 360 - 180);
  // Insertion boundary in the ring nearest an angle: k = "before ring card k"; k = m means after the last.
  const ringWedges = ringCards.map(c => wedgeById[c.id]).filter(Boolean);
  const insertAt = (angle) => {
    const m = ringWedges.length;
    if (m === 0) return { k: 0, ang: -90 + ringRotation };
    let best = { k: 0, ang: ringWedges[0].a0 }, bd = Infinity;
    for (let k = 0; k <= m; k++) {
      const ang = k < m ? ringWedges[k].a0 : ringWedges[m - 1].a1;
      const dd = circDist(angle, ang);
      if (dd < bd) { bd = dd; best = { k, ang }; }
    }
    return best;
  };
  const placeCard = (id, k) => setState(s => {
    const card = s.cards.find(c => c.id === id);
    if (!card) return s;
    const rest = s.cards.filter(c => c.id !== id);
    const ids = ringCards.filter(c => c.id !== id).map(c => c.id);
    const prev = k > 0 ? ids[k - 1] : null, next = k < ids.length ? ids[k] : null;
    let at = rest.length;
    if (next) at = rest.findIndex(c => c.id === next);
    else if (prev) at = rest.findIndex(c => c.id === prev) + 1;
    const ref = rest.find(c => c.id === (prev || next));
    const arr = [...rest];
    arr.splice(at, 0, { ...card, act: ref ? ref.act : 1 });
    return { ...s, cards: arr };
  });
  const startDrag = (e, c, from) => {
    if (e.button !== undefined && e.button !== 0) return;
    dragRef.current = { id: c.id, from, sx: e.clientX, sy: e.clientY, moved: false };
  };
  const finishDrag = (d, p) => {
    const inTrack = p.r >= ro + 6;
    if (inTrack) {
      setTrackAngles(t => ({ ...t, [d.id]: normAngle(p.a) }));
      if (d.from === 'ring') updateCard(d.id, { act: null });
      return;
    }
    if (d.from === 'track' && p.r >= ri - 10) placeCard(d.id, insertAt(p.a).k);
  };
  useEffect(() => {
    const info = (e) => {
      const r = svgRef.current.getBoundingClientRect();
      const k = size / r.width;
      const x = (e.clientX - r.left) * k, y = (e.clientY - r.top) * k;
      return { x, y, r: Math.hypot(x - cx, y - cy), a: Math.atan2(y - cy, x - cx) * 180 / Math.PI };
    };
    const move = (e) => {
      const d = dragRef.current;
      if (!d || !svgRef.current) return;
      if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 6) return;
      d.moved = true;
      setHoveredId(null);
      setDrag({ id: d.id, from: d.from, ...info(e) });
    };
    const up = (e) => {
      const d = dragRef.current;
      dragRef.current = null;
      if (!d || !d.moved || !svgRef.current) return;
      justDragged.current = true;
      setTimeout(() => { justDragged.current = false; }, 60);
      setDrag(null);
      finishDrag(d, info(e));
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
  });

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
  const toggleLockedThread = (name) => setLockedThreads(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  const ensureLockedThread = (name) => setLockedThreads(prev => prev.includes(name) ? prev : [...prev, name]);
  const effectiveThreads = hoverThread && !lockedThreads.includes(hoverThread) ? [...lockedThreads, hoverThread] : lockedThreads;

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

  const ringAnchorR = 105;

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 2, background: '#f4f4f4', borderRadius: 8, padding: 2 }}>
          <button onClick={() => setMode('story')} style={{ ...btnStyle, border: 'none', background: mode === 'story' ? '#fff' : 'transparent', fontWeight: mode === 'story' ? 600 : 400 }}>Story</button>
          <button onClick={() => setMode('threads')} style={{ ...btnStyle, border: 'none', background: mode === 'threads' ? '#fff' : 'transparent', fontWeight: mode === 'threads' ? 600 : 400 }}>Threads</button>
        </div>
        {mode === 'story' && (
          <button onClick={openStagesEditor} style={btnStyle} title="Rename or hide the eight stage labels in the ring's center">✎ Stage labels</button>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} title="Spin the ring — wedges and labels stay upright, only their position moves">
          <span style={{ fontSize: 12, color: '#888' }}>Rotate</span>
          <input type="range" min={0} max={359} step={1} value={ringRotation}
            onChange={e => setRingRotation(Number(e.target.value))} style={{ width: 100 }} />
          {ringRotation !== 0 && (
            <button onClick={() => setRingRotation(0)} style={{ ...btnStyle, padding: '2px 8px' }} title="Reset rotation">Reset</button>
          )}
        </div>
        <button onClick={() => setDebug(d => !d)} style={{ ...btnStyle, background: debug ? '#333' : '#fff', color: debug ? '#fff' : '#333' }} title="Show wedge geometry guides">Debug</button>
        {onOpenClassic && (
          <button onClick={onOpenClassic} style={{ border: 'none', background: 'none', color: '#999', textDecoration: 'underline', cursor: 'pointer', fontSize: 12, marginLeft: 'auto' }}>
            Switch to simple Circle view
          </button>
        )}
      </div>
      <HelpNote on={help}>Story mode shows the eight beats of the Campbell/Harmon Hero's Journey around the ring — rename or hide them with "Stage labels" if your story doesn't map onto this shape. Threads mode shows setup → payoff connections instead; click a thread to lock it and dim everything else. Rotate spins the ring without moving cards relative to each other. Scenes with no act sit in the outer track: drag one onto a gap in the ring to place it there, or drag a ring scene out to the track to unplace it.</HelpNote>

      {stagesOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setStagesOpen(false)}>
          <div style={{ background: '#fff', borderRadius: 10, width: 340, padding: 20, boxShadow: '0 8px 30px rgba(0,0,0,0.25)' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 14px', fontSize: 15 }}>Stage labels</h3>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, marginBottom: 12 }}>
              <input type="checkbox" checked={stagesHiddenDraft} onChange={e => setStagesHiddenDraft(e.target.checked)} />
              Hide stage labels in the ring's center
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
          <svg ref={svgRef} width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ userSelect: 'none' }}
            onClick={() => { if (justDragged.current) return; setHoveredId(null); if (mode === 'threads') setLockedThreads([]); }}>
            {(trackCards.length > 0 || (drag && drag.from === 'ring')) && (
              <circle cx={cx} cy={cy} r={trc} fill="none" stroke={drag && drag.from === 'ring' && drag.r >= ro + 6 ? '#185FA5' : '#999'}
                strokeWidth={tro - tri} strokeDasharray="3 5" opacity={drag && drag.from === 'ring' && drag.r >= ro + 6 ? 0.3 : 0.18} style={{ pointerEvents: 'none' }} />
            )}
            {trackCards.map((c, idx) => {
              const dragging = drag && drag.id === c.id && drag.from === 'track';
              if (dragging && drag.r < ro + 6) return null;
              const mid = dragging ? normAngle(drag.a) : trackMid(c, idx);
              const a0 = mid - perSlot / 2, a1 = mid + perSlot / 2;
              const bottom = Math.sin(mid * Math.PI / 180) > 0.0001;
              const arcLen = perSlot * Math.PI / 180 * trc * 0.88;
              const lines = wrapTrackTitle(c.title, Math.max(4, Math.floor(arcLen / 6.3)));
              const radii = lines.length === 1
                ? [bottom ? trc + 4 : trc - 4]
                : (bottom ? [trc - 3, trc + 11] : [trc + 3, trc - 11]);
              const cardThreads = mode === 'threads' ? cardThreadsOf(c.id) : [];
              const dimmed = mode === 'threads' && effectiveThreads.length > 0 && !cardThreads.some(t => effectiveThreads.includes(t));
              const isHovered = hoveredId === c.id;
              const m = 2.5;
              return (
                <React.Fragment key={'trk' + c.id}>
                  <path d={sectorPath(cx, cy, tri + 2, tro - 2, a0, a1)}
                    fill={resolveColor(c)} stroke={dragging ? '#185FA5' : resolveBorder(c)} strokeWidth={dragging ? 3 : (isHovered ? 2.5 : 1)}
                    opacity={dimmed ? 0.15 : 1} style={{ cursor: dragging ? 'grabbing' : 'grab', touchAction: 'none' }}
                    onPointerDown={e => startDrag(e, c, 'track')}
                    onMouseEnter={() => { if (!drag) setHoveredId(c.id); if (mode === 'threads' && cardThreads.length) setHoverThread(cardThreads[0]); }}
                    onMouseLeave={() => { setHoveredId(null); if (mode === 'threads') setHoverThread(null); }}
                    onClick={(e) => { e.stopPropagation(); if (justDragged.current) return; if (mode === 'threads') { if (cardThreads.length) { const ct = cardThreads[0]; if (lockedThreads.includes(ct)) setHoverThread(null); toggleLockedThread(ct); } } else { setPopupCard(c.id); } }}
                    onDoubleClick={(e) => { e.stopPropagation(); setPopupCard(c.id); }} />
                  {lines.map((ln, j) => {
                    const r = radii[j];
                    const s0 = bottom ? polar(cx, cy, r, a1 - m) : polar(cx, cy, r, a0 + m);
                    const s1 = bottom ? polar(cx, cy, r, a0 + m) : polar(cx, cy, r, a1 - m);
                    const pid = `trk-${c.id}-${j}`;
                    return (
                      <React.Fragment key={j}>
                        <defs><path id={pid} d={`M${s0.x} ${s0.y} A${r} ${r} 0 0 ${bottom ? 0 : 1} ${s1.x} ${s1.y}`} /></defs>
                        <text fontSize="11" fill="#333" textAnchor="middle" fontWeight={c.major ? 700 : 400} opacity={dimmed ? 0.15 : 1} style={{ pointerEvents: 'none' }}>
                          <textPath href={`#${pid}`} startOffset="50%">{(c.major && j === 0 ? '\u2605 ' : '') + ln}</textPath>
                        </text>
                      </React.Fragment>
                    );
                  })}
                </React.Fragment>
              );
            })}
            {mode === 'story' && !stagesHidden && stages.map((stage, i) => {
              const angle = -90 + i * 45 + ringRotation;
              const p = polar(cx, cy, ringAnchorR, angle);
              const lozW = stage.length * 8 + 20;
              const lozH = 22;
              return (
                <foreignObject key={i} x={p.x - lozW / 2} y={p.y - lozH / 2} width={lozW} height={lozH} style={{ overflow: 'visible', pointerEvents: 'none' }}>
                  <div style={{
                    width: '100%', height: '100%', background: '#e8e6e2', border: '1px solid #d2cfc9',
                    borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 600, color: '#555',
                  }}>{stage}</div>
                </foreignObject>
              );
            })}
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
                  {d.setups.map(cid => anchorPos[cid] && (
                    <React.Fragment key={'s' + cid}>
                      <path d={`M${anchorPos[cid].x} ${anchorPos[cid].y} L${hub.x} ${hub.y}`} stroke={color} strokeWidth={10} opacity={0} style={{ cursor: 'pointer' }}
                        onMouseEnter={enter} onMouseLeave={leave} onClick={lock} />
                      <path d={`M${anchorPos[cid].x} ${anchorPos[cid].y} L${hub.x} ${hub.y}`} stroke={color} strokeWidth={2} opacity={lineOp} fill="none" />
                    </React.Fragment>
                  ))}
                  {d.payoffs.map(cid => anchorPos[cid] && (
                    <React.Fragment key={'p' + cid}>
                      <path d={`M${hub.x} ${hub.y} L${anchorPos[cid].x} ${anchorPos[cid].y}`} stroke={color} strokeWidth={10} opacity={0} style={{ cursor: 'pointer' }}
                        onMouseEnter={enter} onMouseLeave={leave} onClick={lock} />
                      <path d={`M${hub.x} ${hub.y} L${anchorPos[cid].x} ${anchorPos[cid].y}`} stroke={color} strokeWidth={2} opacity={lineOp} fill="none" />
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
            {ringCards.map(c => {
              const w = wedgeById[c.id];
              if (!w) return null;
              const midR = (ri + ro) / 2;
              const mid = (w.a0 + w.a1) / 2;
              const p = polar(cx, cy, midR, mid);
              const rot = ringLabelRotation(mid);
              const spanRad = ((w.a1 - w.a0) * Math.PI) / 180;
              const radialLen = (ro - ri) * 0.92;
              const tangLen = 2 * (ri + (ro - ri) * 0.3) * Math.sin(spanRad / 2) * 0.9;
              const fit = fitRingLabel(c.title, radialLen, tangLen);
              const cardThreads = mode === 'threads' ? cardThreadsOf(c.id) : [];
              const dimmed = mode === 'threads' && effectiveThreads.length > 0 && !cardThreads.some(t => effectiveThreads.includes(t));
              const isHovered = hoveredId === c.id;
              const lp = polar(cx, cy, ro + 16, mid);
              return (
                <React.Fragment key={c.id}>
                  <path d={sectorPath(cx, cy, ri, ro, w.a0, w.a1)}
                    fill={resolveColor(c)} stroke={resolveBorder(c)} strokeWidth={isHovered ? 2.5 : 1}
                    opacity={dimmed ? 0.15 : 1} style={{ cursor: 'pointer' }}
                    onPointerDown={mode === 'story' ? (e => startDrag(e, c, 'ring')) : undefined}
                    onMouseEnter={() => { if (!drag) setHoveredId(c.id); if (mode === 'threads' && cardThreads.length) setHoverThread(cardThreads[0]); }}
                    onMouseLeave={() => { setHoveredId(null); if (mode === 'threads') setHoverThread(null); }}
                    onClick={(e) => { e.stopPropagation(); if (justDragged.current) return; if (mode === 'threads') { if (cardThreads.length) { const ct = cardThreads[0]; if (lockedThreads.includes(ct)) setHoverThread(null); toggleLockedThread(ct); } } else { setPopupCard(c.id); } }}
                    onDoubleClick={(e) => { e.stopPropagation(); setPopupCard(c.id); }} />
                  {fit && (
                    <foreignObject x={p.x - radialLen / 2} y={p.y - tangLen / 2} width={radialLen} height={tangLen} style={{ overflow: 'visible', pointerEvents: 'none' }}>
                      <div style={{
                        width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
                        transform: `rotate(${rot}deg)`, fontSize: fit.fs, lineHeight: `${fit.lh}px`, color: '#333', fontWeight: c.major ? 700 : 400,
                        wordBreak: 'break-word', whiteSpace: 'normal',
                      }}>{c.major ? '★ ' : ''}{c.title}</div>
                    </foreignObject>
                  )}
                  {isHovered && (
                    <foreignObject x={lp.x - 90} y={lp.y - 24} width={180} height={80} style={{ overflow: 'visible', pointerEvents: 'none' }}>
                      <div style={{ background: '#222', color: '#fff', borderRadius: 8, padding: '6px 9px', fontSize: 11, lineHeight: 1.4, boxShadow: '0 4px 14px rgba(0,0,0,0.25)' }}>
                        <div style={{ fontWeight: 600 }}>{c.title}</div>
                        <div style={{ opacity: 0.75 }}>
                          {(chapters.find(ch => ch.id === c.chapterId) || {}).title || 'Unassigned chapter'}{c.act ? ` · ${ACT_NAMES[c.act]}` : ''}
                        </div>
                        {cardThreadsOf(c.id).length > 0 && <div style={{ opacity: 0.75 }}>{cardThreadsOf(c.id).join(', ')}</div>}
                      </div>
                    </foreignObject>
                  )}
                  {debug && (
                    <g style={{ pointerEvents: 'none' }}>
                      <line x1={polar(cx, cy, ri, mid).x} y1={polar(cx, cy, ri, mid).y} x2={polar(cx, cy, ro, mid).x} y2={polar(cx, cy, ro, mid).y}
                        stroke="#e0245e" strokeWidth="0.75" strokeDasharray="4 3" />
                      <line x1={p.x - 6} y1={p.y} x2={p.x + 6} y2={p.y} stroke="#e0245e" strokeWidth="1.5" />
                      <line x1={p.x} y1={p.y - 6} x2={p.x} y2={p.y + 6} stroke="#e0245e" strokeWidth="1.5" />
                      <text x={lp.x} y={lp.y} fontSize="10" fill="#e0245e" textAnchor="middle">{stages[w.g]} {w.i + 1}/{w.n}{fit ? '' : ' (no label)'}</text>
                    </g>
                  )}
                </React.Fragment>
              );
            })}
            {drag && drag.r < ro + 6 && (() => {
              const c = cards.find(x => x.id === drag.id);
              if (!c) return null;
              const ins = drag.from === 'track' && drag.r >= ri - 10 ? insertAt(drag.a) : null;
              const p1 = ins ? polar(cx, cy, ri - 6, ins.ang) : null, p2 = ins ? polar(cx, cy, ro + 6, ins.ang) : null;
              return (
                <g style={{ pointerEvents: 'none' }}>
                  {ins && <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#185FA5" strokeWidth="5" strokeLinecap="round" />}
                  <foreignObject x={drag.x + 10} y={drag.y + 10} width={180} height={30} style={{ overflow: 'visible' }}>
                    <div style={{ background: '#222', color: '#fff', borderRadius: 8, padding: '4px 9px', fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180, boxSizing: 'border-box' }}>{c.title}</div>
                  </foreignObject>
                </g>
              );
            })()}
            {!drag && hoveredId && trackCards.some(c => c.id === hoveredId) && (() => {
              const c = trackCards.find(x => x.id === hoveredId);
              return (
                <foreignObject x={cx - 90} y={cy - 30} width={180} height={80} style={{ overflow: 'visible', pointerEvents: 'none' }}>
                  <div style={{ background: '#222', color: '#fff', borderRadius: 8, padding: '6px 9px', fontSize: 11, lineHeight: 1.4, boxShadow: '0 4px 14px rgba(0,0,0,0.25)' }}>
                    <div style={{ fontWeight: 600 }}>{c.title}</div>
                    <div style={{ opacity: 0.75 }}>Unplaced · {(chapters.find(ch => ch.id === c.chapterId) || {}).title || 'Unassigned chapter'}</div>
                    {cardThreadsOf(c.id).length > 0 && <div style={{ opacity: 0.75 }}>{cardThreadsOf(c.id).join(', ')}</div>}
                  </div>
                </foreignObject>
              );
            })()}
          </svg>
        </div>

        {mode === 'threads' && (
          <ThreadsPanel threadNames={threadNames} threadData={threadData} cards={cards} threadColor={threadColor}
            lockedThreads={lockedThreads} hoverThread={hoverThread} onToggle={toggleLockedThread}
            onOpenPopup={name => { ensureLockedThread(name); setThreadPopup(name); }} />
        )}
      </div>

      {mode === 'threads' && (
        <div style={{ fontSize: 12, color: '#999', marginTop: 6 }}>Hover a line, hub, or wedge to preview its thread. Click to lock the dimming. Click a hub to edit that thread.</div>
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
