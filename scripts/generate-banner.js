// generate-banner.js
// Builds the small SVG banner that normally sits above the graph:
// "N contributions in the last year" on the left, a
// "Contribution settings v" button on the right, aligned to the same
// width as the graph produced by generate-graph.js.
//
// The button is drawn to look like GitHub's, but it cannot actually open
// a menu. GitHub loads this SVG through an <img> tag in your README, and
// an <img> tag cannot run JavaScript or respond to clicks — so this is a
// still image of the button, not a working one.

const fs = require("fs");
const path = require("path");
const { OUTER_PADDING, computeGraphWidth } = require("./graph-config");

const USERNAME = process.env.GH_USERNAME;
const TOKEN = process.env.GH_TOKEN;

if (!USERNAME || !TOKEN) {
  console.error("Set GH_USERNAME and GH_TOKEN environment variables.");
  process.exit(1);
}

const QUERY = `
query ($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks {
          firstDay
        }
      }
    }
  }
}`;

async function main() {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: QUERY, variables: { login: USERNAME } }),
  });

  if (!res.ok) {
    throw new Error(`GitHub API request failed: ${res.status} ${await res.text()}`);
  }

  const json = await res.json();
  const calendar = json.data.user.contributionsCollection.contributionCalendar;
  const total = calendar.totalContributions;
  const weekCount = calendar.weeks.length;
  const totalFormatted = total.toLocaleString("en-GB");

  // Match the graph's width exactly, so the two images line up when
  // stacked in your README.
  const width = computeGraphWidth(weekCount);
  const HEIGHT = 32;

  const BUTTON_LABEL = "Contribution settings";
  const BUTTON_PADDING_X = 12;
  const ICON_SIZE = 12;
  const ICON_GAP = 4; // small gap between the label text and the icon
  const CHAR_WIDTH = 7.2; // rough width per character at 14px font size

  const buttonTextWidth = Math.ceil(BUTTON_LABEL.length * CHAR_WIDTH * (12 / 14));
  const buttonWidth = BUTTON_PADDING_X + buttonTextWidth + ICON_GAP + ICON_SIZE + BUTTON_PADDING_X;
  const buttonHeight = 26;
  const buttonX = width - OUTER_PADDING - buttonWidth;
  const buttonY = (HEIGHT - buttonHeight) / 2;

  const iconX = buttonX + buttonWidth - BUTTON_PADDING_X - ICON_SIZE;
  const iconY = buttonY + (buttonHeight - ICON_SIZE) / 2;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${HEIGHT}" width="${width}" height="${HEIGHT}" role="img">
<title>${totalFormatted} contributions in the last year</title>
<style>
  .label {
    font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
    font-size: 14px;
    fill: #1f2328;
  }
  .btn-text {
    font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
    font-size: 12px;
    fill: #24292f;
  }
  .btn {
    fill: #f6f8fa;
    stroke: #d0d7de;
    stroke-width: 1px;
  }
  .chevron { fill: #57606a; }
  @media (prefers-color-scheme: dark) {
    .label { fill: #e6edf3; }
    .btn-text { fill: #c9d1d9; }
    .btn { fill: #21262d; stroke: #30363d; }
    .chevron { fill: #8b949e; }
  }
</style>
<text class="label" x="${OUTER_PADDING}" y="${HEIGHT / 2 + 5}"><tspan font-weight="600">${totalFormatted}</tspan> contributions in the last year</text>
<rect class="btn" x="${buttonX}" y="${buttonY}" width="${buttonWidth}" height="${buttonHeight}" rx="6"/>
<text class="btn-text" x="${buttonX + BUTTON_PADDING_X}" y="${HEIGHT / 2 + 4}">${BUTTON_LABEL}</text>
<g transform="translate(${iconX}, ${iconY})">
  <path class="chevron" fill-rule="evenodd" clip-rule="evenodd" d="M2.22 4.22a.75.75 0 0 1 1.06 0L6 6.94l2.72-2.72a.75.75 0 1 1 1.06 1.06L6.53 8.53a.75.75 0 0 1-1.06 0L2.22 5.28a.75.75 0 0 1 0-1.06Z"/>
</g>
</svg>
`;

  const outDir = path.join(__dirname, "..", "dist");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "contribution-banner.svg"), svg);
  console.log(`Wrote banner (${totalFormatted} contributions, width ${width}) to dist/contribution-banner.svg`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});