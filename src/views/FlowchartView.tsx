// @ts-nocheck -- JSX migrated without changing the original event and state logic.
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ACT_COLORS, ACT_BORDERS, UNASSIGNED_COLOR, UNASSIGNED_BORDER, ACT_NAMES, ACTS, uid, GENERIC_PLACEHOLDER, resolveColor, resolveBorder, nudgeWithActAdoption } from '../domain/story';
import { HelpNote, CardEditModal } from '../components/EditorControls';
import { btnStyle } from '../components/styles';

/* ============================== FLOWCHART VIEW ============================== */

// One chapter's five-Act-plus-Unassigned column strip. `cards` is always the FULL global
// array (needed so index-based splicing in setState stays correct) — filtering to this
// chapter happens internally.
function FlowchartChapterRow({ chapterId, cards, setState, onOpenPopup }) {
  const setAct = (id, act) => setState(s => ({ ...s, cards: s.cards.map(c => c.id === id ? { ...c, act } : c) }));

  const insertCard = (afterIndex, act) => setState(s => {
    const arr = [...s.cards];
    const newCard = { id: uid(), act, gapIndex: null, chapterId, title: 'New Card', text: '', notes: '', tags: [], values: [], placeholder: GENERIC_PLACEHOLDER, customColor: null, major: false };
    arr.splice(afterIndex + 1, 0, newCard);
    return { ...s, cards: arr };
  });

  const nudgeInColumn = (colCards, localIdx, dir) => {
    const target = colCards[localIdx + dir];
    if (!target) return;
    const trueA = colCards[localIdx].i, trueB = target.i;
    setState(s => {
      const arr = [...s.cards];
      [arr[trueA], arr[trueB]] = [arr[trueB], arr[trueA]];
      return { ...s, cards: arr };
    });
  };

  const columnsOrder = [...ACTS, 0]; // Act I..V, then Unassigned — used to find neighbouring columns
  const getAdjacentColAct = (colAct, dir) => {
    const idx = columnsOrder.indexOf(colAct);
    const j = idx + dir;
    if (j < 0 || j >= columnsOrder.length) return undefined;
    return columnsOrder[j];
  };

  // Moves a card into a neighbouring act column within THIS chapter: 'end' = bottom of the
  // previous act (top card nudged up), 'start' = top of the next act (bottom card nudged down).
  const moveCardAcrossAct = (cardId, targetColAct, position) => setState(s => {
    const arr = [...s.cards];
    const idx = arr.findIndex(c => c.id === cardId);
    if (idx === -1) return s;
    const [card] = arr.splice(idx, 1);
    const targetAct = targetColAct === 0 ? null : targetColAct;
    const moved = { ...card, act: targetAct };
    const actEntries = arr.map((c, i) => ({ c, i })).filter(({ c }) => c.chapterId === chapterId && (targetColAct === 0 ? c.act === null : c.act === targetColAct));
    let insertAt;
    if (actEntries.length === 0) insertAt = arr.length;
    else if (position === 'start') insertAt = actEntries[0].i;
    else insertAt = actEntries[actEntries.length - 1].i + 1;
    arr.splice(insertAt, 0, moved);
    return { ...s, cards: arr };
  });

  const columns = [...ACTS, 0]; // unassigned bucket placed after Act V

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      {columns.map(colAct => {
        const bg = colAct === 0 ? UNASSIGNED_COLOR : ACT_COLORS[colAct];
        const border = colAct === 0 ? UNASSIGNED_BORDER : ACT_BORDERS[colAct];
        const colCards = cards.map((c, i) => ({ c, i })).filter(({ c }) => c.chapterId === chapterId && (colAct === 0 ? c.act === null : c.act === colAct));
        const chapterCardIdxs = cards.map((c, i) => ({ c, i })).filter(({ c }) => c.chapterId === chapterId);
        const insertAct = colAct === 0 ? null : colAct;
        const topInsertAfterIndex = colCards.length > 0 ? colCards[0].i - 1 : (chapterCardIdxs.length > 0 ? chapterCardIdxs[chapterCardIdxs.length - 1].i : cards.length - 1);
        const prevColAct = getAdjacentColAct(colAct, -1);
        const nextColAct = getAdjacentColAct(colAct, 1);
        return (
          <div key={colAct} style={{ minWidth: 220, flex: 1, background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: 8 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: '#555' }}>
              {colAct === 0 ? 'Unassigned' : ACT_NAMES[colAct]}
            </div>
            <FlowInsertDivider onInsert={() => insertCard(topInsertAfterIndex, insertAct)} />
            {colCards.map(({ c, i }, localIdx) => {
              const isTop = localIdx === 0;
              const isBottom = localIdx === colCards.length - 1;
              const upDisabled = isTop ? prevColAct === undefined : false;
              const downDisabled = isBottom ? nextColAct === undefined : false;
              const onUp = () => isTop ? moveCardAcrossAct(c.id, prevColAct, 'end') : nudgeInColumn(colCards, localIdx, -1);
              const onDown = () => isBottom ? moveCardAcrossAct(c.id, nextColAct, 'start') : nudgeInColumn(colCards, localIdx, 1);
              return (
                <React.Fragment key={c.id}>
                  <div style={{ background: resolveColor(c), border: `1px solid ${resolveBorder(c)}`, borderRadius: 8, padding: 8 }}
                    onDoubleClick={() => onOpenPopup(c.id)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <input value={c.title} onChange={e => setState(s => ({ ...s, cards: s.cards.map(cc => cc.id === c.id ? { ...cc, title: e.target.value } : cc) }))}
                        onClick={e => e.stopPropagation()} onDoubleClick={e => e.stopPropagation()}
                        style={{ fontSize: 13, fontWeight: 600, flex: 1, border: 'none', background: 'transparent', padding: 0, minWidth: 0 }} />
                      <div style={{ display: 'flex', gap: 2 }}>
                        <button onClick={() => onOpenPopup(c.id)} style={btnStyle} title="Open details">✎</button>
                        <button onClick={onUp} disabled={upDisabled} style={{ ...btnStyle, opacity: upDisabled ? 0.35 : 1 }}
                          title={isTop ? (prevColAct !== undefined ? `Move to ${prevColAct === 0 ? 'Unassigned' : ACT_NAMES[prevColAct]}` : undefined) : undefined}>↑</button>
                        <button onClick={onDown} disabled={downDisabled} style={{ ...btnStyle, opacity: downDisabled ? 0.35 : 1 }}
                          title={isBottom ? (nextColAct !== undefined ? `Move to ${nextColAct === 0 ? 'Unassigned' : ACT_NAMES[nextColAct]}` : undefined) : undefined}>↓</button>
                      </div>
                    </div>
                    <select value={c.act === null ? '' : c.act} onChange={e => setAct(c.id, e.target.value ? parseInt(e.target.value, 10) : null)}
                      style={{ fontSize: 11, marginTop: 4 }}>
                      <option value="">Unassigned</option>
                      {ACTS.map(a => <option key={a} value={a}>{ACT_NAMES[a]}</option>)}
                    </select>
                  </div>
                  <FlowInsertDivider onInsert={() => insertCard(i, insertAct)} />
                </React.Fragment>
              );
            })}
            {colCards.length === 0 && <div style={{ fontSize: 12, color: '#999', textAlign: 'center' }}>No cards</div>}
          </div>
        );
      })}
    </div>
  );
}

