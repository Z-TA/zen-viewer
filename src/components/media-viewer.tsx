import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";

import VideoPlayer from "./video-player";
import { cn } from "../lib/utils";

type MediaViewerProps = {
  src: string;
  type: "image" | "gif" | "video";
  zoom?: number;
  onDrag: (isDragging: boolean) => void;
  position: { x: number; y: number };
  imageSize: { width: number; height: number } | undefined;
  windowSize?: { width: number; height: number };
  onLoadDimensions?: (width: number, height: number) => void;
  setPosition: Dispatch<SetStateAction<{ x: number; y: number }>>;
};

export function MediaViewer({
  src,
  type,
  zoom = 1,
  onDrag,
  position,
  imageSize,
  windowSize,
  onLoadDimensions,
  setPosition,
}: MediaViewerProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  useEffect(() => onDrag(isDragging), [isDragging]);

  function resetView() {
    setPosition({ x: 0, y: 0 });
    prevScale.current = 1;
    lastMouse.current = { x: 0, y: 0 };
    setIsDragging(false);

    if (type === "video") {
      const video = videoRef.current;
      if (!video) return;

      const handler = () => onLoadDimensions?.(video.videoWidth, video.videoHeight);
      video.addEventListener("loadedmetadata", handler);
      return () => video.removeEventListener("loadedmetadata", handler);
    } else {
      const img = imgRef.current;
      if (!img) return;

      const handler = () => onLoadDimensions?.(img.naturalWidth, img.naturalHeight);
      img.addEventListener("load", handler);
      return () => img.removeEventListener("load", handler);
    }
  }

  useEffect(() => {
    resetView();
  }, [src]);

  let additionalScale = 1;
  if (imageSize && windowSize && (type === "image" || type === "gif")) {
    const targetWidth = imageSize.width * zoom;
    const targetHeight = imageSize.height * zoom;

    const windowScale = Math.min(
      imageSize.width / targetWidth,
      imageSize.height / targetHeight,
    );

    additionalScale = 1 / windowScale;
  }

  const prevScale = useRef(additionalScale);

  const imageStyle =
    type === "image" || type === "gif"
      ? {
          transform: `translate(${position.x}px, ${position.y}px) scale(${additionalScale})`,
          transformOrigin: "center center",
          cursor: isDragging ? "grabbing" : "grab",
        }
      : {};

  useEffect(() => {
    const scaleRatio = additionalScale / prevScale.current;

    setPosition((pos) => ({
      x: pos.x * scaleRatio,
      y: pos.y * scaleRatio,
    }));

    prevScale.current = additionalScale;
  }, [additionalScale]);

  return (
    <div
      className={cn(
        "bg-transparent",
        "pointer-events-none overflow-hidden p-2 m-2  absolute inset-0 rounded-md  ",
      )}
    >
      {type === "video" ? (
        <VideoPlayer key={src} src={src} />
      ) : (
        <img
          ref={imgRef}
          src={src}
          alt="media"
          onError={() => {
            console.log("Invalid image:", src);
          }}
          draggable={false}
          className="pointer-events-none w-full h-full object-contain"
          style={imageStyle}
        />
      )}
    </div>
  );
}
