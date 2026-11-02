# Approach – the talk, card by card

This is a readable snapshot of the presentation website in `web/src/deck`. The source of truth is
`web/src/deck/slides.ts` for order and timing and `web/src/deck/slides/*.tsx` for cards and speaker
notes. Regenerate this snapshot whenever those notes change.

**Presentation: 24 cards (17 content cards + title + six part openers), 17:03.**
Optional question cards: 29; they are not reached by the presentation controls.

The talk follows Dima’s path through Riverty’s outline: identify the problem, narrow down the
approach, build the technical solution, demonstrate it live, then explain infrastructure and
adoption. Text in square brackets is a placeholder Dima must replace in his own words.

---

## 1 · The problem · what I identified

### `title` · Which contracts are missing something?

**Timing:** 0:00–0:45 (45 s)

**Speaker notes:**

Hello, I'm Dima. [Here you introduce yourself – in your own words.] The case study asks how AI can make the legal team more efficient: most of their work is reviewing and comparing contracts, by hand. I'll show you the problem, my approach and the technical solution – then the prototype live, the infrastructure and adoption.

### `part-1` · The problem · what I identified

**Timing:** 0:45–0:49 (4 s)

**Speaker notes:**

First, the problem.

### `questions` · Two questions, again and again.

**Timing:** 0:49–1:21 (32 s)

**Speaker notes:**

The task names two questions that come back again and again. First: which contracts lack a certain clause – for example a limitation of liability?

Second: which contracts still name a former company, after a rename?

Both come straight from the case study – and both are about every contract.

### `today` · Today: open, search, note – by hand.

**Timing:** 1:21–1:51 (30 s)

**Speaker notes:**

What does one question cost today? Over 100 vendors and over 1,000 merchants – over 1,100 contracts.

I assume 5 minutes per contract: open, search, note. To be measured with Legal first.

That's about 90 hours for one question – and again for the next one.

### `hard` · Three things make it hard.

**Timing:** 1:51–2:39 (48 s)

**Speaker notes:**

Three things make it hard – all three are in the case study.

Some contracts are old scans, only images. The text has to be read first.

The same clause comes in other words. All three cap liability; the second never says 'liability', the third is German. Keywords miss them.

And the case study says it itself: agents often fail on the sheer size of the environment. Over 1,100 contracts fit into no context window.

## 2 · My approach · how I narrowed it down

### `part-2` · My approach · how I narrowed it down

**Timing:** 2:39–2:44 (5 s)

**Speaker notes:**

My approach: where the lever is, what I tested, and what I decided.

### `levers` · The biggest lever: read every contract only once.

**Timing:** 2:44–3:32 (48 s)

**Speaker notes:**

I mapped today's process for one question: open, search and read, note, verify, decide – for every contract, and again for every question.

The biggest lever is the reading. So the AI reads every contract only once, when it arrives, into a structured register: compile, don't search.

Then a question becomes a lookup – seconds instead of about 90 hours, always over every contract.

Verifying means the passage on the page; only unclear goes to a person. The decision stays with the lawyer – on purpose.

### `rag-fails` · A search cannot prove what is missing.

**Timing:** 3:32–4:52 (80 s)

**Speaker notes:**

Before I built that, I tested the usual approach: a chatbot over the documents – search first, then a model answers. I wrote 47 test contracts with known answers, because Riverty's are confidential. Question 1 on the merchant agreements: 19 contracts, M15 is a copy of M01.

A search keeps only the passages most similar to the question – here the top 10. They come from only 8 contracts.

So for the search, the other 11 lack the clause?

No: 7 are false alarms – they cap liability in other words or in German, like M02. And M14 is missed: no cap, but a hidden instruction for the AI mentions liability.

A missing clause has no passage, so it never shows up – a larger k does not help: 11 contracts never match. A search ranks what is there; it cannot prove what is missing.

### `agent` · An agent stops when it decides it is done.

**Timing:** 4:52–5:42 (50 s)

**Speaker notes:**

The second usual option: an agent. A model decides a step, calls a tool – open a file, search, note – and repeats.

It decides itself when it is done – so it can stop early, and nobody notices.

A 2026 study, OverclaimBench, told agents to review every file: they skipped files in 68 percent of the runs, and in 4 of 5 of those, the report hid it.

