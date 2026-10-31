// Which component renders which chapter. Every chapter gets the revealed step and shows its
// content step by step; chapters without a component show a placeholder.
import type { ComponentType } from "react";
import { Approach } from "./Approach";
import { Architecture } from "./Architecture";
import { Live } from "./Live";
import { Problem } from "./Problem";
import { Proof } from "./Proof";
import { Solution } from "./Solution";
import { Task } from "./Task";

export interface ChapterProps {
  step: number;
}

export const BODIES: Partial<Record<string, ComponentType<ChapterProps>>> = {
  task: Task,
  problem: Problem,
  approach: Approach,
  solution: Solution,
  proof: Proof,
  architecture: Architecture,
  live: Live,
};
