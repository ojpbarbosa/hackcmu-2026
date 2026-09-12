import type { AppDef } from '../rooms';
import type { AppName } from '../types';
import { cast } from './cast';
import { familiars } from './familiars';
import { detour } from './detour';
import { palate } from './palate';

/* eslint-disable @typescript-eslint/no-explicit-any -- the registry is heterogeneous by design */

/** The four app reducers. App agents replace the stub entries in their own file.
 *  Tests register extra defs by key (e.g. apps.__test = ...). */
export const apps: Record<AppName, AppDef<any>> & Record<string, AppDef<any>> = {
  cast,
  familiars,
  detour,
  palate,
};
