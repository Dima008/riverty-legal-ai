// App shell: one website with two layers. The talk - a page of cards, a present mode and a
// presenter view, each full screen on its own (decision 76) - and "Legal Workbench", the tool;
// the talk ends in the tool. The address (hash route) says where you are, so every chapter and
// view can be opened directly. The reviewer switch stands in for the Entra ID sign-in
// (decision 54). The tool switches between English and German (decision 74); the presentation
// stays English. The tool's frame comes from the talk (decision 77): one near-black bar with the
// mint-to-cyan hairline and the contract-tile logo; the surfaces lawyers work on stay light.
// Only the tool layer watches the register for changes (live.tsx): the talk's pages poll nothing new.
import { Avatar, Dropdown, FluentProvider, Option, Tab, TabList } from "@fluentui/react-components";
import { ArrowLeft16Regular } from "@fluentui/react-icons";
import { useEffect, useState } from "react";
import { api, setCurrentUser } from "./api";
import { AuditLog } from "./AuditLog";
import { RegisterPulse } from "./components/RegisterPulse";
import { LangContext, translate, type Lang, type Params } from "./i18n";
import { RegisterLiveProvider } from "./live";
import { Register } from "./register/Register";
import { navigate, parseHash, TOOL_AREAS, useHashRoute } from "./routing";
import { Page } from "./deck/Page";
import { Present } from "./deck/Present";
import { Presenter } from "./deck/Presenter";
import { SLIDES } from "./deck/slides";
import { darkTheme } from "./theme";
import { SwitchUserContext, UserContext, USERS } from "./user";
import { Workbench } from "./workbench/Workbench";

/** The talk's contract-tile motif: nine contracts, one of them with a gap (red). */
function TileLogo() {
  return (
    <svg className="logo" viewBox="0 0 24 24" aria-hidden>
      {[0, 1, 2].flatMap((row) =>
        [0, 1, 2].map((col) => (
          <rect key={`${row}${col}`} x={3 + col * 6.5} y={3 + row * 6.5} width="5" height="5" rx="1.2"
                fill={row === 1 && col === 2 ? "#ff6f7d" : "#44e2b0"} opacity={row === 1 && col === 2 ? 1 : 0.92 - row * 0.12} />
        )),
      )}
    </svg>
  );
}

function isWorkbench(hash: string): boolean {
  const r = parseHash(hash);
  return r.layer === "tool" && r.page === "workbench";
}

// The chosen language is remembered in the browser. localStorage can be blocked (private mode,
// strict settings): then the switch still works, it is just forgotten on reload.
function savedLang(): Lang {
  try {
    return localStorage.getItem("lang") === "de" ? "de" : "en";
  } catch {
    return "en";
  }
}

