// App shell: dark brand header with navigation and the reviewer switch (stand-in for the Entra ID
// sign-in, decision 54), one content area, a footer with the ground rules.
import { Avatar, Dropdown, FluentProvider, Option, Tab, TabList } from "@fluentui/react-components";
import { Scales24Regular } from "@fluentui/react-icons";
import { useEffect, useState } from "react";
import { api, setCurrentUser } from "./api";
import { AuditLog } from "./AuditLog";
import { Register } from "./register/Register";
import { darkTheme } from "./theme";
import { UserContext, USERS } from "./user";
import { Workbench } from "./workbench/Workbench";

type Area = "workbench" | "register" | "audit";
const AREAS: Area[] = ["workbench", "register", "audit"];

export function App() {
  const fromHash = location.hash.slice(1) as Area;
  const [area, setArea] = useState<Area>(AREAS.includes(fromHash) ? fromHash : "workbench");
  const [user, setUser] = useState("reviewer_a");
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    api.health().then((h) => setVersion(h.prompt_version)).catch(() => setVersion(null));
  }, []);
  useEffect(() => {
    location.hash = area;
  }, [area]);

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
                <div className="brand-sub">Contract register · Legal</div>
              </div>
            </div>
            <TabList selectedValue={area} onTabSelect={(_, d) => setArea(d.value as Area)} className="nav">
              <Tab value="workbench">Workbench</Tab>
              <Tab value="register">Contract register</Tab>
              <Tab value="audit">Audit log</Tab>
            </TabList>
            <div className="spacer" />
            <span className="env-pill warn">Synthetic test data</span>
            <span className={`env-pill ${version ? "ok" : "off"}`}>
              <span className="dot" /> {version ? `Register ${version}` : "API offline"}
            </span>
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
          </header>
        </FluentProvider>
        <main className="content">
          {area === "workbench" && <Workbench />}
          {area === "register" && <Register />}
          {area === "audit" && <AuditLog />}
        </main>
        <footer className="footer">
          Observations, not legal advice – lawyers decide · Synthetic and public test data (CUAD, CC BY 4.0) · Every model call is logged with its cost
        </footer>
      </div>
    </UserContext.Provider>
  );
}
