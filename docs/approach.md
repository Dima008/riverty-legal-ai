# Approach – the talk, part by part

The text behind the presentation website (`web/src/deck`, decision 76): the order of the talk, what
each card says on screen, the sentence of Riverty's task it picks up, and what is said per build.
Since decision 90 the talk follows the outline of the task itself: (1) the problem, (2) my approach,
(3) the technical solution, (4) infrastructure, (5) adoption, (6) the basic implementation, live – the
finale, so every outline bullet is said before the part whose timing varies most. Task quotes are on
screen only on the six part openers and the card `task`; content cards pick up their sentence in the
speaker notes. Deep dives after the close are opened only on a question (decision 78).

The source of truth is the deck: `web/src/deck/slides.ts` (order, parts, checkpoints, skip list) and
`web/src/deck/slides/*.tsx` (cards and notes). Every number below is rendered from the deck, which reads
it from a data file – the register snapshot `deck-data.json`, `eval/results/`, the test-set files or the
code itself (`?raw`); none is typed by hand. Dev guards in the deck check each claim against its source.
This file is a snapshot of the rendered notes: regenerate it when the notes change. The earlier chapter
text of the first website (decision 68) is in the git history of this file.

**Main track: 33 cards, 1193 s = 19:53** – Riverty asks for 15–20 minutes. Deep dives: 14 cards.

| Part | Starts | Cards | Seconds |
| --- | --- | --- | --- |
| 1 · The problem | 0:00 | 6 | 155 |
| 2 · My approach | 2:35 | 7 | 262 |
| 3 · The technical solution | 6:57 | 11 | 421 |
| 4 · Infrastructure | 13:58 | 3 | 99 |
| 5 · Adoption | 15:37 | 2 | 60 |
| 6 · The basic implementation, live | 16:37 | 4 | 196 |

**When late** (all before the demo): skip `results` from build 2 → `what-if` from build 3 → `sharepoint` from build 3. Never skip `what-we-use`, `run-it`, `live-add` or `live`.

