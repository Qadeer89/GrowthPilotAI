import fs from "node:fs/promises";
import { prisma, type Prisma } from "@growthpilot/db";
import { generateImage, generateSpeech, generateVideoScript, type BrandBrief } from "@growthpilot/ai";
import { requireMembership, requirePermission } from "./rbac";
import { PERMISSIONS } from "./permissions";
import { writeAuditLog } from "./audit";
import { NotFoundError, ConflictError } from "./errors";
import { writeAssetFile, resolveAssetFile } from "./storage";
import { assembleVideo } from "./video-render";
import { publishSocialVideo } from "./integrations";

async function loadBrand(organizationId: string, brandId: string) {
  const brand = await prisma.brand.findFirst({ where: { id: brandId, organizationId } });
  if (!brand) throw new NotFoundError("Brand not found in this organization");
  return brand;
}

function toBrandBrief(brand: Awaited<ReturnType<typeof loadBrand>>): BrandBrief {
  return {
    name: brand.name,
    website: brand.website,
    industry: brand.industry,
    description: brand.description,
    valueProposition: brand.valueProposition,
    targetAudience: brand.targetAudience,
    targetCountries: brand.targetCountries,
    tone: brand.tone,
    languages: brand.languages,
    monthlyBudget: brand.monthlyBudget,
  };
}

async function loadVideoProject(organizationId: string, videoProjectId: string) {
  const project = await prisma.videoProject.findFirst({
    where: { id: videoProjectId, organizationId },
    include: { scenes: { orderBy: { order: "asc" } } },
  });
  if (!project) throw new NotFoundError("Video project not found in this organization");
  return project;
}

type VideoProjectWithScenes = Prisma.VideoProjectGetPayload<{ include: { scenes: true } }>;

