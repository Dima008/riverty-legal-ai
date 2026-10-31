// Chapter 7 - the architecture map as data. Every box has a role (the interface, which stays),
// its Azure service (target) and its local stand-in (prototype); the arrows connect roles, not
// technologies, so they are the same in every view. The component (../Architecture.tsx) only
// draws what is here. Source of the content: the table in docs/approach.md, chapter 7. Every
// adapter file named in a card exists in the repository.

/** The three views of the one map. */
export type Mode = "target" | "prototype" | "boundaries";

/** What kind of thing a box is; the colours are those of the other figures (story.css). */
export type BoxKind = "person" | "code" | "model" | "data" | "external" | "platform";

export const KIND_TEXT: Record<BoxKind, string> = {
  person: "people",
  code: "service or job",
  model: "model endpoint",
  data: "stored data",
  external: "Riverty system",
  platform: "cross-cutting service",
};

/** Rows of the map, top to bottom. Rows a, b1 + b2 and c become the zones of the boundary view. */
export type Row = "a" | "b1" | "b2" | "c";

/** The service card a box opens. */
export interface Card {
  target: string;       // the Azure service, in a sentence
  prototype: string;    // what runs today instead
  files: string[];      // where the stand-in lives in the repository (the adapter)
  production: string;   // what changes for production
  decisions: string;    // decision numbers, docs/context/decisions.md
}

export interface Box {
  id: string;
  role: string;                 // what the box does - the same in every view
  col: number;                  // 0-4, left to right in the pipeline's order
  row: Row;
  kind: BoxKind;
  target: [string, string];     // name and detail shown in the box: Azure
  prototype: [string, string];  // name and detail shown in the box: today
  card?: Card;                  // people have no service card
}

export interface Edge {
  from: string;
  to: string;
  label?: string[];          // boundary view: what may flow this way (one line per entry)
  side?: "left" | "right";   // where a vertical arrow carries its label
  gate?: boolean;            // the one action with an effect outside the system
}

export interface Zone {
  id: string;
  label: string;
  cols: [number, number];    // first and last column it spans
  rows: Row[];               // rows inside it, top to bottom
  labelCol?: number;         // column where the label starts (default: the first), to stay clear of arrows
}

