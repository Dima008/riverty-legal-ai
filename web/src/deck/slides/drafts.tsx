// Act 4 "Proof": the opener, the trap map (act4.tsx), then results, what-if and cost (proof.tsx).
import type { Slide } from "../types";
import { TEST_SET } from "./act4";
import { COST, RESULTS, WHAT_IF } from "./proof";

const opener = (id: string, act: number, title: string, notes: string): Slide => ({
  id, act, kind: "opener", title, steps: 0, seconds: 4, notes: [notes],
});

export const ACT4: Slide[] = [
  opener("act-4", 4, "Proof", "Does it work – and how do we know?"),
  TEST_SET,
  RESULTS,
  WHAT_IF,
  COST,
];
