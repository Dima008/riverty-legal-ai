// Act 4 "Proof": the opener, the trap map (act4.tsx), then results, what-if and cost (proof.tsx).
// The opener names its phase of the roadmap (card 'how-i-worked', decision 88): Deliver, step 7.
import type { Slide } from "../types";
import { TEST_SET } from "./act4";
import { COST, RESULTS, WHAT_IF } from "./proof";

const opener = (id: string, act: number, title: string, notes: string): Slide => ({
  id, act, kind: "opener", title, steps: 0, seconds: 4, notes: [notes],
});

export const ACT4: Slide[] = [
  opener("act-4", 4, "Proof", "Deliver: does it work – how do I know?"),
  TEST_SET,
  RESULTS,
  WHAT_IF,
  COST,
];
