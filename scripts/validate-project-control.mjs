import { runProjectControlValidation } from "../src/project-control-cli.js";

await runProjectControlValidation(new URL("../", import.meta.url));
