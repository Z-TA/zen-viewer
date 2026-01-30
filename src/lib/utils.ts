import { CachedImage, Media } from "@/types/types";
import { invoke } from "@tauri-apps/api/core";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getFileNameFromPath(fullPath: string): string {
  if (!fullPath) return "";
  const lastSlashIndex = Math.max(fullPath.lastIndexOf("/"), fullPath.lastIndexOf("\\"));
  return fullPath.substring(lastSlashIndex + 1);
}

export async function copyMediaToClipboard(media: Media): Promise<void> {
  const bytes = await invoke<number[]>("get_image_bytes", { path: media.filePath });

  const blob = new Blob([new Uint8Array(bytes)], { type: "image/png" }); // or jpeg/webp
  return await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
}

export async function copyMediaPathToClipboard(media: Media): Promise<void> {
  return await writeText(media.filePath);
}

export function getReadableCacheSize(cache: CachedImage[]): string {
  const totalBytes = cache.reduce((sum, f) => sum + (f.bytes ?? 0), 0) * 1024;
  return getReadableSizeFromBytes(totalBytes);
}

export function getReadableSizeFromBytes(bytes: number): string {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const dm = 2 < 0 ? 0 : 2;
  const sizes = ["B", "KB", "MB", "GB", "TB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = parseFloat((bytes / Math.pow(k, i)).toFixed(dm));

  return `${value} ${sizes[i]}`;
}
