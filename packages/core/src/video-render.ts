import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// ffmpeg's drawtext filter treats ':' as a special character, which collides
// with Windows absolute paths ("C:\..."). Every file this module hands to
// ffmpeg is copied into one working directory first and referenced by a
// plain relative filename (via `cwd`) so none of that escaping is needed.
const CAPTION_FONT_FILE = process.env.CREATIVE_CAPTION_FONT ?? "C:\\Windows\\Fonts\\arial.ttf";

function wrapCaption(text: string, maxLineLength = 42, maxLines = 3): string {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxLineLength && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
    if (lines.length === maxLines - 1 && candidate.length > maxLineLength) break;
  }
  if (current) lines.push(current);

  return lines.slice(0, maxLines).join("\n");
}

async function getAudioDurationSeconds(workDir: string, audioFile: string): Promise<number> {
  const { stdout } = await execFileAsync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", audioFile],
    { cwd: workDir },
  );
  const seconds = parseFloat(stdout.trim());
  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new Error(`ffprobe returned an invalid duration for ${audioFile}: "${stdout.trim()}"`);
  }
  return seconds;
}

async function renderSceneClip(input: {
  workDir: string;
  imageFile: string;
  audioFile: string;
  narration: string;
  fontFile: string;
  outFile: string;
  durationSeconds: number;
}): Promise<void> {
  const captionFile = `${input.outFile}.caption.txt`;
  await fs.writeFile(path.join(input.workDir, captionFile), wrapCaption(input.narration));

  const drawtext = [
    `textfile=${captionFile}`,
    `fontfile=${input.fontFile}`,
    "fontsize=36",
    "fontcolor=white",
    "box=1",
    "boxcolor=black@0.6",
    "boxborderw=14",
    "x=(w-text_w)/2",
    "y=h-160",
    "line_spacing=8",
  ].join(":");

  await execFileAsync(
    "ffmpeg",
    [
      "-y",
      "-loop",
      "1",
      "-i",
      input.imageFile,
      "-i",
      input.audioFile,
      "-t",
      String(input.durationSeconds),
      "-vf",
      `scale=1024:1024,drawtext=${drawtext}`,
      "-c:v",
      "libx264",
      "-c:a",
      "aac",
      "-pix_fmt",
      "yuv420p",
      "-shortest",
      input.outFile,
    ],
    { cwd: input.workDir },
  );
}

async function concatClips(workDir: string, clipFiles: string[], outFile: string): Promise<void> {
  const listFile = "concat-list.txt";
  await fs.writeFile(path.join(workDir, listFile), clipFiles.map((f) => `file '${f}'`).join("\n"));

  await execFileAsync("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", outFile], {
    cwd: workDir,
  });
}

export type RenderScene = {
  order: number;
  narration: string;
  imagePath: string;
  audioPath: string;
};

export type RenderedVideo = {
  buffer: Buffer;
  sceneDurations: { order: number; durationSeconds: number }[];
};

export async function assembleVideo(scenes: RenderScene[]): Promise<RenderedVideo> {
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "growthpilot-video-"));

  try {
    const fontFile = "caption-font.ttf";
    await fs.copyFile(CAPTION_FONT_FILE, path.join(workDir, fontFile));

    const sceneDurations: { order: number; durationSeconds: number }[] = [];
    const clipFiles: string[] = [];

    for (const scene of scenes) {
      const imageFile = `scene-${scene.order}-image${path.extname(scene.imagePath)}`;
      const audioFile = `scene-${scene.order}-audio${path.extname(scene.audioPath)}`;
      const clipFile = `scene-${scene.order}-clip.mp4`;

      await fs.copyFile(scene.imagePath, path.join(workDir, imageFile));
      await fs.copyFile(scene.audioPath, path.join(workDir, audioFile));

      const durationSeconds = await getAudioDurationSeconds(workDir, audioFile);

      await renderSceneClip({
        workDir,
        imageFile,
        audioFile,
        narration: scene.narration,
        fontFile,
        outFile: clipFile,
        durationSeconds,
      });

      sceneDurations.push({ order: scene.order, durationSeconds });
      clipFiles.push(clipFile);
    }

    const finalFile = "final.mp4";
    await concatClips(workDir, clipFiles, finalFile);

    const buffer = await fs.readFile(path.join(workDir, finalFile));
    return { buffer, sceneDurations };
  } finally {
    await fs.rm(workDir, { recursive: true, force: true });
  }
}