That is the sentence from the case study. So I read every contract once, completely: one model call per contract.

### `code-or-ai` · Per step: code – AI only where meaning is needed.

**Timing:** 5:42–6:32 (50 s)

**Speaker notes:**

From that, per step: code or a model? My rule: as little freedom for the AI as works. Reading the text is code – OCR for an image, with a confidence.

One step needs meaning: find a clause in any words. Only here a model reads – and because it can be wrong, code checks that its quote is really in the text, and a second model call gives an opinion.

The question itself is a lookup over every row of the register: coverage is a fact. And a lawyer decides.

### `needs` · So we need three guarantees.

**Timing:** 6:32–6:54 (22 s)

**Speaker notes:**

From all this, three guarantees.

First, every contract is read – and we can prove it, not just claim it.

Second, every finding shows its passage on the page.

And third, a lawyer decides.

## 3 · The technical solution · how I built it

### `part-3` · The technical solution · how I built it

**Timing:** 6:54–7:00 (6 s)

**Speaker notes:**

The technical solution: the architecture, the register, and how a finding reaches a person.

### `architecture` · The architecture: read once into a register – a lawyer decides.

**Timing:** 7:00–8:30 (90 s)

**Speaker notes:**

The architecture, end to end, the technology under every box. It starts in SharePoint: PDFs or images.

The text is read. A PDF has its text; a scan is only an image, so OCR – optical character recognition – reads it and says how sure it is. Below 70 percent, a person checks the findings.

Then one call to a small model on Azure OpenAI, gpt-4.1-mini, fills a fixed form: for each clause of Legal's playbook – the guidelines as data – found or not, page, quote. Code checks it, a second call gives its opinion, and the row goes into the register: SQLite today, PostgreSQL on Azure. Fixed steps: a workflow, not a free agent.

The lower row is Legal's: the Workbench in React and TypeScript, FastAPI behind it. Ask, confirm the plan, see every contract red, orange or green, decide. Only then a copy goes to the contract storage, through its REST API.

That is the stack: built today, and the Azure target.

### `register` · A question becomes a lookup.

**Timing:** 8:30–9:22 (52 s)

**Speaker notes:**

This is the register: every contract, read once, clause by clause. Green found, red not found, orange unclear.

Question 1 is one column: 5 contracts, no model call. Red and orange count together – one too many beats one missed.

Coverage: 20 in scope, 19 checked, M15 excluded with its reason – a copy of M01. Nothing drops out silently.

Question 2, the former names: 5 contracts. Not M05: its amendment M05-A already renamed it.

### `human` · How a finding reaches a person.

**Timing:** 9:22–10:41 (79 s)

**Speaker notes:**

Guarantee three: a lawyer decides. This is how a finding reaches a person. The model says found or not, with a quote. Five checks run in code: is the quote in the text, the clause's words, does a second call agree, text addressed to the AI, a scan below 70 percent.

From the checks, code computes a confidence – never asked from the model – and sorts the finding into three lanes. All pass: one click, and one in ten is still opened at random. Unclear or below 0.8: one lawyer. Risky, like M14's hidden instruction: two people, four eyes – a counterparty's text must never decide for Riverty.

The lawyer sees the passage first, then decides with a reason – stored and reused. Only after approval does our server send a copy to the contract storage; before that, the gate refuses. Here a stand-in plays the storage.

### `results` · Does it work? Measured, not claimed.

**Timing:** 10:41–11:23 (42 s)

**Speaker notes:**

I built the register from scratch 7 times: every expected contract found, no false alarm – 8 of 8 questions.

On real public contracts labelled by legal experts, we agree on 19 of 20 – and they showed me 3 errors my own traps had missed. Fixed.

But it is a small test set – 16 contracts – and I tuned on it. Next: a sealed set I never tune on.

## 4 · The basic implementation, live

### `part-4` · The basic implementation, live

**Timing:** 11:23–11:29 (6 s)

**Speaker notes:**

Now the basic implementation, live: the pipeline, the tool and the whole workflow.

### `live-add` · A handwritten contract arrives – watch what is found.

**Timing:** 11:29–12:24 (55 s)

**Speaker notes:**

