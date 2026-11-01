// The two system prompts of the pipeline, word for word from pipeline/extract.py (decision 90): their
// first sentences on the card 'what-we-use', both in full on the deep dive 'prompts'. Read from the
// code at build time, never typed - a quote on a card cannot drift from what the model is sent.
import catalogueRaw from "../../../../pipeline/catalogue.py?raw";
import extractPy from "../../../../pipeline/extract.py?raw";
import llmPy from "../../../../pipeline/llm.py?raw";

/** A Python string as the model gets it: a backslash at a line end continues the line (and the
 *  files are checked out with CRLF). */
const unwrap = (text: string) => text.replace(/\\\r?\n/g, "").replace(/\r\n/g, "\n");
const promptOf = (name: string) => unwrap(new RegExp(`^${name} = """([\\s\\S]*?)"""`, "m").exec(extractPy)?.[1] ?? "");

export const PROMPT_NAMES = [...extractPy.matchAll(/^([A-Z_]+_PROMPT) = """/gm)].map((m) => m[1]);
export const PROMPTS = PROMPT_NAMES.length;                               // system prompts: 2
export const READER = promptOf("SYSTEM_PROMPT");                          // the extraction call
export const CHECKER = promptOf("CHECKER_PROMPT");                        // the four-eyes checker call
export const RULES = (READER.match(/^\d+\. /gm) ?? []).length;            // the reader's numbered rules
export const CLAUSES = (catalogueRaw.match(/^ {4}"[a-z_]+": \{\r?$/gm) ?? []).length;   // Legal's playbook
export const TEMPERATURE = /temperature=([\d.]+)/.exec(llmPy)?.[1] ?? "";
export const STRICT = /"strict": True/.test(llmPy);
// the user messages that go with them (pipeline/extract.py: _contract_block and check_findings)
export const READER_ASK = /f"(Extract the register entry for this contract)\{part\}\./.exec(extractPy)?.[1] ?? "";
export const CHECKER_ASK = /"content": f"(Check each claim:)\\n/.exec(extractPy)?.[1] ?? "";

/** The first sentence, word for word; a long one is cut at a comma (else at a word) and ends in " …". */
export function opening(text: string, max = 75) {
  const first = /^[\s\S]*?\.(?=\s|$)/.exec(text.trim())?.[0] ?? "";
  if (first.length <= max) return first;
  const cut = first.slice(0, max);
  const comma = cut.lastIndexOf(",");
  return `${cut.slice(0, comma > max / 2 ? comma : cut.lastIndexOf(" "))} …`;
}

const SAY = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
/** 8 -> "eight" (numbers are spoken as words in the notes) */
export const say = (n: number) => SAY[n] ?? String(n);
export const Say = (n: number) => say(n)[0].toUpperCase() + say(n).slice(1);

// ---------------------------------------------------------------- guards (development only)
// The cards paraphrase the prompts outside quote marks ("the contract is data", "only a definition
// and a quote") - these check that the code still says so.
if (import.meta.env.DEV) {
  const problems = [
    PROMPTS !== 2 && `'what-we-use' says two prompts - pipeline/extract.py has ${PROMPTS}: ${PROMPT_NAMES}`,
    RULES !== 8 && `'what-we-use' and 'prompts' speak of the reader's eight rules - SYSTEM_PROMPT has ${RULES}`,
    CLAUSES !== 5 && `'what-we-use' says Legal's playbook has five clauses - pipeline/catalogue.py has ${CLAUSES}`,
    !(READER.startsWith("You are") && CHECKER.startsWith("You are")) && "a system prompt could not be read from pipeline/extract.py",
    !(READER.includes("untrusted data") && READER.includes("copied verbatim") && READER.includes("answer UNCLEAR"))
      && "'prompts' says the rules make the contract data, quotes word for word and unsure -> unclear - SYSTEM_PROMPT changed",
    !CHECKER.includes("You see only the definition and the quote") && "'what-we-use' says the checker sees only a definition and a quote - CHECKER_PROMPT changed",
    !extractPy.includes('failed.append((f"checker_rejected') && "'what-we-use' says a 'no' from the checker turns 'found' into 'unclear' - pipeline/extract.py changed",
    TEMPERATURE !== "0" && `'what-we-use' says temperature 0 - pipeline/llm.py has ${TEMPERATURE || "none"}`,
    !STRICT && "'what-we-use' says a fixed form (strict JSON schema) - pipeline/llm.py no longer asks for strict",
    !(READER_ASK && CHECKER_ASK) && "'prompts' quotes the user messages - pipeline/extract.py words them differently now",
  ].filter(Boolean);
  for (const p of problems) console.error(`the prompts: ${p}`);
}
