// @ts-nocheck -- JSX migrated without changing the original event and state logic.
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ACT_COLORS, ACT_BORDERS, UNASSIGNED_COLOR, UNASSIGNED_BORDER, ACT_NAMES, ACTS, BOLD_PALETTE, SOFT_PALETTE, uid, GENERIC_PLACEHOLDER, resolveColor, resolveBorder } from '../domain/story';
import { parseWords } from '../domain/words';
import { btnStyle } from './styles';

/* ============================== SMALL UI PRIMITIVES ============================== */

export function ChipBar({ label, items, onAdd, onRemove }) {
  const [val, setVal] = useState('');
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '8px 0' }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#666', minWidth: 90 }}>{label}</span>
      {items.map(it => (
        <span key={it} style={{ background: '#eee', borderRadius: 12, padding: '3px 10px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
          {it}
          <button onClick={() => onRemove(it)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#999', fontSize: 12, padding: 0 }}>×</button>
        </span>
      ))}
      <input
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && val.trim()) { onAdd(val.trim()); setVal(''); } }}
        placeholder={`Add ${label.toLowerCase().replace(/:$/, '')}...`}
        style={{ border: '1px solid #ddd', borderRadius: 8, fontSize: 13, padding: '3px 8px', width: 140 }}
      />
    </div>
  );
}

function ActBadge({ act }) {
  if (!act) return <span style={{ fontSize: 11, background: UNASSIGNED_COLOR, border: `1px solid ${UNASSIGNED_BORDER}`, borderRadius: 6, padding: '2px 8px', color: '#888' }}>Unassigned</span>;
  return <span style={{ fontSize: 11, background: ACT_COLORS[act], border: `1px solid ${ACT_BORDERS[act]}`, borderRadius: 6, padding: '2px 8px', color: '#555' }}>{ACT_NAMES[act]}</span>;
}

function ActSelect({ act, onChange }) {
  return (
    <select value={act === null || act === undefined ? '' : act}
      onChange={e => onChange(e.target.value ? parseInt(e.target.value, 10) : null)}
      style={{
        fontSize: 11, background: act ? ACT_COLORS[act] : UNASSIGNED_COLOR,
        border: `1px solid ${act ? ACT_BORDERS[act] : UNASSIGNED_BORDER}`, borderRadius: 6,
        padding: '2px 6px', color: '#555', cursor: 'pointer',
      }}>
      <option value="">Unassigned</option>
      {ACTS.map(a => <option key={a} value={a}>{ACT_NAMES[a]}</option>)}
    </select>
  );
}

export function ColorSwatchPicker({ value, onChange, palette = [...BOLD_PALETTE, ...SOFT_PALETTE] }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
      {palette.map((p, i) => (
        <React.Fragment key={p.hex}>
          <button onClick={() => onChange(value === p.hex ? null : p.hex)} title={p.name}
            style={{
              width: 22, height: 22, borderRadius: '50%', background: p.hex, cursor: 'pointer',
              border: value === p.hex ? '3px solid #333' : '1px solid #ccc',
            }} />
          {palette[0] === BOLD_PALETTE[0] && i === BOLD_PALETTE.length - 1 && palette.length > BOLD_PALETTE.length && <div style={{ flexBasis: '100%', height: 0 }} />}
        </React.Fragment>
      ))}
    </div>
  );
}

/* ============================== SEGMENTED CONTROL ============================== */

export function SegButtons({ value, onChange, options }) {
  return (
    <div style={{ display: 'inline-flex', border: '1px solid #ccc', borderRadius: 6, overflow: 'hidden', fontSize: 12 }}>
      {options.map(([val, label], i) => (
        <button key={val} type="button" onClick={() => onChange(val)}
          style={{
            border: 'none', borderLeft: i > 0 ? '1px solid #ccc' : 'none',
            background: value === val ? '#333' : '#fff', color: value === val ? '#fff' : '#555',
            padding: '3px 10px', cursor: 'pointer', font: 'inherit',
          }}>{label}</button>
      ))}
    </div>
  );
}

/* ============================== TAG EDITOR ============================== */

