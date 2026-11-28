import test from "node:test";
import { runChecks } from "../scripts/test-checks.js";
import { checks as documentation } from "./documentation.checks.js";
import { checks as inspector } from "./inspector-ui.checks.js";
import { checks as samples } from "./samples.checks.js";
import { checks as units } from "./units.checks.js";

test("sample designs and property views", () => runChecks(samples));
test("documentation, inspector, and units", () => runChecks([...documentation, ...inspector, ...units]));
