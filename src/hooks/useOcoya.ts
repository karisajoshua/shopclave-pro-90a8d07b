import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type OcoyaMethod = "GET" | "POST" | "PATCH" | "DELETE";

export interface OcoyaProxyRequest {
  method: OcoyaMethod;
  path: string;
  query?: Record<string, string | number | undefined>;
  body?: unknown;
}

export interface OcoyaProxyResponse<T = unknown> {
  status: number;
  ok: boolean;
  data: T;
}

export async function callOcoya<T = unknown>(req: OcoyaProxyRequest): Promise<OcoyaProxyResponse<T>> {
  const { data, error } = await supabase.functions.invoke<OcoyaProxyResponse<T>>("ocoya-proxy", {
    body: req,
  });
  if (error) throw new Error(error.message || "Ocoya proxy error");
  if (!data) throw new Error("Empty Ocoya response");
  if (!data.ok) {
    const msg = (data.data as any)?.message || `Ocoya error (${data.status})`;
    throw new Error(msg);
  }
  return data;
}

// ---------- Types ----------
export interface OcoyaUser {
  id: string;
  name?: string;
  email?: string;
}

export interface OcoyaWorkspace {
  id: string;
  name: string;
}

export interface OcoyaSocialProfile {
  id: string;
  network?: string;
  handle?: string;
  name?: string;
  avatarUrl?: string;
  [k: string]: unknown;
}

export interface OcoyaPost {
  id: string;
  caption?: string;
  mediaUrls?: string[];
  socialProfileIds?: string[];
  scheduledAt?: string;
  status?: string;
  publishedAt?: string;
  [k: string]: unknown;
}

// ---------- Hooks ----------
export function useOcoyaMe() {
  return useQuery({
    queryKey: ["ocoya", "me"],
    queryFn: async () => {
      const res = await callOcoya<OcoyaUser>({ method: "GET", path: "/me" });
      return res.data;
    },
    retry: false,
  });
}

export function useOcoyaWorkspaces() {
  return useQuery({
    queryKey: ["ocoya", "workspaces"],
    queryFn: async () => {
      const res = await callOcoya<OcoyaWorkspace[] | { data: OcoyaWorkspace[] }>({
        method: "GET",
        path: "/workspaces",
      });
      const d = res.data as any;
      return (Array.isArray(d) ? d : d?.data ?? []) as OcoyaWorkspace[];
    },
    retry: false,
  });
}

export function useOcoyaSocialProfiles(workspaceId?: string) {
  return useQuery({
    queryKey: ["ocoya", "social-profiles", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const res = await callOcoya<OcoyaSocialProfile[] | { data: OcoyaSocialProfile[] }>({
        method: "GET",
        path: "/social-profiles",
        query: { workspaceId: workspaceId! },
      });
      const d = res.data as any;
      return (Array.isArray(d) ? d : d?.data ?? []) as OcoyaSocialProfile[];
    },
    retry: false,
  });
}

export function useOcoyaPosts(workspaceId?: string) {
  return useQuery({
    queryKey: ["ocoya", "posts", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const res = await callOcoya<OcoyaPost[] | { data: OcoyaPost[] }>({
        method: "GET",
        path: "/post",
        query: { workspaceId: workspaceId! },
      });
      const d = res.data as any;
      return (Array.isArray(d) ? d : d?.data ?? []) as OcoyaPost[];
    },
    retry: false,
  });
}

export function useCreateOcoyaPost(workspaceId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      caption?: string;
      mediaUrls?: string[];
      socialProfileIds: string[];
      scheduledAt?: string;
    }) => {
      const res = await callOcoya<{ id: string }>({
        method: "POST",
        path: "/post",
        query: { workspaceId: workspaceId! },
        body,
      });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ocoya", "posts", workspaceId] });
    },
  });
}

export function useUpdateOcoyaPost(workspaceId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Record<string, unknown> }) => {
      const res = await callOcoya({
        method: "PATCH",
        path: `/post/${id}`,
        query: { workspaceId: workspaceId! },
        body,
      });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ocoya", "posts", workspaceId] });
    },
  });
}

export function useDeleteOcoyaPost(workspaceId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await callOcoya({
        method: "DELETE",
        path: `/post/${id}`,
        query: { workspaceId: workspaceId! },
      });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ocoya", "posts", workspaceId] });
    },
  });
}