async function attachAssets(project: VideoProjectWithScenes) {
  const assetIds = [
    ...project.scenes.flatMap((s) => [s.imageAssetId, s.audioAssetId]),
    project.finalVideoAssetId,
  ].filter((id): id is string => Boolean(id));

  const assets = assetIds.length ? await prisma.creativeAsset.findMany({ where: { id: { in: assetIds } } }) : [];
  const byId = new Map(assets.map((a) => [a.id, a]));

  return {
    ...project,
    finalVideoAsset: project.finalVideoAssetId ? byId.get(project.finalVideoAssetId) ?? null : null,
    scenes: project.scenes.map((s) => ({
      ...s,
      imageAsset: s.imageAssetId ? byId.get(s.imageAssetId) ?? null : null,
      audioAsset: s.audioAssetId ? byId.get(s.audioAssetId) ?? null : null,
    })),
  };
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export async function generateAndSaveVideoScript(input: {
  organizationId: string;
  brandId: string;
  actorUserId: string;
  topic: string;
}) {
  await requirePermission(input.organizationId, input.actorUserId, PERMISSIONS.CREATIVE_MANAGE);

  const brand = await loadBrand(input.organizationId, input.brandId);
  const result = await generateVideoScript(toBrandBrief(brand), input.topic);

  const project = await prisma.videoProject.create({
    data: {
      organizationId: input.organizationId,
      workspaceId: brand.workspaceId,
      brandId: input.brandId,
      topic: input.topic,
      script: result.data.script,
      status: "storyboard",
      createdByUserId: input.actorUserId,
      scenes: {
        create: result.data.scenes.map((s) => ({
          order: s.order,
          narration: s.narration,
          visualPrompt: s.visualPrompt,
        })),
      },
    },
    include: { scenes: { orderBy: { order: "asc" } } },
  });

  await writeAuditLog({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "creative.script_generated",
    targetType: "VideoProject",
    targetId: project.id,
  });

  return attachAssets(project);
}

export async function generateVideoAssets(input: {
  organizationId: string;
  videoProjectId: string;
  actorUserId: string;
}) {
  await requirePermission(input.organizationId, input.actorUserId, PERMISSIONS.CREATIVE_MANAGE);

  const project = await loadVideoProject(input.organizationId, input.videoProjectId);
  let anyFailed = false;

  for (const scene of project.scenes) {
    const existingImage = scene.imageAssetId
      ? await prisma.creativeAsset.findUnique({ where: { id: scene.imageAssetId } })
      : null;
    if (existingImage?.status !== "completed") {
      try {
        const image = await generateImage(scene.visualPrompt);
        const storageKey = await writeAssetFile(input.organizationId, "png", Buffer.from(image.base64, "base64"));
        const asset = await prisma.creativeAsset.create({
          data: {
            organizationId: input.organizationId,
            workspaceId: project.workspaceId,
            assetType: "image",
            provider: "openai",
            model: image.model,
            status: "completed",
            storageKey,
            mimeType: "image/png",
            estimatedCostUsd: image.estimatedCostUsd,
            createdByUserId: input.actorUserId,
          },
        });
        await prisma.videoScene.update({ where: { id: scene.id }, data: { imageAssetId: asset.id } });
      } catch (err) {
        const asset = await prisma.creativeAsset.create({
          data: {
            organizationId: input.organizationId,
            workspaceId: project.workspaceId,
            assetType: "image",
            provider: "openai",
            model: "gpt-image-1",
            status: "failed",
            failureReason: errorMessage(err),
            createdByUserId: input.actorUserId,
          },
        });
        await prisma.videoScene.update({ where: { id: scene.id }, data: { imageAssetId: asset.id } });
        anyFailed = true;
      }
    }

    const existingAudio = scene.audioAssetId
      ? await prisma.creativeAsset.findUnique({ where: { id: scene.audioAssetId } })
      : null;
    if (existingAudio?.status !== "completed") {
      try {
        const speech = await generateSpeech(scene.narration);
        const storageKey = await writeAssetFile(input.organizationId, "mp3", Buffer.from(speech.base64, "base64"));
        const asset = await prisma.creativeAsset.create({
          data: {
            organizationId: input.organizationId,
            workspaceId: project.workspaceId,
            assetType: "audio",
            provider: "openai",
            model: speech.model,
            status: "completed",
            storageKey,
            mimeType: "audio/mpeg",
            estimatedCostUsd: speech.estimatedCostUsd,
            createdByUserId: input.actorUserId,
          },
        });
        await prisma.videoScene.update({ where: { id: scene.id }, data: { audioAssetId: asset.id } });
      } catch (err) {
        const asset = await prisma.creativeAsset.create({
          data: {
            organizationId: input.organizationId,
            workspaceId: project.workspaceId,
            assetType: "audio",
            provider: "openai",
            model: "tts-1",
            status: "failed",
            failureReason: errorMessage(err),
            createdByUserId: input.actorUserId,
          },
        });
        await prisma.videoScene.update({ where: { id: scene.id }, data: { audioAssetId: asset.id } });
        anyFailed = true;
      }
    }
  }

  const updated = await prisma.videoProject.update({
    where: { id: project.id },
    data: anyFailed
      ? { status: "failed", failureReason: "One or more scenes failed to generate assets — see the asset list below." }
      : { status: "captions", failureReason: null },
    include: { scenes: { orderBy: { order: "asc" } } },
  });

  await writeAuditLog({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "creative.assets_generated",
    targetType: "VideoProject",
    targetId: project.id,
    metadata: { anyFailed },
  });

  return attachAssets(updated);
}

export async function renderVideo(input: {
  organizationId: string;
  videoProjectId: string;
  actorUserId: string;
}) {
  await requirePermission(input.organizationId, input.actorUserId, PERMISSIONS.CREATIVE_MANAGE);

  const project = await loadVideoProject(input.organizationId, input.videoProjectId);

  if (project.status !== "captions") {
    throw new ConflictError(
      `Video project is not ready to render (status: "${project.status}"). Generate assets for every scene first.`,
    );
  }

  const assetIds = project.scenes.flatMap((s) => [s.imageAssetId, s.audioAssetId]).filter((id): id is string => Boolean(id));
  const assets = await prisma.creativeAsset.findMany({ where: { id: { in: assetIds } } });
  const byId = new Map(assets.map((a) => [a.id, a]));

  const renderScenes = project.scenes.map((scene) => {
    const imageAsset = scene.imageAssetId ? byId.get(scene.imageAssetId) : undefined;
    const audioAsset = scene.audioAssetId ? byId.get(scene.audioAssetId) : undefined;
    if (!imageAsset?.storageKey || imageAsset.status !== "completed") {
      throw new ConflictError(`Scene ${scene.order} has no completed image asset`);
    }
    if (!audioAsset?.storageKey || audioAsset.status !== "completed") {
      throw new ConflictError(`Scene ${scene.order} has no completed audio asset`);
    }
    return {
      order: scene.order,
      narration: scene.narration,
      imagePath: resolveAssetFile(input.organizationId, imageAsset.storageKey),
      audioPath: resolveAssetFile(input.organizationId, audioAsset.storageKey),
    };
  });

  await prisma.videoProject.update({ where: { id: project.id }, data: { status: "rendering" } });

  try {
    const { buffer, sceneDurations } = await assembleVideo(renderScenes);

    const storageKey = await writeAssetFile(input.organizationId, "mp4", buffer);
    const videoAsset = await prisma.creativeAsset.create({
      data: {
        organizationId: input.organizationId,
        workspaceId: project.workspaceId,
        assetType: "video",
        provider: "ffmpeg-local",
        model: "ffmpeg",
        status: "completed",
        storageKey,
        mimeType: "video/mp4",
        estimatedCostUsd: 0,
        createdByUserId: input.actorUserId,
      },
    });

    await Promise.all(
      sceneDurations.map(({ order, durationSeconds }) =>
        prisma.videoScene.updateMany({ where: { videoProjectId: project.id, order }, data: { durationSeconds } }),
      ),
    );

    const updated = await prisma.videoProject.update({
      where: { id: project.id },
      data: { status: "rendered", finalVideoAssetId: videoAsset.id, failureReason: null },
      include: { scenes: { orderBy: { order: "asc" } } },
    });

    await writeAuditLog({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "creative.video_rendered",
      targetType: "VideoProject",
      targetId: project.id,
      metadata: { finalVideoAssetId: videoAsset.id },
    });

    return attachAssets(updated);
  } catch (err) {
    await prisma.videoProject.update({
      where: { id: project.id },
      data: { status: "failed", failureReason: errorMessage(err) },
    });
    throw err;
  }
}

export async function listVideoProjects(organizationId: string, actorUserId: string) {
  await requireMembership(organizationId, actorUserId);

  const projects = await prisma.videoProject.findMany({
    where: { organizationId },
    include: { scenes: { orderBy: { order: "asc" } } },
    orderBy: { createdAt: "desc" },
  });

  return Promise.all(projects.map((p) => attachAssets(p)));
}

export async function getCreativeAssetFile(organizationId: string, assetId: string, actorUserId: string) {
  await requireMembership(organizationId, actorUserId);

  const asset = await prisma.creativeAsset.findFirst({ where: { id: assetId, organizationId } });
  if (!asset || asset.status !== "completed" || !asset.storageKey) {
    throw new NotFoundError("Asset not found or not ready");
  }

  return {
    filePath: resolveAssetFile(organizationId, asset.storageKey),
    mimeType: asset.mimeType ?? "application/octet-stream",
  };
}

export async function publishVideoProject(input: {
  organizationId: string;
  videoProjectId: string;
  actorUserId: string;
}) {
  const project = await prisma.videoProject.findFirst({
    where: { id: input.videoProjectId, organizationId: input.organizationId },
  });
  if (!project) throw new NotFoundError("Video project not found in this organization");
  if (project.status !== "rendered" || !project.finalVideoAssetId) {
    throw new ConflictError("This video hasn't finished rendering yet.");
  }

  const asset = await prisma.creativeAsset.findFirst({
    where: { id: project.finalVideoAssetId, organizationId: input.organizationId },
  });
  if (!asset?.storageKey) throw new NotFoundError("Rendered video file not found");

  const filePath = resolveAssetFile(input.organizationId, asset.storageKey);
  const fileBuffer = await fs.readFile(filePath);

  return publishSocialVideo({
    organizationId: input.organizationId,
    videoProjectId: project.id,
    fileBuffer,
    mimeType: asset.mimeType ?? "video/mp4",
    description: project.topic,
    actorUserId: input.actorUserId,
  });
}
