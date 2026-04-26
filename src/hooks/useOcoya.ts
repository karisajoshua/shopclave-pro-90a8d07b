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
export interface OcoyaUser { id: string; name?: string; email?: string }
export interface OcoyaWorkspace { id: string; name: string }
export interface OcoyaSocialProfile {
  id: string; network?: string; handle?: string; name?: string; avatarUrl?: string; [k: string]: unknown;
}
export interface OcoyaPost {
  id: string; caption?: string; mediaUrls?: string[]; socialProfileIds?: string[];
  scheduledAt?: string; status?: string; publishedAt?: string; [k: string]: unknown;
}
export interface OcoyaTemplate {
  id: string; name?: string; thumbnailUrl?: string; width?: number; height?: number; [k: string]: unknown;
}
export interface OcoyaDesign {
  id: string; name?: string; thumbnailUrl?: string; updatedAt?: string; [k: string]: unknown;
}
export interface OcoyaAsset {
  id: string; url?: string; thumbnailUrl?: string; mimeType?: string; name?: string; [k: string]: unknown;
}
export interface OcoyaAutomation {
  id: string; name?: string; status?: string; description?: string; [k: string]: unknown;
}
export interface OcoyaInboxItem {
  id: string; type?: string; from?: string; text?: string; receivedAt?: string;
  network?: string; isRead?: boolean; [k: string]: unknown;
}
export interface OcoyaAnalyticsOverview {
  followers?: number; impressions?: number; engagement?: number; postsCount?: number; [k: string]: unknown;
}

// Helper to unwrap Ocoya { data: [...] } | [...] responses
function unwrap<T>(d: any): T[] {
  return (Array.isArray(d) ? d : d?.data ?? []) as T[];
}

// ---------- Identity / workspace ----------
export function useOcoyaMe() {
  return useQuery({
    queryKey: ["ocoya", "me"],
    queryFn: async () => (await callOcoya<OcoyaUser>({ method: "GET", path: "/me" })).data,
    retry: false,
  });
}

export function useOcoyaWorkspaces() {
  return useQuery({
    queryKey: ["ocoya", "workspaces"],
    queryFn: async () => {
      const res = await callOcoya<any>({ method: "GET", path: "/workspaces" });
      return unwrap<OcoyaWorkspace>(res.data);
    },
    retry: false,
  });
}

// ---------- Social profiles ----------
export function useOcoyaSocialProfiles(workspaceId?: string) {
  return useQuery({
    queryKey: ["ocoya", "social-profiles", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const res = await callOcoya<any>({
        method: "GET", path: "/social-profiles", query: { workspaceId: workspaceId! },
      });
      return unwrap<OcoyaSocialProfile>(res.data);
    },
    retry: false,
  });
}

// ---------- Posts ----------
export function useOcoyaPosts(workspaceId?: string, filters?: Record<string, string | number | undefined>) {
  return useQuery({
    queryKey: ["ocoya", "posts", workspaceId, filters],
    enabled: !!workspaceId,
    queryFn: async () => {
      const res = await callOcoya<any>({
        method: "GET", path: "/post", query: { workspaceId: workspaceId!, ...(filters ?? {}) },
      });
      return unwrap<OcoyaPost>(res.data);
    },
    retry: false,
  });
}

export function useCreateOcoyaPost(workspaceId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      caption?: string; mediaUrls?: string[]; socialProfileIds: string[]; scheduledAt?: string;
    }) => {
      const res = await callOcoya<{ id: string }>({
        method: "POST", path: "/post", query: { workspaceId: workspaceId! }, body,
      });
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ocoya", "posts", workspaceId] }),
  });
}

export function useUpdateOcoyaPost(workspaceId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Record<string, unknown> }) => {
      const res = await callOcoya({
        method: "PATCH", path: `/post/${id}`, query: { workspaceId: workspaceId! }, body,
      });
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ocoya", "posts", workspaceId] }),
  });
}

export function useDeleteOcoyaPost(workspaceId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await callOcoya({
        method: "DELETE", path: `/post/${id}`, query: { workspaceId: workspaceId! },
      });
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ocoya", "posts", workspaceId] }),
  });
}

export function usePublishOcoyaPost(workspaceId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await callOcoya({
        method: "POST", path: `/post/${id}/publish`, query: { workspaceId: workspaceId! },
      });
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ocoya", "posts", workspaceId] }),
  });
}

