// The picture of an answer (decision 95, spec 1.2): one lane per colour - red, orange, green, excluded - with
// the count as the lane's head and every contract in scope as a tile. A lane head filters the list beside
// it; a second click returns to "To decide". Every tile opens the contract in step 4. A lane with no
// contract stays, small, with "0": nothing is silent, and the pattern never moves.
import type { Run } from "../api";
import { LightIcon } from "../components/Badges";
import { useT } from "../i18n";
import { exclusionReason } from "../labels";
import { itemWord, lanes, passes, type Filter, type Item } from "./answerRows";
import "./workbench.css";

interface Props {
  run: Run;
  items: Item[];
  filter: Filter;
  onFilter: (f: Filter) => void;
  onOpen: (docId: string) => void;       // step 4 for this contract
  onFile: (docId: string) => void;       // an older answer's contract: its read-only file
}

export function Lanes({ run, items, filter, onFilter, onOpen, onFile }: Props) {
  const t = useT();
  // a colour chosen in the list: the other tiles keep their colour and get a dashed border - never faded
  const dashed = (i: Item) => filter !== "todo" && filter !== "all" && !passes(i, filter);
  return (
    <div className="lanes" aria-label={t("Every contract in scope")}>
      {lanes(run, items, t).map((lane) => {
        const colour = lane.lane === "red" || lane.lane === "orange" || lane.lane === "green" ? lane.lane : null;
        const on = !!colour && filter === colour;
        return (
          <section key={lane.key} className={`lane l-${lane.lane}${lane.items.length ? "" : " empty"}`} aria-label={`${lane.word}: ${lane.items.length}`}>
            <button type="button" className="lane-head" aria-pressed={on} disabled={!colour}
                    onClick={() => colour && onFilter(on ? "todo" : colour)}
                    title={colour ? t("Show only these in the list") : undefined}>
              <LightIcon light={lane.lane === "older" ? "excluded" : lane.lane} />
              <span className="lane-n">{lane.items.length}</span>
              <span className="lane-words">
                <span className="lane-word">{lane.word}</span>
                <span className="lane-sub">{lane.items.length ? lane.sub : t("none")}</span>
              </span>
            </button>
            {lane.items.length > 0 && (
              <ul className="tiles">
                {lane.items.map((i) => {
                  const word = itemWord(i, t);
                  const label = `${i.id} · ${word}`;
                  const older = i.kind === "older";
                  return (
                    <li key={i.id}>
                      <button type="button" className={`tile t-${i.lane}${dashed(i) ? " off" : ""}`} aria-label={label} title={label}
                              onClick={() => (older ? onFile(i.id) : onOpen(i.id))}>
                        {i.id}
                        {!older && <LightIcon light={i.lane === "older" ? "excluded" : i.lane} />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {lane.lane === "excluded" && (
              // every exclusion with its reason, in one line under the tiles
              <p className="tile-reasons">
                {lane.items.map((i, n) => <span key={i.id}>{n > 0 && " · "}<b>{i.id}</b> {exclusionReason(i.reason ?? "", t)}</span>)}
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}
