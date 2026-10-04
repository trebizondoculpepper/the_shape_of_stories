// @ts-nocheck -- JSX migrated without changing the original event and state logic.
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { THREAD_COLOR_PALETTE, uid, GENERIC_PLACEHOLDER } from '../domain/story';
import { ColorSwatchPicker, DeleteButton } from './EditorControls';
import { btnStyle } from './styles';

export function ZoomControls({ zoom, setZoom }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {['full', 'compact'].map(z => (
        <button key={z} onClick={() => setZoom(z)}
          style={{ ...btnStyle, background: zoom === z ? '#333' : '#fff', color: zoom === z ? '#fff' : '#333' }}>
          {z}
        </button>
      ))}
    </div>
  );
}

function ChipDivider({ onInsert }) {
  return (
    <div style={{ height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <button onClick={(e) => { e.stopPropagation(); onInsert(); }} title="Insert card here"
        style={{ width: 18, height: 18, borderRadius: '50%', border: '1px solid #bbb', background: '#fff', color: '#666', fontSize: 12, lineHeight: '16px', cursor: 'pointer', padding: 0 }}>+</button>
    </div>
  );
}

export function ChipStack({ ids, cards, gapIndexById, stages, stagesHidden, updateCard, onInsert, onDelete, onNudge, onOpenFull, onClose }) {
  const orderedIds = cards.filter(c => ids.includes(c.id)).map(c => c.id);
  const stageOf = id => (stagesHidden ? '' : (stages[gapIndexById[id]] ?? ''));

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: 260 }}>
        <ChipDivider onInsert={() => onInsert(0)} />
        {orderedIds.map((id, idx) => {
          const c = cards.find(cc => cc.id === id);
          if (!c) return null;
          return (
            <React.Fragment key={id}>
              <div onDoubleClick={() => onOpenFull(id)}
                style={{
                  position: 'relative', borderRadius: 10, padding: 12, background: '#fff',
                  border: idx === 0 ? '2px solid #378ADD' : '1px solid #ccc',
                }}>
                <div style={{ position: 'absolute', top: 6, right: 6, display: 'flex', gap: 2, alignItems: 'center' }}>
                  <button onClick={(e) => { e.stopPropagation(); onNudge(id, -1); }} title="Move earlier"
                    style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, padding: '0 2px' }}>↑</button>
                  <button onClick={(e) => { e.stopPropagation(); onNudge(id, 1); }} title="Move later"
                    style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, padding: '0 2px' }}>↓</button>
                  <button onClick={(e) => { e.stopPropagation(); onDelete(id); }} title="Delete card"
                    style={{ width: 18, height: 18, borderRadius: '50%', border: '1px solid #bbb', background: '#fff', color: '#666', fontSize: 12, lineHeight: '16px', cursor: 'pointer', padding: 0 }}>−</button>
                </div>
                <input value={c.title} onChange={e => updateCard(id, { title: e.target.value })}
                  onClick={e => e.stopPropagation()} onDoubleClick={e => e.stopPropagation()}
                  style={{ width: '100%', fontSize: 13, fontWeight: 600, border: 'none', background: 'transparent', padding: 0, paddingRight: 56, boxSizing: 'border-box' }} />
                <div style={{ fontSize: 11, color: '#666', marginTop: 6 }}>{stageOf(id)}</div>
              </div>
              <ChipDivider onInsert={() => onInsert(idx + 1)} />
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

function ThreadsPanelRow({ name, isOpen, isLocked, isHovered, color, sceneTitles, onToggle, onOpenPopup }) {
  return (
    <div onClick={() => onToggle(name)}
      style={{
        border: `1px solid ${isLocked ? '#378ADD' : (isHovered ? '#85B7EB' : '#eee')}`, borderRadius: 8, padding: '8px 10px', marginBottom: 8,
        background: isOpen ? '#fff8ee' : '#fafafa', cursor: 'pointer',
        boxShadow: isHovered && !isLocked ? '0 0 0 2px rgba(55,111,212,0.25)' : 'none',
      }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'inline-block' }} />
          {name}
        </div>
        <button onClick={(e) => { e.stopPropagation(); onOpenPopup(name); }}
          style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 12 }} title="Edit thread">✎</button>
      </div>
      <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>Linked scenes:</div>
      {sceneTitles.length === 0 && <div style={{ fontSize: 11, color: '#999', paddingLeft: 4 }}>—</div>}
      {sceneTitles.map((t, i) => <div key={i} style={{ fontSize: 11, color: '#333', paddingLeft: 4 }}>&bull; {t}</div>)}
    </div>
  );
}