You have old handwritten contracts, only as JPEG files. I made one: H01, dated 2009, made to look like a phone photo. I copy it into the folder, our stand-in for SharePoint – watch the number. The watcher checks every 5 seconds; then OCR, one model call and the checks run, as for every contract.

48 documents now. The handwriting is hard to read – a poor scan. Not found: the liability cap and the data processing agreement. The consumer terms are unclear, so a person looks. And the former name can't be ruled out on this scan, so a person reads it.

### `live` · The Legal Workbench, live.

**Timing:** 12:24–14:19 (115 s)

**Speaker notes:**

Now the tool for Legal, live – React and TypeScript, like these slides. It has already seen the new contract: H01, new, a poor scan. One: I choose the analysis – a missing clause, the limitation of liability. The boxes check against Legal's playbook: it decides what counts as missing. Two: the contracts – every merchant agreement; the copy, M15, is listed with its reason. Nothing runs before I confirm the plan. I confirm. Three: the answer, with coverage. Every contract gets a colour. Red, the clause is missing: M03, M14, M18. Orange, a person looks: M08, M10, and H01 – a poor scan cannot prove that a clause is missing. Green, the clause is there. Four: the evidence on the page. M08 is only outlined: the model proposed it, our checks rejected it. Now a green one, M01: its passage is checked and marked in yellow. Five: M14 needs four eyes. Reviewer A approves; I switch to B, who approves too. Six: only now the archive copy, and only once. Then back to the slides.

## 5 · Infrastructure · where it runs

### `part-5` · Infrastructure · where it runs

**Timing:** 14:19–14:24 (5 s)

**Speaker notes:**

The infrastructure: where this would run at Riverty.

### `azure` · On Azure: buy the building blocks, build what is Riverty's.

**Timing:** 14:24–15:28 (64 s)

**Speaker notes:**

Today it runs on my laptop; only the model calls go to Azure, with test data only. Following Riverty's principle – best of breed, then Microsoft – I measured Prompt Shields and a bigger model. On Azure, each part gets its service: Content Understanding for scans, Azure OpenAI in the EU data zone, Entra ID, Container Apps with Terraform – planned, not built.

We buy the building blocks and build what is Riverty's: the playbook, the evidence and the storage boundary.

Gemini? The model sits behind one adapter file – but any model must first pass the 8 test questions. LangGraph? Not needed today: code fixes the order. The target is the Microsoft Agent Framework, with LangGraph as fallback.

## 6 · Adoption · how Legal gets the value

### `part-6` · Adoption · how Legal gets the value

**Timing:** 15:28–15:32 (4 s)

**Speaker notes:**

Finally, adoption – and what I learned.

### `run-it` · One team, one question – measured against today.

**Timing:** 15:32–16:29 (57 s)

**Speaker notes:**

Legal already uses many tools, so this one must earn its place: a pilot with one team and one question. We measure today's effort with 2 or 3 lawyers, then the new way runs next to the old one for a few weeks. In the training, lawyers learn to read the evidence on the page, not to trust it blindly.

Legal owns it: the playbook is theirs, and every correction goes into the test set.

We measure the value as the case study defines productivity: time per question, against today. The prototype already counts how often lawyers overrule it, and works in German or English.

### `close` · 100 % traceable instead of 100 % accurate.

**Timing:** 16:29–17:03 (34 s)

**Speaker notes:**

What I learned: no model is always right. So every contract is read, every answer is traced back to a page, and a lawyer decides. Not built yet: the Azure platform, the SharePoint connector, a model that plans, and one that reads handwriting well. Two questions for you: is a missed contract worse for Legal than a false alarm? And who would pilot it? Thank you.

---

## Optional cards for questions

These cards are available on request after the close. They are not part of the timed presentation.

### `deep-dives` · Deep dives – for your questions

**Speaker notes:**

If you want to see a technique closer, I pick a card.

### `case-study` · The case study, sentence by sentence: six problems, three rules, one goal.

**Speaker notes:**

I went through the case study sentence by sentence and sorted what I found: a problem, a rule, or the goal. The task gives two problems: prove that a passage is missing, and find every former company name. The third is the cost today: open, search, check by hand – over 1,100 contracts, at an assumed 5 minutes each about 90 hours per question.

The technical outline adds two more: the same clause comes in other words, and amendments change older contracts – and some contracts are handwritten scans, only images. Two rules: the storage may only receive an additional copy, and best of breed is compared with Microsoft.

