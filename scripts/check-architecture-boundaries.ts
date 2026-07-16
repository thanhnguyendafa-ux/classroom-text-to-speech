import { checkArchitectureBoundaries } from "./architectureBoundaries";

const violations = await checkArchitectureBoundaries(process.cwd());
if (violations.length > 0) {
  for (const violation of violations) console.error(violation.file + ": " + violation.rule + " (" + violation.detail + ")");
  process.exitCode = 1;
} else {
  console.log("Architecture boundaries: no new violations");
}
