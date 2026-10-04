// @ts-nocheck -- JSX migrated without changing the original event and state logic.
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { uid, GENERIC_PLACEHOLDER, nudgeWithActAdoption } from '../domain/story';
import { ChipBar, HelpNote, CardFields } from '../components/EditorControls';

/* ============================== SCENE (WRITE) VIEW ============================== */

export function SceneView({ state, setState, chapterFilter, help }) {
  const { cards, characters, themes, values, threads, chapters, tagTypes } = state;
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);

  const defaultChapterId = chapterFilter !== 'all' ? chapterFilter : (chapters[0] && chapters[0].id) || null;

  const updateCard = (id, patch) => setState(s => ({ ...s, cards: s.cards.map(c => c.id === id ? { ...c, ...patch } : c) }));
  const removeCard = (id) => setState(s => ({ ...s, cards: s.cards.filter(c => c.id !== id) }));
  const addCard = () => setState(s => {
    const arr = [...s.cards];
    let insertAt = arr.length;
    if (defaultChapterId) {
      for (let i = arr.length - 1; i >= 0; i--) { if (arr[i].chapterId === defaultChapterId) { insertAt = i + 1; break; } }
    }
    arr.splice(insertAt, 0, { id: uid(), act: null, gapIndex: null, chapterId: defaultChapterId, title: 'New Card', text: '', notes: '', tags: [], values: [], placeholder: GENERIC_PLACEHOLDER, customColor: null, major: false });
    return { ...s, cards: arr };
  });
  const nudge = (idx, dir) => setState(s => ({ ...s, cards: nudgeWithActAdoption(s.cards, idx, dir) }));
  const insertCardAt = (afterIndex) => setState(s => {
    const arr = [...s.cards];
    const before = arr[afterIndex];
    const after = arr[afterIndex + 1];
    const inheritedAct = before ? before.act : (after ? after.act : null);
    const inheritedChapter = before ? before.chapterId : (after ? after.chapterId : defaultChapterId);
    arr.splice(afterIndex + 1, 0, { id: uid(), act: inheritedAct, gapIndex: null, chapterId: inheritedChapter, title: 'New Card', text: '', notes: '', tags: [], values: [], placeholder: GENERIC_PLACEHOLDER, customColor: null, major: false });
    return { ...s, cards: arr };
  });

  const addLib = (key) => (item) => setState(s => s[key].includes(item) ? s : { ...s, [key]: [...s[key], item] });
  const removeLib = (key) => (item) => setState(s => ({ ...s, [key]: s[key].filter(x => x !== item) }));

  const visibleCards = cards.map((c, i) => ({ c, i }))
    .filter(({ c }) => !showUnassignedOnly || c.act === null)
    .filter(({ c }) => chapterFilter === 'all' || c.chapterId === chapterFilter);

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '12px 16px' }}>
      <ChipBar label="Characters" items={characters} onAdd={addLib('characters')} onRemove={removeLib('characters')} />
      <ChipBar label="Themes" items={themes} onAdd={addLib('themes')} onRemove={removeLib('themes')} />
      <ChipBar label="Story Values" items={values} onAdd={addLib('values')} onRemove={removeLib('values')} />
      <HelpNote on={help}>Cards run top to bottom in story order. Each card's placeholder prompt (e.g. "What change turns the plot?") is just a nudge — replace it with your own text, or leave it blank.</HelpNote>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '12px 0' }}>
        <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={showUnassignedOnly} onChange={e => setShowUnassignedOnly(e.target.checked)} />
          Show only unassigned
        </label>
        <button onClick={addCard} style={{ fontSize: 13, border: '1px solid #ccc', borderRadius: 8, padding: '4px 10px', cursor: 'pointer' }}>+ New Card</button>
      </div>

      {visibleCards.length > 0 && <InsertDivider onInsert={() => insertCardAt(visibleCards[0].i - 1)} />}
      {visibleCards.map(({ c, i }, j) => (
        <React.Fragment key={c.id}>
        <CardFields
          card={c} updateCard={p => updateCard(c.id, p)} characters={characters} threads={threads}
          valuesLib={values} onAddThread={addLib('threads')} tagTypes={tagTypes} onAddTagType={addLib('tagTypes')}
          showNudgeDelete onNudge={dir => nudge(i, dir)} onDelete={() => removeCard(c.id)}
          nudgeDisabled={{ up: i === 0, down: i === cards.length - 1 }}
        />
        <InsertDivider onInsert={() => insertCardAt(i)} />
        </React.Fragment>
      ))}
    </div>
  );
}

function InsertDivider({ onInsert }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ position: 'relative', height: hover ? 24 : 10, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'height 0.1s' }}
    >
      <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 1, background: hover ? '#ccc' : 'transparent' }} />
      {hover && (
        <button
          onClick={onInsert}
          title="Insert card here"
          style={{
            zIndex: 2, width: 20, height: 20, borderRadius: '50%', border: '1px solid #bbb', background: '#fff',
            color: '#666', fontSize: 13, lineHeight: '18px', cursor: 'pointer', padding: 0,
          }}
        >+</button>
      )}
    </div>
  );
}