export const BOXES: Box[] = [
  // ---- compile once: from the contract library to the register
  { id: "source", role: "Contract source", col: 0, row: "a", kind: "external",
    target: ["SharePoint", "via Microsoft Graph"], prototype: ["data/inbox", "watch folder"],
    card: {
      target: "The SharePoint library, read through Microsoft Graph: delta queries for new and changed files, webhooks to hear about them.",
      prototype: "A watch folder: python -m pipeline.run --watch picks up any PDF, JPEG or TXT dropped into data/inbox.",
      files: ["data/inbox", "pipeline/config.py", "pipeline/run.py"],
      production: "A Graph connector replaces the folder and carries each file's permissions into the index. The rest of the pipeline stays the same.",
      decisions: "35",
    } },
  { id: "ocr", role: "OCR", col: 0, row: "b1", kind: "code",
    target: ["Content Understanding", "+ multimodal fallback"], prototype: ["Tesseract", "deu + eng"],
    card: {
      target: "Azure Content Understanding for text, layout and page coordinates; a multimodal model as fallback for handwriting.",
      prototype: "Tesseract with German and English and a confidence per page. It refuses to start without the German language data instead of silently reading German as English.",
      files: ["pipeline/ingest.py"],
      production: "Handwritten JPEG scans go to the multimodal fallback. A poor page still caps the confidence and sends the contract to a person.",
      decisions: "10, 44",
    } },
  { id: "jobs", role: "Pipeline jobs", col: 1, row: "b1", kind: "code",
    target: ["Container Apps jobs", "+ Service Bus"], prototype: ["pipeline.run", "python -m, one process"],
    card: {
      target: "Azure Container Apps jobs, started from a Service Bus queue: one message per new or changed file.",
      prototype: "python -m pipeline.run, one process on the laptop. Idempotent: unchanged files (same hash) are skipped; extraction reruns only when the text or the prompt version changed.",
      files: ["pipeline/run.py"],
      production: "The same pipeline code in a container; the platform adds retries and scaling. Container Apps rather than AKS: a small team, little to operate.",
      decisions: "12",
    } },
  { id: "model", role: "Model", col: 1, row: "c", kind: "model",
    target: ["Foundry models", "EU data zone"], prototype: ["gpt-4.1-mini", "Global Standard"],
    card: {
      target: "Foundry models deployed in the EU data zone, from Riverty's enterprise quota.",
      prototype: "gpt-4.1-mini as Global Standard on Azure – acceptable only because every document is synthetic or public.",
      files: ["pipeline/llm.py", "pipeline/config.py"],
      production: "One configuration line behind the adapter, which also records tokens and cost of every call. A model change goes through the release gate (chapter 8).",
      decisions: "26, 34, 65",
    } },
  { id: "register", role: "Register", col: 2, row: "b1", kind: "data",
    target: ["PostgreSQL", "+ workflow schema"], prototype: ["Two SQLite files", "register · workbench"],
    card: {
      target: "Azure Database for PostgreSQL: the register, plus a separate workflow schema with restricted write access.",
      prototype: "var/register.sqlite (generated, can be rebuilt at any time) and var/workbench.sqlite (runs, reviews, audit).",
      files: ["pipeline/store.py", "api/workbench.py"],
      production: "The SQL of each step is ported to PostgreSQL. The two stay apart on purpose: rebuilding the register never touches what a reviewer saw and decided.",
      decisions: "36, 56",
    } },
  { id: "search", role: "Search index", col: 2, row: "b2", kind: "data",
    target: ["Azure AI Search", "hybrid + permissions"], prototype: ["FTS5 + vectors", "fused with RRF"],
    card: {
      target: "Azure AI Search as a hybrid index – keywords and vectors – with permission filters.",
      prototype: "SQLite full text (FTS5, BM25) and vectors, fused with Reciprocal Rank Fusion.",
      files: ["pipeline/index.py", "pipeline/search.py"],
      production: "SharePoint permissions become filters, so nobody finds a passage they may not read. Search finds passages; questions like Q1 stay register queries over every contract.",
      decisions: "11, 36",
    } },
  // ---- ask many times: from a question to an approved archive copy
  { id: "planner", role: "Planner", col: 3, row: "b1", kind: "code",
    target: ["Agent Framework", "tools as MCP servers"], prototype: ["Planner, no model", "fixed list of checks"],
    card: {
      target: "Microsoft Agent Framework; the register queries become MCP tools behind API Management, which sets budgets and token limits.",
      prototype: "A planner without a model: example questions and a fixed list of check types, each answered from the register.",
      files: ["pipeline/portfolio.py", "api/workflow.py"],
      production: "A model planner with function calling chooses only from the same fixed checks and asks back when unclear; the examples stay as fallback. LangGraph is the fallback framework and can call the same MCP tools.",
      decisions: "7, 55",
    } },
  { id: "api", role: "API", col: 4, row: "b1", kind: "code",
    target: ["FastAPI", "on Container Apps"], prototype: ["FastAPI", "uvicorn, on the laptop"],
    card: {
      target: "The same FastAPI service, in a container on Azure Container Apps.",
      prototype: "FastAPI on uvicorn, on the laptop: runs, coverage, triage, four-eyes review and the gated archive copy.",
      files: ["api/main.py"],
      production: "No code change for the hosting. The user comes from the Entra ID token instead of the X-User header.",
      decisions: "12 (hosting)",
    } },
  { id: "legal", role: "People", col: 4, row: "a", kind: "person",
    target: ["Legal team", "lawyers decide"], prototype: ["Legal team", "lawyers decide"] },
  { id: "storage", role: "Contract storage", col: 4, row: "c", kind: "external",
    target: ["Storage API", "Riverty's service"], prototype: ["Write-only mock", "same HTTP client"],
    card: {
      target: "Riverty's contract storage API – to be used solely for an additional, legally compliant copy.",
      prototype: "A write-only mock: one PUT per file, nothing to read, list or delete; idempotent by SHA-256; called over HTTP like the real service.",
      files: ["api/storage_client.py", "api/storage_mock.py"],
      production: "STORAGE_API_URL points at Riverty's service and the client sends a managed-identity token; the workbench code does not change. The gate stays on the server: no copy before approval.",
      decisions: "2, 57, 71",
    } },
  // ---- cross-cutting: used by every box, so they get no arrows
  { id: "identity", role: "Identity", col: 3, row: "a", kind: "platform",
    target: ["Entra ID", "sign-in, groups"], prototype: ["Reviewer switch", "simulated A / B"],
    card: {
      target: "Entra ID: a real sign-in, roles from Entra groups.",
      prototype: "A switch between two simulated reviewers, sent as the X-User header. It is not security; it shows the flow.",
      files: ["api/deps.py", "web/src/user.tsx"],
      production: "The API reads the person from the token, so four eyes means two different signed-in people.",
      decisions: "54",
    } },
  { id: "secrets", role: "Secrets", col: 0, row: "b2", kind: "platform",
    target: ["Key Vault", "+ managed identity"], prototype: [".env", "git-ignored"],
    card: {
      target: "Key Vault, reached with a managed identity – no keys in the configuration.",
      prototype: "A local .env file, git-ignored; a pre-commit hook refuses commits that contain keys or endpoints.",
      files: ["pipeline/config.py", ".env.example", ".githooks/pre-commit"],
      production: "Services authenticate with managed identities. The prototype's own budgeted key is renewed after the interview.",
      decisions: "28",
    } },
  { id: "telemetry", role: "Telemetry", col: 3, row: "b2", kind: "platform",
    target: ["Application Insights", "via OpenTelemetry"], prototype: ["llm_calls + audit", "GET /monitoring"],
    card: {
      target: "Application Insights, fed through OpenTelemetry, with alerts and a monthly review with Legal.",
      prototype: "Every model call in the llm_calls table (tokens, cost, latency), every human action in the audit trail; GET /monitoring reads both.",
      files: ["pipeline/llm.py", "pipeline/store.py", "api/quality.py"],
      production: "Traces and metrics go to Application Insights; the audit trail stays in the database next to the decisions it records.",
      decisions: "63",
    } },
];

