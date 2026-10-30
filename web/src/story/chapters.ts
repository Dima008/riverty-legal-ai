// The chapters of the talk, in order - the one place to change the storyline.
// Draft storyline until Dima approves the final one.
// Minutes are the planned speaking time; the sum must stay within 15-20 minutes.

export interface Chapter {
  id: string;
  act: "Why" | "How" | "Proof" | "Live";
  title: string;
  minutes: number;
  lead: string;
}

export const CHAPTERS: Chapter[] = [
  { id: "task", act: "Why", title: "The task, read closely", minutes: 1,
    lead: "Find the contracts that do not contain something – with evidence, and without a lawyer opening every file." },
  { id: "problem", act: "Why", title: "The problem, understood", minutes: 2,
    lead: "Agents fail because of the size of the environment, and top-k retrieval can never prove that a clause is missing." },
  { id: "approach", act: "Why", title: "How I worked", minutes: 1.25,
    lead: "Problem before solution: every decision with its reason and the alternative I rejected, every failure kept." },
  { id: "solution", act: "How", title: "Compile, don't search", minutes: 1.5,
    lead: "Every contract is read once, completely, into a register with evidence. Questions become queries." },
  { id: "pipeline", act: "How", title: "Inside the pipeline", minutes: 2.5,
    lead: "Follow one contract through OCR, chunking, extraction, the guardrail sandwich, families and the index." },
  { id: "proof", act: "Proof", title: "Measured, not claimed", minutes: 2,
    lead: "What the system gets right, how stable it is across runs, and every failure we found on the way." },
  { id: "architecture", act: "Proof", title: "From laptop to Azure", minutes: 1.5,
    lead: "The same design on Azure: every local stand-in sits behind an adapter." },
  { id: "operations", act: "Proof", title: "Adoption, governance, monitoring", minutes: 1.5,
    lead: "Governance is built in, not bolted on." },
  { id: "live", act: "Live", title: "The Legal Workbench, live", minutes: 5,
    lead: "The whole workflow on the test data – from a question to an approved archive copy." },
  { id: "close", act: "Live", title: "What I would ask you", minutes: 0.5,
    lead: "The open questions that decide how this would run at Riverty." },
];

export const TOTAL_MINUTES = CHAPTERS.reduce((sum, c) => sum + c.minutes, 0);
