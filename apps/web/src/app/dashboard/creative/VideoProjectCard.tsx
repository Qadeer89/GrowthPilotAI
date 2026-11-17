import { generateAssetsAction, renderVideoAction } from "./actions";

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
  rendered: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
  rendering: "bg-amber-100 text-amber-700",
};

export function VideoProjectCard({ project }: { project: Project }) {
  const statusColor = STATUS_COLOR[project.status] ?? "bg-slate-100 text-slate-600";
  const canGenerateAssets = project.status === "storyboard" || project.status === "failed";
  const canRender = project.status === "captions";

  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-900">{project.topic}</p>
          <p className="text-xs text-slate-400">Started {project.createdAt.toLocaleString()}</p>
        </div>
        <span className={`rounded px-2 py-0.5 text-xs ${statusColor}`}>
          {STATUS_LABEL[project.status] ?? project.status}
        </span>
      </div>

      {project.failureReason && (
        <p className="mt-2 text-sm text-red-600">{project.failureReason}</p>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {project.scenes.map((scene) => (
          <div key={scene.id} className="rounded-md border border-slate-100 bg-slate-50 p-3 text-xs">
            <p className="font-medium text-slate-700">Scene {scene.order}</p>
            <p className="mt-1 text-slate-600">{scene.narration}</p>

            {scene.imageAsset?.status === "completed" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/creative-assets/${scene.imageAsset.id}`}
                alt={scene.visualPrompt}
                className="mt-2 aspect-square w-full rounded-md object-cover"
              />
            ) : scene.imageAsset?.status === "failed" ? (
              <p className="mt-2 text-red-600">Image failed: {scene.imageAsset.failureReason}</p>
            ) : (
              <p className="mt-2 text-slate-400">Image not generated yet.</p>
            )}

            {scene.audioAsset?.status === "completed" ? (
              <audio controls className="mt-2 w-full" src={`/api/creative-assets/${scene.audioAsset.id}`} />
            ) : scene.audioAsset?.status === "failed" ? (
              <p className="mt-2 text-red-600">Voiceover failed: {scene.audioAsset.failureReason}</p>
            ) : (
              <p className="mt-2 text-slate-400">Voiceover not generated yet.</p>
            )}
          </div>
        ))}
      </div>

      {project.finalVideoAsset?.status === "completed" && (
        <div className="mt-4">
          <p className="text-xs font-medium text-slate-600">Final video</p>
          <video controls className="mt-1 max-w-md rounded-md" src={`/api/creative-assets/${project.finalVideoAsset.id}`} />
        </div>
      )}

      <div className="mt-4 flex gap-2">
        {canGenerateAssets && (
          <form action={generateAssetsAction}>
            <input type="hidden" name="videoProjectId" value={project.id} />
            <button className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500">
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
        {project.status === "rendering" && (
          <p className="self-center text-sm text-slate-500">Rendering can take a minute or two…</p>
        )}
      </div>
    </div>
  );
}