// Every arrow points right or down - the pipeline's reading order. Labels appear in the
// boundary view only: they say which way data may flow across a boundary or into stored data.
export const EDGES: Edge[] = [
  { from: "source", to: "ocr", label: ["read", "permissions kept"], side: "right" },
  { from: "ocr", to: "jobs" },
  { from: "jobs", to: "model", label: ["call, no tools", "text marked as", "untrusted data"], side: "right" },
  { from: "jobs", to: "register", label: ["write"] },
  { from: "register", to: "search", label: ["index"], side: "right" },
  { from: "register", to: "planner", label: ["read"] },
  { from: "planner", to: "api" },
  { from: "legal", to: "api", label: ["ask, review,", "approve"], side: "left" },
  { from: "api", to: "storage", label: ["write only", "after approval", "once per file"], side: "left", gate: true },
];

export const ZONES: Zone[] = [
  { id: "m365", label: "Microsoft 365 tenant · Riverty", cols: [0, 4], rows: ["a"] },
  { id: "eu", label: "EU subscription · Azure", cols: [0, 4], rows: ["b1", "b2"], labelCol: 1 },
  { id: "model", label: "Model endpoint · EU data zone", cols: [0, 2], rows: ["c"] },
  { id: "storage", label: "Contract storage · Riverty", cols: [3, 4], rows: ["c"] },
];

/** The boundary rules under the map; the storage line is counted from EDGES, not typed. */
export const BOUNDARY_RULES: { text: string; refs: string }[] = [
  { text: "The tenant is read with the user's permissions, carried into the index as filters.", refs: "11" },
  { text: "Contract text is untrusted data; a quote from a suspicious passage never counts as evidence.", refs: "41" },
  { text: "An EU subscription; the model endpoint stays in the EU data zone.", refs: "26" },
  { text: "Today: one laptop, synthetic and public data only, the model as Global Standard.", refs: "34" },
];
