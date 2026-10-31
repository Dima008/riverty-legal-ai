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
