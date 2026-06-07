// One-off: capture crisp hero screenshots of our live portfolio sites into
// public/portfolio/. Uses the globally-installed puppeteer. Run:
//   node scripts/capture-portfolio.mjs
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire("C:/Users/blayk/node_modules/");
const puppeteer = require("puppeteer");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, "..", "public", "portfolio");
mkdirSync(OUT, { recursive: true });

const SITES = [
  { file: "wasterescuekc.jpg", url: "https://wasterescuekc.com" },
  { file: "rg158-venue.jpg", url: "https://rg158-venue.pages.dev" },
  { file: "tiny-home-wellness-resort.jpg", url: "https://tiny-home-wellness-resort.pages.dev" },
  { file: "iddisolutions.jpg", url: "https://iddisolutions.net" },
];

// 16:10 hero crop. 1.5x scale keeps text crisp while staying light as JPEG.
const WIDTH = 1600;
const HEIGHT = 1000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  headless: "new",
  defaultViewport: { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1.5 },
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--hide-scrollbars"],
});

for (const site of SITES) {
  const page = await browser.newPage();
  try {
    await page.goto(site.url, { waitUntil: "networkidle2", timeout: 60000 });
    // Trigger any lazy-loaded hero media, then return to top.
    await page.evaluate(async () => {
      const step = window.innerHeight;
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 150));
      }
      window.scrollTo(0, 0);
    });
    await sleep(1500); // settle animations + decode images
    const dest = path.join(OUT, site.file);
    await page.screenshot({ path: dest, type: "jpeg", quality: 82, clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT } });
    console.log("captured", site.file);
  } catch (e) {
    console.error("FAILED", site.url, e.message);
  } finally {
    await page.close();
  }
}

await browser.close();
console.log("done");
