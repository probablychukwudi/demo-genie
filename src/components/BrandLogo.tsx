interface BrandLogoProps {
  variant?: "wordmark" | "icon";
  className?: string;
}

export function BrandLogo({ variant = "wordmark", className = "" }: BrandLogoProps) {
  const src = variant === "icon" ? "/brand/demogenie-icon.png" : "/brand/demogenie-wordmark.png";
  const alt = variant === "icon" ? "DemoGenie icon" : "DemoGenie";

  return <img src={src} alt={alt} className={`block object-contain ${className}`} />;
}
