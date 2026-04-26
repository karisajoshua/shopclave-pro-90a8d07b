import AccountsList from "@/components/admin/social/AccountsList";
import { useSocialContext } from "./useSocialContext";

const SocialIntegrations = () => {
  const { workspaceId } = useSocialContext();
  return <AccountsList workspaceId={workspaceId} />;
};

export default SocialIntegrations;
