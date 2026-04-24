import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Props {
  perm: string;
  children: ReactNode;
}

const RequirePermission = ({ perm, children }: Props) => {
  const { hasPermission, loading, userRoles } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!userRoles.includes("admin")) return; // AdminLayout already handles this
    if (!hasPermission(perm)) {
      toast.error("You don't have permission to access that page");
      navigate("/admin", { replace: true });
    }
  }, [hasPermission, perm, loading, userRoles, navigate]);

  if (loading) return null;
  if (!userRoles.includes("admin")) return null;
  if (!hasPermission(perm)) return null;

  return <>{children}</>;
};

export default RequirePermission;
