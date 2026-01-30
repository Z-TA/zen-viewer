import { useEffect, useRef, useState } from "react";
import { Plyr } from "plyr-react";
import "plyr-react/plyr.css";

export default function VideoPlayer({ src }: { src: string }) {
  const ref = useRef(null);

  const [videoSrc, setVideoSrc] = useState<Plyr.SourceInfo | null>(null);

  useEffect(() => {
    const videoSrc: Plyr.SourceInfo = {
      type: "video",
      sources: [
        {
          src: src,
          type: "video/mp4",
        },
      ],
    };
    setVideoSrc(videoSrc);
  }, []);

  return (
    <div className="pointer-events-auto! w-full h-full object-contain">
      <Plyr
        id="video-player"
        ref={ref}
        source={videoSrc}
        loop
        options={{
          autoplay: true,
          muted: true,
          controls: ["play", "progress", "current-time", "mute", "volume", "fullscreen"],
        }}
      />
    </div>
  );
}
