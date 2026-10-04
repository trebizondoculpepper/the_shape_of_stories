import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { cardsToMarkdown, markdownToCards } from './markdown';
import { buildValueChain, chronoOrderMap, nudgeWithActAdoption } from './story';
import { wordStats } from './words';

const fixture = readFileSync(fileURLToPath(new URL('../../tests/fixtures/cinderella.md', import.meta.url)), 'utf8');

describe('Markdown project files', () => {
  it('imports the existing Cinderella project and preserves its data on export', () => {
    const imported = markdownToCards(fixture);
    const again = markdownToCards(cardsToMarkdown(imported));
    expect(imported.title).toBe('cinderella-story');
    expect(imported.chapters.map(ch => ch.title)).toEqual(['Household', 'The Ball', 'Aftermath']);
    expect(imported.cards.length).toBeGreaterThan(20);
    expect(again.cards.map(c => ({ id: c.id, title: c.title, chapterId: c.chapterId, act: c.act, text: c.text, notes: c.notes, words: c.words, wordTarget: c.wordTarget, values: c.values })))
      .toEqual(imported.cards.map(c => ({ id: c.id, title: c.title, chapterId: c.chapterId, act: c.act, text: c.text, notes: c.notes, words: c.words, wordTarget: c.wordTarget, values: c.values })));
    expect(again.threads).toEqual(imported.threads);
    expect(again.threadNotes).toEqual(imported.threadNotes);
    expect(again.threadColors).toEqual(imported.threadColors);
    expect(again.threadLanes).toEqual(imported.threadLanes);
  });

  it('imports an older file with no chapters or stage labels', () => {
    const result = markdownToCards('# STORY PLOT DATA\n## Cards\n### Opening\n- act: 1\n- text: First scene\n---\n');
    expect(result.chapters).toHaveLength(1);
    expect(result.cards[0].chapterId).toBe(result.chapters[0].id);
    expect(result.circleStages).toHaveLength(8);
  });
});

describe('story calculations', () => {
  it('orders value shifts by chapter then act', () => {
    const chapters = [{ id: 'a' }, { id: 'b' }];
    const cards = [
      { id: 'later', chapterId: 'b', act: 1, values: [{ name: 'hope', shift: -2 }] },
      { id: 'first', chapterId: 'a', act: 2, values: [{ name: 'hope', shift: 3 }] },
    ];
    const { chain, ordered } = buildValueChain(cards, chapters);
    expect(ordered.map(c => c.id)).toEqual(['first', 'later']);
    expect(chain.first.hope).toEqual({ open: 0, close: 3, isEvent: true });
    expect(chain.later.hope).toEqual({ open: 3, close: 1, isEvent: true });
    expect(chronoOrderMap(cards, chapters)).toEqual({ first: 0, later: 1 });
  });

  it('assigns an act when an unassigned card is moved between assigned cards', () => {
    const cards = [{ id: 'one', act: 2 }, { id: 'loose', act: null }, { id: 'three', act: 3 }];
    expect(nudgeWithActAdoption(cards, 1, 1)[2]).toEqual({ id: 'loose', act: 3 });
    expect(cards[1].act).toBeNull();
  });

  it('balances unwritten scene targets after written scenes and manual targets', () => {
    const stats = wordStats([{ words: 300 }, { words: 0, wordTarget: 200 }, { words: 0 }], 900);
    expect(stats.remaining).toBe(600);
    expect(stats.targetOf({ words: 0 })).toBe(400);
    expect(stats.targetOf({ words: 0, wordTarget: 200 })).toBe(200);
  });
});
