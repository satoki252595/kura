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
};

window.Kura = api;

export type { Plan, SleeveId };