export function App() {
  const route = useHashRoute();
  const [user, setUser] = useState("reviewer_a");
  const [lang, setLang] = useState<Lang>(savedLang);
  // undefined while the first health check runs, null when the API cannot be reached
  const [version, setVersion] = useState<string | null | undefined>(undefined);
  // "Talk" in the header returns to where the tool was opened from: the card, and the view - the
  // scrolling page or full-screen present mode (act 6 opens the tool from present mode)
  const [backToTalk, setBackToTalk] = useState(`#/story/${SLIDES[0].id}`);
  // The Workbench tab returns to the last Workbench address of the session - the open answer and
  // contract are in it (?run=…&doc=…) - so a look at the register or the audit log loses nothing.
  // #/tool/workbench itself (the talk's link, the step "Ask") is still a fresh step 1.
  const [lastWorkbench, setLastWorkbench] = useState(() => (isWorkbench(location.hash) ? location.hash : "#/tool/workbench"));
  const area = TOOL_AREAS.includes(route.page) ? route.page : "workbench";
  // German only in the tool; the presentation is always English
  const shown: Lang = route.layer === "tool" ? lang : "en";
  const t = (text: string, params?: Params) => translate(shown, text, params);

  useEffect(() => {
    api.health().then((h) => setVersion(h.prompt_version)).catch(() => setVersion(null));
  }, []);
  useEffect(() => {
    // the address the talk had when the tool opened. oldURL also holds the card the page view
    // scrolled to: it updates the address with replaceState, which fires no hashchange of its own.
    const remember = (e: HashChangeEvent) => {
      const from = new URL(e.oldURL).hash;
      const was = parseHash(from);
      // an empty address ("", "#/story") keeps the first card
      if (parseHash(location.hash).layer === "tool" && was.layer !== "tool" && was.page) setBackToTalk(from);
      // the Workbench address we are on, or the one we just left (oldURL: also after a replaceState)
      if (isWorkbench(location.hash)) setLastWorkbench(location.hash);
      else if (isWorkbench(from)) setLastWorkbench(from);
    };
    window.addEventListener("hashchange", remember);
    return () => window.removeEventListener("hashchange", remember);
  }, []);

  const switchUser = (u: string) => {
    setCurrentUser(u);
    setUser(u);
  };
  const switchLang = (l: Lang) => {
    setLang(l);
    try {
      localStorage.setItem("lang", l);
    } catch {
      // not stored: the page works without it
    }
  };

  // the talk has its own full-screen stage, without the tool's header
  if (route.layer === "story") return <Page slideId={route.page} />;
  if (route.layer === "present") return <Present slideId={route.page || SLIDES[0].id} step={route.step} />;
  if (route.layer === "presenter") return <Presenter slideId={route.page || SLIDES[0].id} step={route.step} />;

  // step 3 (Decide) fills the window: the footer's sentence is on the finding card there
  const deciding = area === "workbench" && route.params.has("doc");
  const openTab = (value: string) => {
    if (value === area) return;          // the tab of this screen: stay where you are
    navigate(value === "workbench" ? lastWorkbench : `/tool/${value}`);
  };

  return (
    <LangContext.Provider value={shown}>
    <UserContext.Provider value={user}>
      <SwitchUserContext.Provider value={switchUser}>
      <RegisterLiveProvider>
      <div className="app" lang={shown}>
        <FluentProvider theme={darkTheme} className="topbar-provider">
          <header className="topbar">
            <a className="to-talk" href={backToTalk} title={t("Back to the talk")}>
              <ArrowLeft16Regular /> {t("Talk")}
            </a>
            <div className="brand" title={version ? `Legal Workbench · ${t("Register {version}", { version })}` : "Legal Workbench"}>
              <TileLogo />
              <span className="brand-name">Legal Workbench</span>
            </div>
            <nav aria-label="Legal Workbench" className="nav">
              <TabList selectedValue={area} onTabSelect={(_, d) => openTab(String(d.value))}>
                <Tab value="workbench">{t("Workbench")}</Tab>
                <Tab value="register">{t("Contract register")}</Tab>
                <Tab value="audit">{t("Audit log")}</Tab>
              </TabList>
            </nav>
            {/* how many contracts, and what is new; "API offline" when the register cannot be reached */}
            <RegisterPulse />
            <div className="spacer" />
            <span className="env-pill warn">{t("Synthetic test data")}</span>
            <div className="lang-switch" role="group" aria-label={t("Language")}>
              {(["en", "de"] as const).map((l) => (
                <button key={l} type="button" aria-pressed={lang === l} onClick={() => switchLang(l)}>
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="user">
              <Avatar name={USERS[user]} size={28} color="colorful" />
              <Dropdown
                aria-label={t("Signed in as")}
                appearance="filled-darker"
                size="small"
                value={USERS[user]}
                selectedOptions={[user]}
                onOptionSelect={(_, d) => switchUser(d.optionValue ?? user)}
              >
                {Object.entries(USERS).map(([id, name]) => (
                  <Option key={id} value={id}>{name}</Option>
                ))}
              </Dropdown>
            </div>
          </header>
        </FluentProvider>
        <main className="content">
          {area === "workbench" && <Workbench />}
          {area === "register" && <Register />}
          {area === "audit" && <AuditLog />}
        </main>
        {!deciding && (
          <footer className="footer">
            {t("Observations, not legal advice – lawyers decide · Synthetic and public test data (CUAD, CC BY 4.0) · Every model call is logged with its cost")}
            {version && <> · {t("Register {version}", { version })}</>}
          </footer>
        )}
      </div>
      </RegisterLiveProvider>
      </SwitchUserContext.Provider>
    </UserContext.Provider>
    </LangContext.Provider>
  );
}
