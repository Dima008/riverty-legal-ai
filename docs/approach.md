# Approach – the talk, part by part

The text behind the presentation website (`web/src/deck`, decision 76): the order of the talk, what
each card says on screen, the sentence of Riverty's task it picks up, and what is said per build.
Since decision 99 the talk follows Dima's path through the outline of the task (Dima, 2.11.: "identify, how
I solve it, what the architecture looks like"): (1) the problem – what I identified, (2) my approach – how I
work, the levers, the options I tested, (3) the technical solution – the architecture, its parts, the proof,
(4) the basic implementation, live – right after the solution it shows, (5) infrastructure, (6) adoption and
the close. Decision 90 had the demo as the finale. Part 1 starts from
Riverty's own document (decision 98): the card `case-study` shows the key sentences of the case study as
screenshots of the PDF, highlighted (`tools/case_study_snips.py` -> `web/public/case-study/`), part by part,
with what I identified in each. Other task quotes are on screen only on the six part openers and, as the one
approved exception, Riverty's agent sentence on `agent`; content cards pick up their sentence in the notes.
Deep dives after the close are opened only on a question (decision 78).

The source of truth is the deck: `web/src/deck/slides.ts` (order, parts, checkpoints, skip list) and
`web/src/deck/slides/*.tsx` (cards and notes). Every number below is rendered from the deck, which reads
it from a data file – the register snapshot `deck-data.json`, `eval/results/`, the test-set files or the
code itself (`?raw`); none is typed by hand. Dev guards in the deck check each claim against its source.
This file is a snapshot of the rendered notes: regenerate it when the notes change. The earlier chapter
text of the first website (decision 68) is in the git history of this file.

**Main track: 27 cards, 1315 s = 21:55** – Riverty asks for 15–20 minutes; Dima's hard maximum is 22:00. Deep dives: 23 cards.

**The notes (decision 98, Dima 2.11.: "nur Stichworte ... nicht gut geschrieben"):** flowing spoken prose, not
keywords – complete sentences that say what is on screen, why it matters and what follows, at B2 level. Every
point is said once; Dima's own Notion sentences stand in his words (rag-fails build 4, agent builds 1 and 3). Since
decision 99 every card opens with its message (answer first), speaks to Riverty ("you", "your lawyers"), never
narrates the document ("next, the technical outline"), and part 1 says no solution.

**Timing (decision 98, Dima 2.11.: keep everything, rehearse with the clock):** each card's seconds are its
spoken words at about 124 words per minute plus 1 s per build; the title adds about 15 s for Dima's own
introduction and `live` keeps its click script (115 s). At a slower 115 words per minute the same notes take
about 23:25. The part starts below are the checkpoints in the presenter view.

**Moved to the deep dives, nothing deleted:** decision 96 – `injection`, `what-if`, `sharepoint`, `cost`;
decision 98 – `task`, `today` and `hard` (their points are said on `case-study`) and `follow-m18` (`what-we-use`
names the model, the fixed form and OCR; `register` says guarantee one; `live-add` shows the pipeline live);
decision 99 – `tomorrow` (its message is the card `levers` of part 2, the system itself the card `architecture`,
which now says OCR and the fixed form first).

| Part | Starts | Cards | Seconds |
| --- | --- | --- | --- |
| 1 · The problem | 0:00 | 4 | 166 |
| 2 · My approach | 2:46 | 8 | 392 |
| 3 · The technical solution | 9:18 | 7 | 402 |
| 4 · The basic implementation, live | 16:00 | 3 | 178 |
| 5 · Infrastructure | 18:58 | 2 | 76 |
| 6 · Adoption | 20:14 | 3 | 101 |

**When late** (before the demo, so it keeps its time): skip `results` from build 2. Never skip `case-study`, `what-we-use`, `run-it`, `live-add` or `live`.

