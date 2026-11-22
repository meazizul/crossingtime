// Browser tests for the web app. `npm test` from ios-app/.
import { defineConfig, chromium } from "@playwright/test";
import { existsSync } from "node:fs";

// Which browser (tracker 27.33). The tests are no longer tied to one Mac:
//   1. GS_CHROME_PATH=/path/to/chrome   that browser, on any system;
//   2. Playwright's own Chromium, when it is installed (`npx playwright
//      install chromium`): the default on a new machine, Linux included;
//   3. otherwise the Google Chrome already on this Mac, as before, so no
//      download is needed where the tests have always run.
const MAC_CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
function browserPath() {
  if (process.env.GS_CHROME_PATH) return process.env.GS_CHROME_PATH;
  try { if (existsSync(chromium.executablePath())) return undefined; } catch (error) { /* not installed */ }
  return existsSync(MAC_CHROME) ? MAC_CHROME : undefined;
}

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    headless: true,
    baseURL: "http://127.0.0.1:8765/",
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    // Web Audio needs a real (fake) output device; these flags give Chrome one
    // and skip the user-gesture requirement so tones are scheduled.
    launchOptions: {
      executablePath: browserPath(),
      args: [
        "--autoplay-policy=no-user-gesture-required",
        "--use-fake-device-for-media-stream",
        "--use-fake-ui-for-media-stream"
      ]
    }
  },
  webServer: {
    command: "python3 -m http.server 8765 --directory www --bind 127.0.0.1",
    url: "http://127.0.0.1:8765/index.html",
    reuseExistingServer: true,
    stdout: "ignore",
    stderr: "ignore",
    timeout: 15_000
  }
});
