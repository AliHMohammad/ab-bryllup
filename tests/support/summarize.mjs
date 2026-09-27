// Sammenfatter Playwright-JSON til en kort liste, så resultatet kan læses hurtigt.
import { readFileSync } from 'node:fs';

const report = JSON.parse(readFileSync(process.argv[2], 'utf8'));
let passed = 0;
let failed = 0;
let skipped = 0;
const failures = [];

const walk = (suite) => {
  (suite.suites ?? []).forEach(walk);
  (suite.specs ?? []).forEach((spec) => {
    spec.tests.forEach((t) => {
      const last = t.results.at(-1);
      const status = last?.status;
      if (t.status === 'skipped' || status === 'skipped') return skipped++;
      if (status === 'passed') return passed++;
      failed++;
      failures.push({
        project: t.projectName,
        title: `${suite.title} › ${spec.title}`,
        error: (last?.error?.message ?? '')
          .replace(/\u001b\[[0-9;]*m/g, '')
          .split('\n')
          .slice(0, 6)
          .join('\n    '),
      });
    });
  });
};

report.suites.forEach(walk);

for (const f of failures) {
  console.log(`\nFAIL [${f.project}] ${f.title}\n    ${f.error}`);
}
console.log(`\npassed=${passed} failed=${failed} skipped=${skipped}`);
