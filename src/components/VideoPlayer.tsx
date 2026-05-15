import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icons";

interface VideoPlayerProps {
  src: string;
  poster?: string;
  className?: string;
}

export function VideoPlayer({ src, poster, className = "" }: VideoPlayerProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showCenter, setShowCenter] = useState(true);
  const [isFs, setIsFs] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => {
      setProgress(v.currentTime);
      setDuration(v.duration || 0);
    };
    const onEnd = () => {
      setPlaying(false);
      setShowCenter(true);
    };
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onTime);
    v.addEventListener("ended", onEnd);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onTime);
      v.removeEventListener("ended", onEnd);
    };
  }, []);

  useEffect(() => {
    const onFs = () => setIsFs(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      void v.play();
      setPlaying(true);
      window.setTimeout(() => setShowCenter(false), 1800);
    } else {
      v.pause();
      setPlaying(false);
      setShowCenter(true);
    }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    if (!v || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    v.currentTime = Math.max(0, Math.min(duration, ratio * duration));
  };

  const toggleFs = async () => {
    const el = wrapRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      await el.requestFullscreen?.();
    } else {
      await document.exitFullscreen?.();
    }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const fmt = (t: number) => {
    if (!isFinite(t)) return "0:00";
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div
      ref={wrapRef}
      className={`relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-black ${className}`}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        playsInline
        preload="metadata"
        className="h-full w-full object-cover"
        onClick={toggle}
      />

      {showCenter && (
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Pause" : "Play"}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex h-16 w-16 items-center justify-center rounded-full bg-background/80 text-foreground backdrop-blur transition hover:scale-105 hover:bg-background"
        >
          {playing ? <Icon.Pause className="h-7 w-7" /> : <Icon.Play className="h-7 w-7 translate-x-0.5" />}
        </button>
      )}

      {/* Brand watermark */}
      <div className="pointer-events-none absolute bottom-12 right-3 flex items-center gap-1 text-[11px] font-medium tracking-tight text-accent/50">
        <Icon.Zap className="h-3 w-3" /> DemoGenie
      </div>

      {/* Control bar */}
      <div className={`absolute inset-x-0 bottom-0 flex items-center gap-3 bg-gradient-to-t from-black/85 to-transparent px-3 pb-2 pt-6 ${isFs ? "opacity-100" : ""}`}>
        <button onClick={toggle} aria-label="Play/pause" className="text-foreground/90 hover:text-foreground">
          {playing ? <Icon.Pause className="h-4 w-4" /> : <Icon.Play className="h-4 w-4" />}
        </button>
        <div
          className="group relative h-1.5 flex-1 cursor-pointer rounded-full bg-foreground/15"
          onClick={seek}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-accent"
            style={{ width: duration ? `${(progress / duration) * 100}%` : "0%" }}
          />
        </div>
        <span className="font-mono text-[11px] tabular-nums text-foreground/80">
          {fmt(progress)} / {fmt(duration)}
        </span>
        <button onClick={toggleMute} aria-label="Mute" className="text-foreground/90 hover:text-foreground">
          {muted ? <Icon.VolumeMute className="h-4 w-4" /> : <Icon.Volume className="h-4 w-4" />}
        </button>
        <button onClick={toggleFs} aria-label="Fullscreen" className="text-foreground/90 hover:text-foreground">
          <Icon.Maximize className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