export function ThreadsPanel({ threadNames, threadData, cards, threadColor, lockedThreads, hoverThread, onToggle, onOpenPopup }) {
  const [filter, setFilter] = useState('all');
  const cardTitle = id => (cards.find(c => c.id === id) || {}).title || '—';
  const names = threadNames.filter(n => threadData[n] && (threadData[n].setups.length > 0 || threadData[n].payoffs.length > 0 || threadData[n].steps.length > 0));
  const open = names.filter(n => threadData[n].setups.length > 0 && threadData[n].payoffs.length === 0);
  const resolved = names.filter(n => !open.includes(n));
  const focused = lockedThreads.filter(n => names.includes(n));

  const renderRow = n => (
    <ThreadsPanelRow key={n} name={n} isOpen={open.includes(n)} isLocked={lockedThreads.includes(n)} isHovered={hoverThread === n}
      color={threadColor(n)} sceneTitles={[...threadData[n].setups, ...threadData[n].steps.map(s => s.cardId), ...threadData[n].payoffs].map(cardTitle)}
      onToggle={onToggle} onOpenPopup={onOpenPopup} />
  );

  return (
    <div style={{ width: 220, flexShrink: 0, border: '1px solid #eee', borderRadius: 10, padding: '10px 12px', height: '100%', overflow: 'auto', boxSizing: 'border-box' }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Threads</div>
      {focused.length > 0 ? (
        <>
          <div style={{ fontSize: 10, color: '#999', marginBottom: 8, fontStyle: 'italic' }}>Showing only the highlighted thread{focused.length > 1 ? 's' : ''}</div>
          {focused.map(renderRow)}
        </>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 2, background: '#f4f4f4', borderRadius: 8, padding: 2, marginBottom: 10 }}>
            <button onClick={() => setFilter('all')} style={{ ...btnStyle, flex: 1, border: 'none', background: filter === 'all' ? '#fff' : 'transparent', fontWeight: filter === 'all' ? 600 : 400 }}>All</button>
            <button onClick={() => setFilter('unresolved')} style={{ ...btnStyle, flex: 1, border: 'none', background: filter === 'unresolved' ? '#fff' : 'transparent', fontWeight: filter === 'unresolved' ? 600 : 400 }}>Unresolved</button>
            <button onClick={() => setFilter('resolved')} style={{ ...btnStyle, flex: 1, border: 'none', background: filter === 'resolved' ? '#fff' : 'transparent', fontWeight: filter === 'resolved' ? 600 : 400 }}>Resolved</button>
          </div>
          {filter !== 'resolved' && (
            <>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 6 }}>Open</div>
              {open.length === 0 && <div style={{ fontSize: 11, color: '#999', marginBottom: 8 }}>None</div>}
              {open.map(renderRow)}
            </>
          )}
          {filter !== 'unresolved' && (
            <>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#888', margin: '10px 0 6px' }}>Resolved</div>
              {resolved.length === 0 && <div style={{ fontSize: 11, color: '#999' }}>None</div>}
              {resolved.map(renderRow)}
            </>
          )}
        </>
      )}
    </div>
  );
}

