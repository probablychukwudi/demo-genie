import fs from "node:fs";
import path from "node:path";

const CLIENT_DIR = path.join(process.cwd(), "dist", "client");
const ASSETS_DIR = path.join(CLIENT_DIR, "assets");

const files = fs.readdirSync(ASSETS_DIR);
const mainScript = files.find((file) => {
  if (!/^index-.*\.js$/.test(file)) return false;
  const contents = fs.readFileSync(path.join(ASSETS_DIR, file), "utf8");
  return contents.includes("hydrateRoot");
});
const stylesheet = files.find((file) => /^styles-.*\.css$/.test(file));

if (!mainScript || !stylesheet) {
  throw new Error("Could not find TanStack client entrypoint or stylesheet in dist/client/assets.");
}

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>DemoGenie</title>
    <meta
      name="description"
      content="Turn shipped product context into a polished, shareable AI video demo link."
    />
    <link rel="icon" href="/brand/demogenie-icon.png" type="image/png" />
    <link rel="stylesheet" href="/assets/${stylesheet}" />
    <script type="module" src="/assets/${mainScript}"></script>
  </head>
  <body></body>
</html>
`;

fs.writeFileSync(path.join(CLIENT_DIR, "index.html"), html);
fs.writeFileSync(
  path.join(CLIENT_DIR, "_redirects"),
  "/* /index.html 200\n",
);

console.log(`Wrote Netlify static shell with ${mainScript}`);
