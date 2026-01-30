import { FolderEdit } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";

export default function SettingsModal({
  onClose,
  copyDestination,
  onChangeDestination,
  acrylicActive = true,
  setAcrylic,
}: {
  copyDestination: string;
  onChangeDestination: (destination: string) => void;
  acrylicActive: boolean;
  setAcrylic: (acrylicBg: boolean) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [folderName, setFolderName] = useState(copyDestination);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    // Open modal properly
    if (!dialog.open) dialog.showModal();

    // ESC key triggers "cancel"
    const handleCancel = (e: Event) => {
      e.preventDefault(); // prevents default close so React controls it
      onClose();
    };

    // Fires when dialog closes (backdrop click or method="dialog")
    const handleClose = () => {
      onClose();
    };

    dialog.addEventListener("cancel", handleCancel);
    dialog.addEventListener("close", handleClose);

    return () => {
      dialog.removeEventListener("cancel", handleCancel);
      dialog.removeEventListener("close", handleClose);
    };
  }, [onClose]);

  // Open a selection dialog for image files
  async function handleClick() {
    const f = await open({
      multiple: false,
      directory: true,
      defaultPath: folderName,
      title: "Select a folder",
    });
    setFolderName((p) => f || p);
    onChangeDestination(f || folderName);
  }

  return (
    <dialog ref={dialogRef} onClose={(_) => onClose()} className="modal select-none">
      <div className="modal-box max-w-200 w-auto bg-base-200/10 backdrop-blur-2xl ring ring-white/20 flex flex-col! gap-2 shadow-black/70 shadow-2xl">
        <h3 className="font-bold text-lg mb-4">Settings</h3>

        <div className="fieldset flex items-center my-0.5 bg-white/5 ring ring-white/10 rounded-xs p-2 pl-2">
          <span className="w-50 text-md">Enable Acrylic Background:</span>
          <label className="toggle text-base-content">
            <input
              checked={!acrylicActive}
              onChange={(e) => setAcrylic(!e.currentTarget.checked)}
              type="checkbox"
            />
            <svg
              aria-label="enabled"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
            >
              <g
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeWidth="4"
                fill="none"
                stroke="#000000a3"
              >
                <path d="M20 6 9 17l-5-5"></path>
              </g>
            </svg>
            <svg
              aria-label="disabled"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#000000a3"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </label>
        </div>

        <div className="fieldset flex flex-col my-0.5 bg-white/5 ring ring-white/10 rounded-xs p-2 pl-2">
          <span className="w-60 text-md">Copy Destination:</span>

          <label className="flex h-full  cursor-pointer">
            <button
              onClick={handleClick}
              className=" flex gap-4 items-center justify-center p-2 w-80 h-full bg-black/40 rounded-r-none border-white/10 text-white/60 text-xs border border-r-0 rounded-xs outline-0 ring-0 m-0 hover:bg-black/60 active:bg-black/80 "
            >
              <FolderEdit size={20} />
              Select Folder
            </button>
            <div className="flex pl-2 pr-2 w-full border items-center bg-black/20 rounded-l-none border-white/10 rounded-xs">
              <span className="  text-white/40 text-xs italic font-light">
                {folderName || "..."}
              </span>
            </div>
          </label>
          <span className="text-xs ml-1 text-white/40  italic font-extralight">
            This will be the destination folder for your copied media files{" "}
            <kbd className="kbd kbd-xs">Ctrl</kbd> + <kbd className="kbd kbd-xs">S</kbd>
          </span>
        </div>
      </div>

      {/* Backdrop click closes dialog natively */}
      <form method="dialog" className="modal-backdrop cursor-default!">
        <button
          aria-label="close"
          className="bg-black/40 outline-none border-none backdrop-blur-xs cursor-default!"
        />
      </form>
    </dialog>
  );
}
