// The order of the talk (decision 76; the parts of decision 90). One place to change the storyline:
// parts, then screens. The talk follows Riverty's own outline: 1 the problem, 2 my approach, 3 the
// technical solution (what we use, then the proof), 4 infrastructure, 5 adoption, 6 the basic
// implementation, live - the finale, so every outline bullet is said before the part whose timing
// varies most. Each opener shows its line of the case study word for word (guarded below). The
// deep dives after the close are opened only on a question. Riverty asks for 15-20 minutes; since
// 1.11. (Dima: no cuts) each card's seconds are what its notes need at about 115 words per minute
// (plus about 15 s on the title for Dima's own introduction, 2.11.), and the main track may grow past
// 20:00 - never past 22:00. To stay under it, decision 96 moved
// four cards to the deep dives, nothing deleted: 'injection', 'what-if', 'sharepoint' and 'cost';
// what they said first (M14 and four eyes, Prompt Shields, the cents of a full run, productivity)
// is said once on the main track ('human', 'what-we-use', 'run-it').
import caseStudy from "../../../docs/context/case-study.md?raw";
import { ACT1 } from "./slides/act1";
import { ACT2 } from "./slides/act2";
import { ACT3 } from "./slides/act3";
import { ADOPTION, INFRASTRUCTURE } from "./slides/act5";
import { ACT6 } from "./slides/act6";
import { DEEP } from "./slides/deep";
import { RESULTS } from "./slides/proof";
import type { Act, Slide } from "./types";

export const ACTS: Act[] = [
  { n: 1, title: "The problem" },
  { n: 2, title: "My approach" },
  { n: 3, title: "The technical solution" },
  { n: 4, title: "Infrastructure" },
  { n: 5, title: "Adoption" },
  { n: 6, title: "The basic implementation, live" },
  { n: 7, title: "Deep dives" },
];

export const SLIDES: Slide[] = [
  ...ACT1,                              // 1 the problem
  ...ACT2,                              // 2 my approach: the roadmap, then why the usual approaches fail
  ...ACT3, RESULTS,                     // 3 the technical solution, ending with the proof
  ...INFRASTRUCTURE,                    // 4
  ...ADOPTION,                          // 5
  ...ACT6,                              // 6 live, then the close
  ...DEEP,
];

/** The timed track: deep dives after the close are opened only on a question (decision 78). */
export const TOTAL_SECONDS = SLIDES.filter((s) => !s.deep).reduce((sum, s) => sum + s.seconds, 0);

/** Planned start of card `index` on the timed track, in seconds. */
export const plannedStart = (index: number) => SLIDES.slice(0, index).reduce((sum, s) => sum + s.seconds, 0);

/** Clock checkpoints of the presenter view (decision 90): the start of parts 2 to 6, and 'what-we-use'
 *  in the long part 3 - computed from the order and the seconds above, never typed. */
export const CHECKPOINTS = SLIDES.flatMap((s, index) =>
  !s.deep && ((s.kind === "opener" && s.act > 1) || s.id === "what-we-use")
    ? [{ index, label: s.kind === "opener" ? `part ${s.act}` : s.id, at: plannedStart(index) }]
    : []);

/** What to skip when late, in this order - all before the demo; never 'what-we-use', 'run-it',
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
    index("what-we-use") < 0 && "the checkpoint 'what-we-use' has no card",
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
