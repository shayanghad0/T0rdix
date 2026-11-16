import { useCallback, useEffect, useState } from "react";
import { api } from "@/services/api";
import type { Project, ProjectOverview } from "@/types";

/** Workspace projects accessible to the signed-in user. */
export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const data = await api.get<Project[]>("/projects");
      setProjects(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { projects, loading, error, refresh };
}

/** Aggregated dashboard payload for one project. */
export function useProjectOverview(projectId: string | null) {
  const [overview, setOverview] = useState<ProjectOverview | null>(null);
  const [loading, setLoading] = useState(Boolean(projectId));

  const refresh = useCallback(async () => {
    if (!projectId) {
      setOverview(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await api.get<ProjectOverview>(`/projects/${projectId}/overview`);
      setOverview(data);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { overview, loading, refresh };
}