function TagEditor({ tags, onChange, characters, threads, onAddThread, tagTypes, onAddTagType }) {
  const [kind, setKind] = useState('label'); // 'label' | 'thread'
  const [labelType, setLabelType] = useState('');
  const [selChars, setSelChars] = useState([]);
  const [direction, setDirection] = useState('up');
  const [note, setNote] = useState('');
  const [role, setRole] = useState('setup');
  const [threadName, setThreadName] = useState('');

  const addTags = () => {
    if (kind === 'thread') {
      const name = threadName.trim();
      if (!name) return;
      if (!threads.includes(name)) onAddThread(name);
      const tag = { id: uid(), type: 'Thread', role, note: name };
      onChange([...tags, tag]);
      setThreadName('');
    } else {
      const typeName = labelType.trim();
      if (!typeName || selChars.length === 0) return;
      if (!tagTypes.includes(typeName)) onAddTagType(typeName);
      const additions = selChars.map(c => ({ id: uid(), type: typeName, char: c, direction, note }));
      onChange([...tags, ...additions]);
      setSelChars([]); setNote('');
    }
  };
  const removeTag = (id) => onChange(tags.filter(t => t.id !== id));
  const threadTagLabel = (t) => t.role === 'step' ? 'Step' : (t.role === 'setup' ? 'Setup' : 'Payoff');

  return (
    <div style={{ fontSize: 12, border: '1px solid #eee', borderRadius: 8, padding: 8, marginTop: 6 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
        {tags.map(t => (
          <span key={t.id} style={{ background: '#f4f4f4', borderRadius: 10, padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
            {t.type === 'Thread'
              ? `Thread: ${t.note} (${threadTagLabel(t)})`
              : `${t.type}: ${t.char} ${t.direction === 'up' ? '↑' : '↓'}${t.note ? ' — ' + t.note : ''}`}
            <button onClick={() => removeTag(t.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#999' }}>×</button>
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <SegButtons value={kind} onChange={setKind} options={[['label', 'Tag'], ['thread', 'Thread']]} />
        {kind === 'label' ? (
          <>
            <input list="tag-type-lib" value={labelType} onChange={e => setLabelType(e.target.value)} placeholder="tag name..." style={{ width: 100, fontSize: 12 }} />
            <datalist id="tag-type-lib">{tagTypes.map(t => <option key={t} value={t} />)}</datalist>
            {characters.length === 0 && <span style={{ color: '#999' }}>Add characters above first</span>}
            {characters.map(c => (
              <label key={c} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <input type="checkbox" checked={selChars.includes(c)}
                  onChange={e => setSelChars(e.target.checked ? [...selChars, c] : selChars.filter(x => x !== c))} />
                {c}
              </label>
            ))}
            <SegButtons value={direction} onChange={setDirection} options={[['up', '↑'], ['down', '↓']]} />
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="note" style={{ width: 90, fontSize: 12 }} />
          </>
        ) : (
          <>
            <SegButtons value={role} onChange={setRole} options={[['setup', 'Setup'], ['step', 'Step'], ['payoff', 'Payoff']]} />
            <input list="thread-lib" value={threadName} onChange={e => setThreadName(e.target.value)} placeholder="thread name" style={{ width: 110, fontSize: 12 }} />
            <datalist id="thread-lib">{threads.map(t => <option key={t} value={t} />)}</datalist>
          </>
        )}
        <button onClick={addTags} style={{ fontSize: 12, border: '1px solid #ccc', borderRadius: 6, padding: '2px 8px', cursor: 'pointer' }}>+ Add</button>
      </div>
    </div>
  );
}

/* ============================== VALUE EDITOR ============================== */

function ValueEditor({ cardValues, onChange, valuesLib }) {
  const active = cardValues.map(v => v.name);
  const toggle = (name) => {
    if (active.includes(name)) onChange(cardValues.filter(v => v.name !== name));
    else onChange([...cardValues, { name, shift: 0 }]);
  };
  const setShift = (name, shift) => onChange(cardValues.map(v => v.name === name ? { ...v, shift } : v));

  if (valuesLib.length === 0) return null;
  return (
    <div style={{ fontSize: 12, marginTop: 6 }}>
      {valuesLib.length === 1 ? (
        <ShiftRow name={valuesLib[0]} shift={(cardValues.find(v => v.name === valuesLib[0]) || {}).shift || 0}
          onSet={s => onChange([{ name: valuesLib[0], shift: s }])} />
      ) : (
        valuesLib.map(name => (
          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input type="checkbox" checked={active.includes(name)} onChange={() => toggle(name)} />
              {name}
            </label>
            {active.includes(name) && (
              <ShiftRow name={name} shift={(cardValues.find(v => v.name === name) || {}).shift || 0} onSet={s => setShift(name, s)} bare />
            )}
          </div>
        ))
      )}
    </div>
  );
}
function DeleteIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" style={{ display: 'block' }}>
      <circle cx="10" cy="10" r="10" fill="#DD5240" />
      <path d="M6.5 6.5L13.5 13.5M13.5 6.5L6.5 13.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// Native window.confirm() is unreliable in embedded/sandboxed contexts (some block it outright,
// silently swallowing the click). This arms on first click and fires on a second click within 3s,
// so delete always works and still can't happen by accident.
// Small inline explanatory note, shown only when the global Help toggle is on.
export function HelpNote({ on, children, style }) {
  if (!on) return null;
  return (
    <div style={{
      fontSize: 11, color: '#8a8a8a', background: '#f7f6f4', border: '1px solid #eee', borderRadius: 6,
      padding: '5px 8px', lineHeight: 1.4, maxWidth: 340, marginTop: 4, marginBottom: 6, ...style,
    }}>{children}</div>
  );
}

export function DeleteButton({ onDelete, label = 'Delete this card' }) {
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 3000);
    return () => clearTimeout(t);
  }, [confirming]);
  return (
    <button
      onClick={() => { if (confirming) { setConfirming(false); onDelete(); } else { setConfirming(true); } }}
      title={confirming ? `Click again to confirm — ${label}` : label}
      style={{
        border: 'none', background: 'none', cursor: 'pointer', padding: 1, display: 'inline-flex',
        alignItems: 'center', borderRadius: '50%', boxShadow: confirming ? '0 0 0 2px #DD5240' : 'none',
      }}>
      <DeleteIcon />
    </button>
  );
}

function ShiftRow({ shift, onSet }) {
  return (
    <span>
      shift: <input type="number" value={shift} onChange={e => onSet(parseFloat(e.target.value) || 0)} style={{ width: 50, fontSize: 12 }} />
    </span>
  );
}

/* ============================== SHARED CARD FIELDS ============================== */
/* Used by the Scene list AND the Flowchart/Circle edit popups, so a card looks and
   behaves identically everywhere: same colour, same content, same functions. */

export function CardFields({
  card, updateCard, characters, threads, valuesLib, onAddThread, tagTypes, onAddTagType,
  showNudgeDelete = false, onNudge, onDelete, nudgeDisabled = {}, notesOpenByDefault = false,
}) {
  return (
    <div style={{ border: `1px solid ${resolveBorder(card)}`, background: resolveColor(card), borderRadius: 10, padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
          <ActSelect act={card.act} onChange={act => updateCard({ act })} />
          {card.major && <span title="Major turning point" style={{ fontSize: 13 }}>★</span>}
          <input value={card.title} onChange={e => updateCard({ title: e.target.value })}
            style={{ fontWeight: 600, fontSize: 15, border: 'none', background: 'transparent', flex: 1, minWidth: 0 }} />
        </div>
        {showNudgeDelete && (
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => onNudge(-1)} disabled={!!nudgeDisabled.up} style={{ ...btnStyle, opacity: nudgeDisabled.up ? 0.35 : 1 }}>↑</button>
            <button onClick={() => onNudge(1)} disabled={!!nudgeDisabled.down} style={{ ...btnStyle, opacity: nudgeDisabled.down ? 0.35 : 1 }}>↓</button>
            <DeleteButton onDelete={onDelete} />
          </div>
        )}
      </div>
      <textarea value={card.text} onChange={e => updateCard({ text: e.target.value })}
        placeholder={card.placeholder || GENERIC_PLACEHOLDER}
        style={{ width: '100%', minHeight: 44, marginTop: 6, fontSize: 13, border: '1px solid #eee', borderRadius: 6, padding: 6, boxSizing: 'border-box' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 12, color: '#777' }}>
        <span>Words</span>
        <input type="number" min="0" value={card.words ?? ''} onChange={e => updateCard({ words: parseWords(e.target.value) })} style={{ width: 80, fontSize: 12 }} />
      </div>
      <TagEditor tags={card.tags} onChange={t => updateCard({ tags: t })} characters={characters} threads={threads} onAddThread={onAddThread} tagTypes={tagTypes} onAddTagType={onAddTagType} />
      <ValueEditor cardValues={card.values} onChange={v => updateCard({ values: v })} valuesLib={valuesLib} />
      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 11, color: '#777', marginBottom: 4 }}>Colour override</div>
        <ColorSwatchPicker value={card.customColor} onChange={color => updateCard({ customColor: color })} />
      </div>
      <details style={{ marginTop: 6 }} open={notesOpenByDefault}>
        <summary style={{ fontSize: 12, color: '#777', cursor: 'pointer' }}>Notes / commentary</summary>
        <textarea value={card.notes} onChange={e => updateCard({ notes: e.target.value })}
          placeholder="Paste quote + citation, or write commentary notes here..."
          style={{ width: '100%', minHeight: 60, marginTop: 4, fontSize: 13, border: '1px solid #eee', borderRadius: 6, padding: 6, boxSizing: 'border-box' }} />
      </details>
    </div>
  );
}

export function CardEditModal({ card, cards, onClose, updateCard, onNudge, onDelete, characters, threads, valuesLib, onAddThread, tagTypes, onAddTagType }) {
  const idx = cards.findIndex(c => c.id === card.id);
  const canUp = idx > 0;
  const canDown = idx >= 0 && idx < cards.length - 1;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: 630, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
        <CardFields
          card={card} updateCard={updateCard} characters={characters} threads={threads} valuesLib={valuesLib} onAddThread={onAddThread}
          tagTypes={tagTypes} onAddTagType={onAddTagType}
          showNudgeDelete onNudge={onNudge} onDelete={() => { onDelete(); onClose(); }}
          nudgeDisabled={{ up: !canUp, down: !canDown }} notesOpenByDefault
        />
      </div>
    </div>
  );
}

