// generate-graph.js
// Builds an SVG copy of the GitHub contribution graph.
// Each square fades in one after another when the SVG loads.
//
// Important: GitHub loads this SVG through an <img> tag in your README.
// An <img> tag does NOT run <script> tags inside the SVG.
// So the animation must be pure CSS, written directly into a <style> block.

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
        weeks {
          contributionDays {
            date
            contributionCount
            color
          }
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
  const weeks = json.data.user.contributionsCollection.contributionCalendar.weeks;

  const {
    CELL,
    GAP,
    STEP,
    OUTER_PADDING,
    MARGIN_LEFT,
    MARGIN_TOP,
    LEGEND_HEIGHT,
    computeGraphWidth,
  } = require("./graph-config");
  const STAGGER = 0.012; // seconds added per square, in load order
  const MONTH_NAMES = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  // OFFSET_X / OFFSET_Y shift every shape inward, away from the border.
  const OFFSET_X = OUTER_PADDING + MARGIN_LEFT;
  const OFFSET_Y = OUTER_PADDING + MARGIN_TOP;

  let index = 0;
  let rects = "";
  let monthLabels = "";
  let lastMonth = -1;

  weeks.forEach((week, weekIdx) => {
    const firstDay = week.contributionDays[0];
    if (firstDay) {
      const month = new Date(firstDay.date).getMonth();
      if (month !== lastMonth) {
        const x = OFFSET_X + weekIdx * STEP;
        monthLabels += `<text class="lbl" x="${x}" y="${OFFSET_Y - 6}">${MONTH_NAMES[month]}</text>\n`;
        lastMonth = month;
      }
    }

    week.contributionDays.forEach((day, dayIdx) => {
      const x = OFFSET_X + weekIdx * STEP;
      const y = OFFSET_Y + dayIdx * STEP;
      const delay = (index * STAGGER).toFixed(3);
      rects += `<rect class="cell" x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2" fill="${day.color}" style="animation-delay:${delay}s"><title>${day.date}: ${day.contributionCount} contributions</title></rect>\n`;
      index++;
    });
  });

  // Day-of-week labels, matching GitHub's own layout (Mon, Wed, Fri only)
  const dayLabels = `
<text class="lbl" x="${OUTER_PADDING}" y="${OFFSET_Y + 1 * STEP + 9}">Mon</text>
<text class="lbl" x="${OUTER_PADDING}" y="${OFFSET_Y + 3 * STEP + 9}">Wed</text>
<text class="lbl" x="${OUTER_PADDING}" y="${OFFSET_Y + 5 * STEP + 9}">Fri</text>
`;

  const contentGridHeight = MARGIN_TOP + 7 * STEP;
  const contentHeight = contentGridHeight + LEGEND_HEIGHT;

  const width = computeGraphWidth(weeks.length);
  const gridHeight = OFFSET_Y + 7 * STEP; // bottom of the last row of squares
  const height = contentHeight + OUTER_PADDING * 2;

  const legendColors = ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"];
  const legendStartX = width - OUTER_PADDING - legendColors.length * 14 - 40;
  const legendY = gridHeight + 12;
  let legend = `<text class="lbl" x="${legendStartX - 26}" y="${legendY + 9}">Less</text>\n`;
  legendColors.forEach((color, i) => {
    legend += `<rect x="${legendStartX + i * 14}" y="${legendY}" width="10" height="10" rx="2" fill="${color}"/>\n`;
  });
  legend += `<text class="lbl" x="${legendStartX + legendColors.length * 14 + 4}" y="${legendY + 9}">More</text>\n`;

  // The border that frames the whole graph, like the card GitHub draws
  // around the real contribution graph.
  const border = `<rect class="border" x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="6"/>\n`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img">
<title>${USERNAME}'s contribution graph</title>
<style>
  .cell {
    opacity: 0;
    animation: fadeInSq 0.35s ease-out forwards;
    stroke: rgba(27, 31, 36, 0.06);
    stroke-width: 1px;
  }
  @keyframes fadeInSq {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @media (prefers-reduced-motion: reduce) {
    .cell { animation: none; opacity: 1; }
  }
  .lbl {
    font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
    font-size: 9px;
    fill: #656d76;
  }
  .border {
    fill: none;
    stroke: #d0d7de;
    stroke-width: 1px;
  }
  @media (prefers-color-scheme: dark) {
    .border { stroke: #30363d; }
    .lbl { fill: #848d97; }
  }
</style>
${border}${monthLabels}${dayLabels}${rects}${legend}</svg>
`;

  const outDir = path.join(__dirname, "..", "dist");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "contribution-graph.svg"), svg);
  console.log(`Wrote ${index} squares to dist/contribution-graph.svg`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});