**Open:** one sentence Dima writes about himself for the title card ("we want to get to know you, not
only your slides"). It is not invented here; the title note keeps the placeholder in square brackets.

---

## 1 · The problem (0:00, 166 s)

### `title` · 53 s · 1 build · from 0:00

**On screen:** Which contracts are missing something?

**Picks up:** “making our legal team more efficient” · “it is purely repetitive work that nobody enjoys doing” · “we want to get to know you, not only your slides”

**Says:** Hello, I'm Dima. [Here you introduce yourself – in your own words.] Your case study is about making your legal team more efficient. Most of their work is reviewing and comparing contracts, and checking them against your guidelines – largely by hand. AI should take over the repetitive part, so the same lawyers can answer more questions. I'll show you what I identified, how I would solve it and what the architecture looks like – then the prototype, live, and finally the infrastructure and adoption.

### `part-1` · 5 s · 1 build · from 0:53

**Opener: The problem** – on screen, word for word from the task:

> One of these challenges is making our legal team more efficient.

**Says:** First, what I identified in your case study.

### `case-study` · 83 s · 4 builds · from 0:58

**On screen:** Your case study – and what I identified.

**Picks up:** “create more with the same number of engineers” · “in day-to-day operations they often fail due to the sheer size and complexity of the environments they have to operate in” · “the main workload still consists of organizing and reviewing contracts, comparing them, and ensuring they comply with our corporate guidelines and represent the company's best interests” · “Most documents reside on SharePoint and are in PDF format. Some of them are scans of really old, handwritten contracts that exist only as JPEG files.” · “You may solely use it to store an additional copy of a contract in a legally compliant manner.” · “First, we evaluate best-of-breed solutions and what they offer. Second, as we are a Microsoft shop, we compare these solutions against what Microsoft provides.” · “contracts that do not contain a certain text passage or contracts in which a company name needs to be updated” · “So far, this is semi-manual work: they have to open the documents, search for the relevant content, and verify the results themselves.” · “over 100 vendors on the inbound side and over 1,000 merchants on the outbound side” · “As a team, we encourage any form of AI usage, as long as we understand what is happening.”

**Says:**

- *Build 0:* I identified two questions that come back again and again: which contracts lack a certain passage, and which name a company that must be updated. Today a lawyer opens every document, searches and checks by hand. With over 100 vendors and over 1,000 merchants, that is over 1,100 contracts – at an assumed 5 minutes each, about 90 hours per question.
- *Build 1:* The contracts are PDFs on SharePoint; some are old handwritten scans, only images. Amendments change older contracts, and the same clause comes in different words. Your lawyers check against your corporate guidelines, and the contract storage may only receive an additional copy.
- *Build 2:* Your measure of success is productivity: more with the same people. And agents, you write, often fail on the sheer size of their environment. So my first requirement: cover every contract, and prove it.
- *Build 3:* And you encourage AI, as long as you understand what is happening – so every result needs its evidence.

### `insight` · 25 s · 2 builds · from 2:21

**On screen:** To prove that something is missing, you have to read everything.

**Says:**

- *Build 0:* Both questions need every contract. To prove that a passage is missing, or that no old name is left, you have to read every contract and every page.
- *Build 1:* And today, that reading starts again with every new question. That is the problem my approach starts from.

---

## 2 · My approach (2:46, 392 s)

### `part-2` · 7 s · 1 build · from 2:46

**Opener: My approach** – on screen, word for word from the task:

> A solution explaining how you would tackle the challenge

**Says:** My approach: how I work, my levers, and the options I tested.

### `how-i-worked` · 53 s · 4 builds · from 2:53

**On screen:** How I work: from the problem to the platform.

**Picks up:** “how you approach real-world problems” · “As our future teammate, we encourage you to do the same.”

**Says:**

- *Build 0:* I work in three phases. First, understand: I qualified the pilot – your two questions – mapped today's process and looked for the biggest levers.
- *Build 1:* Then design: for every step, code or AI – and as little freedom for the AI as works. The architecture follows from that.
- *Build 2:* Then deliver: I evaluated the prototype on contracts with known answers. Azure and the rollout are planned, not built yet.
- *Build 3:* You encourage AI, and I used it: I built this with Claude Code. Every AI-assisted commit is marked in git, every decision is documented, and I can explain every line.

### `levers` · 53 s · 4 builds · from 3:46

**On screen:** Three levers – the biggest: read every contract only once.

**Picks up:** “they have to open the documents, search for the relevant content, and verify the results themselves”

**Says:**

- *Build 0:* To find the levers, I mapped today's process for one question, step by step.
- *Build 1:* The biggest lever is the reading. It grows with every contract and is repeated for every question. So the AI reads every contract only once, when it arrives, into a structured register: compile, don't search.
- *Build 2:* Second: with the register, a new question becomes a lookup – seconds instead of about 90 hours, always over every contract.
- *Build 3:* Third, verifying: the lawyer sees the exact passage on the page, and only unclear findings need a person. One step I deliberately don't automate: the decision stays with the lawyer.

### `contracts` · 53 s · 4 builds · from 4:39

**On screen:** Riverty cannot share contracts – so I put together 47 with known answers.

**Picks up:** “we won't be able to share actual contracts or contract templates” · “These agreements cover both B2B and B2B2C business models”

**Says:**

- *Build 0:* To test the options, I need contracts with known answers. You can't share yours, so I built a test set.
- *Build 1:* I wrote 20 merchant agreements, M01 to M20, B2B and B2B2C, with traps: M18 is a scan, M05 names the former company and its amendment M05-A renames it, and M02 limits liability in other words.
- *Build 2:* Then 6 data processing agreements, the vendor side.
- *Build 3:* And 20 real public contracts from CUAD, labelled by legal experts. For all 8 test questions, I wrote the answers first.

### `rag` · 55 s · 5 builds · from 5:32

**On screen:** The usual approach: a chatbot over your documents.

**Picks up:** “search for the relevant content”

**Says:**

- *Build 0:* For the biggest lever, the reading, I first tested the usual option: a chatbot over your documents. Say you ask about liability in M01.
- *Build 1:* A search compares your question with every passage of every contract, by meaning: each passage becomes a list of numbers, an embedding.
- *Build 2:* It keeps only the 5 most similar passages. That is top-k – here k is 5.
- *Build 3:* A language model reads only these 5 and writes the answer. For M01 it works: the search finds clause 7.2.
- *Build 4:* This is RAG, retrieval-augmented generation: the model sees only what the search returns.

### `rag-fails` · 76 s · 5 builds · from 6:27

**On screen:** It fails when the answer is what is not in the text.

**Picks up:** “contracts that do not contain a certain text passage”

**Says:**

- *Build 0:* Now your real question, Q1: which merchant agreements lack a limitation of liability – a cap on what a party must pay? That's 19 contracts, because M15 is a copy of M01.
- *Build 1:* A keyword search for 'limitation of liability' keeps the top 10 passages. They come from only 8 contracts.
- *Build 2:* So for the search, the other 11 seem to lack the clause.
- *Build 3:* But 7 of them are false alarms: they cap liability in other words or in German, like M02. And M14 is missed: it has no cap, but a hidden instruction for the AI mentions liability.
- *Build 4:* A missing clause has no passage, so it can never show up – and a larger k does not help: 11 contracts never match the keywords. Embeddings rank too. Top-k ranks what is there – search can't prove that something is missing.

### `agent` · 70 s · 4 builds · from 7:43

**On screen:** And an AI agent that reads everything itself?

**Picks up:** “they often fail due to the sheer size and complexity of the environments they have to operate in”

**Says:**

- *Build 0:* The second option is an agent: a model plans a step, calls a tool – open a file, search, take notes – and repeats.
- *Build 1:* The weak point: it decides itself when it has seen enough – so it can stop early, and nobody notices.
- *Build 2:* A 2026 study, OverclaimBench, told agents to review every file. They skipped files in 68 percent of the runs, and in 4 of 5 of those runs, the report hid it.
- *Build 3:* Your case study says agents fail on the size of the environment – and over 1,100 contracts fit into no context window, so an agent sees only a part. A missed contract never shows up, and the answer still sounds complete. That's why I read every contract once, completely: one AI call per contract to read it.

### `needs` · 25 s · 4 builds · from 8:53

**On screen:** So we need three guarantees.

**Picks up:** “verify the results themselves”

**Says:**

- *Build 0:* From all this, I derived three guarantees.
- *Build 1:* First, every contract is read – and we can prove it, not just claim it.
- *Build 2:* Second, every finding shows its passage on the page, so a lawyer can check it in seconds.
- *Build 3:* And third, a lawyer decides.

---

## 3 · The technical solution (9:18, 402 s)

### `part-3` · 8 s · 1 build · from 9:18

**Opener: The technical solution** – on screen, word for word from the task:

> An overall technical solution you would present to our team and how it could be implemented

**Says:** Now the technical solution: the architecture, its parts, and how I know it works.

### `architecture` · 77 s · 4 builds · from 9:26

**On screen:** From SharePoint to the archive copy: the system reads, a lawyer decides.

**Picks up:** “Most documents reside on SharePoint and are in PDF format.” · “Some of them are scans of really old, handwritten contracts that exist only as JPEG files” · “ensuring they comply with our corporate guidelines” · “A basic pipeline showing how you would analyze the documents and make them accessible”

**Says:**

- *Build 0:* Here is the architecture I propose. It starts where your contracts are: in SharePoint, as PDFs or images.
- *Build 1:* First, the text is read. A PDF usually contains its text; a scan is only an image, so OCR – optical character recognition – turns it into text and says how sure it is. Below 70 percent, a person checks the findings.
- *Build 2:* Then one model call per contract fills a fixed form: for each clause in Legal's playbook – your guidelines as data – found or not, with page and quote. Code checks every answer, and the result goes into the register. The steps are fixed in code: a workflow, not a free agent.
- *Build 3:* The lower row is Legal's, in the Workbench: ask, confirm the plan, see every contract in red, orange or green with its evidence – and decide. Only then does a copy go to your contract storage.

### `what-we-use` · 68 s · 3 builds · from 10:43

**On screen:** What we use: two prompts – one reads, one checks. The rest is code.

**Picks up:** “we encourage any form of AI usage, as long as we understand what is happening” · “Python with FastAPI and multiple libraries” · “Frontend written in React and TypeScript”

**Says:**

- *Build 0:* The AI sits in two prompts on one small model, gpt-4.1-mini. The reader gets eight rules, Legal's playbook and one whole contract; the playbook's five clauses are my assumption, because I have no real guidelines. The checker gets only a definition and a quote. No model writes an answer, and reading all 47 documents once cost 12 cents.
- *Build 1:* Embeddings need no prompt. With keywords, they power a search for open questions, like: what does M01 say about liability? They never decide that a clause is missing.
- *Build 2:* Everything else is code we can test – Python and FastAPI behind it, React and TypeScript in front. Planned: a model that drafts the plan, and Microsoft's Prompt Shields as a second check for hidden instructions.

### `checks` · 55 s · 3 builds · from 11:51

**On screen:** The model is checked: M08 said “found”, the register says “unclear”.

**Picks up:** “ensuring they comply with our corporate guidelines”

**Says:**

- *Build 0:* The model is checked before anything counts. Take M08: the reader said the liability cap is there, and quoted clause 6.2.
- *Build 1:* Now our checks run. Guarantee two: the quote is really in the contract. But it lacks the words Legal's playbook expects for a liability cap. And the checker disagrees: this clause is about data protection. That's maker-checker – one call makes, a second one checks.
- *Build 2:* So the register keeps both answers: the model said found, our checks say unclear, confidence 0.35 – and a lawyer looks. The model never decides alone: code before and after it, the guardrail sandwich.

### `register` · 66 s · 4 builds · from 12:46

**On screen:** Every contract in one table – a question becomes a lookup.

**Picks up:** “organizing and reviewing contracts, comparing them”

**Says:**

- *Build 0:* This is the register: every contract, read once, clause by clause. Green is found, red is not found, orange is unclear.
- *Build 1:* Q1 is one column: 5 contracts, no model call. Red and orange count together, because recall comes first – one too many beats one missed. The keyword search had 7 false alarms and missed M14.
- *Build 2:* Coverage: 20 in scope, 19 checked, M15 excluded with its reason – a copy of M01. That's guarantee one: every contract was read, and we can show it. Comparing works too, so far in the API.
- *Build 3:* Your second question, Q2: which contracts still name Arvato or AfterPay, Riverty's former names? 5. Not M05: its amendment M05-A already renamed it to Riverty.

### `human` · 67 s · 3 builds · from 13:52

**On screen:** Observations, not verdicts: a lawyer decides.

**Picks up:** “there is a contract storage solution with a RESTful API” · “You may solely use it to store an additional copy of a contract in a legally compliant manner.”

**Says:**

- *Build 0:* Guarantee three: a lawyer decides; the system only reports what the text says. Who looks is decided by our checks, never by the model. A sure finding takes one click, and one in ten is still opened at random. Unclear or below 0.8: one lawyer looks. Risky: two people – four eyes. Like M14: our pattern check finds its hidden instruction, because a counterparty's text must never decide for you.
- *Build 1:* The lawyer sees the passage on the page first, then decides, with a reason – stored and reused.
- *Build 2:* Your contract storage has a REST API. Our server sends a file there only after approval; before that, the gate refuses. Here a stand-in plays the storage: it keeps each file once, by its fingerprint – and it can't be changed.

### `results` · 61 s · 3 builds · from 14:59

**On screen:** 8 of 8 questions complete – and how sure we can be.

**Picks up:** “feel free to use any publicly available B2B or B2B2C contract” · “while learning and improving ourselves”

**Says:**

- *Build 0:* It works on every test: I built the register from scratch 7 times – every expected contract found, no false alarm. On real contracts labelled by legal experts, we agree on 19 of 20 – and they showed 3 errors my own traps had missed. All fixed.
- *Build 1:* How sure can we be? Q1 found 5 of 5 – but with 95 percent confidence, the true rate could still be as low as 54 percent. And 1 of 1 says almost nothing.
- *Build 2:* All 28 answers together give at least 89 percent. But they come from only 16 contracts, and I tuned on this test set. So next: a sealed test set, with new contracts I never tune on.

---

## 4 · The basic implementation, live (16:00, 178 s)

### `part-4` · 8 s · 1 build · from 16:00

**Opener: The basic implementation, live** – on screen, word for word from the task:

> Basic implementation demonstrating the foundation of the concept

**Says:** Now the basic implementation, live: the pipeline, the front-end and the whole workflow.

### `live-add` · 55 s · 2 builds · from 16:08

**On screen:** A handwritten contract arrives – watch what is found.

**Picks up:** “Anything you feel is necessary to demonstrate the end-to-end workflow”

**Says:**

- *Build 0:* You have old handwritten contracts, only as JPEG files. I made one: H01, dated 2009, made to look like a phone photo. I copy it into the folder, our stand-in for SharePoint – watch the number. The watcher checks every 5 seconds; then OCR, one model call and the checks run, as for every contract.
- *Build 1:* 48 documents now. The handwriting is hard to read – a poor scan. Not found: the liability cap and the data processing agreement. The consumer terms are unclear, so a person looks. And the former name can't be ruled out on this scan, so a person reads it.

### `live` · 115 s · 1 build · from 17:03

**On screen:** The Legal Workbench, live.

**Picks up:** “A basic front-end demonstrating how the solution can be used”

**Says:** Now the tool for Legal, live – React and TypeScript, like these slides. It has already seen the new contract: H01, new, a poor scan. One: I choose the analysis – a missing clause, the limitation of liability. The boxes check against Legal's playbook: it decides what counts as missing. Two: the contracts – every merchant agreement; the copy, M15, is listed with its reason. Nothing runs before I confirm the plan. I confirm. Three: the answer, with coverage. Every contract gets a colour. Red, the clause is missing: M03, M14, M18. Orange, a person looks: M08, M10, and H01 – a poor scan cannot prove that a clause is missing. Green, the clause is there. Four: the evidence on the page. M08 is only outlined: the model proposed it, our checks rejected it. Now a green one, M01: its passage is checked and marked in yellow. Five: M14 needs four eyes. Reviewer A approves; I switch to B, who approves too. Six: only now the archive copy, and only once. Then back to the slides.

---

## 5 · Infrastructure (18:58, 76 s)

### `part-5` · 6 s · 1 build · from 18:58

**Opener: Infrastructure** – on screen, word for word from the task:

> A basic explanation of the infrastructure you would leverage

**Says:** Now the infrastructure: where this would run at Riverty.

### `azure` · 70 s · 3 builds · from 19:04

**On screen:** On Azure: buy the building blocks, build what is Riverty's.

**Picks up:** “Riverty follows two guiding principles when it comes to technology choices.” · “Azure Foundry / Google Gemini” · “Containerized environments” · “Terraform for infrastructure provisioning” · “LangChain and LangGraph for agents”

**Says:**

- *Build 0:* Today it runs on my laptop; only the model calls go to Azure, with test data only. Following your principle – best of breed, then Microsoft – I measured Prompt Shields and a bigger model. On Azure, each part gets its service – Content Understanding for scans, Azure OpenAI in the EU data zone, Entra ID, Container Apps with Terraform – all planned, not built yet.
- *Build 1:* We buy the building blocks, and we build what is yours: the playbook, the evidence and the storage boundary.
- *Build 2:* Gemini? The model sits behind one small adapter file, but any model must first pass the 8 test questions. LangGraph? Not needed today – our code fixes the order; the target is the Microsoft Agent Framework, with LangGraph as fallback. The real value is the architecture: a small, structured world for the AI.

---

## 6 · Adoption (20:14, 101 s)

### `part-6` · 4 s · 1 build · from 20:14

**Opener: Adoption** – on screen, word for word from the task:

> A concept for helping our colleagues adopt the solution and ensure they get the most value out of it

> Anything else you feel is relevant to understanding your approach to solving the challenge

**Says:** Finally, adoption – and what I learned.

### `run-it` · 61 s · 3 builds · from 20:18

**On screen:** Adoption: one team, one question – measured against today.

**Picks up:** “Our legal colleagues currently leverage a variety of tools”

**Says:**

- *Build 0:* Legal already uses many tools, so this one must earn its place. It starts with a pilot: one team, one question. First we measure today's effort with 2 or 3 lawyers; then the new way runs next to the old one for a few weeks. In the training, lawyers learn to read the evidence on the page, not to trust it blindly. Then the next question, the next team.
- *Build 1:* Legal owns it, because the playbook is theirs – and every correction goes into the test set.
- *Build 2:* We measure the value with your definition of productivity: time per question, against today. The prototype already counts how often lawyers overrule it, reviews are reused, and lawyers can work in German or English.

### `close` · 36 s · 1 build · from 21:19

**On screen:** 100 % traceable instead of 100 % accurate.

**Picks up:** “start a meaningful conversation during the interview” · “while learning and improving ourselves”

**Says:** What I learned: no model is always right. So every contract is read, every answer is traced back to a page, and a lawyer decides. Not built yet: the Azure platform, the SharePoint connector, a model that plans, and one that reads handwriting well. Two questions for you. I assumed that a missed contract hurts more than a false alarm – is that right for Legal? And who would pilot it? Thank you.

---

## Deep dives (opened on a question, not timed)

### `deep-dives` · Deep dives – for your questions

- If you want to see a technique closer, I pick a card.

### `choices` · Each problem picked its technique.

- *Build 0:* Each problem picked its technique. Prove what is missing: read every contract into the register.
- *Build 1:* Scans: OCR reads each page, with a confidence.
- *Build 2:* Amendments: read with their contract. Old names work today; clause changes are planned.
- *Build 3:* Other words: the model reads against the playbook. Keywords miss M02.
- *Build 4:* Models can be wrong: a quote we find, and a second model call.
- *Build 5:* Hidden instructions: a pattern check, next Microsoft Prompt Shields.
- *Build 6:* Lawyers decide: triage. Unclear goes to one lawyer, risky to two – four eyes.

### `task` · Six sentences that shaped the solution.

- *Build 0:* I started with your words, sentence by sentence. Two are Legal's questions. First: contracts without a certain passage. Second: contracts with a former company name. Both are about every contract.
- *Build 1:* Today, lawyers do it by hand: open, search, verify. Some contracts are old handwritten scans, only images.
- *Build 2:* Two sentences set the rules. The storage may only get a copy. You want to understand what happens. So every finding needs evidence.

### `today` · Today: open every contract, search, note it down.

- *Build 0:* What does one question cost today? You work with over 100 vendors and over 1,000 merchants. So over 1,100 contracts.
- *Build 1:* I assume 5 minutes per contract. We'd measure it with Legal first.
- *Build 2:* That's about 90 hours for one question.

### `hard` · Three things make it hard.

- *Build 0:* Why not search for a word?
- *Build 1:* First, scans. Most PDFs have text: we read it directly. Some are only images, like this one. OCR, text recognition, reads them. Later, a handwritten one, live.
- *Build 2:* Second, amendments. A contract from 2020 names Arvato, Riverty's old name. Its 2022 amendment says: read as Riverty. The answer needs both.
- *Build 3:* Third, wording. All three cap liability. The second never says liability. The third is German. Keywords miss them. Remember the second one.

### `test-set` · A test set built to break the system.

- *Build 0:* You met the 47. In my 27, I hid traps – and wrote the answers first.
- *Build 1:* One: can it read? Scans, German, a cap split across two pages.
- *Build 2:* Two: does it understand? Caps in other words. Look-alike clauses without a cap. A hidden instruction.
- *Build 3:* Three: is the collection in order? An old name fixed by an amendment, a copy, foreign law.
- *Build 4:* Real contracts, labelled by experts: on the cap, we agree on 19 of 20. C03 has a payment on termination – is that a cap? A question for Legal. They showed 3 errors my traps missed – all fixed.

### `embedding-map` · Embeddings: every passage becomes numbers, near means similar.

- *Build 0:* How does a search know what is similar? With embeddings. Every passage becomes about 1,500 numbers. Here every dot is one of our 938 passages. Further right means closer in meaning to the question.
- *Build 1:* Top-k takes the dots on the far right: 4 CUAD passages, only 1 from a merchant agreement. Near in meaning – but it cannot tell which contract lacks a cap.

### `decoy` · Embeddings know the topic – not whether the clause is there.

- *Build 0:* These are real similarities to M01's liability section. M10's indemnification clause – who pays for whose damage – has no cap, but it scores 0.805.
- *Build 1:* M19's real cap, in German, scores only 0.746. Embeddings say what a text is about. Whether it is a cap, the model and the checks decide.

### `tomorrow` · Tomorrow: the system reads, the lawyer decides.

- *Build 0:* Today, a lawyer opens, searches, reads and takes notes – for every contract and every question.
- *Build 1:* Tomorrow, the system reads each contract once, as soon as it is saved in SharePoint. That's the core idea: compile, don't search. The result goes into one table, the register, and a question becomes a lookup. The lawyer asks, and the system shows a plan: which contracts, which check. The lawyer confirms it, checks the evidence and approves the archive copy. The machine reads; the lawyer decides.

### `follow-m18` · Follow one contract: M18, a scan from 2018.

- *Build 0:* Let's follow one contract: M18, a scanned contract from the test set. It arrives in a folder, later in SharePoint.
- *Build 1:* OCR reads 2 pages: 93 percent average confidence. Below 70, we doubt its findings: a lawyer looks.
- *Build 2:* We cut at the headings: 12 sections. A fixed length can split a clause.
- *Build 3:* One call to a small model, gpt-4.1-mini, fills a fixed form. Per clause: status and quote.
- *Build 4:* Then the checks. 5 clauses: 1 found, 4 not found. Two are required only in data processing agreements.
- *Build 5:* Register: no liability cap, no data processing agreement, a former name. Fixed steps in code. The AI sees one contract at a time: a small world. Guarantee one: 'every contract was read' is a fact.

### `chunking` · Chunking: cut at the headings, not at a fixed length.

- *Build 0:* A common way is to cut every 2,000 characters. Cutting a contract into passages is called chunking.
- *Build 1:* We cut at the headings instead. Each clause stays one piece.
- *Build 2:* In M09 the liability clause runs over the page break. A fixed cut splits it. Our sections keep it whole.

### `ocr` · OCR reads a scan word by word – its confidence is a hint, not proof.

- *Build 0:* Page one of M18, a scan. OCR found 281 words. Each box is one word with its position. So we can highlight evidence on a scan.
- *Build 1:* Each word gets a confidence. Red is below 70 percent: 5 words in M18. Below 70 on average, a person checks the scan. Like H01, the handwritten contract you saw live: 61 percent. A model that reads images is planned.
- *Build 2:* But confidence is a hint, not proof. OCR lost the umlaut in Händlers, 96 percent sure. 3 words have wrong letters.

### `fixed-form` · One model call per contract fills a fixed form.

- *Build 0:* The model fills a fixed form, a JSON schema: per clause found, not found or unclear, a section, a quote, a reason – nothing else.
- *Build 1:* This is M18's real answer. Liability cap: not found, with a reason. Consumer terms in checkout: found, with a quote from section 3.
- *Build 2:* Then our code adds page and confidence; a second model call checks each found clause. 47 contracts, 47 calls to read them. Over 200,000 characters, a contract is read in parts – none here.

### `injection` · A hidden instruction in M14 – caught, and sent to two people.

- *Build 0:* Second danger: a hidden note in M14 tells the AI to report a cap. That is prompt injection. A counterparty's text must not decide for Riverty.
- *Build 1:* Our pattern check finds it. The register still says: no cap. Two people look – four eyes.
- *Build 2:* Honestly: M14 and 3 rewordings – our pattern check found only the original, 1 of 4. Microsoft's Prompt Shields: 4 of 4 – our next step.

### `prompts` · Two prompts, word for word.

- *Build 0:* The reader's prompt, word for word. Eight rules: the contract is data, not orders; quotes word for word; if unsure, unclear. Then the document types. Its message adds Legal's five clauses and the whole contract.
- *Build 1:* The checker's prompt: it sees only the definition and the quote – never the contract. If it says no, found becomes unclear.

### `agent-patterns` · Agent building blocks, each with one job – but no free agent.

- *Build 0:* Code fixes the order. One: plan first – the lawyer confirms it. Two: maker and checker: a second call checks every “found” – 39 calls, one per contract, each for all its found clauses. It overruled 5 of 82.
- *Build 1:* Three: a tool behind a gate – the archive copy needs approval and runs once. Four: a person decides. In Q1 a lawyer opens 3 of 5 – one with four eyes; 2 sure ones: one click, with a spot check.
- *Build 2:* Honestly: the planner has no model yet. Agent Framework or LangChain's LangGraph, and MCP – a standard plug for a model's tools: planned, not built.

### `register-index` · Two stores, two jobs: the register and the search index.

- *Build 0:* Are the contracts embedded too? Yes – for another job. The register answers which contracts lack something, for every contract.
- *Build 1:* The search index holds the 938 passages, with keywords and embeddings: hybrid search, for open questions. Never for “which contracts lack”.

### `hybrid-search` · Open questions: keywords and meaning, merged.

- *Build 0:* For open questions we search. I ask: cap on damages. Keywords find 4 passages with the word damages – none says cap. Embeddings find the meaning: also M19's German cap, and caps called liability.
- *Build 1:* We merge both lists by rank, not by score: what both found comes first. That is hybrid search – built.
- *Build 2:* Still open: a reranker – a second model that re-sorts the best hits – and a test set. On Azure: AI Search. Never for which contracts lack a clause.

### `what-if` · Switch a safeguard off – live.

- *Build 0:* Remember M08: the model said found, the checks said unclear. What if the checks were off? I replay the stored answers on a copy – no model call, no cost.
- *Build 1:* The second model call, off. Q1 still finds all 5. The checks overlap – watch the next switch.
- *Build 2:* Now the words check off too. M08 and M10, the two unclear ones, slip through: 3 of 5. No lawyer would look at them.
- *Build 3:* Both checks back on. Now only the pattern check off: M14 no longer goes to two people.

### `cost` · A few cents to read everything – and the small model was enough on our tests.

- *Build 0:* And the cost? Reading all 47 once: 12 cents. Then a question is a lookup – not 90 hours. Your definition of productivity: the same lawyers answer more questions.
- *Build 1:* A bigger model? GPT-4.1 costs 5 times more. Without our checks it misses less; with them, both find everything.
- *Build 2:* So the small model stays. A new model, prompt or playbook goes live only if all 8 test questions still pass – our rule, run by hand today.

### `ms-checks` · Microsoft at the edges (planned), our own checks in the middle (built).

- *Build 0:* On Azure, Microsoft services would do what they do best: reading scans, a second opinion on hidden instructions, and identity. Planned, not built.
- *Build 1:* I measured Prompt Shields once. It only says yes or no, without the position. So our own check stays. A hit would mean four eyes, never a block.

### `sharepoint` · Saved in SharePoint – how does it reach the register?

- *Build 0:* Target design: a lawyer saves a contract in SharePoint.
- *Build 1:* Microsoft Graph is Microsoft's interface to SharePoint. We would subscribe to the library. Then Graph would say only: something changed. The delta query would then ask: what changed?
- *Build 2:* Then the pipeline reads it – the fixed steps you saw with M18. Its model calls took about 7 seconds.
- *Build 3:* Messages usually come within a minute, at most six hours. Lost ones? A scheduled run would check again.

### `graph-details` · SharePoint in detail: subscription, delta query, safety net.

- *Build 0:* The target design, from Microsoft's documentation. Not built yet. The subscription would only wake us up. The delta query would tell us what changed. We would renew the subscription within 30 days.
- *Build 1:* And we would ask only for read rights on the one library.
