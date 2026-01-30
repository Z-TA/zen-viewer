import { cn } from "@/lib/utils";
import { ArrowLeft, ArrowRight } from "lucide-react";

export default function NavigationControls({
  disabled,
  onChangeIdex,
}: {
  disabled: boolean;
  onChangeIdex: (delta: number) => void;
}) {
  return (
    <>
      <div
        onClick={() => onChangeIdex(1)}
        className={cn(
          disabled ? "pointer-events-none" : "",
          "absolute w-[20%] right-0 inset-y-0 text-white opacity-0 hover:opacity-60 transition-colors cursor-pointer items-center justify-center flex",
        )}
      >
        <ArrowRight size={62} className=" h-full" />
      </div>

      <div
        onClick={() => onChangeIdex(-1)}
        className={cn(
          disabled ? "pointer-events-none" : "",
          "absolute w-[20%] left-0 inset-y-0 text-white opacity-0 hover:opacity-60 transition-colors cursor-pointer items-center justify-center flex",
        )}
      >
        <ArrowLeft size={62} className=" h-full" />
      </div>
    </>
  );
}
