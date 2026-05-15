import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const CLIENT_DIR = path.join(ROOT, "dist", "client");
const SERVER_ENTRY = path.join(ROOT, "dist", "server", "index.js");

const routes = [
  "/",
  "/history",
  "/usage",
  "/settings",
  "/preview/heygen-demo",
  "/preview/prisma-api",
  "/preview/linear-ai",
  "/preview/supportflow-training",
  "/preview/venturedeck-investor",
];

function outputPathForRoute(route) {
  if (route === "/") return path.join(CLIENT_DIR, "index.html");
  return path.join(CLIENT_DIR, route.replace(/^\//, ""), "index.html");
}

async function renderRoute(worker, route) {
  const response = await worker.fetch(
    new Request(`https://demo-genie.netlify.app${route}`),
    {},
    {},
  );
  if (!response.ok) {
    throw new Error(`Failed to prerender ${route}: ${response.status}`);
  }
  const html = await response.text();
  if (!html.includes("DemoGenie")) {
    throw new Error(`Prerendered ${route} did not contain DemoGenie markup.`);
  }
  return html;
}

const { default: worker } = await import(SERVER_ENTRY);

for (const route of routes) {
  const html = await renderRoute(worker, route);
  const filePath = outputPathForRoute(route);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, html);
  console.log(`Wrote ${path.relative(CLIENT_DIR, filePath)} from real SSR route ${route}`);
}

await fs.writeFile(
  path.join(CLIENT_DIR, "_redirects"),
  [
    "/api/settings /.netlify/functions/settings 200",
    "/api/heygen-live-generation /.netlify/functions/heygen-live-generation 200",
    "/api/heygen-video-status /.netlify/functions/heygen-video-status 200",
    "/api/save-generation /.netlify/functions/save-generation 200",
    "/* /index.html 200",
    "",
  ].join("\n"),
);
