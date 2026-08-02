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

  const CELL = 11;
  const GAP = 3;
  const STEP = CELL + GAP;
  const STAGGER = 0.012; // seconds added per square, in load order

  let index = 0;
  let rects = "";

  weeks.forEach((week, weekIdx) => {
    week.contributionDays.forEach((day, dayIdx) => {
      const x = weekIdx * STEP;
      const y = dayIdx * STEP;
      const delay = (index * STAGGER).toFixed(3);
      rects += `<rect class="cell" x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2" fill="${day.color}" style="animation-delay:${delay}s"><title>${day.date}: ${day.contributionCount} contributions</title></rect>\n`;
      index++;
    });
  });

  const width = weeks.length * STEP;
  const height = 7 * STEP;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img">
<title>${USERNAME}'s contribution graph</title>
<style>
  .cell {
    opacity: 0;
    animation: fadeInSq 0.35s ease-out forwards;
  }
  @keyframes fadeInSq {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @media (prefers-reduced-motion: reduce) {
    .cell { animation: none; opacity: 1; }
  }
</style>
${rects}</svg>
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