export function useDuplicateOcoyaPost(workspaceId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await callOcoya({
        method: "POST", path: `/post/${id}/duplicate`, query: { workspaceId: workspaceId! },
      });
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ocoya", "posts", workspaceId] }),
  });
}

// ---------- Templates / designs ----------
export function useOcoyaTemplates(workspaceId?: string) {
  return useQuery({
    queryKey: ["ocoya", "templates", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const res = await callOcoya<any>({
        method: "GET", path: "/templates", query: { workspaceId: workspaceId! },
      });
      return unwrap<OcoyaTemplate>(res.data);
    },
    retry: false,
  });
}

export function useOcoyaDesigns(workspaceId?: string) {
  return useQuery({
    queryKey: ["ocoya", "designs", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const res = await callOcoya<any>({
        method: "GET", path: "/designs", query: { workspaceId: workspaceId! },
      });
      return unwrap<OcoyaDesign>(res.data);
    },
    retry: false,
  });
}

// ---------- Assets ----------
export function useOcoyaAssets(workspaceId?: string) {
  return useQuery({
    queryKey: ["ocoya", "assets", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const res = await callOcoya<any>({
        method: "GET", path: "/assets", query: { workspaceId: workspaceId! },
      });
      return unwrap<OcoyaAsset>(res.data);
    },
    retry: false,
  });
}

// ---------- Automation ----------
export function useOcoyaAutomations(workspaceId?: string) {
  return useQuery({
    queryKey: ["ocoya", "automation", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const res = await callOcoya<any>({
        method: "GET", path: "/automation", query: { workspaceId: workspaceId! },
      });
      return unwrap<OcoyaAutomation>(res.data);
    },
    retry: false,
  });
}

export function useStartAutomation(workspaceId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await callOcoya({
        method: "POST", path: `/automation/${id}/start`, query: { workspaceId: workspaceId! },
      });
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ocoya", "automation", workspaceId] }),
  });
}

export function usePauseAutomation(workspaceId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await callOcoya({
        method: "POST", path: `/automation/${id}/pause`, query: { workspaceId: workspaceId! },
      });
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ocoya", "automation", workspaceId] }),
  });
}

// ---------- AI agents ----------
export function useGenerateCaption() {
  return useMutation({
    mutationFn: async (body: { prompt: string; tone?: string; network?: string; workspaceId?: string }) => {
      const res = await callOcoya<{ caption?: string; text?: string }>({
        method: "POST", path: "/ai/caption", body,
      });
      const d: any = res.data;
      return (d?.caption || d?.text || "") as string;
    },
  });
}

export function useGenerateHashtags() {
  return useMutation({
    mutationFn: async (body: { topic: string; count?: number; workspaceId?: string }) => {
      const res = await callOcoya<{ hashtags?: string[] }>({
        method: "POST", path: "/ai/hashtags", body,
      });
      const d: any = res.data;
      return (d?.hashtags || d?.tags || []) as string[];
    },
  });
}

export function useGenerateAiImage() {
  return useMutation({
    mutationFn: async (body: { prompt: string; size?: string; workspaceId?: string }) => {
      const res = await callOcoya<{ url?: string; imageUrl?: string }>({
        method: "POST", path: "/ai/image", body,
      });
      const d: any = res.data;
      return (d?.url || d?.imageUrl || "") as string;
    },
  });
}

// ---------- Inbox ----------
export function useOcoyaInbox(workspaceId?: string) {
  return useQuery({
    queryKey: ["ocoya", "inbox", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const res = await callOcoya<any>({
        method: "GET", path: "/inbox", query: { workspaceId: workspaceId! },
      });
      return unwrap<OcoyaInboxItem>(res.data);
    },
    retry: false,
  });
}

export function useReplyInbox(workspaceId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, text }: { id: string; text: string }) => {
      const res = await callOcoya({
        method: "POST", path: `/inbox/${id}/reply`,
        query: { workspaceId: workspaceId! }, body: { text },
      });
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ocoya", "inbox", workspaceId] }),
  });
}

// ---------- Analytics ----------
export function useOcoyaAnalytics(workspaceId?: string) {
  return useQuery({
    queryKey: ["ocoya", "analytics", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const res = await callOcoya<OcoyaAnalyticsOverview>({
        method: "GET", path: "/analytics/overview", query: { workspaceId: workspaceId! },
      });
      return res.data;
    },
    retry: false,
  });
}
