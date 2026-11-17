// Permission catalog and default system-role mapping (spec Section 3).
// Keys are checked server-side in every service function below — never only
// hidden in the UI.

export const PERMISSIONS = {
  ORG_MANAGE_USERS: "org.manageUsers",
  ORG_MANAGE_BILLING: "org.manageBilling",
  ORG_MANAGE_INTEGRATIONS: "org.manageIntegrations",
  WORKSPACE_CREATE: "workspace.create",
  WORKSPACE_MANAGE: "workspace.manage",
  BRAND_MANAGE: "brand.manage",
  CAMPAIGN_CREATE: "campaign.create",
  CAMPAIGN_MANAGE: "campaign.manage",
  CONTENT_CREATE: "content.create",
  CONTENT_PUBLISH: "content.publish",
  CONTENT_APPROVE: "content.approve",
  LEADS_MANAGE: "leads.manage",
  ANALYTICS_VIEW: "analytics.view",
  ADS_APPROVE_BUDGET: "ads.approveBudget",
  ADS_APPROVE_LAUNCH: "ads.approveLaunch",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const PERMISSION_CATALOG: { key: PermissionKey; description: string }[] = [
  { key: PERMISSIONS.ORG_MANAGE_USERS, description: "Manage organization members and roles" },
  { key: PERMISSIONS.ORG_MANAGE_BILLING, description: "Manage billing and usage" },
  { key: PERMISSIONS.ORG_MANAGE_INTEGRATIONS, description: "Connect/disconnect integrations" },
  { key: PERMISSIONS.WORKSPACE_CREATE, description: "Create workspaces" },
  { key: PERMISSIONS.WORKSPACE_MANAGE, description: "Manage workspace settings" },
  { key: PERMISSIONS.BRAND_MANAGE, description: "Create and edit brand profiles" },
  { key: PERMISSIONS.CAMPAIGN_CREATE, description: "Create campaigns" },
  { key: PERMISSIONS.CAMPAIGN_MANAGE, description: "Manage existing campaigns" },
  { key: PERMISSIONS.CONTENT_CREATE, description: "Generate and edit content" },
  { key: PERMISSIONS.CONTENT_PUBLISH, description: "Publish approved content" },
  { key: PERMISSIONS.CONTENT_APPROVE, description: "Approve or reject content and campaigns" },
  { key: PERMISSIONS.LEADS_MANAGE, description: "Manage leads and pipeline" },
  { key: PERMISSIONS.ANALYTICS_VIEW, description: "View performance and reports" },
  { key: PERMISSIONS.ADS_APPROVE_BUDGET, description: "Approve advertising budgets" },
  { key: PERMISSIONS.ADS_APPROVE_LAUNCH, description: "Approve launching a paid campaign" },
];

export const SYSTEM_ROLES = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MARKETING_MANAGER: "Marketing Manager",
  CONTENT_CREATOR: "Content Creator",
  ANALYST: "Analyst",
  APPROVER: "Approver",
} as const;

export type SystemRoleName = (typeof SYSTEM_ROLES)[keyof typeof SYSTEM_ROLES];

const ALL_PERMISSION_KEYS = PERMISSION_CATALOG.map((p) => p.key);

export const DEFAULT_ROLE_PERMISSIONS: Record<SystemRoleName, PermissionKey[]> = {
  [SYSTEM_ROLES.OWNER]: ALL_PERMISSION_KEYS,
  [SYSTEM_ROLES.ADMIN]: [
    PERMISSIONS.ORG_MANAGE_USERS,
    PERMISSIONS.ORG_MANAGE_INTEGRATIONS,
    PERMISSIONS.WORKSPACE_CREATE,
    PERMISSIONS.WORKSPACE_MANAGE,
    PERMISSIONS.BRAND_MANAGE,
    PERMISSIONS.CAMPAIGN_CREATE,
    PERMISSIONS.CAMPAIGN_MANAGE,
    PERMISSIONS.CONTENT_CREATE,
    PERMISSIONS.CONTENT_PUBLISH,
    PERMISSIONS.CONTENT_APPROVE,
    PERMISSIONS.LEADS_MANAGE,
    PERMISSIONS.ANALYTICS_VIEW,
  ],
  [SYSTEM_ROLES.MARKETING_MANAGER]: [
    PERMISSIONS.CAMPAIGN_CREATE,
    PERMISSIONS.CAMPAIGN_MANAGE,
    PERMISSIONS.CONTENT_CREATE,
    PERMISSIONS.LEADS_MANAGE,
    PERMISSIONS.ANALYTICS_VIEW,
  ],
  [SYSTEM_ROLES.CONTENT_CREATOR]: [PERMISSIONS.CONTENT_CREATE],
  [SYSTEM_ROLES.ANALYST]: [PERMISSIONS.ANALYTICS_VIEW],
  [SYSTEM_ROLES.APPROVER]: [
    PERMISSIONS.CONTENT_APPROVE,
    PERMISSIONS.ADS_APPROVE_BUDGET,
    PERMISSIONS.ADS_APPROVE_LAUNCH,
  ],
};