The problem description gives the goal – more with the same people – and the sixth problem: agents often fail on the sheer size of their environment. So coverage must be proven, not claimed.

And the last rule: AI is welcome, as long as the team understands what is happening – so every result needs its evidence.

### `task` · Six sentences that shaped the solution.

**Speaker notes:**

I started with the case study's words, sentence by sentence. Two are Legal's questions. First: contracts without a certain passage. Second: contracts with a former company name. Both are about every contract.

Today, lawyers do it by hand: open, search, verify. Some contracts are old handwritten scans, only images.

Two sentences set the rules. The storage may only get a copy. The team wants to understand what happens. So every finding needs evidence.

### `insight` · To prove that something is missing, you have to read everything.

**Speaker notes:**

Both questions need every contract. To prove that a passage is missing, or that no old name is left, you have to read every contract and every page.

And today, that reading starts again with every new question.

### `test-set` · A test set built to break the system.

**Speaker notes:**

You met the 47. In my 27, I hid traps – and wrote the answers first.

One: can it read? Scans, German, a cap split across two pages.

Two: does it understand? Caps in other words. Look-alike clauses without a cap. A hidden instruction.

Three: is the collection in order? An old name fixed by an amendment, a copy, foreign law.

Real contracts, labelled by experts: on the cap, we agree on 19 of 20. C03 has a payment on termination – is that a cap? A question for Legal. They showed 3 errors my traps missed – all fixed.

### `how-i-worked` · How I work: from the problem to the platform.

**Speaker notes:**

I work in three phases. First, understand: I qualified the pilot – the two questions – mapped today's process and looked for the biggest levers.

Then design: for every step, code or AI – and as little freedom for the AI as works. The architecture follows from that.

Then deliver: I evaluated the prototype on contracts with known answers. Azure and the rollout are planned, not built yet.

### `why-fail` · Why do the usual AI approaches fail at this task?

**Speaker notes:**

Before I chose how the AI reads, I took the sixth problem seriously: the case study itself says that agents often fail on the size of the environment. I wanted to see that on the biggest lever, the reading.

Two usual options: A, a chatbot over the documents; B, an AI agent that reads by itself.

I tested both on contracts with known answers. First, the test set.

### `contracts` · A test set: 47 contracts, every answer known.

**Speaker notes:**

To test the options, I need contracts with known answers. Riverty's are confidential, so I built a test set.

I wrote 20 merchant agreements, M01 to M20, B2B and B2B2C, with traps: M18 is a scan, M05 names the former company and its amendment M05-A renames it, and M02 limits liability in other words.

Then 6 data processing agreements, the vendor side.

And 20 real public contracts from CUAD, labelled by legal experts. For all 8 test questions, I wrote the answers first.

### `rag` · Option A in detail: a chatbot over the documents – search first, then answer.

**Speaker notes:**

Option A in detail, the usual chatbot over documents. Say a lawyer asks what M01 says about liability.

A search compares the question with every passage of every contract, by meaning: each passage becomes a list of numbers, an embedding.

It keeps only the 5 most similar passages. That is top-k – here k is 5.

A language model reads only these 5 and writes the answer. For M01 it works: the search finds clause 7.2.

This is RAG, retrieval-augmented generation: the model sees only what the search returns.

### `embedding-map` · Embeddings: every passage becomes numbers, near means similar.

**Speaker notes:**

How does a search know what is similar? With embeddings. Every passage becomes about 1,500 numbers. Here every dot is one of our 938 passages. Further right means closer in meaning to the question.

Top-k takes the dots on the far right: 4 CUAD passages, only 1 from a merchant agreement. Near in meaning – but it cannot tell which contract lacks a cap.

### `decoy` · Embeddings know the topic – not whether the clause is there.

**Speaker notes:**

These are real similarities to M01's liability section. M10's indemnification clause – who pays for whose damage – has no cap, but it scores 0.805.

M19's real cap, in German, scores only 0.746. Embeddings say what a text is about. Whether it is a cap, the model and the checks decide.

### `what-we-use` · How I implemented it: Azure OpenAI, two prompts – one reads, one checks – and the rest in code.

**Speaker notes:**

