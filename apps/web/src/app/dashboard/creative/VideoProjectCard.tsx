import { generateAssetsAction, publishVideoAction, renderVideoAction } from "./actions";

type Asset = {
  id: string;
  assetType: string;
  status: string;
  mimeType: string | null;
  failureReason: string | null;
  estimatedCostUsd: number | null;
} | null;

type Scene = {
  id: string;
  order: number;
  narration: string;
  visualPrompt: string;
  durationSeconds: number | null;
  imageAsset: Asset;
  audioAsset: Asset;
};

type Project = {
  id: string;
  topic: string;
  status: string;
  failureReason: string | null;
  script: string | null;
  createdAt: Date;
  scenes: Scene[];
  finalVideoAsset: Asset;
};

const STATUS_LABEL: Record<string, string> = {
  concept: "Concept",
  storyboard: "Storyboard written",
  assets: "Generating assets",
  voiceover: "Voiceover generated",
  captions: "Ready to render",
  rendering: "Rendering…",
  rendered: "Rendered",
  failed: "Failed",
};

const STATUS_COLOR: Record<string, string> = {
  rendered: "bg-[var(--color-success-soft)] text-[var(--color-success)]",
  failed: "bg-[var(--color-danger-soft)] text-[var(--color-danger)]",
  rendering: "bg-[var(--color-warning-soft)] text-[var(--color-warning)]",
};

export function VideoProjectCard({ project }: { project: Project }) {
  const statusColor = STATUS_COLOR[project.status] ?? "bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]";
  const canGenerateAssets = project.status === "storyboard" || project.status === "failed";
  const canRender = project.status === "captions";
  const canPublish = project.status === "rendered";

  return (
    <div className="gp-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--color-text)]">{project.topic}</p>
          <p className="text-xs text-[var(--color-text-faint)]">Started {project.createdAt.toLocaleString()}</p>
        </div>
        <span className={`rounded px-2 py-0.5 text-xs ${statusColor}`}>
          {STATUS_LABEL[project.status] ?? project.status}
        </span>
      </div>

      {project.failureReason && (
        <p className="mt-2 text-sm text-[var(--color-danger)]">{project.failureReason}</p>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {project.scenes.map((scene) => (
          <div key={scene.id} className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-3 text-xs">
            <p className="font-medium text-[var(--color-text)]">Scene {scene.order}</p>
            <p className="mt-1 text-[var(--color-text-muted)]">{scene.narration}</p>

            {scene.imageAsset?.status === "completed" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/creative-assets/${scene.imageAsset.id}`}
                alt={scene.visualPrompt}
                className="mt-2 aspect-square w-full rounded-md object-cover"
              />
            ) : scene.imageAsset?.status === "failed" ? (
              <p className="mt-2 text-[var(--color-danger)]">Image failed: {scene.imageAsset.failureReason}</p>
            ) : (
              <p className="mt-2 text-[var(--color-text-faint)]">Image not generated yet.</p>
            )}

            {scene.audioAsset?.status === "completed" ? (
              <audio controls className="mt-2 w-full" src={`/api/creative-assets/${scene.audioAsset.id}`} />
            ) : scene.audioAsset?.status === "failed" ? (
              <p className="mt-2 text-[var(--color-danger)]">Voiceover failed: {scene.audioAsset.failureReason}</p>
            ) : (
              <p className="mt-2 text-[var(--color-text-faint)]">Voiceover not generated yet.</p>
            )}
          </div>
        ))}
      </div>

      {project.finalVideoAsset?.status === "completed" && (
        <div className="mt-4">
          <p className="text-xs font-medium text-[var(--color-text-muted)]">Final video</p>
          <video controls className="mt-1 max-w-md rounded-md" src={`/api/creative-assets/${project.finalVideoAsset.id}`} />
        </div>
      )}

      <div className="mt-4 flex gap-2">
        {canGenerateAssets && (
          <form action={generateAssetsAction}>
            <input type="hidden" name="videoProjectId" value={project.id} />
            <button className="rounded-md bg-[var(--color-primary)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]">
              Generate assets (images + voiceover)
            </button>
          </form>
        )}
        {canRender && (
          <form action={renderVideoAction}>
            <input type="hidden" name="videoProjectId" value={project.id} />
            <button className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500">
              Render video
            </button>
          </form>
        )}
        {canPublish && (
          <form action={publishVideoAction}>
            <input type="hidden" name="videoProjectId" value={project.id} />
            <button className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500">
              Publish to connected accounts
            </button>
          </form>
        )}
        {project.status === "rendering" && (
          <p className="self-center text-sm text-[var(--color-text-muted)]">Rendering can take a minute or two…</p>
        )}
      </div>
    </div>
  );
}
