// The chapters of the talk, in order - the one place to change the storyline (decision 68).
// Minutes are the planned speaking time: 17:15 in total, leaving 2:45 of 20 minutes for questions.

export type Act = "Why" | "How" | "Proof" | "Operate" | "Live";

export interface Chapter {
  id: string;
  act: Act;
  title: string;
  minutes: number;
  lead: string;
}

export const ACTS: Act[] = ["Why", "How", "Proof", "Operate", "Live"];

export const CHAPTERS: Chapter[] = [
  { id: "task", act: "Why", title: "The task, read closely", minutes: 1,
    lead: "Find the contracts that do not contain something – for every contract, with the passage as proof. Lawyers decide." },
  { id: "problem", act: "Why", title: "The problem: proving what is missing", minutes: 1.75,
    lead: "Agents fail on the size of the environment, and top-k retrieval can never prove that a clause is missing." },
  { id: "approach", act: "Why", title: "How I worked", minutes: 1.25,
    lead: "Problem before solution – every decision with the alternative I rejected, every failure kept with its evidence." },
  { id: "solution", act: "How", title: "Compile, don't search", minutes: 1.5,
    lead: "Every contract is read once, completely, into a register with evidence. Questions become queries." },
  { id: "pipeline", act: "How", title: "Inside the pipeline: follow one contract", minutes: 2.25,
    lead: "How a contract becomes evidence – and how the checks catch a convincing wrong answer." },
  { id: "proof", act: "Proof", title: "Measured, not claimed", minutes: 2,
    lead: "A test set built to break the system, what the checks are worth, how stable the answers are – and every failure we found." },
  { id: "architecture", act: "Operate", title: "From laptop to Azure", minutes: 1.25,
    lead: "The prototype is the target in miniature: same interfaces, local stand-ins." },
  { id: "operations", act: "Operate", title: "Operating it safely", minutes: 1.5,
    lead: "A model change is a release, not a setting. Monitoring shows what we watch; adoption has gates too." },
  { id: "live", act: "Live", title: "The Legal Workbench, live", minutes: 4.25,
    lead: "Everything you have seen is running – from a question to an approved archive copy." },
  { id: "close", act: "Live", title: "What I learned, what I would ask you", minutes: 0.5,
    lead: "100 % traceable instead of 100 % accurate." },
];

export const TOTAL_MINUTES = CHAPTERS.reduce((sum, c) => sum + c.minutes, 0);
