import esMain from "es-main";
import { checkOpenApiJsonSpecs } from "./check-open-api-json-specs";
import { checkPackageJsonSort } from "./check-package-json-sort";
import { checkCommonPackageFields } from "./check-package-json-fields";
import { checkSiblingDepVersionConsistency } from "./check-sibling-dep-version-consistency";

import {
  ICheckMissingNodeDepsRequest,
  checkMissingNodeDeps,
} from "./check-missing-node-deps";
import { getAllPkgDirs } from "./get-all-pkg-dirs";
import { runAttwOnTgz } from "./run-attw-on-tgz";
import { checkDependencyVersionConsistency } from "./check-dependency-version-consistency";

export async function runCustomChecks(
  argv: string[],
  env: NodeJS.ProcessEnv,
  version: string,
): Promise<void> {
  const TAG = "[tools/custom-checks/run-custom-checks.ts]";
  let overallSuccess = true;
  let overallErrors: string[] = [];

  console.log(`${TAG} Current NodeJS version is v${version}`);

  {
    const [success, errors] = await checkOpenApiJsonSpecs({ argv, env });
    overallErrors = overallErrors.concat(errors);
    overallSuccess = overallSuccess && success;
  }

  {
    const req = { argv, env };
    const [success, errors] = await checkSiblingDepVersionConsistency(req);
    overallErrors = overallErrors.concat(errors);
    overallSuccess = overallSuccess && success;
  }

  {
    const req = { argv, env };
    const [success, errors] = await checkPackageJsonSort(req);
    overallErrors = overallErrors.concat(errors);
    overallSuccess = overallSuccess && success;
  }

  {
    const [success, errors] = await checkCommonPackageFields({ argv, env });
    overallErrors = overallErrors.concat(errors);
    overallSuccess = overallSuccess && success;
  }

  {
    const { absolutePaths: pkgDirsToCheck } = await getAllPkgDirs();

    const req: ICheckMissingNodeDepsRequest = {
      pkgDirsToCheck,
    };
    const [success, errors] = await checkMissingNodeDeps(req);
    overallErrors = overallErrors.concat(errors);
    overallSuccess = overallSuccess && success;
  }

  {
    const [success, errors] = await checkDependencyVersionConsistency();
    overallErrors = overallErrors.concat(errors);
    overallSuccess = overallSuccess && success;
  }

  {
    const [success, errors] = await runAttwOnTgz();
    overallErrors = overallErrors.concat(errors);
    overallSuccess = overallSuccess && success;
  }

  if (!overallSuccess) {
    overallErrors.forEach((it) => console.error(it));
  } else {
    console.log(`${TAG} All Checks Passed OK.`);
  }
  const exitCode = overallSuccess ? 0 : 100;
  process.exit(exitCode);
}

if (esMain(import.meta)) {
  runCustomChecks(process.argv, process.env, process.versions.node);
}
