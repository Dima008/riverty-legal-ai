// The register as it changes, for the tool (R2, D11): a new contract can arrive while the tool is
// open. One provider asks the API every 3 seconds whether the register changed - GET /changes,
// about 150 bytes, the same idea as a Graph delta link - and reloads the matrix only when it did.
// Only the tool layer mounts it, so the talk never polls; a hidden browser tab does not poll either.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, ApiError, type Matrix, type MatrixRow, type RegisterEvent } from "./api";

export const NEW_HOURS = 24;          // "New" = arrived in the last 24 hours, by the server's clock (D12)
const POLL_MS = 3000;
const RETRY_MS = 10000;               // after an error: "API offline", then try again
const KEEP_EVENTS = 200;

export interface Live {
  version: number | null;             // the register version (MAX(audit_log.id)); null until known, or with an older API
  now: string | null;                 // the server's clock at the last answer
  matrix: Matrix | null;              // the register as it is now (GET /matrix)
  newDocs: MatrixRow[];               // arrived within NEW_HOURS
  reading: MatrixRow[];               // the model is reading them
  failed: MatrixRow[];                // reading failed - a person reads them
  events: RegisterEvent[];            // pipeline events since the tool opened (the audit log loads older ones itself)
  offline: boolean;
}

type Polled = Pick<Live, "version" | "now" | "matrix" | "events" | "offline">;
const START: Polled = { version: null, now: null, matrix: null, events: [], offline: false };

function derive(p: Polled): Live {
  const rows = p.matrix?.rows ?? [];
  const since = p.now ? Date.parse(p.now) - NEW_HOURS * 3_600_000 : Infinity;
  return {
    ...p,
    newDocs: rows.filter((r) => r.ingested_at != null && Date.parse(r.ingested_at) >= since),
    reading: rows.filter((r) => r.stage === "reading"),
    failed: rows.filter((r) => r.stage === "failed"),
  };
}

// outside the provider: empty (matrix null), and nothing polls
const LiveContext = createContext<Live>(derive(START));

export function RegisterLiveProvider({ children }: { children: ReactNode }) {
  const [polled, setPolled] = useState<Polled>(START);
  useEffect(() => {
    let stopped = false;
    let timer = 0;
    let version: number | null = null;        // the last register version seen: the cursor for the next poll
    const later = (ms: number) => {
      if (!stopped) timer = window.setTimeout(poll, ms);
    };
    async function poll() {
      // the first load always runs; after that, a hidden tab asks nothing
      if (version !== null && document.visibilityState !== "visible") return later(POLL_MS);
      try {
        const c = await api.changes(version ?? undefined);
        const changed = version === null || c.version > version || c.reset;
        const matrix = changed ? await api.matrix() : null;
        if (stopped) return;
        version = c.version;
        setPolled((p) => ({
          version: c.version,
          now: c.now,
          matrix: matrix ?? p.matrix,
          events: c.reset ? c.events : [...p.events, ...c.events].slice(-KEEP_EVENTS),   // reset: the register was rebuilt
          offline: false,
        }));
        later(POLL_MS);
      } catch (e) {
        if (stopped) return;
        if (e instanceof ApiError && e.status === 404) {
          // an older API without /changes: load the register once, as the screens did before - no polling
          api.matrix()
            .then((matrix) => !stopped && setPolled((p) => ({ ...p, matrix, offline: false })))
            .catch(() => !stopped && setPolled((p) => ({ ...p, offline: true })));
          return;
        }
        setPolled((p) => ({ ...p, offline: true }));
        later(RETRY_MS);
      }
    }
    poll();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, []);
  const live = useMemo(() => derive(polled), [polled]);
  return <LiveContext.Provider value={live}>{children}</LiveContext.Provider>;
}

/** The register as it changes: version, server clock, matrix, new / reading / failed contracts, events. */
export const useRegisterLive = () => useContext(LiveContext);
