import { getReadableSizeFromBytes } from "@/lib/utils";
import { Keymap, Media } from "@/types/types";

export default function InfoBox({
  keymaps,
  zoomLevel,
  pan,
  media,
  indexInfo,
  cacheMemory,
}: {
  keymaps: Keymap[];
  zoomLevel: number;
  pan: { x: number; y: number };
  media: Media | null;
  indexInfo: { current: number; total: number };
  cacheMemory: string;
  currentWindowSize: any;
}) {
  return (
    <div className="absolute left-0 top-0 flex flex-col p-2 pb-1.5 bg-black/60 backdrop-blur-xl ring ring-white/10 text-ss w-150 rounded-br-md text-white/80  overflow-hidden font-extralight">
      <div className="font-bold  text-xs">[=Meta Data=====================]</div>
      <div className="ml-2 ">
        <span className="flex gap-1  my-0.5 bg-white/5 ring ring-white/10 rounded-xs p-0.5 pl-1 mb-0.75">
          <span className="w-20 shrink-0">Cache:</span>
          <span className=" -ml-px text-orange-200 wrap-anywhere">{cacheMemory}</span>
        </span>
        {media && (
          <div className="flex flex-col gap-px">
            <span className="flex gap-1 my-0.5 bg-white/5 ring ring-white/10 rounded-xs p-0.5 pl-1">
              <span className="w-20 shrink-0">Indexing:</span>
              <span className="text-orange-200 font-light wrap-anywhere">
                {indexInfo.current} / {indexInfo.total}
              </span>
            </span>
            <span className="flex text-nowrap gap-1 my-0.5 bg-white/5 ring ring-white/10 rounded-xs p-0.5 pl-1">
              <span className="w-20 shrink-0">File name:</span>
              <span className="text-orange-200 text-wrap font-light wrap-anywhere">
                {media.name}
              </span>
            </span>
            <span className="flex text-nowrap gap-1 my-0.5 bg-white/5 ring ring-white/10 rounded-xs p-0.5 pl-1">
              <span className="w-20 shrink-0">Cached Path:</span>
              <span className="text-wrap text-orange-200 font-light wrap-anywhere">
                {media.src}
              </span>
            </span>
            <span className="flex text-nowrap gap-1 my-0.5 bg-white/5 ring ring-white/10 rounded-xs p-0.5 pl-1">
              <span className="w-20 shrink-0">File Path:</span>
              <span className="text-wrap text-orange-200 font-light wrap-anywhere">
                {media.filePath}
              </span>
            </span>

            {media.type !== "video" && (
              <span className="flex gap-1 my-0.5 bg-white/5 ring ring-white/10 rounded-xs p-0.5 pl-1">
                <span className="w-20 shrink-0">Resolution:</span>
                <span className="text-orange-200 font-light wrap-anywhere">
                  {media.resolution.width}w x {media.resolution.height}h
                </span>
              </span>
            )}
            <span className="flex gap-1 my-0.5 bg-white/5 ring ring-white/10 rounded-xs p-0.5 pl-1">
              <span className="w-20 shrink-0">File Size:</span>
              <span className="text-orange-200 font-light wrap-anywhere">
                {getReadableSizeFromBytes(media.size)}
              </span>
            </span>
          </div>
        )}
      </div>

      <span className="font-bold  text-sm mt-2">[=Canvas Info====================]</span>
      <div className=" pl-2 flex flex-col">
        <span className="flex gap-1 my-0.5 bg-white/5 ring ring-white/10 rounded-xs p-0.5 pl-1">
          <span className="w-20 shrink-0">Zoom:</span>
          <span className=" text-orange-200 font-light wrap-anywhere">
            {(zoomLevel * 100).toFixed(0)}%
          </span>
        </span>
        <span className="flex gap-1 my-0.5 bg-white/5 ring ring-white/10 rounded-xs p-0.5 pl-1">
          <span className="w-20 shrink-0">Pan:</span>
          <span className=" text-orange-200 font-light wrap-anywhere">
            x: {pan.x.toFixed(2)} y: {pan.y.toFixed(2)}
          </span>
        </span>
      </div>

      <span className="font-bold  text-sm mt-2">[=Keymaps========================]</span>

      {keymaps.map((keymap, i) => (
        <div
          className="flex my-0.5 bg-white/5 ring ring-white/10 rounded-xs ml-2 items-center p-0.5 pl-1"
          key={i}
        >
          <span className="w-40 shrink-0 ">{keymap.description}:</span>
          {Array.isArray(keymap.key)
            ? keymap.key.map((key, j) => (
                <div key={j + key} className="flex flex-row">
                  {key.split("|").map((s, k) => (
                    <div key={k + s} className="flex flex-row">
                      <kbd className="kbd kbd-xs text-white">{s}</kbd>
                      {k < key.split("|").length - 1 && <span className=" mx-1">+</span>}
                    </div>
                  ))}
                  {j < keymap.key.length - 1 && <span className=" mx-1">|</span>}
                </div>
              ))
            : (keymap.key as string).split("|").map((s, k) => (
                <div key={k + s} className="flex flex-row">
                  <kbd className="kbd kbd-xs text-white">{s}</kbd>

                  {k < (keymap.key as string).split("|").length - 1 && (
                    <span className=" mx-1">+</span>
                  )}
                </div>
              ))}
        </div>
      ))}
    </div>
  );
}
