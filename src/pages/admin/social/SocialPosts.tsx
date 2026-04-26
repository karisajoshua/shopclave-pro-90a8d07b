import ComposeForm from "@/components/admin/social/ComposeForm";
import ScheduledList from "@/components/admin/social/ScheduledList";
import { useSocialContext } from "./useSocialContext";

const SocialPosts = () => {
  const { workspaceId } = useSocialContext();
  return (
    <div className="space-y-6">
      <ComposeForm workspaceId={workspaceId} />
      <ScheduledList workspaceId={workspaceId} />
    </div>
  );
};

export default SocialPosts;
