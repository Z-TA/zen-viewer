"use client";

import "./App.css";

import {} from "@tauri-apps/plugin-process";
import { useEffect, useRef, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { convertFileSrc } from "@tauri-apps/api/core";
import { MediaViewer } from "./components/media-viewer";
import { currentMonitor, getCurrentWindow } from "@tauri-apps/api/window";
import { ImageOff, Pin } from "lucide-react";
import SettingsModal from "./components/settings-modal";
import {
  cn,
  copyMediaPathToClipboard,
  copyMediaToClipboard,
  getReadableCacheSize,
} from "./lib/utils";
import { toast } from "sonner";
import InfoBox from "./components/info-box";
import NavigationControls from "./components/navigation-controls";
import { CachedImage, Keymap, Media } from "./types/types";
import { getSetting, setSetting } from "./store";
import { getStore } from "@tauri-apps/plugin-store";

function App() {
  const [media, setMedia] = useState<Media | null>(null);
  const [folderFiles, setFolderFiles] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  const [fileCache, setFileCache] = useState<CachedImage[]>([]);

  const [isDraggin, setIsDraggin] = useState(false);

  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });

  const [copyDestination, setCopyDestination] = useState<string>("");
  const [showSettings, setShowSettings] = useState(false);
  const [originalImageSize, setOriginalImageSize] = useState<{
    width: number;
    height: number;
  }>();
  const [currentWindowSize, setCurrentWindowSize] = useState<{
    width: number;
    height: number;
  }>();

  const [acrylicBg, setAcrylicBg] = useState(true);

  const appWindow = getCurrentWindow();
  const [monitor, setMonitor] = useState<any>(null);
  const [alwaysOnTop, setAlwaysOnTop] = useState(false);

  const lockZoomRef = useRef<boolean>(false);
  const zoomRef = useRef<number>(zoomLevel);
  const isZoomingRef = useRef<boolean>(false);
  const originalImageSizeRef = useRef<typeof originalImageSize>(originalImageSize);
  const monitorRef = useRef<any>(monitor);
  const mediaRef = useRef<typeof media>(media);

  async function toggleAlwaysOnTop() {
    const v = !alwaysOnTop;
    await appWindow.setAlwaysOnTop(v);
    toast.success(`Always on top: ${v ? "enabled" : "disabled"}`, {
      position: "bottom-center",
    });
    setAlwaysOnTop(v);
  }

  const keymaps: Keymap[] = [
    {
      key: "ctrl|,",
      description: "Open Settings",
      action: () => setShowSettings((p) => !p),
    },
    {
      key: "ctrl|t",
      description: "Always on top",
      action: async () => await toggleAlwaysOnTop(),
    },
    {
      key: "ctrl|s",
      description: "Copy To Destination",
      action: () => {
        if (!media) return;
        copyCurrentMediaToFolder()
          .then((result) => {
            toast.success(`Copied file ${media.name} to ${result}!`, {
              position: "bottom-center",
            });
          })
          .catch((err) => {
            toast.error(`Failed to copy file: ${err}`, { position: "bottom-center" });
          });
      },
    },
    {
      key: "ctrl|c",
      description: "Copy Media",
      action: async () => {
        if (!media) return;

        if (media.type === "video") {
          return await copyMediaPathToClipboard(media).finally(() =>
            toast.success(`Copied ${media.filePath} path to clipboard`, {
              position: "bottom-center",
            }),
          );
        }

        await copyMediaToClipboard(media).finally(() =>
          toast.success(`Copied file ${media.name} to clipboard`, {
            position: "bottom-center",
          }),
        );
      },
    },
    {
      key: "ctrl|shift|c",
      description: "Copy Media Path",
      action: async () => {
        if (!media) return;
        await copyMediaPathToClipboard(media).finally(() =>
          toast.success(`Copied ${media.filePath} path to clipboard`, {
            position: "bottom-center",
          }),
        );
      },
    },
    {
      key: ["ctrl|h", "ctrl|l", "ctrl|j", "ctrl|k", "ScrollDown"],
      description: "Drag Image",
      action: (s) => {
        switch (s) {
          case "ctrl|h":
            setImagePosition((p) => ({ x: p.x - 10, y: p.y }));
            break;
          case "ctrl|l":
            setImagePosition((p) => ({ x: p.x + 10, y: p.y }));
            break;
          case "ctrl|j":
            setImagePosition((p) => ({ x: p.x, y: p.y - 10 }));
            break;
          case "ctrl|k":
            setImagePosition((p) => ({ x: p.x, y: p.y + 10 }));
            break;
        }
      },
    },
    {
      key: ["right", "h"],
      description: "Next",
      action: () => changeIndex(1),
    },
    { key: ["left", "l"], description: "Previous", action: () => changeIndex(-1) },
    {
      key: ["=", "k", "up", "ctrl|MouseScroll"],
      description: "Zoom In",
      action: () => changeZoom(1),
    },
    {
      key: ["-", "j", "down", "ctrl|MouseScroll"],
      description: "Zoom Out",
      action: () => changeZoom(-1),
    },
    {
      key: ["esc", "r", "o"],
      description: "Reset Zoom/Pan",
      action: () => {
        setZoomToActualSize();
        setImagePosition({ x: 0, y: 0 });
      },
    },
    { key: "1", description: "Zoom to Actual Size", action: setZoomToActualSize },
    { key: "x", description: "Close Window", action: () => appWindow.close() },
    { key: "ctrl|o", description: "Open File", action: handleOpenFile },
    {
      key: "i",
      description: "Toggle Info",
      action: () => {
        setShowDebugInfo((prev) => !prev);
      },
    },
  ];

  let mouseDown = false;
  let dragStarted = false;
  let startX = 0;
  let startY = 0;
  let imageDragStarted = false;

  const DRAG_THRESHOLD = 6; // pixels before it counts as a drag

  //#region Handle Events
  function handleMouseUp() {
    // if (showSettings) return;
    // setIsDragginImage(false);
    // setIsDragginWindow(false);
    mouseDown = false;
    imageDragStarted = false;
    dragStarted = false;
  }

  async function handleMouseMove(e: MouseEvent) {
    if (showSettings) return;
    if (imageDragStarted) {
      setImagePosition((p) => ({ x: p.x + e.movementX, y: p.y + e.movementY }));
      return;
    }
    // if (isDragginWindow && e.buttons === 1) {
    //   const op = await appWindow.outerPosition();
    //   const x = op.x + e.movementX;
    //   const y = op.y + e.movementY;
    //   appWindow.setPosition(new PhysicalPosition(x, y));
    // }

    if (!mouseDown || dragStarted) return;

    const dx = Math.abs(e.clientX - startX);
    const dy = Math.abs(e.clientY - startY);

    if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) {
      dragStarted = true;
      await appWindow.startDragging();
    }
  }

  function handleMouseDown(e: MouseEvent) {
    if (showSettings) return;

    if (e.button === 1) {
      if (!media || media?.type === "video") return;
      imageDragStarted = true;
      return;
    }

    if (e.button !== 0) return;

    if (e.detail === 2 && !e.ctrlKey && media && media.type !== "video") {
      appWindow.toggleMaximize();
      return;
    }

    mouseDown = true;
    dragStarted = false;
    startX = e.clientX;
    startY = e.clientY;
  }

  function handleKeyMaps(e: globalThis.KeyboardEvent) {
    for (const km of keymaps) {
      const matchedKey = getMatchingKey(e, km);

      if (matchedKey) {
        e.preventDefault();
        km.action?.(matchedKey);
        break;
      }
    }

    function normalizeKeyString(key: string): string {
      return key.toLowerCase().split("|").sort().join("|");
    }

    function getMatchingKey(e: globalThis.KeyboardEvent, keymap: Keymap): string | null {
      const pressed = normalizeKeyString(eventToKeyString(e));
      const keys = Array.isArray(keymap.key) ? keymap.key : [keymap.key];

      for (const k of keys) {
        if (normalizeKeyString(k) === pressed) {
          return pressed;
        }
      }
      return null;
    }

    function eventToKeyString(e: globalThis.KeyboardEvent): string {
      const parts: string[] = [];

      if (e.ctrlKey) parts.push("ctrl");
      if (e.altKey) parts.push("alt");
      if (e.shiftKey) parts.push("shift");

      let key = e.key.toLowerCase();

      const special: Record<string, string> = {
        " ": "space",
        arrowup: "up",
        arrowdown: "down",
        arrowleft: "left",
        arrowright: "right",
        escape: "esc",
      };

      key = special[key] ?? key;

      parts.push(key);

      return parts.join("|");
    }
  }

  async function handleWheel(e: WheelEvent) {
    if (showSettings) {
      return;
    }

    if (!e.ctrlKey) {
      // e.preventDefault();
      const delta = e.deltaY > 0 ? -1 : 1;
      changeIndex(delta);
      return;
    }
    // e.preventDefault();
    const delta = e.deltaY > 0 ? -1 : 1;
    changeZoom(delta);
  }
  //#endregion

  //#region hooks

  //load settings
  useEffect(() => {
    (async () => {
      const store = await getStore("launch.json");
      if (store) {
        const files = await store.get<string[]>("pending_files");

        if (files && files.length > 0 && files[1]) {
          await handleOpenFileFromAssociation(files[1]);
          await store.close();
        } else {
          await store.delete("pending_files");
        }
      }

      const ea = await getSetting("enableAcrylic");
      const df = await getSetting("destinationFolder");
      setAcrylicBg(ea);
      setCopyDestination(df);
    })();

    return () => {};
  }, []);

  useEffect(() => {
    zoomRef.current = zoomLevel;
  }, [zoomLevel]);
  useEffect(() => {
    originalImageSizeRef.current = originalImageSize;
  }, [originalImageSize]);
  useEffect(() => {
    monitorRef.current = monitor;
  }, [monitor]);
  useEffect(() => {
    mediaRef.current = media;
  }, [media]);

  useEffect(() => {
    (async () => {
      const mon = await currentMonitor();
      setMonitor(mon);
    })();

    // const trigger = document.getElementById("drag-trigger");
    // if (!trigger) return;
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [media, showSettings]);

  useEffect(() => {
    window.addEventListener("wheel", handleWheel);
    window.addEventListener("keydown", handleKeyMaps, { capture: true });

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("keydown", handleKeyMaps, { capture: true });
    };
  }, [
    folderFiles,
    currentIndex,
    showDebugInfo,
    zoomLevel,
    originalImageSize,
    showSettings,
    alwaysOnTop,
  ]);

  useEffect(() => {
    if (folderFiles.length === 0) return;
    loadMedia(folderFiles[currentIndex], currentIndex);
    updateFileCache(currentIndex);
  }, [currentIndex]);
  //#endregion

  //#region Navigation
  async function updateWindowSize(imageWidth: number, imageHeight: number, zoom: number) {
    let finalWidth = Math.floor(imageWidth * zoom);
    let finalHeight = Math.floor(imageHeight * zoom);

    const minWidth = Math.max(200, Math.floor(imageWidth * 0.05));
    const minHeight = Math.max(150, Math.floor(imageHeight * 0.05));

    finalWidth = Math.max(minWidth, finalWidth);
    finalHeight = Math.max(minHeight, finalHeight);

    if (await appWindow.isFullscreen()) await appWindow.setFullscreen(false);

    if (finalWidth >= monitor.size.width) {
      finalWidth = monitor.size.width;
    }

    if (finalHeight >= monitor.size.height) {
      finalHeight = monitor.size.height;
    }

    setCurrentWindowSize({ width: finalWidth, height: finalHeight });
  }

  async function changeZoom(delta: number) {
    if (folderFiles.length === 0) return;

    if (delta > 0 && lockZoomRef.current) return;
    if (!originalImageSizeRef.current || !monitorRef.current) return;

    if (isZoomingRef.current) return;
    isZoomingRef.current = true;

    try {
      const zoomSteps = [
        0.05, 0.1, 0.15, 0.25, 0.33, 0.5, 0.67, 0.75, 1.0, 1.25, 1.5, 2.0, 2.5, 3.0, 4.0,
        5.0, 6.0, 8.0, 10.0,
      ];

      const current = zoomRef.current ?? 1.0;
      let currentStepIndex = zoomSteps.findIndex(
        (step) => Math.abs(step - current) < 0.01,
      );
      if (currentStepIndex === -1) {
        currentStepIndex = zoomSteps.reduce(
          (closest, step, index) =>
            Math.abs(step - current) < Math.abs(zoomSteps[closest] - current)
              ? index
              : closest,
          0,
        );
      }

      const newStepIndex = Math.max(
        0,
        Math.min(zoomSteps.length - 1, currentStepIndex + delta),
      );
      const newZoom = zoomSteps[newStepIndex];

      if (newZoom === current) return;

      const orig = originalImageSizeRef.current!;
      const mon = monitorRef.current!;
      const finalW = Math.floor(orig.width * newZoom);
      const finalH = Math.floor(orig.height * newZoom);

      const wouldBeFullscreen = finalW >= mon.size.width || finalH >= mon.size.height;

      if (delta > 0 && wouldBeFullscreen && mediaRef.current?.type === "video") {
        lockZoomRef.current = true;
      }

      zoomRef.current = newZoom;
      setZoomLevel(newZoom);

      await updateWindowSize(orig.width, orig.height, newZoom);
    } catch (err) {
      console.error("changeZoom error:", err);
    } finally {
      isZoomingRef.current = false;
    }
  }

  async function clearZoom() {
    if (!originalImageSize) return;

    lockZoomRef.current = false;
    zoomRef.current = 1.0;
    isZoomingRef.current = false;
    setZoomLevel(1.0);

    resetZoom();
    await updateWindowSize(originalImageSize.width, originalImageSize.height, 1.0);
  }

  async function resetZoom() {
    if (folderFiles.length === 0) return;

    if (!originalImageSize) return;
    const monitor = await currentMonitor();
    if (!monitor) return;

    // Reset to fit-to-screen zoom level
    const fitScale = Math.min(
      1,
      monitor.size.width / originalImageSize.width,
      monitor.size.height / originalImageSize.height,
    );

    // setZoomLevel(fitScale);
    await updateWindowSize(originalImageSize.width, originalImageSize.height, fitScale);
  }

  async function setZoomToActualSize() {
    if (folderFiles.length === 0) return;

    if (!originalImageSize) return;

    setZoomLevel(1.0);
    await updateWindowSize(originalImageSize.width, originalImageSize.height, 1.0);
  }

  async function changeIndex(delta: number) {
    if (folderFiles.length === 0) return;
    const newIndex = (currentIndex + delta + folderFiles.length) % folderFiles.length;
    await clearZoom();
    setCurrentIndex(newIndex);
  }

  //#endregion

  //#region File/Cache

  async function handleOpenFileFromAssociation(filePath: string) {
    if (!filePath) return;

    const files = await invoke<string[]>("scan_folder_alt", { path: filePath });

    if (files.length === 0) {
      console.log("No files found in folder");
      return;
    }

    if (media) {
      setFileCache([]);
    }

    setFolderFiles(files);
    const index = files.indexOf(filePath);
    console.log("Loading image at index:", index);
    setCurrentIndex(index);
  }

  async function handleOpenFile() {
    const selected = await open({
      multiple: false,
      defaultPath: media ? media.name : "",
      filters: [
        {
          name: "Media",
          extensions: ["jpg", "jpeg", "png", "gif", "mp4", "webm"],
        },
      ],
    });

    if (selected && typeof selected === "string") {
      const files = await invoke<string[]>("scan_folder_alt", { path: selected });

      if (files.length === 0) {
        console.log("No files found in folder");
        return;
      }

      if (media) {
        setFileCache([]);
        // clearCache();
      }

      setFolderFiles(files);
      const index = files.indexOf(selected);
      console.log("Loading image at index:", index);
      setCurrentIndex(index);
    }
  }

  async function copyCurrentMediaToFolder(): Promise<string> {
    if (copyDestination === "") {
      throw "No destination folder selected";
    }

    if (!media) {
      throw "No media selected";
    }

    return await invoke<string>("copy_media_to_folder", {
      srcPath: media.filePath,
      destFolder: copyDestination,
    });
  }

  async function loadMedia(path: string, index: number) {
    let info = await invoke<Media>("load_media", { path });

    const cached = getCached(index);
    let convertedSrc = cached ? cached.path : convertFileSrc(path);
    setMedia({
      src: convertedSrc,
      name: info.name,
      filePath: path,
      size: info.size,
      resolution: info.resolution,
      type: info.type,
    });
    // updateCacheStats();
    clearZoom();
  }

  async function handleImageLoad(width: number, height: number) {
    setOriginalImageSize({ width, height });

    if (!monitor) return;

    const fitScale = Math.min(
      1,
      monitor.size.width / width,
      monitor.size.height / height,
    );

    await updateWindowSize(width, height, fitScale);
  }

  function updateFileCache(targetIndex: number) {
    const preloadCount = 2;

    const start = Math.max(0, targetIndex - preloadCount);
    const end = Math.min(folderFiles.length - 1, targetIndex + preloadCount);

    setFileCache((prevCache) => {
      const newCache: CachedImage[] = [];

      for (let i = start; i <= end; i++) {
        const existing = prevCache.find((f) => f.index === i);
        if (existing) {
          newCache.push(existing);
        } else {
          newCache.push(createCachedImage(i, folderFiles[i]));
        }
      }

      // release old ones
      prevCache.forEach((item) => {
        if (!newCache.find((n) => n.index === item.index)) {
          item.img.src = "";
        }
      });

      return newCache;
    });
  }

  function getCached(index: number) {
    return fileCache.find((f) => f.index === index);
  }

  function createCachedImage(index: number, path: string): CachedImage {
    const src = convertFileSrc(path);
    const img = new Image();

    const cached: CachedImage = { index, path: src, img, bytes: 0 };

    img.onload = async () => {
      cached.bytes = (await invoke<number>("get_media_size", { path: path })) / 1024;
    };

    img.src = src;
    return cached;
  }
  //#endregion

  return (
    <div
      id="app-root"
      className={cn(
        acrylicBg ? "bg-black/40" : "bg-black",
        "pointer-events-none group peer page-content select-none items-center  justify-center text-white/80! flex-1 min-h-0 flex overflow-hidden!",
      )}
    >
      {media ? (
        <MediaViewer
          onDrag={setIsDraggin}
          src={media.src}
          type={media.type}
          zoom={zoomLevel}
          position={imagePosition}
          imageSize={originalImageSize}
          setPosition={setImagePosition}
          windowSize={currentWindowSize}
          onLoadDimensions={(width, height) => handleImageLoad(width, height)}
        />
      ) : (
        <div className="flex flex-col items-center gap-2">
          <ImageOff size={64} strokeWidth={1} className=" fill-white/20" />
          <span className=" font-bold text-xl">NO MEDIA</span>
          <span className="text-white/40 text-md font-light italic">
            press <kbd className="kbd kbd-xs">CTRL</kbd> +{" "}
            <kbd className="kbd kbd-xs">O</kbd> to open a new file
          </span>
        </div>
      )}

      {media && (
        <NavigationControls
          disabled={isDraggin || imageDragStarted || showSettings}
          onChangeIdex={changeIndex}
        />
      )}

      {showDebugInfo && (
        <InfoBox
          keymaps={keymaps}
          zoomLevel={zoomLevel}
          pan={imagePosition}
          media={media}
          indexInfo={{ current: currentIndex, total: folderFiles.length }}
          cacheMemory={getReadableCacheSize(fileCache)}
          currentWindowSize={currentWindowSize}
        />
      )}

      {showSettings && (
        <SettingsModal
          copyDestination={copyDestination}
          onChangeDestination={(path) => {
            (async () => {
              await setSetting("destinationFolder", path);
            })();
            setCopyDestination(path);
          }}
          setAcrylic={(value) => {
            (async () => {
              await setSetting("enableAcrylic", value);
            })();
            setAcrylicBg(value);
          }}
          acrylicActive={acrylicBg}
          onClose={() => {
            setShowSettings(false);
          }}
        />
      )}

      {alwaysOnTop && (
        <Pin
          size={64}
          className="absolute right-4 top-4 z-10 rotate-45 fill-white/40 opacity-45"
        />
      )}
    </div>
  );
}

export default App;
