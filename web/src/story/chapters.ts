// The chapters of the talk, in order - the one place to change the storyline (decision 68).
// Minutes are the planned speaking time: 17:15 in total, leaving 2:45 of 20 minutes for questions.
// Steps are revealed one by one with → (like builds on a slide); the text behind every chapter is
// in docs/approach.md.

export type Act = "Why" | "How" | "Proof" | "Operate" | "Live";
/** Double Diamond phase (decision 19): colours the chapter in the rail. */
export type Phase = "Discover" | "Define" | "Develop" | "Deliver" | "All";

export interface Chapter {
  id: string;
  act: Act;
  phase: Phase;
  title: string;
  minutes: number;
  lead: string;
  steps: string[];
}

export const ACTS: Act[] = ["Why", "How", "Proof", "Operate", "Live"];
export const PHASES: Phase[] = ["Discover", "Define", "Develop", "Deliver"];

export const CHAPTERS: Chapter[] = [
  { id: "task", act: "Why", phase: "Discover", title: "The task, read closely", minutes: 1,
    lead: "Find the contracts that do not contain something – for every contract, with the passage as proof. Lawyers decide.",
    steps: ["The task, annotated", "What one question costs today"] },
  { id: "problem", act: "Why", phase: "Define", title: "The problem: proving what is missing", minutes: 1.75,
    lead: "Agents fail on the size of the environment, and top-k retrieval can never prove that a clause is missing.",
    steps: ["Today's process", "The root causes", "Ask the search", "The quality goal"] },
  { id: "approach", act: "Why", phase: "All", title: "How I worked", minutes: 1.25,
    lead: "Problem before solution – every decision with the alternative I rejected, every failure kept with its evidence.",
    steps: ["Double Diamond", "The paper trail", "How I used AI"] },
  { id: "solution", act: "How", phase: "Define", title: "Compile, don't search", minutes: 1.5,
    lead: "Every contract is read once, completely, into a register with evidence. Questions become queries.",
    steps: ["The process tomorrow", "Compile once, ask many times", "Five decisions"] },
  { id: "pipeline", act: "How", phase: "Develop", title: "Inside the pipeline: follow one contract", minutes: 2.25,
    lead: "How a contract becomes evidence – and how the checks catch a convincing wrong answer.",
    steps: ["A workflow, not a free agent", "The map", "The guardrail sandwich", "Retrieval where it fits"] },
  { id: "proof", act: "Proof", phase: "Develop", title: "Measured, not claimed", minutes: 2,
    lead: "A test set built to break the system, what the checks are worth, how stable the answers are – and every failure we found.",
    steps: ["Results", "Switch a safeguard off", "Is the model choice right?"] },
  { id: "architecture", act: "Operate", phase: "Deliver", title: "From laptop to Azure", minutes: 1.25,
    lead: "The prototype is the target in miniature: same interfaces, local stand-ins.",
    steps: ["Target and prototype", "Boundaries"] },
  { id: "operations", act: "Operate", phase: "Deliver", title: "Operating it safely", minutes: 1.5,
    lead: "A model change is a release, not a setting. Monitoring shows what we watch; adoption has gates too.",
    steps: ["A model change is a release", "What we watch", "Adoption"] },
  { id: "live", act: "Live", phase: "Deliver", title: "The Legal Workbench, live", minutes: 4.25,
    lead: "Everything you have seen is running – from a question to an approved archive copy.",
    steps: ["The doorway"] },
  { id: "close", act: "Live", phase: "All", title: "What I learned, what I would ask you", minutes: 0.5,
    lead: "100 % traceable instead of 100 % accurate.",
    steps: ["Three lessons", "What I would ask you"] },
];

export const TOTAL_MINUTES = CHAPTERS.reduce((sum, c) => sum + c.minutes, 0);
