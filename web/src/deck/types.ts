// The talk as data (decision 76): one statement per screen, the explanation in the speaker notes.
import type { ComponentType } from "react";

/** title: the first screen · opener: starts an act · statement: one big sentence · content: headline + visual */
export type SlideKind = "title" | "opener" | "statement" | "content";

export interface Slide {
  id: string;
  act: number;
  kind: SlideKind;
  title: string;            // the headline - one sentence the audience can read in two seconds
  steps: number;            // how many builds → reveals after the first view (0 = none)
  seconds: number;          // planned speaking time
  notes: string;            // what to say - only in the presenter view, never on the screen
  draft?: boolean;          // planned in the new structure, not rebuilt yet
  Body?: ComponentType;     // the visual; reads the revealed step with useStep()
}

export interface Act {
  n: number;
  title: string;
}
