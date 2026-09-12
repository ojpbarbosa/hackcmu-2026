import { castPrompts } from './cast';
import { familiarsPrompts } from './familiars';
import { detourPrompts } from './detour';
import { palatePrompts } from './palate';

export const TASKS = [
  'cast.prompt',
  'cast.plan',
  'familiars.hatch',
  'familiars.exchange',
  'familiars.intro',
  'familiars.recap',
  'casts.prompt',
  'scout.plan',
  'scout.extract',
  'scout.fit',
  'detour.nudges',
  'detour.story',
  'palate.profile',
  'palate.menu',
  'palate.reason',
  'palate.chefCard',
] as const;

export type TaskName = (typeof TASKS)[number];

export type Prompt = {
  /** system text; llm.ts appends the output shape */
  system: string;
  /** a JSON shape sketch, appended to the system message */
  outputShape: string;
  effort?: 'low' | 'medium' | 'high';
};

export const prompts: Record<TaskName, Prompt> = {
  ...castPrompts,
  ...familiarsPrompts,
  ...detourPrompts,
  ...palatePrompts,
};

export function isTaskName(v: unknown): v is TaskName {
  return typeof v === 'string' && (TASKS as readonly string[]).includes(v);
}
