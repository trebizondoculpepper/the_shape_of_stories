// @ts-nocheck -- JSX migrated without changing the original event and state logic.
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { hashColorIndex, THREAD_COLORS, uid, GENERIC_PLACEHOLDER, chronoOrderMap, nudgeWithActAdoption } from '../domain/story';
import { SegButtons, HelpNote, CardEditModal } from '../components/EditorControls';
import { btnStyle } from '../components/styles';
import { ThreadEditPopup } from '../components/ThreadControls';

/* ============================== THREAD LIBRARY ============================== */

export function ThreadLibraryView({ state, setState, help }) {
  const { cards, threads, characters, values, chapters, tagTypes, threadNotes, threadColors, threadLanes } = state;
  const [popupCard, setPopupCard] = useState(null);
  const [selectedThread, setSelectedThread] = useState(null);
  const [clearOpen, setClearOpen] = useState(false);
  const [clearMode, setClearMode] = useState('links');
  const [display, setDisplay] = useState('swim'); // 'swim' | 'web'
  const [manageThread, setManageThread] = useState(null);
  const [newThreadOpen, setNewThreadOpen] = useState(false);
  const [newThreadName, setNewThreadName] = useState('');
  const [hoverPoint, setHoverPoint] = useState(null);
  const webWrapRef = useRef(null);

  const updateCard = (id, patch) => setState(s => ({ ...s, cards: s.cards.map(c => c.id === id ? { ...c, ...patch } : c) }));
  const nudgeCard = (cardId, dir) => setState(s => {
    const idx = s.cards.findIndex(c => c.id === cardId);
    if (idx === -1) return s;
    return { ...s, cards: nudgeWithActAdoption(s.cards, idx, dir) };
  });
  const addLib = (key) => (item) => setState(s => s[key].includes(item) ? s : { ...s, [key]: [...s[key], item] });

  const threadColor = (name) => (threadColors && threadColors[name]) || THREAD_COLORS[hashColorIndex(name) % THREAD_COLORS.length] || '#888780';
  const chapterTitle = (chapterId) => (chapters.find(ch => ch.id === chapterId) || {}).title || '';

  // Ordered entries per thread, in story (card array) order — mirrors Circle's threadData
  // but unfiltered by chapter, since threads span the whole story. Within a thread, entries
  // are ranked setup first, then steps by their step number, then payoff last.
  const roleRank = (e, order) => e.role === 'setup' ? -1e12 : e.role === 'payoff' ? 1e12 : (order[e.cardId] ?? 1e9);
  const entriesByThread = useMemo(() => {
    const map = {};
    threads.forEach(name => { map[name] = []; });
    cards.forEach(c => {
      (c.tags || []).forEach(t => {
        if (t.type === 'Thread') {
          if (!map[t.note]) map[t.note] = [];
          map[t.note].push({ cardId: c.id, role: t.role, tagId: t.id, title: c.title, chapter: chapterTitle(c.chapterId) });
        }
      });
    });
    const order = chronoOrderMap(cards, chapters);
    Object.values(map).forEach(list => {
      list.sort((a, b) => roleRank(a, order) - roleRank(b, order));
      let n = 0;
      list.forEach(e => { if (e.role === 'step') e.step = ++n; });
    });
    return map;
  }, [cards, threads, chapters]);

  const isResolved = (name) => (entriesByThread[name] || []).some(e => e.role === 'payoff');
  const openNames = threads.filter(n => !isResolved(n));
  const resolvedNames = threads.filter(n => isResolved(n));

  // Thread Web lanes are assigned once per thread and kept for the thread's lifetime, so
  // deleting one thread never shifts another's row. Freed numbers (from deleted threads) are
  // reused by the next *new* thread rather than growing unboundedly.
  useEffect(() => {
    const missing = threads.filter(n => !threadLanes || threadLanes[n] === undefined);
    if (missing.length === 0) return;
    setState(s => {
      const lanes = { ...(s.threadLanes || {}) };
      missing.forEach(name => {
        if (lanes[name] !== undefined) return;
        let n = 0;
        const used = new Set(Object.values(lanes));
        while (used.has(n)) n++;
        lanes[name] = n;
      });
      return { ...s, threadLanes: lanes };
    });
  }, [threads, threadLanes]);

  // Web layout: threads as lines across story order, converging at cards shared by >1 thread.
  // Always computed over every thread (not just the selected one) so lane positions stay put
  // and shared-card convergence points remain visible; selection only affects render opacity.
  const webLayout = useMemo(() => {
    const cardIndex = {};
    cards.forEach((c, i) => { cardIndex[c.id] = i; });
    const laneGap = 64, yStart = 50, xStart = 90, xGap = 140;
    const laneOf = {};
    threads.forEach((name, i) => { laneOf[name] = (threadLanes && threadLanes[name] !== undefined) ? threadLanes[name] : i; });
    const cardIdsUsed = new Set();
    threads.forEach(name => (entriesByThread[name] || []).forEach(e => cardIdsUsed.add(e.cardId)));
    const slots = [...cardIdsUsed].sort((a, b) => (cardIndex[a] ?? 0) - (cardIndex[b] ?? 0));
    const slotOf = {};
    slots.forEach((id, i) => { slotOf[id] = i; });
    const threadsPerCard = {};
    threads.forEach(name => (entriesByThread[name] || []).forEach(e => {
      threadsPerCard[e.cardId] = (threadsPerCard[e.cardId] || 0) + 1;
    }));
    const sharedY = (cardId) => {
      const involved = threads.filter(name => (entriesByThread[name] || []).some(e => e.cardId === cardId));
      const ys = involved.map(name => yStart + laneOf[name] * laneGap);
      return ys.reduce((a, b) => a + b, 0) / ys.length;
    };
    const lines = threads.map(name => {
      const entries = [...(entriesByThread[name] || [])].sort((a, b) => (cardIndex[a.cardId] ?? 0) - (cardIndex[b.cardId] ?? 0));
      const laneY = yStart + laneOf[name] * laneGap;
      const points = entries.map(e => {
        const shared = (threadsPerCard[e.cardId] || 0) > 1;
        return { x: xStart + slotOf[e.cardId] * xGap, y: shared ? sharedY(e.cardId) : laneY, shared, entry: e };
      });
      return { name, color: threadColor(name), laneY, points };
    });
    const sharedNodes = [];
    const seenShared = new Set();
    lines.forEach(l => l.points.forEach(p => {
      if (p.shared && !seenShared.has(p.entry.cardId)) { seenShared.add(p.entry.cardId); sharedNodes.push(p); }
    }));
    const width = Math.max(680, xStart * 2 + Math.max(0, slots.length - 1) * xGap);
    const maxLane = threads.length ? Math.max(...threads.map(name => laneOf[name] || 0)) : 0;
    const height = yStart + maxLane * laneGap + 40;
    return { lines, sharedNodes, width, height };
  }, [cards, entriesByThread, threads, threadLanes]);

  const addNewThread = () => { setNewThreadName(''); setNewThreadOpen(true); };
  const commitNewThread = () => {
    const trimmed = newThreadName.trim();
    if (!trimmed) return;
    if (!threads.includes(trimmed)) setState(s => ({ ...s, threads: [...s.threads, trimmed] }));
    setNewThreadOpen(false);
  };

  const doClearThreads = () => {
    setState(s => {
      const clearedCards = s.cards.map(c => ({ ...c, tags: c.tags.filter(t => t.type !== 'Thread') }));
      if (clearMode === 'hubs') return { ...s, cards: clearedCards, threads: [], threadNotes: {} };
      return { ...s, cards: clearedCards };
    });
    setClearOpen(false);
    setSelectedThread(null);
  };

  const openManage = (name) => { setManageThread(name); };

  const renameThread = (oldName, newName) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) return;
    if (threads.includes(trimmed)) { window.alert('A thread with that name already exists.'); return; }
    setState(s => ({
      ...s,
      threads: s.threads.map(t => t === oldName ? trimmed : t),
      threadNotes: (() => {
        const next = { ...(s.threadNotes || {}) };
        if (oldName in next) { next[trimmed] = next[oldName]; delete next[oldName]; }
        return next;
      })(),
      threadColors: (() => {
        const next = { ...(s.threadColors || {}) };
        if (oldName in next) { next[trimmed] = next[oldName]; delete next[oldName]; }
        return next;
      })(),
      threadLanes: (() => {
        const next = { ...(s.threadLanes || {}) };
        if (oldName in next) { next[trimmed] = next[oldName]; delete next[oldName]; }
        return next;
      })(),
      cards: s.cards.map(c => ({
        ...c,
        tags: (c.tags || []).map(t => (t.type === 'Thread' && t.note === oldName) ? { ...t, note: trimmed } : t),
      })),
    }));
    if (selectedThread === oldName) setSelectedThread(trimmed);
    setManageThread(trimmed);
  };
  const setThreadColorOverride = (name, hex) => setState(s => ({ ...s, threadColors: { ...(s.threadColors || {}), [name]: hex } }));

  const deleteThread = (name) => {
    setState(s => ({
      ...s,
      threads: s.threads.filter(t => t !== name),
      threadNotes: (() => { const next = { ...(s.threadNotes || {}) }; delete next[name]; return next; })(),
      threadColors: (() => { const next = { ...(s.threadColors || {}) }; delete next[name]; return next; })(),
      threadLanes: (() => { const next = { ...(s.threadLanes || {}) }; delete next[name]; return next; })(),
      cards: s.cards.map(c => ({ ...c, tags: (c.tags || []).filter(t => !(t.type === 'Thread' && t.note === name)) })),
    }));
    if (selectedThread === name) setSelectedThread(null);
    setManageThread(null);
  };

  const addThreadRole = (threadName, cardId, role, stepNum) => setState(s => ({
    ...s, cards: s.cards.map(c => c.id === cardId
      ? { ...c, tags: [...c.tags, { id: uid(), type: 'Thread', role, note: threadName }] }
      : c),
  }));
  const createAndAddRole = (threadName, title, role, stepNum) => {
    const defaultChapterId = (chapters[chapters.length - 1] && chapters[chapters.length - 1].id) || null;
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
  const updateThreadNotes = (name, text) => setState(s => ({ ...s, threadNotes: { ...s.threadNotes, [name]: text } }));

  const dataFor = (name) => {
    const list = entriesByThread[name] || [];
    return {
      setups: list.filter(e => e.role === 'setup').map(e => e.cardId),
      payoffs: list.filter(e => e.role === 'payoff').map(e => e.cardId),
      steps: list.filter(e => e.role === 'step').map(e => ({ cardId: e.cardId, step: e.step || 1 })),
    };
  };

  const pillStyle = (name, resolved) => ({
    display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '5px 6px', borderRadius: 6,
    cursor: 'pointer', color: resolved ? '#999' : '#222',
    background: selectedThread === name ? '#eee' : 'transparent',
  });
  const nodeStyle = (color) => ({
    borderRadius: 7, padding: '7px 12px', fontSize: 11.5, fontWeight: 600, color: '#fff',
    whiteSpace: 'nowrap', cursor: 'pointer', background: color,
  });

  return (
    <div style={{ padding: '12px 16px' }}>
      <HelpNote on={help}>A thread needs at least a setup and a payoff (steps in between are optional). Swimlanes shows each thread as its own row; Web shows them converging on cards that share more than one thread.</HelpNote>
      <div style={{ border: '1px solid #eee', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid #eee' }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Thread Library</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <SegButtons value={display} onChange={setDisplay} options={[['swim', 'Swimlanes'], ['web', 'Web']]} />
            <button onClick={addNewThread} style={btnStyle}>+ New thread</button>
            <button onClick={() => { setClearMode('links'); setClearOpen(true); }}
              style={{ ...btnStyle, borderColor: '#D85A30', color: '#D85A30' }}>Clear Threads…</button>
          </div>
        </div>
        <div style={{ display: 'flex' }}>
          <div style={{ width: 190, flexShrink: 0, borderRight: '1px solid #eee', background: '#fafafa', padding: 10 }}>
            <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.04em', color: '#999', margin: '4px 0' }}>Open</div>
            {openNames.length === 0 && <div style={{ fontSize: 11, color: '#bbb' }}>None</div>}
            {openNames.map(n => (
              <div key={n} style={pillStyle(n, false)} onClick={() => setSelectedThread(selectedThread === n ? null : n)}
                onDoubleClick={(e) => { e.stopPropagation(); openManage(n); }} title="Double-click to rename or delete">
                <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: threadColor(n) }} />
                {n}
              </div>
            ))}
            <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.04em', color: '#999', margin: '10px 0 4px' }}>Resolved</div>
            {resolvedNames.length === 0 && <div style={{ fontSize: 11, color: '#bbb' }}>None</div>}
            {resolvedNames.map(n => (
              <div key={n} style={pillStyle(n, true)} onClick={() => setSelectedThread(selectedThread === n ? null : n)}
                onDoubleClick={(e) => { e.stopPropagation(); openManage(n); }} title="Double-click to rename or delete">
                <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: threadColor(n) }} />
                {n}
              </div>
            ))}
          </div>
          <div ref={webWrapRef} style={{ flex: 1, padding: '18px 22px', overflowX: 'auto', position: 'relative' }}
            onMouseLeave={() => setHoverPoint(null)}>
            {threads.length === 0 && <div style={{ fontSize: 12, color: '#999' }}>No threads yet — tag a card as a Thread setup or payoff first.</div>}
            {display === 'swim' && threads.map(name => {
              const entries = entriesByThread[name] || [];
              const color = threadColor(name);
              const resolved = isResolved(name);
              const dimmed = selectedThread && selectedThread !== name;
              return (
                <div key={name} style={{ display: 'flex', alignItems: 'center', marginBottom: 22, minWidth: 640, opacity: dimmed ? 0.3 : 1 }}>
                  <div style={{ width: 130, flexShrink: 0, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                    onDoubleClick={() => openManage(name)} title="Double-click to rename or delete">
                    <span style={{ width: 9, height: 9, borderRadius: '50%', flexShrink: 0, background: color }} />
                    {name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                    {entries.length === 0 && <span style={{ fontSize: 11.5, color: '#bbb' }}>No links yet</span>}
                    {entries.map((e, i) => (
                      <React.Fragment key={e.tagId}>
                        {i > 0 && <div style={{ height: 2, width: 26, flexShrink: 0, background: color }} />}
                        <div style={nodeStyle(color)} title={e.chapter} onClick={() => setPopupCard(e.cardId)}>
                          {e.role === 'setup' ? 'Setup' : e.role === 'step' ? `Step ${e.step || 1}` : 'Payoff'} — {e.title}
                        </div>
                      </React.Fragment>
                    ))}
                    {!resolved && entries.length > 0 && (
                      <>
                        <div style={{ height: 0, width: 26, flexShrink: 0, borderTop: '2px dashed #ccc' }} />
                        <div style={{ borderRadius: 7, padding: '7px 12px', fontSize: 11.5, fontWeight: 500, color: '#aaa', border: '1.5px dashed #ccc', whiteSpace: 'nowrap' }}
                          title="Tag a card as this thread's payoff to close the loop">+ add payoff</div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            {display === 'web' && threads.length > 0 && (
              <svg width={webLayout.width} height={webLayout.height} style={{ display: 'block' }}>
                {webLayout.lines.map(l => (
                  <polyline key={l.name} points={l.points.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke={l.color} strokeWidth="2"
                    opacity={selectedThread && selectedThread !== l.name ? 0.2 : 1} />
                ))}
                {webLayout.lines.map(l => (
                  <text key={'lbl-' + l.name} x="8" y={l.laneY + 4} style={{ fontSize: 11, fontWeight: 600, fill: l.color, cursor: 'pointer' }}
                    opacity={selectedThread && selectedThread !== l.name ? 0.35 : 1}
                    onDoubleClick={() => openManage(l.name)}>
                    <title>Double-click to rename or delete</title>
                    {l.name}
                  </text>
                ))}
                {webLayout.lines.map(l => l.points.filter(p => !p.shared).map(p => (
                  <circle key={l.name + '-' + p.entry.cardId} cx={p.x} cy={p.y} r="6" fill={l.color}
                    opacity={selectedThread && selectedThread !== l.name ? 0.2 : 1}
                    style={{ cursor: 'pointer' }} onClick={() => setPopupCard(p.entry.cardId)}
                    onMouseEnter={(e) => {
                      const rect = webWrapRef.current.getBoundingClientRect();
                      const text = (p.entry.role === 'setup' ? 'Setup' : p.entry.role === 'step' ? `Step ${p.entry.step || 1}` : 'Payoff') + ' — ' + p.entry.title;
                      setHoverPoint({ x: e.clientX - rect.left, y: e.clientY - rect.top, text });
                    }}
                    onMouseLeave={() => setHoverPoint(null)} />
                )))}
                {webLayout.sharedNodes.map(p => {
                  const selectedCardIds = selectedThread ? new Set((entriesByThread[selectedThread] || []).map(e => e.cardId)) : null;
                  const dimmed = selectedThread && !selectedCardIds.has(p.entry.cardId);
                  return (
                    <circle key={'shared-' + p.entry.cardId} cx={p.x} cy={p.y} r="8" fill="#888780"
                      opacity={dimmed ? 0.2 : 1}
                      style={{ cursor: 'pointer' }} onClick={() => setPopupCard(p.entry.cardId)}
                      onMouseEnter={(e) => {
                        const rect = webWrapRef.current.getBoundingClientRect();
                        setHoverPoint({ x: e.clientX - rect.left, y: e.clientY - rect.top, text: p.entry.title });
                      }}
                      onMouseLeave={() => setHoverPoint(null)} />
                  );
                })}
              </svg>
            )}
            {hoverPoint && (
              <div style={{
                position: 'absolute', left: hoverPoint.x, top: hoverPoint.y, transform: 'translate(-50%, -130%)',
                background: '#222', color: '#fff', fontSize: 11.5, padding: '4px 9px', borderRadius: 6,
                whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 30, boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
              }}>
                {hoverPoint.text}
              </div>
            )}
          </div>
        </div>
      </div>

      {clearOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setClearOpen(false)}>
          <div style={{ background: '#fff', borderRadius: 10, width: 340, padding: 20, boxShadow: '0 8px 30px rgba(0,0,0,0.25)' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 6px', fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: '#D85A30' }}>⚠</span> Clear Threads
            </h3>
            <p style={{ fontSize: 12.5, color: '#555', margin: '0 0 16px', lineHeight: 1.5 }}>This can't be undone. Choose what to remove:</p>
            <label style={{
              display: 'block', border: '1px solid ' + (clearMode === 'links' ? '#D85A30' : '#ddd'), borderRadius: 8, padding: '10px 12px',
              marginBottom: 8, cursor: 'pointer', background: clearMode === 'links' ? '#FFF6F3' : '#fff',
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="radio" checked={clearMode === 'links'} onChange={() => setClearMode('links')} /> Clear links only
              </span>
              <span style={{ fontSize: 11.5, color: '#999', display: 'block', margin: '4px 0 0 22px', lineHeight: 1.4 }}>
                Removes setup/payoff connections between cards. Thread names stay, so you can re-link later.
              </span>
            </label>
            <label style={{
              display: 'block', border: '1px solid ' + (clearMode === 'hubs' ? '#D85A30' : '#ddd'), borderRadius: 8, padding: '10px 12px',
              marginBottom: 8, cursor: 'pointer', background: clearMode === 'hubs' ? '#FFF6F3' : '#fff',
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="radio" checked={clearMode === 'hubs'} onChange={() => setClearMode('hubs')} /> Clear hubs & links
              </span>
              <span style={{ fontSize: 11.5, color: '#999', display: 'block', margin: '4px 0 0 22px', lineHeight: 1.4 }}>
                Removes the links above and deletes the threads themselves from the library.
              </span>
            </label>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
              <button onClick={() => setClearOpen(false)} style={btnStyle}>Cancel</button>
              <button onClick={doClearThreads} style={{ ...btnStyle, border: 'none', background: '#D85A30', color: '#fff' }}>
                {clearMode === 'hubs' ? 'Clear hubs & links' : 'Clear links only'}
              </button>
            </div>
          </div>
        </div>
      )}

      {newThreadOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setNewThreadOpen(false)}>
          <div style={{ background: '#fff', borderRadius: 10, width: 320, padding: 20, boxShadow: '0 8px 30px rgba(0,0,0,0.25)' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 14px', fontSize: 15 }}>New thread</h3>
            <label style={{ fontSize: 11.5, color: '#999', display: 'block', marginBottom: 4 }}>Name</label>
            <input autoFocus value={newThreadName} onChange={e => setNewThreadName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') commitNewThread(); }}
              style={{ fontSize: 13, border: '1px solid #ddd', borderRadius: 8, padding: '6px 10px', width: '100%', boxSizing: 'border-box', marginBottom: 16 }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setNewThreadOpen(false)} style={btnStyle}>Cancel</button>
              <button onClick={commitNewThread} style={{ ...btnStyle, border: 'none', background: '#222', color: '#fff' }}>Add</button>
            </div>
          </div>
        </div>
      )}

      {manageThread && (
        <ThreadEditPopup
          name={manageThread} data={dataFor(manageThread)}
          cards={cards} color={threadColor(manageThread)}
          colorOverride={(threadColors && threadColors[manageThread]) || null}
          onColorChange={hex => setThreadColorOverride(manageThread, hex)}
          notes={(threadNotes && threadNotes[manageThread]) || ''}
          allowRoleEdit={display === 'swim'}
          onClose={() => setManageThread(null)}
          onRename={newName => renameThread(manageThread, newName)}
          onAddRole={(cardId, role, stepNum) => addThreadRole(manageThread, cardId, role, stepNum)}
          onCreateAndAddRole={(title, role, stepNum) => createAndAddRole(manageThread, title, role, stepNum)}
          onRemoveTag={(cardId, tagId) => removeThreadTag(cardId, tagId)}
          onDelete={() => deleteThread(manageThread)}
          onNotesChange={text => updateThreadNotes(manageThread, text)}
        />
      )}

      {popupCard && (
        <CardEditModal
          card={cards.find(c => c.id === popupCard)} cards={cards} onClose={() => setPopupCard(null)}
          updateCard={p => updateCard(popupCard, p)} onNudge={dir => nudgeCard(popupCard, dir)}
          onDelete={() => setState(s => ({ ...s, cards: s.cards.filter(c => c.id !== popupCard) }))}
          characters={characters} threads={threads} valuesLib={values} onAddThread={addLib('threads')}
          tagTypes={tagTypes} onAddTagType={addLib('tagTypes')}
        />
      )}
    </div>
  );
}

