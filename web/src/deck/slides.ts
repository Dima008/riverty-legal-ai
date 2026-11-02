// The order of the talk (decision 76; the parts of decisions 90, 99, 100 and 101 - the rebuild of 2.11.:
// 17 content cards, one title and six part openers, a one-line title each, a few words on screen,
// about 17 minutes). The talk follows
// Dima's path through Riverty's outline - identify, narrow down, build: 1 the problem (the two questions,
// the cost today, three things that make it hard), 2 my approach (the lever, two options tested and
// rejected with numbers, per step code or AI, three guarantees), 3 the technical solution (the
// architecture with its stack, the register, how a finding reaches a person, the proof), 4 the basic
// implementation live, 5 infrastructure, 6 adoption and the close. Each opener shows its line of the
// case study word for word (guarded below). The deep dives after the close are not part of the talk:
// hidden on the page behind "For questions", never reached by → in present mode.
import caseStudy from "../../../docs/context/case-study.md?raw";
import { ACT1 } from "./slides/act1";
import { ACT2 } from "./slides/act2";
import { ACT3 } from "./slides/act3";
import { ADOPTION, INFRASTRUCTURE } from "./slides/act5";
import { CLOSE, LIVE } from "./slides/act6";
import { DEEP } from "./slides/deep";
import { RESULTS } from "./slides/proof";
import type { Act, Slide } from "./types";

export const ACTS: Act[] = [
  { n: 1, title: "The problem · what I identified" },
  { n: 2, title: "My approach · how I narrowed it down" },
  { n: 3, title: "The technical solution · how I built it" },
  { n: 4, title: "The basic implementation, live" },
  { n: 5, title: "Infrastructure · where it runs" },
  { n: 6, title: "Adoption · how Legal gets the value" },
  { n: 7, title: "For questions" },
];

export const SLIDES: Slide[] = [
  ...ACT1,                              // 1 the problem: the two questions, the cost today, what makes it hard
  ...ACT2,                              // 2 my approach: the lever, a search and an agent tested, code or AI, three guarantees
  ...ACT3, RESULTS,                     // 3 the technical solution: the architecture with its stack, the register, a finding to a person, the proof
  ...LIVE,                              // 4 the basic implementation, live
  ...INFRASTRUCTURE,                    // 5
  ...ADOPTION, ...CLOSE,                // 6 adoption, then the close
  ...DEEP,                              // for questions only
];

/** The first card after the talk: the deep dives start here (present mode stops before it). */
export const DEEP_FROM = SLIDES.findIndex((s) => s.deep);

/** The timed track: deep dives after the close are opened only on a question (decision 78). */
export const TOTAL_SECONDS = SLIDES.filter((s) => !s.deep).reduce((sum, s) => sum + s.seconds, 0);

/** Planned start of card `index` on the timed track, in seconds. */
export const plannedStart = (index: number) => SLIDES.slice(0, index).reduce((sum, s) => sum + s.seconds, 0);

/** Clock checkpoints of the presenter view (decision 90): the start of parts 2 to 6 - computed from the
 *  order and the seconds above, never typed. */
export const CHECKPOINTS = SLIDES.flatMap((s, index) =>
  !s.deep && s.kind === "opener" && s.act > 1
    ? [{ index, label: s.kind === "opener" ? `part ${s.act}` : s.id, at: plannedStart(index) }]
    : []);

/** What to skip when late, in this order - before the demo, so it keeps its time; never 'run-it',
 *  'live-add' or 'live'. `build`: skip from this build on; none: skip the whole card. */
export const SKIP_IF_LATE: { id: string; build?: number }[] = [{ id: "results", build: 2 }];   // 'what-if' and 'sharepoint' are deep dives (decision 96)

/** 75 -> "1:15" */
export const mmss = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, "0")}`;

export const pad = (n: number) => String(n).padStart(2, "0");

// ---------------------------------------------------------------- guards (development only)
// The structure of decision 90: one opener per part, id 'part-N', titled as the part, with its line
// from the case study word for word (whitespace-normalised, like the card 'task'); quotes on the
// openers only; parts in order, the deep dives last; the main track at most 22 minutes (Dima, 1.11.).
if (import.meta.env.DEV) {
  const CASE = caseStudy.replace(/\s+/g, " ");
  const norm = (text: string) => text.replace(/\s+/g, " ").trim();
  const main = SLIDES.filter((s) => !s.deep);
  const index = (id: string) => SLIDES.findIndex((s) => s.id === id);
  const problems = [
    ...SLIDES.flatMap((s) => (s.quote ?? []).filter((q) => !CASE.includes(norm(q)))
      .map((q) => `opener "${s.id}" quotes a line that is not in the case study word for word: "${q}"`)),
    ...SLIDES.filter((s) => s.quote && s.kind !== "opener").map((s) => `card "${s.id}" has a quote line - decision 90 puts them on the openers only`),
    ...ACTS.filter((a) => a.n < 7).flatMap((a) => {
      const openers = main.filter((s) => s.kind === "opener" && s.act === a.n);
      if (openers.length !== 1) return [`part ${a.n} has ${openers.length} openers, not one`];
      const o = openers[0];
      return [
        o.id !== `part-${a.n}` && `the opener of part ${a.n} is "${o.id}", not "part-${a.n}" (links and the demo kit use that id)`,
        o.title !== a.title && `the opener "${o.id}" is titled "${o.title}", its part "${a.title}"`,
        !o.quote?.length && `the opener "${o.id}" has no line from the case study (decision 90)`,
        main.find((s) => s.act === a.n && s.kind !== "title") !== o && `part ${a.n} does not start with its opener`,
      ];
    }),
    new Set(SLIDES.map((s) => s.id)).size !== SLIDES.length && "two cards share an id",
    SLIDES.some((s, i) => i > 0 && s.act < SLIDES[i - 1].act) && "the parts are not in order",
    SLIDES.some((s) => (s.act === 7) !== !!s.deep) && "a deep dive is not in act 7, or a card of act 7 is not a deep dive",
    ...SKIP_IF_LATE.map((k) => {
      const s = SLIDES[index(k.id)];
      return !s ? `SKIP_IF_LATE names "${k.id}" - no such card`
        : s.deep ? `SKIP_IF_LATE names the deep dive "${k.id}"`
        : k.build !== undefined && !(k.build > 0 && k.build <= s.steps) ? `SKIP_IF_LATE: "${k.id}" has no build ${k.build}`
        : index(k.id) > index("live-add") ? `SKIP_IF_LATE: "${k.id}" comes after the demo` : false;
    }),
    TOTAL_SECONDS > 22 * 60 && `the main track is ${mmss(TOTAL_SECONDS)} - the hard maximum is 22:00 (Riverty asks for 15-20 minutes, decision 90; Dima, 1.11.)`,
  ].filter(Boolean);
  for (const p of problems) console.error(`talk structure: ${p}`);
}
