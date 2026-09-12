import type { TaskName } from '../tasks';
import castPrompt from './cast.prompt';
import castPlan from './cast.plan';
import famHatch from './familiars.hatch';
import famExchange from './familiars.exchange';
import famStory from './familiars.story';
import famCluster from './familiars.cluster';
import detNudges from './detour.nudges';
import detStory from './detour.story';
import palProfile from './palate.profile';
import palMenu from './palate.menu';
import palReason from './palate.reason';
import palChef from './palate.chefCard';

/** Deterministic stand-ins so every screen works with LLM_PROVIDER=mock and no keys. */
export const mocks: Record<TaskName, (input: never, seed: number) => unknown> = {
  'cast.prompt': castPrompt,
  'cast.plan': castPlan,
  'familiars.hatch': famHatch,
  'familiars.exchange': famExchange,
  'familiars.story': famStory,
  'familiars.cluster': famCluster,
  'detour.nudges': detNudges,
  'detour.story': detStory,
  'palate.profile': palProfile,
  'palate.menu': palMenu,
  'palate.reason': palReason,
  'palate.chefCard': palChef,
} as Record<TaskName, (input: never, seed: number) => unknown>;

export const MOCK_MODEL = 'mock-deterministic';
