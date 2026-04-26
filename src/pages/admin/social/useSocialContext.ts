import { useOutletContext } from "react-router-dom";

export interface SocialContext {
  workspaceId?: string;
}

export function useSocialContext(): SocialContext {
  return useOutletContext<SocialContext>() ?? {};
}