export function ThreadEditPopup({ name, data, cards, color, colorOverride, onColorChange, notes, onClose, onRename, onAddRole, onCreateAndAddRole, onRemoveTag, onDelete, onNotesChange, allowRoleEdit = true }) {
  const [nameInput, setNameInput] = useState(name);
  const [addSetupId, setAddSetupId] = useState('');
  const [addStepId, setAddStepId] = useState('');
  const [addPayoffId, setAddPayoffId] = useState('');
  const [newCardMode, setNewCardMode] = useState(null); // 'setup' | 'step' | 'payoff' | null
  const [newCardTitle, setNewCardTitle] = useState('');

  const startNewCard = (role) => { setNewCardMode(role); setNewCardTitle(''); };
  const commitNewCard = (role) => {
    const title = newCardTitle.trim();
    if (!title || !onCreateAndAddRole) return;
    onCreateAndAddRole(title, role);
    setNewCardMode(null);
    setNewCardTitle('');
  };

  const cardById = (id) => cards.find(c => c.id === id);
  const setupTagFor = (cardId) => (cardById(cardId)?.tags || []).find(t => t.type === 'Thread' && t.role === 'setup' && t.note === name);
  const stepTagFor = (cardId) => (cardById(cardId)?.tags || []).find(t => t.type === 'Thread' && t.role === 'step' && t.note === name);
  const payoffTagFor = (cardId) => (cardById(cardId)?.tags || []).find(t => t.type === 'Thread' && t.role === 'payoff' && t.note === name);

  const stepCardIds = data.steps.map(s => s.cardId);
  const eligibleForSetup = cards.filter(c => !data.setups.includes(c.id));
  const eligibleForStep = cards.filter(c => !stepCardIds.includes(c.id));
  const eligibleForPayoff = cards.filter(c => !data.payoffs.includes(c.id));

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: 630, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', boxSizing: 'border-box', background: '#fff', borderRadius: 12, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
          <input value={nameInput} onChange={e => setNameInput(e.target.value)}
            onBlur={() => { if (nameInput.trim() && nameInput !== name) onRename(nameInput.trim()); }}
            onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
            style={{ flex: 1, fontSize: 15, fontWeight: 600, border: '1px solid #ddd', borderRadius: 6, padding: '4px 8px' }} />
          <button onClick={onClose} style={btnStyle}>Close</button>
        </div>
        {onColorChange && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 12, color: '#999' }}>Color</span>
            <ColorSwatchPicker value={colorOverride} onChange={onColorChange} palette={THREAD_COLOR_PALETTE} />
            {colorOverride && (
              <button onClick={() => onColorChange(null)} style={{ ...btnStyle, fontSize: 11 }}>Reset to auto</button>
            )}
          </div>
        )}

        <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>Setups</div>
        <div style={{ marginBottom: 10 }}>
          {data.setups.length === 0 && <div style={{ fontSize: 13, color: '#999' }}>None yet.</div>}
          {data.setups.map(cid => {
            const c = cardById(cid);
            if (!c) return null;
            const tag = setupTagFor(cid);
            return (
              <div key={cid} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, padding: '3px 0' }}>
                <span>{c.title}</span>
                {tag && <button onClick={() => onRemoveTag(cid, tag.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#999' }}>×</button>}
              </div>
            );
          })}
          {allowRoleEdit && (
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              <select value={addSetupId} onChange={e => setAddSetupId(e.target.value)} style={{ flex: 1, fontSize: 12 }}>
                <option value="">Choose a card...</option>
                {eligibleForSetup.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
              <button onClick={() => { if (addSetupId) { onAddRole(addSetupId, 'setup'); setAddSetupId(''); } }}
                style={{ ...btnStyle, fontSize: 12 }}>+ Add setup</button>
            </div>
          )}
          {allowRoleEdit && onCreateAndAddRole && (newCardMode === 'setup' ? (
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              <input autoFocus value={newCardTitle} onChange={e => setNewCardTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') commitNewCard('setup'); if (e.key === 'Escape') setNewCardMode(null); }}
                placeholder="Card title" style={{ flex: 1, fontSize: 12 }} />
              <button onClick={() => commitNewCard('setup')} style={{ ...btnStyle, fontSize: 12 }}>Create</button>
              <button onClick={() => setNewCardMode(null)} style={{ ...btnStyle, fontSize: 12 }}>Cancel</button>
            </div>
          ) : (
            <button onClick={() => startNewCard('setup')} style={{ ...btnStyle, fontSize: 11.5, marginTop: 4, color: '#777' }}>+ New unplaced card</button>
          ))}
        </div>
        {!allowRoleEdit && (
          <div style={{ fontSize: 11, color: '#bbb', marginTop: -6, marginBottom: 10 }}>Switch to Swimlanes to add or change links.</div>
        )}

        <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>Steps</div>
        <div style={{ marginBottom: 10 }}>
          {data.steps.length === 0 && <div style={{ fontSize: 13, color: '#999' }}>None yet — the beats that develop the thread between setup and payoff.</div>}
          {data.steps.map(({ cardId: cid, step }) => {
            const c = cardById(cid);
            if (!c) return null;
            const tag = stepTagFor(cid);
            return (
              <div key={cid} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, padding: '3px 0' }}>
                <span>Step {step}: {c.title}</span>
                {tag && <button onClick={() => onRemoveTag(cid, tag.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#999' }}>×</button>}
              </div>
            );
          })}
          {allowRoleEdit && (
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              <select value={addStepId} onChange={e => setAddStepId(e.target.value)} style={{ flex: 1, fontSize: 12 }}>
                <option value="">Choose a card...</option>
                {eligibleForStep.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
              <button onClick={() => { if (addStepId) { onAddRole(addStepId, 'step'); setAddStepId(''); } }}
                style={{ ...btnStyle, fontSize: 12 }}>+ Add step</button>
            </div>
          )}
          {allowRoleEdit && onCreateAndAddRole && (newCardMode === 'step' ? (
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              <input autoFocus value={newCardTitle} onChange={e => setNewCardTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') commitNewCard('step'); if (e.key === 'Escape') setNewCardMode(null); }}
                placeholder="Card title" style={{ flex: 1, fontSize: 12 }} />
              <button onClick={() => commitNewCard('step')} style={{ ...btnStyle, fontSize: 12 }}>Create</button>
              <button onClick={() => setNewCardMode(null)} style={{ ...btnStyle, fontSize: 12 }}>Cancel</button>
            </div>
          ) : (
            <button onClick={() => startNewCard('step')} style={{ ...btnStyle, fontSize: 11.5, marginTop: 4, color: '#777' }}>+ New unplaced card</button>
          ))}
        </div>

        <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>Payoffs</div>
        <div style={{ marginBottom: 12 }}>
          {data.payoffs.length === 0 && <div style={{ fontSize: 13, color: '#999' }}>None yet.</div>}
          {data.payoffs.map(cid => {
            const c = cardById(cid);
            if (!c) return null;
            const tag = payoffTagFor(cid);
            return (
              <div key={cid} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, padding: '3px 0' }}>
                <span>{c.title}</span>
                {tag && <button onClick={() => onRemoveTag(cid, tag.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#999' }}>×</button>}
              </div>
            );
          })}
          {allowRoleEdit && (
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              <select value={addPayoffId} onChange={e => setAddPayoffId(e.target.value)} style={{ flex: 1, fontSize: 12 }}>
                <option value="">Choose a card...</option>
                {eligibleForPayoff.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
              <button onClick={() => { if (addPayoffId) { onAddRole(addPayoffId, 'payoff'); setAddPayoffId(''); } }}
                style={{ ...btnStyle, fontSize: 12 }}>+ Add payoff</button>
            </div>
          )}
          {allowRoleEdit && onCreateAndAddRole && (newCardMode === 'payoff' ? (
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              <input autoFocus value={newCardTitle} onChange={e => setNewCardTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') commitNewCard('payoff'); if (e.key === 'Escape') setNewCardMode(null); }}
                placeholder="Card title" style={{ flex: 1, fontSize: 12 }} />
              <button onClick={() => commitNewCard('payoff')} style={{ ...btnStyle, fontSize: 12 }}>Create</button>
              <button onClick={() => setNewCardMode(null)} style={{ ...btnStyle, fontSize: 12 }}>Cancel</button>
            </div>
          ) : (
            <button onClick={() => startNewCard('payoff')} style={{ ...btnStyle, fontSize: 11.5, marginTop: 4, color: '#777' }}>+ New unplaced card</button>
          ))}
        </div>

        {allowRoleEdit && onCreateAndAddRole && (
          <div style={{ fontSize: 11, color: '#bbb', marginTop: -6, marginBottom: 10 }}>
            Unplaced cards show up in Scene → Unassigned and Flowchart's unassigned column until you drag them into a chapter and act.
          </div>
        )}

        <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>Notes / commentary</div>
        <textarea value={notes} onChange={e => onNotesChange(e.target.value)}
          placeholder="Paste a quote and citation, or write commentary about this thread..."
          style={{ width: '100%', minHeight: 80, fontSize: 13, borderRadius: 6, border: '1px solid #ddd', padding: 6, boxSizing: 'border-box', resize: 'vertical', marginBottom: 12 }} />

        <DeleteButton onDelete={onDelete} label="Delete this thread" />
      </div>
    </div>
  );
}

export function RemoteControl({ cards, updateCard, setState, chapterFilter, chapters }) {
  const [selId, setSelId] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const selCard = cards.find(c => c.id === selId);

  const addCard = () => {
    if (!newTitle.trim()) return;
    const chapterId = chapterFilter !== 'all' ? chapterFilter : ((chapters[chapters.length - 1] && chapters[chapters.length - 1].id) || null);
    setState(s => {
      const arr = [...s.cards];
      let insertAt = arr.length;
      if (chapterId) {
        for (let i = arr.length - 1; i >= 0; i--) { if (arr[i].chapterId === chapterId) { insertAt = i + 1; break; } }
      }
      arr.splice(insertAt, 0, { id: uid(), act: null, gapIndex: null, chapterId, title: newTitle.trim(), text: '', notes: '', tags: [], values: [], placeholder: GENERIC_PLACEHOLDER, customColor: null, major: false });
      return { ...s, cards: arr };
    });
    setNewTitle('');
  };

  return (
    <div style={{ marginTop: 16, border: '1px solid #eee', borderRadius: 10, padding: 12, maxWidth: 500 }}>
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Remote Control</div>
      <div style={{ fontSize: 11, color: '#999', marginBottom: 8 }}>Ring position is automatic, based on card order in Scene.</div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
        <select value={selId} onChange={e => setSelId(e.target.value)} style={{ fontSize: 12 }}>
          <option value="">Select a card...</option>
          {cards.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
        {selCard && (
          <>
            <input value={selCard.title} onChange={e => updateCard(selCard.id, { title: e.target.value })} style={{ fontSize: 12, width: 120 }} />
            <label style={{ fontSize: 12 }}>
              <input type="checkbox" checked={!!selCard.major} onChange={e => updateCard(selCard.id, { major: e.target.checked })} /> ★ major
            </label>
            <DeleteButton label="Delete this card"
              onDelete={() => { setState(s => ({ ...s, cards: s.cards.filter(c => c.id !== selCard.id) })); setSelId(''); }} />
          </>
        )}
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="New card title" style={{ fontSize: 12, width: 160 }} />
        <button onClick={addCard} style={btnStyle}>+ Add card</button>
      </div>
    </div>
  );
}

