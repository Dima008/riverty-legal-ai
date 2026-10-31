// The order of the talk (decision 76). One place to change the storyline: acts, then screens.
import { ACT1 } from "./slides/act1";
import { ACT2 } from "./slides/act2";
import { LATER } from "./slides/drafts";
import type { Act, Slide } from "./types";

export const ACTS: Act[] = [
  { n: 1, title: "The task" },
  { n: 2, title: "Why the usual AI approach fails" },
  { n: 3, title: "Our solution" },
  { n: 4, title: "Proof" },
  { n: 5, title: "Running it at Riverty" },
  { n: 6, title: "Live" },
];

export const SLIDES: Slide[] = [...ACT1, ...ACT2, ...LATER];

export const TOTAL_SECONDS = SLIDES.reduce((sum, s) => sum + s.seconds, 0);

/** 75 -> "1:15" */
export const mmss = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, "0")}`;

export const pad = (n: number) => String(n).padStart(2, "0");