I set up Azure OpenAI and deployed two models: gpt-4.1-mini for reading and checking, and an embedding model. Then the playbook as data – its five clauses are my assumption, I have no real guidelines – and two prompts: the reader gets eight rules, the playbook and one whole contract; the checker only a definition and a quote. No model writes an answer. Reading all 47 documents once cost 12 cents.

Embeddings need no prompt: with keywords they power a search for open questions – what does M01 say about liability? – and never decide that a clause is missing.

Everything else is code we can test. Planned: a model that drafts the plan, and Microsoft's Prompt Shields as a second check for hidden instructions.

### `checks` · The model is checked: M08 said “found”, the register says “unclear”.

**Speaker notes:**

The model is checked before anything counts. Take M08: the reader said the liability cap is there, and quoted clause 6.2.

Now our checks run. Guarantee two: the quote is really in the contract. But it lacks the words Legal's playbook expects for a liability cap. And the checker disagrees: this clause is about data protection. That's maker-checker – one call makes, a second one checks.

So the register keeps both answers: the model said found, our checks say unclear, confidence 0.35 – and a lawyer looks. The model never decides alone: code before and after it, the guardrail sandwich.

### `tomorrow` · Tomorrow: the system reads, the lawyer decides.

**Speaker notes:**

Today, a lawyer opens, searches, reads and takes notes – for every contract and every question.

Tomorrow, the system reads each contract once, as soon as it is saved in SharePoint. That's the core idea: compile, don't search. The result goes into one table, the register, and a question becomes a lookup. The lawyer asks, and the system shows a plan: which contracts, which check. The lawyer confirms it, checks the evidence and approves the archive copy. The machine reads; the lawyer decides.

### `follow-m18` · Follow one contract: M18, a scan from 2018.

**Speaker notes:**

Let's follow one contract: M18, a scanned contract from the test set. It arrives in a folder, later in SharePoint.

OCR reads 2 pages: 93 percent average confidence. Below 70, we doubt its findings: a lawyer looks.

We cut at the headings: 12 sections. A fixed length can split a clause.

One call to a small model, gpt-4.1-mini, fills a fixed form. Per clause: status and quote.

Then the checks. 5 clauses: 1 found, 4 not found. Two are required only in data processing agreements.

Register: no liability cap, no data processing agreement, a former name. Fixed steps in code. The AI sees one contract at a time: a small world. Guarantee one: 'every contract was read' is a fact.

### `chunking` · Chunking: cut at the headings, not at a fixed length.

**Speaker notes:**

A common way is to cut every 2,000 characters. Cutting a contract into passages is called chunking.

We cut at the headings instead. Each clause stays one piece.

In M09 the liability clause runs over the page break. A fixed cut splits it. Our sections keep it whole.

### `ocr` · OCR reads a scan word by word – its confidence is a hint, not proof.

**Speaker notes:**

Page one of M18, a scan. OCR found 281 words. Each box is one word with its position. So we can highlight evidence on a scan.

Each word gets a confidence. Red is below 70 percent: 5 words in M18. Below 70 on average, a person checks the scan. Like H01, the handwritten contract you saw live: 61 percent. A model that reads images is planned.

But confidence is a hint, not proof. OCR lost the umlaut in Händlers, 96 percent sure. 3 words have wrong letters.

### `fixed-form` · One model call per contract fills a fixed form.

**Speaker notes:**

The model fills a fixed form, a JSON schema: per clause found, not found or unclear, a section, a quote, a reason – nothing else.

This is M18's real answer. Liability cap: not found, with a reason. Consumer terms in checkout: found, with a quote from section 3.

Then our code adds page and confidence; a second model call checks each found clause. 47 contracts, 47 calls to read them. Over 200,000 characters, a contract is read in parts – none here.

### `injection` · A hidden instruction in M14 – caught, and sent to two people.

**Speaker notes:**

Second danger: a hidden note in M14 tells the AI to report a cap. That is prompt injection. A counterparty's text must not decide for Riverty.

Our pattern check finds it. The register still says: no cap. Two people look – four eyes.

Honestly: M14 and 3 rewordings – our pattern check found only the original, 1 of 4. Microsoft's Prompt Shields: 4 of 4 – our next step.

### `prompts` · Two prompts, word for word.

**Speaker notes:**

