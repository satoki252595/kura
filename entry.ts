import {
  DEFAULT_PLAN,
  PRESETS,
  SLEEVES,
  planFromPreset,
  project,
  rebalance,
  matchingPreset,
  loadPlan,
  savePlan,
  type Plan,
  type SleeveId,
} from "../src/lib/simulate.ts";
import { formatAxis, formatPercent, formatReading, formatSignedReading, formatYen } from "../src/lib/format.ts";
import { planFromSearch, planToSearch, shareSentence, xIntentUrl } from "../src/lib/share.ts";
import { paintShareCard, sharePaintedCard } from "../src/lib/share-card.ts";

declare global {
  interface Window {
    Kura: typeof api;
  }
}

const api = {
  DEFAULT_PLAN,
  PRESETS,
  SLEEVES,
  planFromPreset,
  project,
  rebalance,
  matchingPreset,
  loadPlan,
  savePlan,
  formatAxis,
  formatPercent,
  formatReading,
  formatSignedReading,
  formatYen,
  planFromSearch,
  planToSearch,
  shareSentence,
  xIntentUrl,
  paintShareCard,
  sharePaintedCard,
};

window.Kura = api;

export type { Plan, SleeveId };
