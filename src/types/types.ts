import { LogicalSize } from "@tauri-apps/api/window";

export type CachedImage = {
  index: number;
  path: string;
  img: HTMLImageElement;
  bytes?: number;
};

export type Media = {
  src: string;
  name: string;
  filePath: string;
  resolution: LogicalSize;
  size: number;
  type: "image" | "gif" | "video";
};

export type Keymap = {
  key: string | string[];
  description: string;
  action?: (key: string | string[] | undefined) => void;
};
