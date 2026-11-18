import { prisma } from "@growthpilot/db";
import { requireMembership, requirePermission } from "./rbac";
import { PERMISSIONS } from "./permissions";
import { writeAuditLog } from "./audit";
import { NotFoundError, ValidationError } from "./errors";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function createLandingPage(input: {
  organizationId: string;
  workspaceId: string;
  brandId: string;
  actorUserId: string;
  name: string;
  headline: string;
  body: string;
  ctaLabel?: string;
  published?: boolean;
}) {
  await requirePermission(input.organizationId, input.actorUserId, PERMISSIONS.LEADS_MANAGE);

  const brand = await prisma.brand.findFirst({
    where: { id: input.brandId, organizationId: input.organizationId },
  });
  if (!brand) throw new NotFoundError("Brand not found in this organization");

  const baseSlug = slugify(input.name) || "page";
  let slug = baseSlug;
  let suffix = 1;
  while (await prisma.landingPage.findUnique({ where: { organizationId_slug: { organizationId: input.organizationId, slug } } })) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

  const page = await prisma.landingPage.create({
    data: {
      organizationId: input.organizationId,
      workspaceId: input.workspaceId,
      brandId: input.brandId,
      slug,
      name: input.name,
      headline: input.headline,
      body: input.body,
      ctaLabel: input.ctaLabel || "Get in touch",
      published: input.published ?? true,
      createdByUserId: input.actorUserId,
    },
  });

  await writeAuditLog({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "landingPage.created",
    targetType: "LandingPage",
    targetId: page.id,
  });

  return page;
}

export async function listLandingPages(organizationId: string, actorUserId: string) {
  await requireMembership(organizationId, actorUserId);
  return prisma.landingPage.findMany({
    where: { organizationId },
    include: { brand: true, _count: { select: { leads: true } } },
    orderBy: { createdAt: "desc" },
  });
}

// Public: fetches a published page by org+slug for the public-facing route.
// No permission check -- this is what an anonymous visitor's browser loads.
export async function getPublishedLandingPage(organizationId: string, slug: string) {
  return prisma.landingPage.findFirst({
    where: { organizationId, slug, published: true },
    include: { brand: true },
  });
}

// Public: submits the lead form on a landing page. No auth -- the caller is
// an anonymous website visitor, not an organization member.
export async function submitLeadForm(input: {
  organizationId: string;
  landingPageId: string;
  name?: string;
  email: string;
  message?: string;
}) {
  const page = await prisma.landingPage.findFirst({
    where: { id: input.landingPageId, organizationId: input.organizationId, published: true },
  });
  if (!page) throw new NotFoundError("Landing page not found or not published");

  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ValidationError("A valid email is required");

  return prisma.lead.create({
    data: {
      organizationId: input.organizationId,
      workspaceId: page.workspaceId,
      landingPageId: page.id,
      name: input.name?.trim() || null,
      email,
      message: input.message?.trim() || null,
      status: "new",
    },
  });
}

export async function listLeads(organizationId: string, actorUserId: string) {
  await requireMembership(organizationId, actorUserId);
  return prisma.lead.findMany({
    where: { organizationId },
    include: { landingPage: true },
    orderBy: { createdAt: "desc" },
  });
}

const LEAD_STATUSES = ["new", "contacted", "qualified", "unqualified", "converted"] as const;

export async function updateLeadStatus(input: {
  organizationId: string;
  leadId: string;
  status: (typeof LEAD_STATUSES)[number];
  actorUserId: string;
}) {
  await requirePermission(input.organizationId, input.actorUserId, PERMISSIONS.LEADS_MANAGE);
  if (!LEAD_STATUSES.includes(input.status)) throw new ValidationError("Invalid lead status");

  const lead = await prisma.lead.findFirst({ where: { id: input.leadId, organizationId: input.organizationId } });
  if (!lead) throw new NotFoundError("Lead not found in this organization");

  const updated = await prisma.lead.update({ where: { id: lead.id }, data: { status: input.status } });

  await writeAuditLog({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "lead.statusChanged",
    targetType: "Lead",
    targetId: lead.id,
    metadata: { from: lead.status, to: input.status },
  });

  return updated;
}
