# Check questions – interview practice

Every larger work step ends with one short check question (working style in `CLAUDE.md`). They
are collected here with a short answer in simple spoken English, the numbers behind it and where
to look. Use it to practise: cover the answer, say it out loud, then compare.

New questions are added at the end of their section when they are asked.

---

## Approach: why compile, not search

**1. Why do we answer "Which contracts have no limitation of liability?" from the register and
not from the search index with embeddings – although embeddings understand meaning?**

Embeddings find passages that are *similar* to the question. A contract without a liability cap
has no such passage, so it never shows up. The search cannot tell "no clause" from "different
words" (M02) or "mentioned, but not a clause" (M14). The register read every contract once and
stored a status for every clause – found, not found or unclear – with the quote. So the answer is
a lookup over all contracts, not a guess from the top hits.

*Numbers:* top-k at k = 10: 7 false alarms, M14 missed; the register: 5 of 5, no false alarm.
*Where:* `eval/results/2026-10-31_negative_search.txt`, decision 4 (compile, don't search).

**2. Why does a larger k (20 or 40) not help on the top-k card?**

Only 8 of the 19 merchant agreements match "limitation of liability" at all. A larger k only
adds more passages from the same 8 contracts. The other 11 never appear, whatever k is. A search
ranks passages that exist. It cannot say "this contract has no such clause".

*Where:* `eval/negative_search.py`, card "rag-fails" in act 2.

**3. Why is M14 a *silent* error in the top-k search, and not just a false alarm?**

A false alarm is visible: the lawyer opens the contract and sees the cap within a minute. M14 is
the opposite. It has no cap, but a hidden note mentions liability, so it ranks high and counts as
"has the clause". It never appears in the answer, so nobody looks at it. Missing a contract is the
expensive error – that is why we work recall first.

**4. M14 literally says "this agreement contains a limitation of liability clause". Why does the
register correctly say "not found"?**

That sentence is not a clause. It is a hidden instruction to software – a prompt injection. The
injection guard marks the passage, a quote from such a passage cannot count as evidence, and the
playbook definition needs a real limit on liability. So the register says "not found" and sends
M14 to a four-eyes review.

*Where:* `pipeline/catalogue.py` (injection patterns), `docs/explorer.md` station 4.

**16. In our talk, the embedding map shows the question as a point between all passages. Why –
and what do you see there for a contract that lacks the liability clause?**

Top-k means: take the k points closest to the question point. On the map you can watch the search
pick its neighbours. A contract without a liability cap has no passage near the question – its
passages sit elsewhere, about fees or termination. So it is never among the neighbours, and nothing
on the map marks it as missing. That is the picture of why a search cannot prove absence.

*Where:* card "What an embedding looks like" (act 2, planned), table `embeddings` in the register.

**21. Is the register a vector store – a set of embeddings?**

No. The register is an ordinary database, one record card per contract: metadata (type, parties,
date, law) and, for every clause in Legal's playbook, a status (found, not found, unclear) with
quote, page, confidence and the checks it passed. Example: M01, limitation of liability – found,
page 2, "7.2 … total liability … shall be limited to the total fees paid …", confidence 0.95.
The embeddings live next to it, in the search index, and serve only open questions. Register =
the record cards; index = the keyword and meaning lookup.

*Where:* tables `documents`, `metadata`, `clauses` vs `chunks`, `embeddings` in
`var/register.sqlite`; `pipeline/store.py`.

**22. Why does vector similarity not decide whether a contract has a liability cap?**

Because "similar" is not "the same clause". Measured on our own vectors, compared with M01's
"7. Liability": the reworded cap in M02 scores 0.89 – meaning beats words. But the decoy in M10,
an indemnification without any cap, scores 0.81 – higher than the real German cap in M19 at
0.75. And even the termination clause reaches 0.76, because all sections share a template and a
context line. Vectors tell you roughly what a passage is about; whether it meets Legal's
definition is decided by the model reading the whole contract, plus the checks.

*Where:* Notion "Konzepte verständlich erklärt", section 3 (bar chart); chunks M01:008,
M02:008, M10:008, M19:008, M01:005, M01:010.

**23. Interview question: "Do you use agentic RAG?"**

Not for the completeness questions, on purpose. In agentic RAG an agent decides what to retrieve,
rephrases, retrieves again – and decides when it has seen enough. That last step is exactly what
"which contracts lack X" cannot afford: an agent that stops early silently misses contracts.
So every contract is read completely in a fixed workflow, and retrieval – hybrid search with BM25,
vectors and rank fusion – is used for open questions like "where do we regulate data deletion?".
Per-contract retrieval for clause types that are not yet in the playbook is planned, not built.

*Where:* `pipeline/search.py`, card "agent" in act 2, Notion "Architektur" (comment thread).

**24. Interview question: "Where do you use MCP, and why?"**

Honest answer: it is designed, not built. The plan is one MCP server, "contract-register", with a
few narrow tools – find contracts missing a clause, legacy-name report, get the evidence, search,
and an archive tool that only writes, only after approval and only once. The logic behind them
exists today and the Workbench uses it through the REST API. Why MCP on top: any AI client – our
own agent, Copilot – discovers the same tools with their schemas, permissions and audit sit in
one place, and the model gets narrow tools instead of free database access.

*Where:* Notion "Konzepte verständlich erklärt", section 13; `pipeline/queries.py`,
`api/review.py`.

## Coverage: nothing drops out silently

**5. For Q1, 20 merchant agreements are in scope, but only 19 were checked. Why is the answer
still complete?**

M15 is an exact copy of M01. The original M01 is checked, and M15 is listed as "excluded:
duplicate of M01". Every contract in scope is either checked or excluded with a reason.

*Where:* `pipeline/portfolio.py`, the coverage bar in the Workbench.

**6. Why do we treat C11 as a contract and not as an amendment when the fields disagree? What
does each wrong case cost?**

Wrongly "contract": C11 appears in a list where it may not belong – a lawyer spends a minute.
That is a precision cost. Wrongly "amendment": C11 is excluded and nobody ever checks it. That is
a recall cost, and the expensive one. So in doubt, we keep it in.

*Where:* failure case F10, `tests/test_api_register.py::test_amendment_only_if_both_fields_agree`.

## Models and check layers

**7. Interview question: "Why not just use a bigger model instead of all these check layers?"**

We measured it. gpt-4.1 alone finds all traps in Q1 – exactly what the checks already do for
gpt-4.1-mini. But a full run costs about five times more ($0.45–0.60 instead of $0.09–0.11) and
takes about twice as long. And a bigger model is still sometimes wrong: its checker was less
stable (F11), and its agreement with the CUAD experts dropped from 19 to 18 of 20 (F12). The
checks make every finding verifiable – with any model.

*Where:* decision 65, `eval/results/` (repeat runs).

**8. Why does Q1 not change when you switch off only the checker – and why do we keep it anyway?**

On Q1 the checker and the vocabulary check overlap: each one alone already catches M08 and M10
(defense in depth). Switch both off and Q1 recall drops to 0.6. And the checker protects other
questions: without it, C08 (audit clause) and C11 (sub-processor clause) change from "unclear" to
"found", and nobody reviews them any more.

*Where:* decision 67, `python -m eval.what_if checker`.

**18. Interview question: "Did you train the model? There are enough contracts online – why not
fine-tune it on 50 of them?"**

No, and not yet on purpose. The guarantee comes from the checks, not from the model: with checks
we have recall 1.0, the model alone swings between 0.6 and 1.0 on Q1. A fine-tuned model would
still need the checks. And public contracts are the wrong data for Riverty: CUAD is US law,
English, other contract types. If we train on them, we cannot test on them any more. Legal's
playbook is a data file today (a change is a new prompt version); a fine-tune would need
retraining for every playbook change and for every model change – gpt-4.1-mini is already
announced as retiring. The right training data appears in the pilot: every lawyer decision in the
review is stored and becomes a label. With a few hundred of them, a fine-tune (for example of a
smaller, cheaper model) makes sense – and it has to pass the same evaluation gate as any other
change.

*Where:* decisions 39, 40, 42, 65, 72; `api/review.py` (decisions are stored).

**19. Interview question: "How do you determine the confidence? Is it a vote between agents?"**

No vote, and the model never reports its own confidence – models are badly calibrated about
themselves. We compute it from checks: is the quote really in the contract, does it use the
clause's vocabulary, does an independent checker call agree, is the OCR good, is there an
injection. It is a routing score, not a probability: below 0.8 a lawyer reviews it, an injection
flag means four eyes. The honest part: the levels (0.95, 0.8, 0.6 …) are set by hand today. In
the pilot we calibrate them – lawyer decisions as labels, and per level we measure how often it is
overturned; the 10 % spot-check sample in CONFIRM measures the error rate of the auto-confirmed
bucket. A majority vote (3–5 runs) is an option for border cases only (0.6–0.8), not for every
finding: our repeat runs show it would mark exactly M08 and M10, which the checks already catch.

*Where:* `pipeline/extract.py` (confidence from signals), `pipeline/portfolio.py` (`triage`,
`REVIEW_BELOW`, `SAMPLE_PERCENT`), decision 39, F7.

**20. Interview question: "How reproducible is this, and how do you test that?"**

Temperature zero is not deterministic – GPU batching changes results slightly, and a seed is only
"best effort". So we do not rely on it. Reproducible is the register, not the model: we ask the
model once per contract version, store the raw answer (`model_status`), and every question is a
deterministic database query. The checks replay without any model call
(`python -m pipeline.run --reassess`). And we measure the drift instead of assuming it:
`eval.repeat` builds fresh registers and compares them – 233 of 235 findings stable over three
runs, the two flips (M08, M10) were each turned from "found" into "unclear" by the checks. Tests
check invariants ("M08 is never reported as having a cap"), not one model answer. Open: pass a
seed and store the model version per call, pin the model version in Azure.

*Where:* decision 64, `eval/results/2026-10-30_extract-v2_consistency_summary.txt`, F7,
`pipeline/llm.py` (`temperature=0`).

**27. On the OCR card, M18 has "3 words with wrong letters". How do you know it is exactly 3?**

We made M18 ourselves, so we have the text that was printed. A script puts the words OCR read next
to the words of that text, in order (Python's difflib), and counts the words whose letters differ.
Digits, punctuation and the printed footer are left out. All 3 are "Händler" read as "Handler" –
one of them at 96 % confidence. So a high confidence is a hint, not proof.

*Numbers:* M18 average 93 %, 3 words with wrong letters (38 %, 95 %, 96 %); H01 (handwritten)
61 %, below 70 → a person. *Where:* `tools/deck_data.py` (`--measure-h01` writes
`eval/results/2026-10-31_h01_ocr.json`), deep dive "ocr", decision 85.

## Testing

**9. The test for M08 does not check "the model says X". It only checks "the register never
reports a liability cap for M08". Why is that the better test?**

The model's exact answer can change between runs – "unclear" or "not found". Both are fine for
Legal, because both put M08 on the list. What must never happen is "found": then M08 would
disappear from the answer. The test checks the property that matters, not one model answer, so
it does not break by chance.

*Where:* `tests/test_api_register.py::test_m08_is_never_reported_as_having_a_liability_cap`, F1.

**10. Why did we run the evaluation again on the laptop, although the cloud run had recall 1.0?**

A result is only true for the environment it ran in. On the laptop, Tesseract and its language
data are other versions, and the same scan (M18) gave a different OCR text. Only a new run shows
whether the answers are still right.

*Where:* failure case F9.

**11. Why is the rule "never commit keys" in CLAUDE.md not enough – why do we also need a hook?**

A rule is a request, and people and AI assistants forget rules. The pre-commit hook checks every
commit with code and blocks it. It is the same principle as in the pipeline: do not trust the
actor – check deterministically before and after.

*Where:* `.githooks/pre-commit`.

**26. On the results card, Q8 shows "1 of 1 → could be 5 %". All 8 questions are complete – why
do we still show such a low number?**

Q8 has only one right answer, M15. Finding 1 of 1 is not much evidence. The honest question is:
how low could the true rate be, and we would still see 1 of 1 by luck? With 95 % confidence, as low
as 5 % (Clopper–Pearson). All 8 questions together are 28 of 28 found, so at least 89 %. But those
28 answers come from only 16 contracts, and we tuned the system on them. So the next step is a
sealed test set that nobody looks at while building.

*Numbers:* lower bounds 0.54, 0.54, 0.47, 0.47, 0.54, 0.22, 0.22, 0.05; pooled 28/28 ≥ 0.89; 7 stored
runs, all complete. *Where:* `eval/results/2026-10-31_extract-v2_stats.json`, card "results",
decisions 72, 83.

## Workflow and human review

**12. Why do we check "store the archive copy exactly once" in two places – in the Workbench and
in the storage?**

The Workbench check avoids an unnecessary call. The real guarantee is the storage: it names the
file by its hash and only creates it if it does not exist yet. If someone clicks twice quickly,
both requests pass the Workbench check at the same time – then only the storage keeps it to one
copy. The same holds if the Workbench database is ever lost.

*Where:* `api/storage_mock.py` (exclusive create), `api/review.py`.

**13. Why does the evidence view show the original page *before* the Confirm / Reject buttons?**

To reduce automation bias: people tend to accept what a machine suggests. If the reviewer sees
the passage on the original page first, they judge the text, not the label.

## Running it

**14. What do you see in the frontend if only `npm run dev` runs and the API does not?**

The page loads, but the header says "API offline" and the views say "API not reachable". The
frontend only shows data – everything comes from the FastAPI backend on port 8010. Vite forwards
every `/api` call there.

## The talk

**15. In present mode on the top-k card you press → three times. What happens on the third press?**

The third build appears: the truth, with the false alarms and M14 missed. Only the fourth press
opens the next card.

**25. On the register card it says "7 false alarms, M14 missed". Where does that number come
from – and what happens to the card if the register changes?**

Nobody typed it. The card imports the stored measurement of the top-k search,
`eval/results/2026-10-31_negative_search.json`, and counts the false alarms itself. The other
numbers (the register matrix, M18's journey, the embedding ruler) come from a script,
`tools/deck_data.py`: it reads the built register and writes `deck-data.json`. If the register
changes, I run the measurement and the script again, and every card shows the new numbers. So
the talk cannot say something the data does not say.

*Numbers:* 50 cards; the data file is about 66 KB; the script embeds two queries ("limitation of
liability" for the ruler, "cap on damages" for the hybrid search; < $0.0001 together). *Where:* `tools/deck_data.py`, `web/src/deck/slides/deck-data.json`,
`web/src/deck/slides/act3.tsx`, dev-log entry "The talk built through to the close".

## How I worked

**17. Which step of the path "from process to platform" decides between a fixed workflow and an
agent – and what did we choose for reading the contracts, and why?**

Step 4: for every step we decide "deterministic or agent", and step 5 says: as little autonomy as
needed. Reading the contracts is a fixed workflow – every contract, one model call each, checks
before and after. "Every contract was read" must be a fact we can prove. An agent decides itself
when it is done, so it could only claim it.

*Where:* Notion page "Herangehensweise", `docs/context/briefing.md` section 4, decision 8.
