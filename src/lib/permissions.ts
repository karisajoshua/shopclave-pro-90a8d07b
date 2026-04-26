// Permission keys used to gate admin UI sections.
// These are UI-level gates; data-level access is still enforced by Supabase RLS
// (which keys off the `admin` role). Team roles scope what staff members see/do
// inside the admin panel.

export const PERMISSIONS = {
  DASHBOARD_VIEW: "dashboard.view",

  ORDERS_VIEW: "orders.view",
  ORDERS_UPDATE: "orders.update",

  PRODUCTS_VIEW: "products.view",
  PRODUCTS_UPDATE: "products.update",
  CATEGORIES_MANAGE: "categories.manage",
  BULK_IMPORT_USE: "bulk_import.use",
  MEDIA_MANAGE: "media.manage",

  VENDORS_VIEW: "vendors.view",
  VENDORS_UPDATE: "vendors.update",

  USERS_VIEW: "users.view",
  USERS_ASSIGN_ROLES: "users.assign_roles",

  WITHDRAWALS_VIEW: "withdrawals.view",
  WITHDRAWALS_UPDATE: "withdrawals.update",

  SUBSCRIPTIONS_VIEW: "subscriptions.view",
  SUBSCRIPTIONS_UPDATE: "subscriptions.update",

  ANALYTICS_VIEW: "analytics.view",

  MESSAGES_VIEW: "messages.view",
  EVIDENCE_VIEW: "evidence.view",
  NOTIFICATIONS_SEND: "notifications.send",

  SETTINGS_MANAGE: "settings.manage",

  TEAM_MANAGE: "team.manage",

  MARKETING_MANAGE: "marketing.manage",

  RESOURCES_MANAGE: "resources.manage",

  SOCIAL_MEDIA_MANAGE: "social_media.manage",

  DOCUMENTATION_VIEW: "documentation.view",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// Grouped for the role editor UI
export const PERMISSION_GROUPS: { label: string; perms: { key: PermissionKey; label: string }[] }[] = [
  {
    label: "Overview",
    perms: [{ key: PERMISSIONS.DASHBOARD_VIEW, label: "View dashboard" }],
  },
  {
    label: "Operations",
    perms: [
      { key: PERMISSIONS.ORDERS_VIEW, label: "View orders" },
      { key: PERMISSIONS.ORDERS_UPDATE, label: "Update orders" },
      { key: PERMISSIONS.MESSAGES_VIEW, label: "View messages" },
      { key: PERMISSIONS.EVIDENCE_VIEW, label: "View evidence vault" },
      { key: PERMISSIONS.NOTIFICATIONS_SEND, label: "Send notifications" },
    ],
  },
  {
    label: "Catalog",
    perms: [
      { key: PERMISSIONS.PRODUCTS_VIEW, label: "View products" },
      { key: PERMISSIONS.PRODUCTS_UPDATE, label: "Update products" },
      { key: PERMISSIONS.CATEGORIES_MANAGE, label: "Manage categories" },
      { key: PERMISSIONS.BULK_IMPORT_USE, label: "Use bulk import" },
      { key: PERMISSIONS.MEDIA_MANAGE, label: "Manage media" },
    ],
  },
  {
    label: "Finance",
    perms: [
      { key: PERMISSIONS.WITHDRAWALS_VIEW, label: "View withdrawals" },
      { key: PERMISSIONS.WITHDRAWALS_UPDATE, label: "Update withdrawals" },
      { key: PERMISSIONS.SUBSCRIPTIONS_VIEW, label: "View subscriptions" },
      { key: PERMISSIONS.SUBSCRIPTIONS_UPDATE, label: "Update subscriptions" },
    ],
  },
  {
    label: "Insights",
    perms: [{ key: PERMISSIONS.ANALYTICS_VIEW, label: "View analytics" }],
  },
  {
    label: "Content",
    perms: [
      { key: PERMISSIONS.MARKETING_MANAGE, label: "Manage marketing (banners & promotions)" },
      { key: PERMISSIONS.RESOURCES_MANAGE, label: "Manage vendor resource center" },
      { key: PERMISSIONS.SOCIAL_MEDIA_MANAGE, label: "Manage social media (Ocoya)" },
    ],
  },
  {
    label: "System",
    perms: [
      { key: PERMISSIONS.VENDORS_VIEW, label: "View vendors" },
      { key: PERMISSIONS.VENDORS_UPDATE, label: "Update vendors" },
      { key: PERMISSIONS.USERS_VIEW, label: "View users" },
      { key: PERMISSIONS.USERS_ASSIGN_ROLES, label: "Assign user roles" },
      { key: PERMISSIONS.SETTINGS_MANAGE, label: "Manage settings" },
      { key: PERMISSIONS.TEAM_MANAGE, label: "Manage team & permissions" },
      { key: PERMISSIONS.DOCUMENTATION_VIEW, label: "View documentation" },
    ],
  },
];

export const ALL_PERMISSIONS: PermissionKey[] = PERMISSION_GROUPS.flatMap((g) => g.perms.map((p) => p.key));

// Helper used everywhere
export const hasPerm = (perms: string[] | null | undefined, key: string): boolean => {
  if (!perms) return false;
  return perms.includes("*") || perms.includes(key);
};
