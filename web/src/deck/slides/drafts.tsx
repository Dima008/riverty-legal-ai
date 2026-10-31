// Act 4 "Proof" (owned by the parallel session that built the trap map): the trap map is built,
// results, what-if and cost are still drafts - each names its statement and planned visual.
import type { Slide } from "../types";
import { TEST_SET } from "./act4";

function Planned({ visual }: { visual: string }) {
  return <div className="planned"><span className="label">Visual, being built</span>{visual}</div>;
}

const draft = (id: string, act: number, title: string, seconds: number, visual: string, notes: string): Slide => ({
  id, act, kind: "content", title, steps: 0, seconds, notes: [notes], draft: true, Body: () => <Planned visual={visual} />,
});
const opener = (id: string, act: number, title: string, notes: string): Slide => ({
  id, act, kind: "opener", title, steps: 0, seconds: 4, notes: [notes],
});

export const ACT4: Slide[] = [
  opener("act-4", 4, "Proof", "Does it work – and how do we know?"),
  TEST_SET,
  draft("results", 4, "8 of 8 questions complete – and how sure we can be.", 30,
    "Recall per question and the honest lower bound: at least 0.89 with 95 % confidence.",
    "So every answer was known in advance. How many did we find? Perfect on a small set is weak evidence; the held-out set comes next."),
  draft("what-if", 4, "Switch a safeguard off – live.", 45,
    "The what-if switches: turn off the checker and watch contracts slip through.",
    "Each layer earns its place with a number."),
  draft("cost", 4, "$0.12 to read all 47 once. $0 per question.", 25,
    "Two numbers, big.",
    "Every model call is logged with its cost."),
];
