// The order of the talk (decision 76, reordered in decision 88). One place to change the storyline:
// acts, then screens. Act 1 opens with the roadmap (how I worked), act 2 with the test bench, act 3
// walks the map of 'tomorrow' left to right; the technique table is the first deep dive.
import { ACT1 } from "./slides/act1";
import { ACT2 } from "./slides/act2";
import { ACT3 } from "./slides/act3";
import { ACT5 } from "./slides/act5";
import { ACT6 } from "./slides/act6";
import { DEEP } from "./slides/deep";
import { ACT4 } from "./slides/drafts";
import type { Act, Slide } from "./types";

export const ACTS: Act[] = [
  { n: 1, title: "The task" },
  { n: 2, title: "Why the usual AI approaches fail" },
  { n: 3, title: "Our solution" },
  { n: 4, title: "Proof" },
  { n: 5, title: "Running it at Riverty" },
  { n: 6, title: "Live" },
  { n: 7, title: "Deep dives" },
];

export const SLIDES: Slide[] = [...ACT1, ...ACT2, ...ACT3, ...ACT4, ...ACT5, ...ACT6, ...DEEP];

/** The timed track: deep dives after the close are opened only on a question (decision 78). */
export const TOTAL_SECONDS = SLIDES.filter((s) => !s.deep).reduce((sum, s) => sum + s.seconds, 0);

/** Planned start of card `index` on the timed track, in seconds. */
export const plannedStart = (index: number) => SLIDES.slice(0, index).reduce((sum, s) => sum + s.seconds, 0);

/** Clock checkpoints of the presenter view (decision 88): the start of acts 2 to 6, and the register
 *  in the long act 3 - computed from the order and the seconds above, never typed. */
export const CHECKPOINTS = SLIDES.flatMap((s, index) =>
  !s.deep && ((s.kind === "opener" && s.act > 1) || s.id === "register")
    ? [{ index, label: s.kind === "opener" ? `act ${s.act}` : s.id, at: plannedStart(index) }]
    : []);

/** What to skip when late, in this order - never the adoption card or the live demo. `build`: skip
 *  from this build on; none: skip the whole card. */
export const SKIP_IF_LATE: { id: string; build?: number }[] = [{ id: "register-index" }, { id: "sharepoint", build: 3 }, { id: "results", build: 2 }];

/** 75 -> "1:15" */
export const mmss = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, "0")}`;

export const pad = (n: number) => String(n).padStart(2, "0");
