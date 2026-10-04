// @ts-nocheck -- JSX migrated without changing the original event and state logic.
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { HelpNote, DeleteButton } from '../components/EditorControls';
import { btnStyle, chipStyle, chipActiveStyle } from '../components/styles';

/* ============================== CHAPTER CONTROLS ============================== */

export function ChapterBar({ chapters, activeChapterId, setActiveChapterId, onAddChapter, reorderOpen, setReorderOpen, help }) {
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const commitAdd = () => {
    if (newTitle.trim()) onAddChapter(newTitle.trim());
    setNewTitle(''); setAdding(false);
  };

  return (
    <div style={{ padding: '0 16px', borderBottom: '1px solid #eee' }}>
    <HelpNote on={help}>Filters every view to one chapter, or "All" to see the whole story. "Reorder chapters" lets you drag chapters into a new order.</HelpNote>
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '8px 0' }}>
      <span style={{ fontSize: 12, color: '#999', marginRight: 2, flexShrink: 0 }}>Chapter:</span>
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', flex: 1, minWidth: 0, paddingBottom: 2 }}>
        <button onClick={() => setActiveChapterId('all')}
          style={{ ...chipStyle, flexShrink: 0, ...(activeChapterId === 'all' ? chipActiveStyle : {}) }}>All</button>
        {chapters.map(ch => (
          <button key={ch.id} onClick={() => setActiveChapterId(ch.id)}
            style={{ ...chipStyle, flexShrink: 0, ...(activeChapterId === ch.id ? chipActiveStyle : {}) }}>{ch.title}</button>
        ))}
        {adding ? (
          <input autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') commitAdd(); if (e.key === 'Escape') { setAdding(false); setNewTitle(''); } }}
            onBlur={commitAdd} placeholder="Chapter title..."
            style={{ fontSize: 12, border: '1px solid #ddd', borderRadius: 8, padding: '3px 8px', width: 130, flexShrink: 0 }} />
        ) : (
          <button onClick={() => setAdding(true)} style={{ ...chipStyle, flexShrink: 0 }} title="Add chapter">+</button>
        )}
      </div>
      <button onClick={() => setReorderOpen(!reorderOpen)} style={{ ...btnStyle, flexShrink: 0 }}>
        {reorderOpen ? 'Close reorder' : 'Reorder chapters'}
      </button>
    </div>
    </div>
  );
}

export function ChapterReorderPanel({ chapters, cards, setState, activeChapterId, setActiveChapterId, setExpandedChapterIds }) {
  const [dragId, setDragId] = useState(null);

  const move = (fromId, toId) => {
    if (fromId === toId) return;
    setState(s => {
      const arr = [...s.chapters];
      const from = arr.findIndex(c => c.id === fromId);
      const to = arr.findIndex(c => c.id === toId);
      if (from === -1 || to === -1) return s;
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      return { ...s, chapters: arr };
    });
  };

  const rename = (id, title) => setState(s => ({ ...s, chapters: s.chapters.map(c => c.id === id ? { ...c, title } : c) }));

  // Threads whose setup/step/payoff cards live in this chapter — deleting the chapter
  // deletes those cards, which can silently break the thread's continuity elsewhere.
  const threadsIn = (chapterId) => {
    const names = new Set();
    cards.filter(c => c.chapterId === chapterId).forEach(c => (c.tags || []).forEach(t => { if (t.type === 'Thread') names.add(t.note); }));
    return [...names];
  };

  const remove = (id) => {
    if (chapters.length <= 1) { window.alert('At least one chapter is required.'); return; }
    setState(s => ({
      ...s,
      chapters: s.chapters.filter(c => c.id !== id),
      cards: s.cards.filter(c => c.chapterId !== id),
    }));
    setExpandedChapterIds(prev => prev.filter(x => x !== id));
    if (activeChapterId === id) setActiveChapterId('all');
  };

  return (
    <div style={{ padding: '10px 16px', borderBottom: '1px solid #eee', maxWidth: 420 }}>
      <div style={{ fontSize: 11, color: '#999', marginBottom: 8 }}>Drag to reorder. Sequence view and act-ordered charts follow this order.</div>
      {chapters.map(ch => {
        const affected = threadsIn(ch.id);
        const label = affected.length
          ? `Delete "${ch.title}" and all its cards — this passes through ${affected.length} thread${affected.length > 1 ? 's' : ''} (${affected.join(', ')}) and may break their continuity`
          : `Delete "${ch.title}" and all its cards`;
        return (
          <div key={ch.id} draggable
            onDragStart={() => setDragId(ch.id)}
            onDragOver={e => e.preventDefault()}
            onDrop={() => move(dragId, ch.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', border: '1px solid #eee', borderRadius: 8, marginBottom: 6, background: '#fff' }}>
            <span style={{ cursor: 'grab', color: '#aaa' }}>⋮⋮</span>
            <input value={ch.title} onChange={e => rename(ch.id, e.target.value)}
              style={{ flex: 1, fontSize: 13, border: 'none', background: 'transparent' }} />
            <DeleteButton label={label} onDelete={() => remove(ch.id)} />
          </div>
        );
      })}
    </div>
  );
}

