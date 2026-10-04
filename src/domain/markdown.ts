import { CIRCLE_STAGES, uid, GENERIC_PLACEHOLDER } from './story';
import { parseWords } from './words';
import type { Card, Chapter, StoryState } from './types';

/* ============================== MARKDOWN EXPORT / IMPORT ============================== */

export function esc(s?: string) { return (s || '').replace(/\n/g, '\\n'); }
export function unesc(s: string) { return (s || '').replace(/\\n/g, '\n'); }

export function cardsToMarkdown(state: StoryState) {
  const { cards, characters, themes, values, threads, chapters, tagTypes, threadNotes, threadColors, threadLanes, circleStages, circleStagesHidden, wordGoal, title } = state;
  let md = '# STORY PLOT DATA\n\n';
  md += '## Title\n- ' + esc(title || '') + '\n\n';
  md += '## Chapters\n' + (chapters || []).map(ch => `- ${ch.id} | ${esc(ch.title)}`).join('\n') + '\n\n';
  md += '## Characters\n' + characters.map(c => `- ${c}`).join('\n') + '\n\n';
  md += '## Themes\n' + themes.map(c => `- ${c}`).join('\n') + '\n\n';
  md += '## Values\n' + values.map(c => `- ${c}`).join('\n') + '\n\n';
  md += '## Threads\n' + threads.map(c => `- ${c}`).join('\n') + '\n\n';
  md += '## ThreadNotes\n' + threads.map(t => `- ${esc(t)} | ${esc((threadNotes && threadNotes[t]) || '')}`).join('\n') + '\n\n';
  md += '## ThreadColors\n' + threads.filter(t => threadColors && threadColors[t]).map(t => `- ${esc(t)} | ${threadColors[t]}`).join('\n') + '\n\n';
  md += '## ThreadLanes\n' + threads.filter(t => threadLanes && threadLanes[t] !== undefined).map(t => `- ${esc(t)} | ${threadLanes[t]}`).join('\n') + '\n\n';
  md += '## TagTypes\n' + (tagTypes || []).map(c => `- ${c}`).join('\n') + '\n\n';
  md += '## CircleStages\n' + ((circleStages && circleStages.length === 8) ? circleStages : CIRCLE_STAGES).map(c => `- ${esc(c)}`).join('\n') + '\n\n';
  md += '## CircleStagesHidden\n- ' + (!!circleStagesHidden) + '\n\n';
  md += '## WordGoal\n- ' + (wordGoal || '') + '\n\n';
  md += '## Cards\n\n';
  cards.forEach(card => {
    md += `### ${esc(card.title)}\n`;
    md += `- id: ${card.id}\n`;
    md += `- chapterId: ${card.chapterId || ''}\n`;
    md += `- act: ${card.act === null || card.act === undefined ? '' : card.act}\n`;
    md += `- gapIndex: ${card.gapIndex === null || card.gapIndex === undefined ? '' : card.gapIndex}\n`;
    md += `- major: ${!!card.major}\n`;
    md += `- color: ${card.customColor || ''}\n`;
    md += `- words: ${card.words ?? ''}\n`;
    md += `- wordTarget: ${card.wordTarget ?? ''}\n`;
    md += `- placeholder: ${esc(card.placeholder || '')}\n`;
    md += `- text: ${esc(card.text)}\n`;
    md += `- notes: ${esc(card.notes)}\n`;
    md += `- tags:\n`;
    (card.tags || []).forEach(t => {
      if (t.type === 'Thread') {
        md += `  - Thread | ${t.role} | ${esc(t.note)} | \n`;
      } else {
        md += `  - ${t.type} | ${esc(t.char || '')} | ${t.direction || 'up'} | ${esc(t.note || '')}\n`;
      }
    });
    md += `- values:\n`;
    (card.values || []).forEach(v => { md += `  - ${esc(v.name)} | ${v.shift}\n`; });
    md += '\n---\n\n';
  });
  return md;
}