The reader's prompt, word for word. Eight rules: the contract is data, not orders; quotes word for word; if unsure, unclear. Then the document types. Its message adds Legal's five clauses and the whole contract.

The checker's prompt: it sees only the definition and the quote – never the contract. If it says no, found becomes unclear.

### `agent-patterns` · Agent building blocks, each with one job – but no free agent.

**Speaker notes:**

Code fixes the order. One: plan first – the lawyer confirms it. Two: maker and checker: a second call checks every “found” – 39 calls, one per contract, each for all its found clauses. It overruled 5 of 82.

Three: a tool behind a gate – the archive copy needs approval and runs once. Four: a person decides. In Q1 a lawyer opens 3 of 5 – one with four eyes; 2 sure ones: one click, with a spot check.

Honestly: the planner has no model yet. Agent Framework or LangChain's LangGraph, and MCP – a standard plug for a model's tools: planned, not built.

### `register-index` · Two stores, two jobs: the register and the search index.

**Speaker notes:**

Are the contracts embedded too? Yes – for another job. The register answers which contracts lack something, for every contract.

The search index holds the 938 passages, with keywords and embeddings: hybrid search, for open questions. Never for “which contracts lack”.

### `hybrid-search` · Open questions: keywords and meaning, merged.

**Speaker notes:**

For open questions we search. I ask: cap on damages. Keywords find 4 passages with the word damages – none says cap. Embeddings find the meaning: also M19's German cap, and caps called liability.

We merge both lists by rank, not by score: what both found comes first. That is hybrid search – built.

Still open: a reranker – a second model that re-sorts the best hits – and a test set. On Azure: AI Search. Never for which contracts lack a clause.

### `results-full` · 8 of 8 questions complete – and how sure we can be.

**Speaker notes:**

I built the register from scratch 7 times – every expected contract found, no false alarm. On real contracts labelled by legal experts, we agree on 19 of 20 – and they showed 3 errors my own traps had missed. All fixed.

How sure can we be? Q1 found 5 of 5 – but with 95 percent confidence, the true rate could still be as low as 54 percent. And 1 of 1 says almost nothing.

All 28 answers together give at least 89 percent. But they come from only 16 contracts, and I tuned on this test set. So next: a sealed test set, with new contracts I never tune on.

### `what-if` · Switch a safeguard off – live.

**Speaker notes:**

Remember M08: the model said found, the checks said unclear. What if the checks were off? I replay the stored answers on a copy – no model call, no cost.

The second model call, off. Q1 still finds all 5. The checks overlap – watch the next switch.

Now the words check off too. M08 and M10, the two unclear ones, slip through: 3 of 5. No lawyer would look at them.

Both checks back on. Now only the pattern check off: M14 no longer goes to two people.

### `cost` · A few cents to read everything – and the small model was enough on our tests.

**Speaker notes:**

And the cost? Reading all 47 once: 12 cents. Then a question is a lookup – not 90 hours. Your definition of productivity: the same lawyers answer more questions.

A bigger model? GPT-4.1 costs 5 times more. Without our checks it misses less; with them, both find everything.

So the small model stays. A new model, prompt or playbook goes live only if all 8 test questions still pass – our rule, run by hand today.

### `ms-checks` · Microsoft at the edges (planned), our own checks in the middle (built).

**Speaker notes:**

On Azure, Microsoft services would do what they do best: reading scans, a second opinion on hidden instructions, and identity. Planned, not built.

I measured Prompt Shields once. It only says yes or no, without the position. So our own check stays. A hit would mean four eyes, never a block.

### `sharepoint` · Saved in SharePoint – how does it reach the register?

**Speaker notes:**

Target design: a lawyer saves a contract in SharePoint.

Microsoft Graph is Microsoft's interface to SharePoint. We would subscribe to the library. Then Graph would say only: something changed. The delta query would then ask: what changed?

Then the pipeline reads it – the fixed steps you saw with M18. Its model calls took about 7 seconds.

Messages usually come within a minute, at most six hours. Lost ones? A scheduled run would check again.

### `graph-details` · SharePoint in detail: subscription, delta query, safety net.

**Speaker notes:**

The target design, from Microsoft's documentation. Not built yet. The subscription would only wake us up. The delta query would tell us what changed. We would renew the subscription within 30 days.

And we would ask only for read rights on the one library.
