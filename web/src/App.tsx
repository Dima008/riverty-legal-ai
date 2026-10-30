// One app, several areas (decision: one app with modes). The reviewer switch at the top stands in
// for the Entra ID sign-in (decision 54).
import { Badge, Caption1, Dropdown, Option, Tab, TabList, Text } from "@fluentui/react-components";
import { useEffect, useState } from "react";
import { api, setCurrentUser } from "./api";
import { AuditLog } from "./AuditLog";
import { UserContext, USERS } from "./user";
import { Workbench } from "./workbench/Workbench";

type Area = "workbench" | "audit";

export function App() {
  const [area, setArea] = useState<Area>((location.hash.slice(1) as Area) || "workbench");
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
        <header className="topbar">
          <div className="brand">
            <Text weight="semibold" size={500}>Legal Workbench</Text>
            <Caption1>Contract register · observations, not legal advice</Caption1>
          </div>
          <TabList selectedValue={area} onTabSelect={(_, d) => setArea(d.value as Area)}>
            <Tab value="workbench">Workbench</Tab>
            <Tab value="audit">Audit log</Tab>
          </TabList>
          <div className="spacer" />
          <Badge appearance="outline" color="warning">Synthetic test data</Badge>
          <Badge appearance="outline" color={version ? "success" : "danger"}>{version ? `register ${version}` : "API offline"}</Badge>
          <div className="user">
            <Caption1>Signed in as</Caption1>
            <Dropdown aria-label="Reviewer" value={USERS[user]} selectedOptions={[user]} onOptionSelect={(_, d) => switchUser(d.optionValue ?? user)}>
              {Object.entries(USERS).map(([id, name]) => (
                <Option key={id} value={id}>{name}</Option>
              ))}
            </Dropdown>
          </div>
        </header>
        <main className="content">{area === "workbench" ? <Workbench /> : <AuditLog />}</main>
      </div>
    </UserContext.Provider>
  );
}
