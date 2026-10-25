import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createStaticServer } from "../scripts/dev-server.mjs";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("project structure contains entry HTML, separated CSS/JS, docs, assets, and scripts", () => {
  const expectedPaths = [
    "index.html",
    "src/styles/main.css",
    "src/js/app.js",
    "assets/preview.svg",
    "docs/technical-reference.md",
    "scripts/dev-server.mjs",
    "scripts/build.mjs",
  ];

  for (const rel of expectedPaths) {
    assert.equal(fs.existsSync(path.join(ROOT_DIR, rel)), true, `Expected ${rel} to exist`);
  }

  assert.equal(
    fs.existsSync(path.join(ROOT_DIR, "TowerStudio.html")),
    false,
    "Duplicate TowerStudio.html should not exist"
  );
});

test("index.html links external stylesheet and application script cleanly", () => {
  const html = fs.readFileSync(path.join(ROOT_DIR, "index.html"), "utf8");
  assert.match(html, /<link\s+rel="stylesheet"\s+href="\.\/src\/styles\/main\.css">/);
  assert.match(html, /<script\s+src="\.\/src\/js\/app\.js"><\/script>/);
  assert.doesNotMatch(html, /<style>/);
  assert.match(html, /three\.js\/r128\/three\.min\.js/);
});

test("static dev server serves index.html, CSS, and JS with 200 status codes", async () => {
  const server = createStaticServer(ROOT_DIR);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const htmlRes = await fetch(`${baseUrl}/`);
    assert.equal(htmlRes.status, 200);
    assert.match(htmlRes.headers.get("content-type") || "", /text\/html/);

    const cssRes = await fetch(`${baseUrl}/src/styles/main.css`);
    assert.equal(cssRes.status, 200);
    assert.match(cssRes.headers.get("content-type") || "", /text\/css/);

    const jsRes = await fetch(`${baseUrl}/src/js/app.js`);
    assert.equal(jsRes.status, 200);
    assert.match(jsRes.headers.get("content-type") || "", /text\/javascript/);
  } finally {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  }
});
