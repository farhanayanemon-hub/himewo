import { Route, Switch, Redirect } from "wouter";
import { useAuth } from "./lib/auth";
import { Layout } from "./components/Layout";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Users } from "./pages/Users";
import { Content } from "./pages/Content";
import { Reports } from "./pages/Reports";
import { Communities } from "./pages/Communities";
import { Verification } from "./pages/Verification";
import { Announcements } from "./pages/Announcements";
import { Roles } from "./pages/Roles";
import { Settings } from "./pages/Settings";
import { Audit } from "./pages/Audit";
import { Spinner } from "./components/ui";
import type { Permission } from "./lib/types";

function Guard({
  perm,
  children,
}: {
  perm: Permission;
  children: React.ReactNode;
}) {
  const { can } = useAuth();
  if (!can(perm)) return <Redirect to="/" />;
  return <>{children}</>;
}

export default function App() {
  const { status } = useAuth();

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (status !== "ready") {
    return <Login />;
  }

  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/users">
          <Guard perm="users.view">
            <Users />
          </Guard>
        </Route>
        <Route path="/content">
          <Guard perm="content.view">
            <Content />
          </Guard>
        </Route>
        <Route path="/reports">
          <Guard perm="reports.view">
            <Reports />
          </Guard>
        </Route>
        <Route path="/communities">
          <Guard perm="communities.view">
            <Communities />
          </Guard>
        </Route>
        <Route path="/verification">
          <Guard perm="verification.view">
            <Verification />
          </Guard>
        </Route>
        <Route path="/announcements">
          <Guard perm="announcements.view">
            <Announcements />
          </Guard>
        </Route>
        <Route path="/roles">
          <Guard perm="roles.view">
            <Roles />
          </Guard>
        </Route>
        <Route path="/settings">
          <Guard perm="settings.view">
            <Settings />
          </Guard>
        </Route>
        <Route path="/audit">
          <Guard perm="audit.view">
            <Audit />
          </Guard>
        </Route>
        <Route>
          <Redirect to="/" />
        </Route>
      </Switch>
    </Layout>
  );
}
