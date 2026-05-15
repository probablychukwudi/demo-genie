// Coolicons-style icons via lucide-react with stroke-width 1.5 + rounded caps.
// Single ergonomic wrapper so the whole app uses the same line treatment.
import type * as React from "react";
import {
  Wand2,
  Clock,
  ExternalLink,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Globe,
  Loader2,
  Square,
  Activity,
  Film,
  Upload,
  RefreshCw,
  Download,
  Share2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Play,
  Pause,
  Maximize2,
  Volume2,
  VolumeX,
  Copy,
  X,
  Zap,
  Camera,
  type LucideProps,
} from "lucide-react";

const baseProps = {
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

type IconComponent = (props: LucideProps) => React.ReactElement;

const wrap = (Component: typeof Wand2): IconComponent => {
  const Wrapped = (props: LucideProps) => <Component {...baseProps} {...props} />;
  Wrapped.displayName = Component.displayName ?? "Icon";
  return Wrapped;
};

export const Icon = {
  Wand: wrap(Wand2),
  Clock: wrap(Clock),
  External: wrap(ExternalLink),
  Settings: wrap(Settings),
  ChevronLeft: wrap(ChevronLeft),
  ChevronRight: wrap(ChevronRight),
  Sparkles: wrap(Sparkles),
  Globe: wrap(Globe),
  Loader: wrap(Loader2),
  Stop: wrap(Square),
  Activity: wrap(Activity),
  Film: wrap(Film),
  Upload: wrap(Upload),
  Refresh: wrap(RefreshCw),
  Download: wrap(Download),
  Share: wrap(Share2),
  Check: wrap(CheckCircle2),
  XCircle: wrap(XCircle),
  Alert: wrap(AlertCircle),
  Play: wrap(Play),
  Pause: wrap(Pause),
  Maximize: wrap(Maximize2),
  Volume: wrap(Volume2),
  VolumeMute: wrap(VolumeX),
  Copy: wrap(Copy),
  X: wrap(X),
  Zap: wrap(Zap),
  Camera: wrap(Camera),
};
