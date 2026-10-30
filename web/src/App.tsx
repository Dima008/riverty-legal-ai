// App shell: one website with two layers. "Case study" is the presentation (chapter by chapter),
// "Legal Workbench" is the tool; the story ends in the tool. The address (hash route) says where
// you are, so every chapter and view can be opened directly. The reviewer switch stands in for
// the Entra ID sign-in (decision 54).
import { Avatar, Dropdown, FluentProvider, Option, Tab, TabList } from "@fluentui/react-components";
import { BookOpen20Regular, Scales20Regular, Scales24Regular } from "@fluentui/react-icons";
import { useEffect, useState } from "react";
import { api, setCurrentUser } from "./api";
import { AuditLog } from "./AuditLog";
import { Register } from "./register/Register";
import { navigate, TOOL_AREAS, useHashRoute } from "./routing";
import { CHAPTERS } from "./story/chapters";
import { Story } from "./story/Story";
import { darkTheme } from "./theme";
import { UserContext, USERS } from "./user";
import { Workbench } from "./workbench/Workbench";

export function App() {
  const route = useHashRoute();
  const [user, setUser] = useState("reviewer_a");
  const [version, setVersion] = useState<string | null>(null);
  // Switching layers returns to where you left off: the chapter you were on, the view you used.
  const [lastChapter, setLastChapter] = useState(CHAPTERS[0].id);
  const [lastArea, setLastArea] = useState("workbench");
  const area = TOOL_AREAS.includes(route.page) ? route.page : "workbench";

  useEffect(() => {
    api.health().then((h) => setVersion(h.prompt_version)).catch(() => setVersion(null));
  }, []);
  useEffect(() => {
    if (route.layer === "story" && route.page) setLastChapter(route.page);
    if (route.layer === "tool") setLastArea(area);
  }, [route, area]);

  const switchUser = (u: string) => {
    setCurrentUser(u);
    setUser(u);
  };

  return (
    <UserContext.Provider value={user}>
      <div className="app">
        <FluentProvider theme={darkTheme} className="topbar-provider">
          <header className="topbar">
            <div className="brand">
              <div className="logo" aria-hidden>
                <Scales24Regular />
              </div>
              <div>
                <div className="brand-name">Legal Workbench</div>
                <div className="brand-sub">
                  {route.layer === "story" ? "Case study · Software Engineer (RAG)" : "Contract register · Legal"}
                </div>
              </div>
            </div>
            <TabList
              selectedValue={route.layer}
              onTabSelect={(_, d) => navigate(d.value === "story" ? `/story/${lastChapter}` : `/tool/${lastArea}`)}
              className="nav"
            >
              <Tab value="story" icon={<BookOpen20Regular />}>Case study</Tab>
              <Tab value="tool" icon={<Scales20Regular />}>Legal Workbench</Tab>
            </TabList>
            <div className="spacer" />
            <span className="env-pill warn">Synthetic test data</span>
            <span className={`env-pill ${version ? "ok" : "off"}`}>
              <span className="dot" /> {version ? `Register ${version}` : "API offline"}
            </span>
            {route.layer === "tool" && (
              <div className="user">
                <Avatar name={USERS[user]} size={32} color="colorful" />
                <Dropdown
                  aria-label="Signed in as"
                  appearance="filled-darker"
                  value={USERS[user]}
                  selectedOptions={[user]}
                  onOptionSelect={(_, d) => switchUser(d.optionValue ?? user)}
                >
                  {Object.entries(USERS).map(([id, name]) => (
                    <Option key={id} value={id}>{name}</Option>
                  ))}
                </Dropdown>
              </div>
            )}
          </header>
        </FluentProvider>
        {route.layer === "tool" && (
          <nav className="subnav" aria-label="Legal Workbench">
            <TabList selectedValue={area} onTabSelect={(_, d) => navigate(`/tool/${d.value}`)}>
              <Tab value="workbench">Workbench</Tab>
              <Tab value="register">Contract register</Tab>
              <Tab value="audit">Audit log</Tab>
            </TabList>
          </nav>
        )}
        <main className={route.layer === "story" ? "content story-content" : "content"}>
          {route.layer === "story" && <Story chapterId={route.page} />}
          {route.layer === "tool" && area === "workbench" && <Workbench />}
          {route.layer === "tool" && area === "register" && <Register />}
          {route.layer === "tool" && area === "audit" && <AuditLog />}
        </main>
        <footer className="footer">
          Observations, not legal advice – lawyers decide · Synthetic and public test data (CUAD, CC BY 4.0) · Every model call is logged with its cost
        </footer>
      </div>
    </UserContext.Provider>
  );
}
