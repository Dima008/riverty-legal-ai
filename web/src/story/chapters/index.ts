// Which component renders which chapter. Every chapter gets the revealed step and shows its
// content step by step; chapters without a component show a placeholder.
import type { ComponentType } from "react";
import { Live } from "./Live";
import { Proof } from "./Proof";
import { Task } from "./Task";

export interface ChapterProps {
  step: number;
}

export const BODIES: Partial<Record<string, ComponentType<ChapterProps>>> = {
  task: Task,
  proof: Proof,
  live: Live,
};
