export const STAFF_ROLES = ["owner", "admin", "order_manager", "delivery_manager"] as const;
export const ROLES = ["customer", ...STAFF_ROLES] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  "dashboard:read",
  "orders:read",
  "orders:update",
  "orders:cancel",
  "payments:manage",
  "delivery:manage",
  "products:manage",
  "categories:manage",
  "customers:read",
  "analytics:read",
  "content:manage",
  "reviews:manage",
  "settings:manage",
  "staff:manage",
  "audit:read",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ALL: readonly Permission[] = PERMISSIONS;

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  customer: [],
  owner: ALL,
  admin: ALL.filter((p) => p !== "staff:manage"),
  order_manager: [
    "dashboard:read",
    "orders:read",
    "orders:update",
    "orders:cancel",
    "payments:manage",
    "delivery:manage",
    "customers:read",
    "products:manage",
    "categories:manage",
    "reviews:manage",
  ],
  delivery_manager: ["dashboard:read", "orders:read", "delivery:manage"],
};

export const ROLE_LABELS: Record<Role, string> = {
  customer: "Customer",
  owner: "Owner",
  admin: "Administrator",
  order_manager: "Order manager",
  delivery_manager: "Delivery manager",
};

export function isStaffRole(role: string): role is StaffRole {
  return (STAFF_ROLES as readonly string[]).includes(role);
}

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
