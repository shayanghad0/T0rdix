import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/layouts/app-shell";
import { AuthPage } from "@/pages/auth-page";
import { DashboardPage } from "@/pages/dashboard";
import { ProjectsPage } from "@/pages/projects";
import { ProjectDetailPage } from "@/pages/project-detail";
import { SecretsPage } from "@/pages/secrets";
import { ApisPage } from "@/pages/apis";
import { MockPage } from "@/pages/mock";
import { TestingPage } from "@/pages/testing";
import { FakeDataPage } from "@/pages/fake-data";
import { LogsPage } from "@/pages/logs";
import { SettingsPage } from "@/pages/settings";
import { useTheme } from "@/hooks/use-theme";

export function App() {
  // Mounts the theme listener (dark class on <html>) once.
  useTheme();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/secrets" element={<SecretsPage />} />
          <Route path="/apis" element={<ApisPage />} />
          <Route path="/mock" element={<MockPage />} />
          <Route path="/testing" element={<TestingPage />} />
          <Route path="/fake-data" element={<FakeDataPage />} />
          <Route path="/logs" element={<LogsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