export function FlowchartView({ state, setState, chapterFilter, expandedChapterIds, setExpandedChapterIds, help }) {
  const { cards, characters, threads, values, chapters, tagTypes } = state;
  const scrollRef = useRef(null);
  const [popupCard, setPopupCard] = useState(null);
  const [jumpTo, setJumpTo] = useState('');

  useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement && document.activeElement.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (!scrollRef.current) return;
      if (e.key === 'ArrowRight') scrollRef.current.scrollLeft += 60;
      if (e.key === 'ArrowLeft') scrollRef.current.scrollLeft -= 60;
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const updateCard = (id, patch) => setState(s => ({ ...s, cards: s.cards.map(c => c.id === id ? { ...c, ...patch } : c) }));
  const nudgeCard = (cardId, dir) => setState(s => {
    const idx = s.cards.findIndex(c => c.id === cardId);
    if (idx === -1) return s;
    return { ...s, cards: nudgeWithActAdoption(s.cards, idx, dir) };
  });

  const addLib = (key) => (item) => setState(s => s[key].includes(item) ? s : { ...s, [key]: [...s[key], item] });

  const visibleChapters = chapterFilter === 'all' ? chapters : chapters.filter(ch => ch.id === chapterFilter);
  const showCollapsible = chapterFilter === 'all' && chapters.length > 1;

  const isExpanded = (id) => !showCollapsible || expandedChapterIds.includes(id);
  const toggleExpanded = (id) => setExpandedChapterIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const expandAll = () => setExpandedChapterIds(chapters.map(ch => ch.id));
  const collapseAll = () => setExpandedChapterIds([]);

  const jumpToChapter = (id) => {
    if (!id) return;
    if (!expandedChapterIds.includes(id)) setExpandedChapterIds(prev => [...prev, id]);
    setTimeout(() => {
      const el = document.getElementById('flow-chapter-row-' + id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 0);
  };

  const cardCountFor = (chapterId) => cards.filter(c => c.chapterId === chapterId).length;

  return (
    <div style={{ padding: '12px 16px' }}>
      <HelpNote on={help}>Cards are grouped by chapter and act. Click a chapter header to collapse it, or use "Expand all" / "Collapse all" and the jump menu to navigate a long story.</HelpNote>
      {showCollapsible && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 3, flex: 1, minWidth: 120 }}>
            {chapters.map(ch => (
              <div key={ch.id} onClick={() => jumpToChapter(ch.id)} title={ch.title}
                style={{ height: 6, borderRadius: 3, flex: 1, cursor: 'pointer', background: isExpanded(ch.id) ? '#5b8def' : '#e0e0e0' }} />
            ))}
          </div>
          <select value={jumpTo} onChange={e => { jumpToChapter(e.target.value); setJumpTo(''); }}
            style={{ fontSize: 12, border: '1px solid #ddd', borderRadius: 8, padding: '3px 6px' }}>
            <option value="">Jump to...</option>
            {chapters.map(ch => <option key={ch.id} value={ch.id}>{ch.title}</option>)}
          </select>
          <button onClick={expandAll} style={btnStyle}>Expand all</button>
          <button onClick={collapseAll} style={btnStyle}>Collapse all</button>
        </div>
      )}
      <div ref={scrollRef} style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowX: 'auto', paddingBottom: 12 }}>
        {visibleChapters.map(ch => {
          const open = isExpanded(ch.id);
          return (
            <div key={ch.id} id={'flow-chapter-row-' + ch.id} style={showCollapsible ? { border: '1px solid #eee', borderRadius: 10 } : undefined}>
              <div
                onClick={showCollapsible ? () => toggleExpanded(ch.id) : undefined}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 14,
                  padding: showCollapsible ? '8px 12px' : '0 0 6px', cursor: showCollapsible ? 'pointer' : 'default',
                  background: showCollapsible ? '#fafafa' : 'transparent', borderRadius: showCollapsible ? '10px 10px 0 0' : 0,
                }}>
                {showCollapsible && <span style={{ fontSize: 11, color: '#999', width: 10 }}>{open ? '▾' : '▸'}</span>}
                <span style={{ flex: 1 }}>{ch.title}</span>
                {showCollapsible && <span style={{ fontSize: 11, color: '#999', fontWeight: 400 }}>{cardCountFor(ch.id)} cards</span>}
              </div>
              {open && (
                <div style={{ padding: showCollapsible ? 12 : 0 }}>
                  <FlowchartChapterRow chapterId={ch.id} cards={cards} setState={setState} onOpenPopup={setPopupCard} />
                </div>
              )}
            </div>
          );
        })}
      </div>
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

function FlowInsertDivider({ onInsert }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ position: 'relative', height: hover ? 22 : 8, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'height 0.1s' }}
    >
      <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 1, background: hover ? '#ccc' : 'transparent' }} />
      {hover && (
        <button onClick={onInsert} title="Insert card here"
          style={{ zIndex: 2, width: 18, height: 18, borderRadius: '50%', border: '1px solid #bbb', background: '#fff', color: '#666', fontSize: 12, lineHeight: '16px', cursor: 'pointer', padding: 0 }}>
          +
        </button>
      )}
    </div>
  );
}

