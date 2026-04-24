-- Team roles table
CREATE TABLE public.team_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  permissions TEXT[] NOT NULL DEFAULT '{}',
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Team members table
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  team_role_id UUID NOT NULL REFERENCES public.team_roles(id) ON DELETE RESTRICT,
  assigned_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.team_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- updated_at trigger
CREATE TRIGGER update_team_roles_updated_at
BEFORE UPDATE ON public.team_roles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- has_permission helper. If the admin has no team_member row, treat as super admin.
CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _perm TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_admin BOOLEAN;
  _has_membership BOOLEAN;
  _granted BOOLEAN;
BEGIN
  IF _user_id IS NULL THEN RETURN false; END IF;

  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin'::app_role) INTO _is_admin;
  IF NOT _is_admin THEN RETURN false; END IF;

  SELECT EXISTS(SELECT 1 FROM public.team_members WHERE user_id = _user_id) INTO _has_membership;
  IF NOT _has_membership THEN RETURN true; END IF; -- super admin fallback

  SELECT EXISTS (
    SELECT 1
    FROM public.team_members tm
    JOIN public.team_roles tr ON tr.id = tm.team_role_id
    WHERE tm.user_id = _user_id
      AND (_perm = ANY(tr.permissions) OR '*' = ANY(tr.permissions))
  ) INTO _granted;

  RETURN _granted;
END;
$$;

-- RLS: any admin can read team_roles (needed to resolve own permissions)
CREATE POLICY "Admins can read team roles"
ON public.team_roles FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Team managers can manage team roles"
ON public.team_roles FOR ALL TO authenticated
USING (has_permission(auth.uid(), 'team.manage'))
WITH CHECK (has_permission(auth.uid(), 'team.manage'));

-- RLS: any admin can read team_members
CREATE POLICY "Admins can read team members"
ON public.team_members FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Team managers can manage team members"
ON public.team_members FOR ALL TO authenticated
USING (has_permission(auth.uid(), 'team.manage'))
WITH CHECK (has_permission(auth.uid(), 'team.manage'));

-- Seed system roles
INSERT INTO public.team_roles (name, description, permissions, is_system) VALUES
('Super Admin', 'Full access to all admin features', ARRAY['*'], true),
('Orders Manager', 'Handles orders, messages and disputes',
  ARRAY['dashboard.view','orders.view','orders.update','messages.view','evidence.view','notifications.send'], true),
('Catalog Manager', 'Manages products, categories, media and bulk imports',
  ARRAY['dashboard.view','products.view','products.update','categories.manage','bulk_import.use','media.manage'], true),
('Finance Manager', 'Manages withdrawals and subscriptions',
  ARRAY['dashboard.view','withdrawals.view','withdrawals.update','subscriptions.view','subscriptions.update','analytics.view'], true),
('Support Agent', 'Read-only access plus messaging support',
  ARRAY['dashboard.view','orders.view','messages.view','notifications.send','vendors.view','users.view'], true),
('Vendor Manager', 'Manages vendor accounts and approvals',
  ARRAY['dashboard.view','vendors.view','vendors.update','users.view','subscriptions.view'], true);