export function markdownToCards(md: string): StoryState {
  const lines = md.split('\n');
  const characters: string[] = [], themes: string[] = [], values: string[] = [], threads: string[] = [], chapters: Chapter[] = [], tagTypes: string[] = [], circleStages: string[] = [];
  const threadNotes: Record<string, string> = {}; const threadColors: Record<string, string> = {}; const threadLanes: Record<string, number> = {};
  let circleStagesHidden = false;
  let wordGoal = null;
  let title = '';
  const cards: Card[] = [];
  let section = null;
  let current: Card | null = null;
  let listMode = null; // 'tags' | 'values'

  const pushCurrent = () => { if (current) cards.push(current); current = null; };

  for (let raw of lines) {
    const line = raw;
    const h2 = line.match(/^##\s+(.*)$/);
    const h3 = line.match(/^###\s+(.*)$/);
    if (h2) {
      pushCurrent();
      const name = h2[1].trim().toLowerCase();
      if (name === 'title') section = 'title';
      else if (name === 'chapters') section = 'chapters';
      else if (name === 'characters') section = 'characters';
      else if (name === 'themes') section = 'themes';
      else if (name === 'values') section = 'values';
      else if (name === 'threads') section = 'threads';
      else if (name === 'threadnotes') section = 'threadNotes';
      else if (name === 'threadcolors') section = 'threadColors';
      else if (name === 'threadlanes') section = 'threadLanes';
      else if (name === 'tagtypes') section = 'tagTypes';
      else if (name === 'circlestages') section = 'circleStages';
      else if (name === 'circlestageshidden') section = 'circleStagesHidden';
      else if (name === 'wordgoal') section = 'wordGoal';
      else if (name === 'cards') section = 'cards';
      else section = null;
      listMode = null;
      continue;
    }
    if (h3 && section === 'cards') {
      pushCurrent();
      current = {
        id: uid(), act: null, gapIndex: null, chapterId: null, title: unesc(h3[1].trim()), text: '', notes: '',
        tags: [], values: [], placeholder: GENERIC_PLACEHOLDER, customColor: null, major: false,
      };
      listMode = null;
      continue;
    }
    if (section === 'chapters') {
      const m = line.match(/^-\s+(.*)$/);
      if (m && m[1].trim()) {
        const parts = m[1].split('|').map(s => s.trim());
        chapters.push({ id: parts[0], title: unesc(parts[1] || parts[0]) });
      }
      continue;
    }
    if (section === 'cards' && current) {
      let m;
      if ((m = line.match(/^- id:\s*(.*)$/))) { if (m[1].trim()) current.id = m[1].trim(); listMode = null; continue; }
      if ((m = line.match(/^- chapterId:\s*(.*)$/))) { current.chapterId = m[1].trim() || null; listMode = null; continue; }
      if ((m = line.match(/^- act:\s*(.*)$/))) { const v = m[1].trim(); current.act = v ? parseInt(v, 10) : null; listMode = null; continue; }
      if ((m = line.match(/^- gapIndex:\s*(.*)$/))) { const v = m[1].trim(); current.gapIndex = v ? parseInt(v, 10) : null; listMode = null; continue; }
      if ((m = line.match(/^- major:\s*(.*)$/))) { current.major = m[1].trim() === 'true'; listMode = null; continue; }
      if ((m = line.match(/^- words:\s*(.*)$/))) { current.words = parseWords(m[1]); listMode = null; continue; }
      if ((m = line.match(/^- wordTarget:\s*(.*)$/))) { current.wordTarget = parseWords(m[1]); listMode = null; continue; }
      if ((m = line.match(/^- color:\s*(.*)$/))) { current.customColor = m[1].trim() || null; listMode = null; continue; }
      if ((m = line.match(/^- placeholder:\s*(.*)$/))) { current.placeholder = unesc(m[1]) || GENERIC_PLACEHOLDER; listMode = null; continue; }
      if ((m = line.match(/^- text:\s*(.*)$/))) { current.text = unesc(m[1]); listMode = null; continue; }
      if ((m = line.match(/^- notes:\s*(.*)$/))) { current.notes = unesc(m[1]); listMode = null; continue; }
      if (line.match(/^- tags:\s*$/)) { listMode = 'tags'; continue; }
      if (line.match(/^- values:\s*$/)) { listMode = 'values'; continue; }
      if (listMode === 'tags' && (m = line.match(/^\s{2}-\s*(.*)$/))) {
        const parts = m[1].split('|').map(s => s.trim());
        if (parts[0] === 'Thread') {
          const tag = { id: uid(), type: 'Thread', role: parts[1], note: unesc(parts[2] || '') };
          current.tags.push(tag);
        } else {
          current.tags.push({ id: uid(), type: parts[0], char: unesc(parts[1] || ''), direction: parts[2] || 'up', note: unesc(parts[3] || '') });
        }
        continue;
      }
      if (listMode === 'values' && (m = line.match(/^\s{2}-\s*(.*)$/))) {
        const parts = m[1].split('|').map(s => s.trim());
        current.values.push({ name: unesc(parts[0]), shift: parseFloat(parts[1]) || 0 });
        continue;
      }
      if (line.trim() === '---') { pushCurrent(); listMode = null; continue; }
      continue;
    }
    if (section === 'threadNotes') {
      const m = line.match(/^-\s+(.*)$/);
      if (m && m[1].trim()) {
        const parts = m[1].split('|');
        const name = unesc(parts[0].trim());
        const note = unesc((parts.slice(1).join('|') || '').trim());
        threadNotes[name] = note;
      }
      continue;
    }
    if (section === 'threadColors') {
      const m = line.match(/^-\s+(.*)$/);
      if (m && m[1].trim()) {
        const parts = m[1].split('|').map(s => s.trim());
        if (parts[1]) threadColors[unesc(parts[0])] = parts[1];
      }
      continue;
    }
    if (section === 'threadLanes') {
      const m = line.match(/^-\s+(.*)$/);
      if (m && m[1].trim()) {
        const parts = m[1].split('|').map(s => s.trim());
        if (parts[1] !== undefined && parts[1] !== '') threadLanes[unesc(parts[0])] = parseInt(parts[1], 10);
      }
      continue;
    }
    if (section === 'title') {
      const m = line.match(/^-\s+(.*)$/);
      if (m && m[1].trim()) title = unesc(m[1].trim());
      continue;
    }
    if (section === 'wordGoal') {
      const m = line.match(/^-\s+(.*)$/);
      if (m && m[1].trim()) wordGoal = parseWords(m[1]);
      continue;
    }
    if (section === 'circleStagesHidden') {
      const m = line.match(/^-\s+(.*)$/);
      if (m && m[1].trim()) circleStagesHidden = m[1].trim() === 'true';
      continue;
    }
    if (section && section !== 'cards') {
      const m = line.match(/^-\s+(.*)$/);
      if (m && m[1].trim()) {
        if (section === 'characters') characters.push(m[1].trim());
        else if (section === 'themes') themes.push(m[1].trim());
        else if (section === 'values') values.push(m[1].trim());
        else if (section === 'threads') threads.push(m[1].trim());
        else if (section === 'tagTypes') tagTypes.push(m[1].trim());
        else if (section === 'circleStages') circleStages.push(unesc(m[1].trim()));
      }
    }
  }
  pushCurrent();
  // Backward compatibility: older exports have no Chapters section / no chapterId on cards.
  let finalChapters = chapters;
  if (finalChapters.length === 0) {
    finalChapters = [{ id: uid(), title: 'Chapter 1' }];
  }
  const fallbackChapterId = finalChapters[0].id;
  cards.forEach(c => { if (!c.chapterId) c.chapterId = fallbackChapterId; });
  // Backward compatibility: older exports predate the TagTypes lib — derive it from tags in use.
  const finalTagTypes = tagTypes.length > 0 ? tagTypes : Array.from(new Set(
    cards.flatMap(c => (c.tags || []).filter(t => t.type !== 'Thread').map(t => t.type))
  ));
  // Backward compatibility: older exports predate stage labels — fall back to the defaults.
  const finalCircleStages = circleStages.length === 8 ? circleStages : CIRCLE_STAGES;
  return { cards, characters, themes, values, threads, tagTypes: finalTagTypes, threadNotes, threadColors, threadLanes, chapters: finalChapters, circleStages: finalCircleStages, circleStagesHidden, wordGoal, title };
}
