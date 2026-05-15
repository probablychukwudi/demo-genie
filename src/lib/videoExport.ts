export function filenameForVideo(productName: string | null | undefined) {
  const base = (productName || "demogenie-demo")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base || "demogenie-demo"}.mp4`;
}

export async function exportVideo(videoUrl: string, productName?: string | null) {
  const filename = filenameForVideo(productName);

  if (videoUrl.startsWith("/")) {
    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    return;
  }

  try {
    const response = await fetch(videoUrl);
    if (!response.ok) throw new Error("Video download failed");
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(videoUrl, "_blank", "noopener,noreferrer");
  }
}

export async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand("copy");
    textarea.remove();
    return ok;
  }
}
