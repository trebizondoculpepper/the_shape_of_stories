// @ts-nocheck -- JSX migrated without changing the original event and state logic.
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { CIRCLE_STAGES, uid, freshDefaultChapters, freshDefaultCards } from './domain/story';
import { cardsToMarkdown, markdownToCards } from './domain/markdown';
import { btnStyle } from './components/styles';
import { SceneView } from './views/SceneView';
import { FlowchartView } from './views/FlowchartView';
import { CircleView } from './views/CircleView';
import { RingView } from './views/RingView';
import { WordMeter, WordCountView } from './views/WordCountView';
import { ArcChartView } from './views/ArcChartView';
import { ChapterBar, ChapterReorderPanel } from './views/ChapterControls';
import { ThreadLibraryView } from './views/ThreadLibraryView';

/* ============================== TOP-LEVEL APP ============================== */

const VIEWS = ['Scene', 'Flowchart', 'Ring', 'Arc Chart', 'Threads', 'Words']; // Circle is reachable via a link from Ring, not a top-level tab

export function PlotTool() {
  const [state, setState] = useState(() => {
    const chapters = freshDefaultChapters();
    return { cards: freshDefaultCards(chapters[0].id), characters: [], themes: [], values: [], threads: [], tagTypes: [], threadNotes: {}, threadColors: {}, threadLanes: {}, chapters, circleStages: CIRCLE_STAGES, circleStagesHidden: false };
  });
  const [view, setView] = useState('Scene');
  const [fileName, setFileName] = useState(null);
  const [pinnedIds, setPinnedIds] = useState([]); // Circle stacking order — lifted here so it survives view switches
  const [activeChapterId, setActiveChapterId] = useState('all'); // lifted so the chapter filter survives view switches
  const [expandedChapterIds, setExpandedChapterIds] = useState(() => state.chapters.map(ch => ch.id)); // lifted so Flowchart's expand/collapse survives view switches
  const [reorderOpen, setReorderOpen] = useState(false);
  const [helpOn, setHelpOn] = useState(false); // global show/hide for inline help notes, not saved to the file
  const fileInputRef = useRef(null);
  useEffect(() => { document.title = state.title ? `${state.title} — Story Shape` : 'Story Shape'; }, [state.title]);

  // Newly created chapters start expanded, since the user is presumably about to work on it.
  const addChapter = (title) => {
    const chapter = { id: uid(), title };
    setState(s => ({ ...s, chapters: [...s.chapters, chapter], cards: [...s.cards, ...freshDefaultCards(chapter.id)] }));
    setExpandedChapterIds(prev => [...prev, chapter.id]);
  };

  const handleExport = () => {
    const md = cardsToMarkdown(state);
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safe = (state.title || '').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '').replace(/\s+/g, ' ').trim();
    const name = (safe || 'story-plot') + '.md';
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setFileName(name);
  };

  const handleImportClick = () => fileInputRef.current && fileInputRef.current.click();
  const handleImportFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const parsed = markdownToCards(ev.target.result);
      setState({ ...parsed, title: parsed.title || file.name.replace(/\.md$/i, '') });
      setFileName(file.name);
      setActiveChapterId('all');
      setExpandedChapterIds(parsed.chapters.map(ch => ch.id));
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const [startOverOpen, setStartOverOpen] = useState(false);
  const doStartOver = () => {
    const chapters = freshDefaultChapters();
    setState({ cards: freshDefaultCards(chapters[0].id), characters: [], themes: [], values: [], threads: [], tagTypes: [], threadNotes: {}, threadColors: {}, threadLanes: {}, chapters, circleStages: CIRCLE_STAGES, circleStagesHidden: false, title: '' });
    setFileName(null);
    setActiveChapterId('all');
    setExpandedChapterIds(chapters.map(ch => ch.id));
    setStartOverOpen(false);
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', color: '#222', maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid #eee', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {VIEWS.map(v => (
            <button key={v} onClick={() => setView(v)}
              style={{ ...btnStyle, background: view === v ? '#333' : '#fff', color: view === v ? '#fff' : '#333' }}>
              {v}
            </button>
          ))}
          <button onClick={() => setHelpOn(h => !h)}
            style={{ ...btnStyle, background: helpOn ? '#333' : '#fff', color: helpOn ? '#fff' : '#333' }}
            title="Show or hide short explanatory notes next to the controls">? Help</button>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12 }}>
          <input value={state.title || ''} onChange={e => setState(s => ({ ...s, title: e.target.value }))} placeholder="Untitled plot" title="Plot title — also used as the exported file name"
            style={{ fontSize: 16, fontWeight: 600, width: 240, border: 'none', borderBottom: '1px solid #ddd', background: 'transparent', padding: '2px 4px' }} />
          <button onClick={handleImportClick} style={btnStyle}>Import .md</button>
          <input ref={fileInputRef} type="file" accept=".md,text/markdown" style={{ display: 'none' }} onChange={handleImportFile} />
          <button onClick={handleExport} style={btnStyle}>Export .md</button>
          <button onClick={() => setStartOverOpen(true)} style={btnStyle}>Start Over</button>
        </div>
      </div>

      <WordMeter cards={state.cards} goal={state.wordGoal || 0} onGoal={g => setState(s => ({ ...s, wordGoal: g }))} onOpen={() => setView('Words')} />

      {startOverOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setStartOverOpen(false)}>
          <div style={{ background: '#fff', borderRadius: 10, width: 340, padding: 20, boxShadow: '0 8px 30px rgba(0,0,0,0.25)' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 6px', fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: '#D85A30' }}>⚠</span> Start Over
            </h3>
            <p style={{ fontSize: 12.5, color: '#555', margin: '0 0 16px', lineHeight: 1.5 }}>
              This clears all current data — chapters, cards, characters, threads, everything. Unsaved changes will be lost. This can't be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setStartOverOpen(false)} style={btnStyle}>Cancel</button>
              <button onClick={doStartOver} style={{ ...btnStyle, border: 'none', background: '#D85A30', color: '#fff' }}>Start Over</button>
            </div>
          </div>
        </div>
      )}

      <ChapterBar
        chapters={state.chapters} activeChapterId={activeChapterId} setActiveChapterId={setActiveChapterId}
        onAddChapter={addChapter} reorderOpen={reorderOpen} setReorderOpen={setReorderOpen} help={helpOn}
      />
      {reorderOpen && (
        <ChapterReorderPanel chapters={state.chapters} cards={state.cards} setState={setState} activeChapterId={activeChapterId} setActiveChapterId={setActiveChapterId} setExpandedChapterIds={setExpandedChapterIds} />
      )}

      {view === 'Scene' && <SceneView state={state} setState={setState} chapterFilter={activeChapterId} help={helpOn} />}
      {view === 'Flowchart' && <FlowchartView state={state} setState={setState} chapterFilter={activeChapterId} expandedChapterIds={expandedChapterIds} setExpandedChapterIds={setExpandedChapterIds} help={helpOn} />}
      {view === 'Ring' && <RingView state={state} setState={setState} chapterFilter={activeChapterId} onOpenClassic={() => setView('Circle')} help={helpOn} />}
      {view === 'Circle' && <CircleView state={state} setState={setState} pinnedIds={pinnedIds} setPinnedIds={setPinnedIds} chapterFilter={activeChapterId} onBackToRing={() => setView('Ring')} help={helpOn} />}
      {view === 'Arc Chart' && <ArcChartView state={state} chapterFilter={activeChapterId} help={helpOn} />}
      {view === 'Threads' && <ThreadLibraryView state={state} setState={setState} help={helpOn} />}
      {view === 'Words' && <WordCountView state={state} setState={setState} chapterFilter={activeChapterId} help={helpOn} />}
    </div>
  );
}


