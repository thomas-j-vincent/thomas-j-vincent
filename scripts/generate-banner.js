// generate-banner.js
// Builds the small SVG banner that normally sits above the graph:
// "N contributions in the last year" on the left, a
// "Contribution settings ⌄" button on the right.
//
// The button is drawn to look like GitHub's, but it cannot actually open
// a menu. GitHub loads this SVG through an <img> tag in your README, and
// an <img> tag cannot run JavaScript or respond to clicks — so this is a
// still image of the button, not a working one.

const fs = require("fs");
const path = require("path");

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
  const total = json.data.user.contributionsCollection.contributionCalendar.totalContributions;
  const totalFormatted = total.toLocaleString("en-GB");

  const label = `${totalFormatted} contributions in the last year`;

  // There's no text-measuring tool available here, so width is estimated
  // from character count. This is approximate, not exact, but close
  // enough for a banner like this.
  const CHAR_WIDTH = 7.2; // rough width per character at 14px font size
  const labelWidth = Math.ceil(label.length * CHAR_WIDTH);

  const HEIGHT = 32;
  const PADDING = 4;
  const BUTTON_LABEL = "Contribution settings";
  const BUTTON_PADDING_X = 12;
  const CHEVRON_GAP = 18;
  const buttonTextWidth = Math.ceil(BUTTON_LABEL.length * CHAR_WIDTH);
  const buttonWidth = buttonTextWidth + BUTTON_PADDING_X * 2 + CHEVRON_GAP;
  const GAP_BETWEEN = 16;

  const width = PADDING + labelWidth + GAP_BETWEEN + buttonWidth + PADDING;

  const buttonX = width - PADDING - buttonWidth;
  const buttonY = (HEIGHT - 26) / 2;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${HEIGHT}" width="${width}" height="${HEIGHT}" role="img">
<title>${label}</title>
<style>
  .label {
    font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
    font-size: 14px;
    fill: #1f2328;
  }
  .label strong { font-weight: 600; }
  .btn-text {
    font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
    font-size: 12px;
    fill: #24292f;
  }
  .chevron {
    stroke: #24292f;
    stroke-width: 1.4px;
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  @media (prefers-color-scheme: dark) {
    .label { fill: #e6edf3; }
    .btn-text { fill: #c9d1d9; }
    .chevron { stroke: #c9d1d9; }
  }
</style>
<text class="label" x="${PADDING}" y="${HEIGHT / 2 + 5}"><tspan font-weight="600">${totalFormatted}</tspan> contributions in the last year</text>
<text class="btn-text" x="${buttonX + BUTTON_PADDING_X}" y="${HEIGHT / 2 + 4}">${BUTTON_LABEL}</text>
<polyline class="chevron" points="${buttonX + buttonWidth - CHEVRON_GAP + 3},${HEIGHT / 2 - 3} ${buttonX + buttonWidth - CHEVRON_GAP + 8},${HEIGHT / 2 + 2} ${buttonX + buttonWidth - CHEVRON_GAP + 13},${HEIGHT / 2 - 3}"/>
</svg>
`;

  const outDir = path.join(__dirname, "..", "dist");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "contribution-banner.svg"), svg);
  console.log(`Wrote banner (${totalFormatted} contributions) to dist/contribution-banner.svg`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});