**Open:** one sentence Dima writes about himself for the title card ("we want to get to know you, not
only your slides"). It is not invented here; until then the title note is the question and the agenda.

---

## 1 · The problem (0:00, 155 s)

### `title` · 25 s · 1 build · from 0:00

**On screen:** Which contracts are missing something?

**Picks up:** “present your solution in 15–20 minutes” · “we want to get to know you, not only your slides”

**Says:** Hello, I'm Dima. Riverty's lawyers keep asking one kind of question: which contracts are missing something? In under twenty minutes I show how I'd answer it – with a working prototype. I follow your outline: from the problem to adoption, then it runs live.

### `part-1` · 4 s · 1 build · from 0:25

**Opener: The problem** – on screen, word for word from the task:

> One of these challenges is making our legal team more efficient.

**Says:** First, the problem: what does Legal actually ask?

### `task` · 40 s · 3 builds · from 0:29

**On screen:** I read Riverty's task sentence by sentence.

**Picks up:** “contracts that do not contain a certain text passage or contracts in which a company name needs to be updated” · “they have to open the documents, search for the relevant content, and verify the results themselves”

**Says:**

- *Build 0:* I started with Riverty's own words, sentence by sentence. Two sentences are Legal's questions: contracts without a certain passage, and contracts with a former company name. Both are about every contract.
- *Build 1:* Today it is done by hand: open, search, verify. And some contracts are old handwritten scans, only images.
- *Build 2:* Two sentences set the rules. The storage may only receive a copy. And Riverty wants to understand what happens. So every finding needs evidence.

### `today` · 26 s · 3 builds · from 1:09

**On screen:** Today: open every contract, search, note it down.

**Picks up:** “over 100 vendors on the inbound side and over 1,000 merchants on the outbound side” · “semi-manual work”

**Says:**

- *Build 0:* What does one question cost today? Riverty has over 1,100 contracts. Over 100 vendors, over 1,000 merchants.
- *Build 1:* I assume 5 minutes per contract: open, search, note. We'd measure it with Legal first.
- *Build 2:* That's about 90 hours for one question. And again for the next one.

### `hard` · 38 s · 4 builds · from 1:35

**On screen:** Three things make it hard.

**Picks up:** “Some of them are scans of really old, handwritten contracts that exist only as JPEG files” · “in PDF format”

**Says:**

- *Build 0:* Why not just search for a word?
- *Build 1:* First, scans. Most are PDFs with text – we read that directly. Some are only images, like this one. OCR – text recognition – reads them. Later, a handwritten one, live.
- *Build 2:* Second, amendments. A contract from 2020 names Arvato; its 2022 amendment says: read as Riverty. The answer needs both.
- *Build 3:* Third, wording. All three cap liability. The second never says liability, the third is German. Keywords miss them. Remember the second one.

### `insight` · 22 s · 2 builds · from 2:13

**On screen:** To prove that something is missing, you have to read everything.

**Picks up:** “it is purely repetitive work that nobody enjoys doing”

**Says:**

- *Build 0:* Finding is easy: you stop at the first hit. To prove something is not there, you must read every contract, every page.
- *Build 1:* And today that reading starts again for every new question. That is the lever: read everything once – and prove it.

---

## 2 · My approach (2:35, 262 s)

### `part-2` · 4 s · 1 build · from 2:35

**Opener: My approach** – on screen, word for word from the task:

> A solution explaining how you would tackle the challenge

**Says:** How would I tackle it? Here's my roadmap.

### `how-i-worked` · 34 s · 4 builds · from 2:39

**On screen:** How I worked: from the problem to the platform.

**Picks up:** “how you approach real-world problems” · “As our future teammate, we encourage you to do the same.”

**Says:**

- *Build 0:* How I worked: you've seen the first steps – the pilot, our first question, and today's process. Rethinking comes next.
- *Build 1:* Design: code or AI per step, as little AI freedom as works, then the architecture.
- *Build 2:* Deliver: test it, run it on Azure, bring it to the lawyers.
- *Build 3:* You encourage AI – so did I: built with Claude Code, every AI commit marked in git. I can explain every line.

### `contracts` · 44 s · 4 builds · from 3:13

**On screen:** Riverty cannot share contracts – so I put together 47 with known answers.

**Picks up:** “we won't be able to share actual contracts or contract templates” · “These agreements cover both B2B and B2B2C business models”

**Says:**

- *Build 0:* To test any approach, I need known answers. Riverty can't share contracts, so I built a test set.
- *Build 1:* 20 merchant agreements I wrote, M01 to M20, with traps. They are B2B – with consumer terms in the merchant's checkout, B2B2C. M18: the scan you saw. M05 and its amendment M05-A: the former name. M02: a cap in other words.
- *Build 2:* 6 data processing agreements: the vendor side.
- *Build 3:* 20 real public contracts from CUAD, labelled by experts. For 8 test questions, I wrote the answers first.

### `rag` · 50 s · 5 builds · from 3:57

**On screen:** The usual approach: a chatbot over your documents.

**Picks up:** “search for the relevant content”

**Says:**

- *Build 0:* Most document assistants work like this. You ask, for example, about liability in the Nordlicht contract, M01.
- *Build 1:* A search compares your question with every passage – a short piece of a contract – and returns the most similar ones. It compares meaning: every passage becomes numbers – embeddings. Near means similar.
- *Build 2:* This is called top-k. Here k is 5: the 5 best passages, nothing else.
- *Build 3:* The model – the AI that writes – reads only these 5 and answers. For M01 this works: the search finds clause 7.2.
- *Build 4:* This is called RAG: retrieval-augmented generation. The model only sees what the search returns.

### `rag-fails` · 62 s · 5 builds · from 4:47

**On screen:** It fails when the answer is what is not in the text.

**Picks up:** “contracts that do not contain a certain text passage”

**Says:**

- *Build 0:* Legal's question, our Q1: which merchant agreements lack a limitation of liability – a cap like the ones you saw? 19 contracts: M15 is a copy of M01 and counts once.
- *Build 1:* Now a keyword search over these 19: 'limitation of liability', top 10. The 10 best passages come from 8 contracts.
- *Build 2:* For the search, the other 11 'lack' it.
- *Build 3:* 7 of the 11 are false alarms: they cap liability in other words or in German, like M02. And M14 is missed: no cap, but its hidden instruction for the AI mentions liability – so it ranks high.
- *Build 4:* A larger k does not help: 11 contracts never match the keywords. Embeddings rank too. Top-k ranks what is there. It cannot prove what is missing.

### `agent` · 43 s · 4 builds · from 5:49

**On screen:** And an AI agent that reads everything itself?

**Picks up:** “they often fail due to the sheer size and complexity of the environments they have to operate in”

**Says:**

- *Build 0:* Second idea: an agent. A model plans a step, calls a tool – open a file, search, take notes – and repeats.
- *Build 1:* The weak point: it decides when it is done. Nobody checks that it opened every file.
- *Build 2:* A 2026 study, OverclaimBench: agents told to review every file skipped files in 68 percent of runs – and 4 in 5 reports hid it.
- *Build 3:* Riverty's own task says agents fail on the size of the environment. A thousand contracts is exactly that.

### `needs` · 25 s · 4 builds · from 6:32

**On screen:** So we need three guarantees.

**Picks up:** “verify the results themselves”

**Says:**

- *Build 0:* So we need three guarantees.
- *Build 1:* One: every contract is read. We prove it, not just claim it.
- *Build 2:* Two: every finding shows the passage on the page. A lawyer can check it in seconds.
- *Build 3:* Three: a lawyer decides.

---

## 3 · The technical solution (6:57, 421 s)

### `part-3` · 6 s · 1 build · from 6:57

**Opener: The technical solution** – on screen, word for word from the task:

> An overall technical solution you would present to our team and how it could be implemented

**Says:** Design: how do we deliver the three guarantees – and does it work?

### `tomorrow` · 30 s · 2 builds · from 7:03

**On screen:** Tomorrow: the system reads, the lawyer decides.

**Picks up:** “They approached us to ask whether AI could help with this task” · “Most documents reside on SharePoint”

**Says:**

- *Build 0:* Today a lawyer opens, searches, reads and notes – every contract, every question.
- *Build 1:* Tomorrow the system reads each contract once, when it is saved in SharePoint – into one table, the register. The lawyer asks; the system shows a plan – which contracts, which check – the lawyer confirms it, checks the evidence and approves the archive copy. The machine reads. The lawyer decides.

### `follow-m18` · 56 s · 6 builds · from 7:33

**On screen:** Follow one contract: M18, a scan from 2018.

**Picks up:** “A basic pipeline showing how you would analyze the documents and make them accessible”

**Says:**

- *Build 0:* Follow M18, the scan from the start. It arrives in a folder – later, SharePoint.
- *Build 1:* OCR reads 2 pages, 93 percent average confidence. Below 70, a person looks.
- *Build 2:* We cut at the headings: 12 sections – the passages the search uses.
- *Build 3:* One call to a small model, gpt-4.1-mini, fills a fixed form: status and quote per clause.
- *Build 4:* The checks – next card. 5 clauses: 1 found, 4 not found – 2 of them are required only in data processing agreements.
- *Build 5:* Register: no liability cap, no data processing agreement, a former name. Fixed steps in code; the AI sees one contract at a time – a small world. Guarantee one: 'every contract was read' is a fact.

### `checks` · 38 s · 3 builds · from 8:29

**On screen:** The model is checked: M08 said “found”, the register says “unclear”.

**Picks up:** “ensuring they comply with our corporate guidelines”

**Says:**

- *Build 0:* But a model can be wrong. M08: the model said: limitation of liability, found. Its quote is clause 6.2.
- *Build 1:* Guarantee two: the quote is really there. But it lacks the words Legal's playbook expects – the playbook is Legal's guidelines, as data. And a second model call says: this is about data protection.
- *Build 2:* So the register says unclear, 0.35, and a lawyer looks. Code before and after the model: the guardrail sandwich.

### `injection` · 31 s · 3 builds · from 9:07

**On screen:** A hidden instruction in M14 – caught, and sent to two people.

**Picks up:** “represent the company's best interests”

**Says:**

- *Build 0:* Second danger: M14's hidden note tells the AI to report a cap – prompt injection. A counterparty's text must not decide for Riverty.
- *Build 1:* Our pattern check finds it. The register still says: no cap. Two people look – four eyes.
- *Build 2:* Honestly: M14 and 3 rewordings – our pattern check found only the original, 1 of 4. Microsoft's Prompt Shields: 4 of 4 – our next step.

### `register` · 52 s · 4 builds · from 9:38

**On screen:** Every contract in one table – a question becomes a lookup.

**Picks up:** “organizing and reviewing contracts, comparing them”

**Says:**

- *Build 0:* Every contract, read like M18, in one table: the register. Here the merchant agreements. Green found, red not found, amber unclear.
- *Build 1:* Q1 is one column: 5 contracts, no model call. Red and amber count together – one too many beats one missed. Keyword search: 7 false alarms, M14 missed.
- *Build 2:* Coverage: 20 in scope, 19 checked, M15 excluded – a copy of M01. Nothing drops out silently. Comparing is built too: M15 next to M01, the same text – API only so far.
- *Build 3:* Legal's second question, Q2: which contracts still name Arvato or AfterPay – Riverty's former names? 5. Not M05: its amendment M05-A renamed it to Riverty.

### `human` · 40 s · 3 builds · from 10:30

**On screen:** Observations, not verdicts: a lawyer decides.

**Picks up:** “there is a contract storage solution with a RESTful API” · “You may solely use it to store an additional copy of a contract in a legally compliant manner.”

**Says:**

- *Build 0:* Guarantee three: a lawyer decides; the system only observes. Triage sorts each finding: sure ones get a spot check; unclear, or below 0.8 confidence, one lawyer; risky ones two – four eyes.
- *Build 1:* The lawyer sees the passage on the page first, then decides with a reason – stored, and reused next time.
- *Build 2:* Riverty's storage has a REST API. Our server sends the file only after approval – before, it refuses. Stored once, by its fingerprint, write-once, with a receipt. Here a stand-in.

### `what-we-use` · 45 s · 3 builds · from 11:10

**On screen:** What we use: two prompts – one reads, one checks. The rest is code.

**Picks up:** “we encourage any form of AI usage, as long as we understand what is happening” · “Python with FastAPI and multiple libraries” · “Frontend written in React and TypeScript”

**Says:**

- *Build 0:* What do we use? Two prompts on one small model. The reader gets eight rules, Legal's playbook and one whole contract. It fills the form. The checker sees only a definition and a quote. No model writes an answer.
- *Build 1:* Embeddings need no prompt. They serve only open questions. Never to say a clause is missing.
- *Build 2:* Everything else is code we can test: OCR, every check, triage, the lookups, the gate. Python and FastAPI. The tool is React and TypeScript. Planned: a model that drafts the plan, and Prompt Shields.

### `results` · 39 s · 3 builds · from 11:55

**On screen:** 8 of 8 questions complete – and how sure we can be.

**Picks up:** “feel free to use any publicly available B2B or B2B2C contract” · “while learning and improving ourselves”

**Says:**

- *Build 0:* Deliver: does it work – how do I know? 7 runs from scratch: complete, no false alarm. Real contracts, labelled by experts: we agree on 19 of 20. They showed 3 errors my traps missed – all fixed.
- *Build 1:* Sure? 5 of 5 could still mean 54 percent. 1 of 1 says almost nothing.
- *Build 2:* All 28 answers together: at least 89 percent. But I tuned on these 16 contracts. Planned: a sealed test set – new contracts I never tune on.

### `what-if` · 46 s · 4 builds · from 12:34

**On screen:** Switch a safeguard off – live.

**Picks up:** “as long as we understand what is happening”

**Says:**

- *Build 0:* Remember M08: the model said found, the checks said unclear. What if the checks were off? I replay the stored answers on a copy – no model call, no cost.
- *Build 1:* The second model call, off. Q1 still finds all 5. The checks overlap – watch the next switch.
- *Build 2:* Now the words check off too. M08 and M10 slip through: 3 of 5 – and no lawyer would look at them.
- *Build 3:* Both checks back on. Now only the pattern check off: M14 no longer goes to two people.

### `cost` · 38 s · 3 builds · from 13:20

**On screen:** A few cents to read everything – and the small model was enough on our tests.

**Picks up:** “create more with the same number of engineers”

**Says:**

- *Build 0:* And the cost? Reading all 47 once: 12 cents. Then a question is a lookup – not 90 hours. Your definition of productivity: the same lawyers answer more questions.
- *Build 1:* A bigger model? GPT-4.1 costs 5 times more. Without our checks it misses less; with them, both find everything.
- *Build 2:* So the small model stays. A new model, prompt or playbook goes live only if all 8 test questions still pass – our rule, run by hand today.

---

## 4 · Infrastructure (13:58, 99 s)

### `part-4` · 4 s · 1 build · from 13:58

**Opener: Infrastructure** – on screen, word for word from the task:

> A basic explanation of the infrastructure you would leverage

**Says:** Where would it run at Riverty?

### `azure` · 60 s · 3 builds · from 14:02

**On screen:** On Azure: buy the building blocks, build what is Riverty's.

**Picks up:** “Riverty follows two guiding principles when it comes to technology choices.” · “Azure Foundry / Google Gemini” · “Containerized environments” · “Terraform for infrastructure provisioning” · “LangChain and LangGraph for agents”

**Says:**

- *Build 0:* Riverty chooses in two steps: best of breed, then compared with Microsoft – I measured Prompt Shields and a bigger model. Each part has its Azure service: Content Understanding reads scans, Azure OpenAI in the EU data zone, Entra ID for approvals. It would run in Container Apps, set up with Terraform – planned: no Dockerfile or Terraform yet.
- *Build 1:* We buy the building blocks. We build what is Riverty's: playbook, evidence, storage boundary.
- *Build 2:* Gemini? The model sits behind one small adapter file; any model must first pass the 8 test questions. LangChain or LangGraph? Not needed today – code fixes the order. Target: Agent Framework, LangGraph as fallback. The value is the architecture: a small, structured world for the AI.

### `sharepoint` · 35 s · 4 builds · from 15:02

**On screen:** Saved in SharePoint – how does it reach the register?

**Picks up:** “Most documents reside on SharePoint and are in PDF format.”

**Says:**

- *Build 0:* Target design: a lawyer saves a contract in SharePoint.
- *Build 1:* We would subscribe to the library. Microsoft Graph – Microsoft's interface to SharePoint – says only: something changed. The delta query then asks: what changed?
- *Build 2:* Then the pipeline reads it – the fixed steps you saw with M18. Its model calls took about 7 seconds.
- *Build 3:* Messages usually come within a minute, at most six hours. Lost ones? A scheduled run would check again.

---

## 5 · Adoption (15:37, 60 s)

### `part-5` · 4 s · 1 build · from 15:37

**Opener: Adoption** – on screen, word for word from the task:

> A concept for helping our colleagues adopt the solution and ensure they get the most value out of it

**Says:** How do lawyers get the most value?

### `run-it` · 56 s · 3 builds · from 15:41

**On screen:** Adoption: one team, one question – measured against today.

**Picks up:** “Our legal colleagues currently leverage a variety of tools”

**Says:**

- *Build 0:* Legal already has a variety of tools – this one must earn its place. Adoption starts with a pilot: one team, one question. First we measure today, with 2 or 3 lawyers. Then the question runs next to the old way, for a few weeks. Training: read the evidence on the page – don't trust it blindly. Then the next question, the next team.
- *Build 1:* Legal owns it: the playbook is their guidelines, as data. Corrections go into the test set.
- *Build 2:* Value, measured: time per question against today, and how often lawyers overrule – the prototype counts that already. A review is stored and reused. And lawyers work in German or English.

---

## 6 · The basic implementation, live (16:37, 196 s)

### `part-6` · 6 s · 1 build · from 16:37

**Opener: The basic implementation, live** – on screen, word for word from the task:

> Basic implementation demonstrating the foundation of the concept

> Anything else you feel is relevant to understanding your approach to solving the challenge

**Says:** Your second list: pipeline, front-end, the whole workflow – let me show you.

### `live-add` · 45 s · 2 builds · from 16:43

**On screen:** A handwritten contract arrives – watch what is found.

**Picks up:** “Anything you feel is necessary to demonstrate the end-to-end workflow”

**Says:**

- *Build 0:* Now live. Riverty has handwritten contracts, only as JPEG. I made one: H01, dated 2009 – rendered to look like a phone photo. I copy it into the folder – our stand-in for SharePoint. Watch the number. The watcher looks every 5 seconds. Then OCR reads the image, one model call, the checks – like M18.
- *Build 1:* 48. Handwriting, hard to read – a person checks it. Not found: limitation of liability, data processing agreement. Consumer terms: unclear – a person looks. Former name: cannot be ruled out on this scan – a person reads it.

### `live` · 115 s · 1 build · from 17:28

**On screen:** The Legal Workbench, live.

**Picks up:** “A basic front-end demonstrating how the solution can be used”

**Says:** Now the tool for Legal, live – React and TypeScript, like these slides. It has seen the new contract too: H01, new, a poor scan. One: I ask Q1 – which merchant agreements lack a limitation of liability? Two: the plan – this check, on every merchant agreement. Nothing runs before I confirm it. Three: the answer, with coverage – a tile for every merchant agreement, H01 too; M15 is excluded as a copy, with the reason. Not found: M03, M14, M18. Unclear: M08, M10. And H01, the handwritten one: not found – but a poor scan, so a person checks the page. Four: M08 – the passage, highlighted on the page. The checks overruled the model. Five: M14 needs four eyes. Reviewer A approves; I switch to B, who approves too. Six: only now the archive copy – and only once. Then back to the talk.

### `close` · 30 s · 1 build · from 19:23

**On screen:** 100 % traceable instead of 100 % accurate.

**Picks up:** “start a meaningful conversation during the interview” · “while learning and improving ourselves”

**Says:** What I learned: no model is always right. So every contract is read, every answer traced to a page, and a lawyer decides. Not built yet: the Azure platform, a model that plans, a reader for handwriting. Two questions: I assumed a missed contract hurts more than a false alarm – right for Legal? And who would pilot it? Thank you.

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

### `test-set` · A test set built to break the system.

- *Build 0:* You met the 47. In my 27, I hid traps – and wrote the answers first.
- *Build 1:* One: can it read? Scans, German, a cap split across two pages.
- *Build 2:* Two: does it understand? Caps in other words. Look-alike clauses without a cap. A hidden instruction.
- *Build 3:* Three: is the collection in order? An old name fixed by an amendment, a copy, foreign law.
- *Build 4:* Real contracts, labelled by experts: on the cap, we agree on 19 of 20. C03 is a question for Legal. They showed 3 errors my traps missed – all fixed.

### `embedding-map` · Embeddings: every passage becomes numbers, near means similar.

- *Build 0:* How does a search know what is similar? With embeddings. Every passage becomes about 1,500 numbers. Here every dot is one of our 938 passages. Further right means closer in meaning to the question.
- *Build 1:* Top-k takes the dots on the far right: 4 CUAD passages, only 1 from a merchant agreement. So: does top-k answer Legal's question?

### `decoy` · Embeddings know the topic – not whether the clause is there.

- *Build 0:* These are real similarities to M01's liability section. M10's indemnification clause has no cap, but it scores 0.805.
- *Build 1:* M19's real cap, in German, scores only 0.746. Embeddings say what a text is about. Whether it is a cap, the model and the checks decide.

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

### `ms-checks` · Microsoft at the edges, our own checks in the middle.

- *Build 0:* Microsoft services do what they do best: reading scans, a second opinion on hidden instructions, and identity.
- *Build 1:* Prompt Shields only says yes or no, without the position. So our own check stays. A hit means four eyes, never a block.

### `graph-details` · SharePoint in detail: subscription, delta query, safety net.

- *Build 0:* The details from Microsoft's documentation. The subscription only wakes us up. The delta query tells us what changed. The subscription must be renewed within 30 days.
- *Build 1:* And we ask only for read rights on the one library.
