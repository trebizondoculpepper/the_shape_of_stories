export interface Chapter {
  id: string;
  title: string;
}

export interface StoryTag {
  id: string;
  type: string;
  role?: string;
  char?: string;
  direction?: string;
  note?: string;
}

export interface ValueShift {
  name: string;
  shift: number;
}

export interface Card {
  id: string;
  chapterId: string | null;
  act: number | null;
  gapIndex: number | null;
  title: string;
  text: string;
  notes: string;
  tags: StoryTag[];
  values: ValueShift[];
  placeholder: string;
  customColor: string | null;
  major: boolean;
  words?: number | null;
  wordTarget?: number | null;
}

export interface StoryState {
  cards: Card[];
  chapters: Chapter[];
  characters: string[];
  themes: string[];
  values: string[];
  threads: string[];
  tagTypes: string[];
  threadNotes: Record<string, string>;
  threadColors: Record<string, string>;
  threadLanes: Record<string, number>;
  circleStages: string[];
  circleStagesHidden: boolean;
  wordGoal?: number | null;
  title?: string;
}
