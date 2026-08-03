// Parity harness helper — dumps the JS canonical engine's output for a batch of
// cases so the Python mirror can be compared against it (see test_parity.py).
//
// Usage:
//   node parity_dump.mjs <cases.json> <abs/path/to/scoring.js> <mode>
//     mode = "answers"  -> cases: [{retailer, answers}]
//                          out:   [{dimensions:{d:{status,numeric,hardGate}},
//                                   topBlockers, verdict, timeline, overallStatus}]
//     mode = "statuses" -> cases: [{retailer, statuses:{dim:status}}]
//                          out:   [{topBlockers, verdict, timeline, overallStatus}]
//
// Only the substantive, cross-engine-comparable fields are emitted. The advisory
// findings/fix prose is intentionally excluded: the Python mirror condenses it and
// it is not part of the parity contract (score, grade/verdict, gates, blockers are).
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const casesPath = process.argv[2];
const scoringPath = process.argv[3];
const mode = process.argv[4];

const cases = JSON.parse(readFileSync(casesPath, 'utf8'));
const eng = await import(pathToFileURL(scoringPath).href);
const { computeScores, getTopBlockers, getOverallVerdict, DIMENSIONS } = eng;

function aggOf(scores, retailer) {
  const v = getOverallVerdict(scores, retailer);
  return {
    topBlockers: getTopBlockers(scores),
    verdict: v.verdict,
    timeline: v.timeline,
    overallStatus: v.overallStatus,
  };
}

let out;
if (mode === 'answers') {
  out = cases.map(({ retailer, answers }) => {
    const scores = computeScores(answers, retailer);
    const dimensions = {};
    for (const d of DIMENSIONS) {
      dimensions[d] = {
        status: scores[d].status,
        numeric: scores[d].numeric,
        hardGate: Boolean(scores[d].hardGate),
      };
    }
    return { dimensions, ...aggOf(scores, retailer) };
  });
} else if (mode === 'statuses') {
  out = cases.map(({ retailer, statuses }) => {
    const scores = {};
    for (const [d, s] of Object.entries(statuses)) scores[d] = { status: s };
    return aggOf(scores, retailer);
  });
} else {
  process.stderr.write(`unknown mode: ${mode}\n`);
  process.exit(2);
}
process.stdout.write(JSON.stringify(out));
