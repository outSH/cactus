// TS_NODE_PROJECT=./tools/tsconfig.json node --trace-deprecation --experimental-modules --abort-on-uncaught-exception --loader ts-node/esm --experimental-specifier-resolution=node ./tools/custom-checks/check-package-json-fields.ts
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import { globby, Options as GlobbyOptions } from "globby";
import { RuntimeError } from "run-time-error";
import { isStdLibRecord } from "./is-std-lib-record";
import lernaCfg from "../../lerna.json" assert { type: "json" };
import Joi from "joi";

const schema = Joi.object({
  name: Joi.string()
    .pattern(new RegExp("^@hyperledger(-cacti)?/.*"))
    .required(),
  version: Joi.string().valid("2.1.0").required(),
  private: Joi.bool().valid(false),
  description: Joi.string().min(10).required(),
  keywords: Joi.array()
    .items(Joi.string())
    .has(Joi.valid("Hyperledger"))
    .has(Joi.valid("Cacti"))
    .required(),
  homepage: Joi.string()
    .valid("https://github.com/hyperledger-cacti/cacti#readme")
    .required(),
  bugs: Joi.object()
    .valid({
      url: "https://github.com/hyperledger-cacti/cacti/issues",
    })
    .required(),
  repository: Joi.object()
    .valid({
      type: "git",
      url: "git+https://github.com/hyperledger-cacti/cacti.git",
    })
    .required(),
  license: Joi.string().valid("Apache-2.0").required(),
  author: Joi.object()
    .valid({
      name: "Hyperledger Cacti Contributors",
      email: "cacti@lists.lfdecentralizedtrust.org",
      url: "https://www.lfdecentralizedtrust.org/projects/cacti",
    })
    .required(),
  files: Joi.array().items(Joi.string()), // required? dist?
  engines: Joi.object()
    .valid({
      node: ">=18",
      npm: ">=8",
    })
    .required(),
  publishConfig: Joi.object({ access: Joi.string().valid("public") })
    .unknown()
    .required(),
}).unknown();

export interface CheckCommonPackageFieldsArgs {
  readonly argv: string[];
  readonly env: NodeJS.ProcessEnv;
}

export default async function checkCommonPackageFields(
  req: CheckCommonPackageFieldsArgs,
): Promise<[boolean, string[]]> {
  const TAG = "[tools/check-common-package-fields.ts]";
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const SCRIPT_DIR = __dirname;
  const PROJECT_DIR = path.join(SCRIPT_DIR, "../../");

  console.log(`${TAG} SCRIPT_DIR=${SCRIPT_DIR}`);
  console.log(`${TAG} PROJECT_DIR=${PROJECT_DIR}`);

  if (!req) {
    throw new RuntimeError(`req parameter cannot be falsy.`);
  }
  if (!req.argv) {
    throw new RuntimeError(`req.argv cannot be falsy.`);
  }
  if (!req.env) {
    throw new RuntimeError(`req.env cannot be falsy.`);
  }

  const pkgJsonGlobPatterns = lernaCfg.packages.map((it: string) =>
    "./".concat(it).concat(`/package.json`),
  );
  console.log("Globbing lerna package patterns: ", pkgJsonGlobPatterns);

  const globbyOpts: GlobbyOptions = {
    cwd: PROJECT_DIR,
    ignore: ["**/node_modules"],
  };
  const includeGlobs = lernaCfg.packages.map((x) => x.concat("/package.json"));
  const pkgJsonPaths = await globby(includeGlobs, globbyOpts);

  const errors: string[] = [];
  const checks = pkgJsonPaths.map(async (pathRel) => {
    const filePathAbs = path.join(PROJECT_DIR, pathRel);
    const pkgJson: unknown = await fs.readJSON(filePathAbs);
    if (!pkgJson) {
      errors.push(`ERROR: ${pathRel} package.json cannot be empty.`);
      return;
    }
    if (!isStdLibRecord(pkgJson)) {
      return;
    }

    const { error: validationError } = schema.validate(pkgJson);
    if (validationError) {
      errors.push(
        `ERROR: ${pathRel} field check failed. Details: ${JSON.stringify(validationError.details)}`,
      );
      return;
    }

    // Check Hyperledger cacti dependncy versions
    // TODO - use it once all dependencies have common prefix (hyperledger-cacti, hyperledger/cacti, etc...)
    // const loosePkgJson = pkgJson as any;
    // const packageDependencies = {
    //   ...loosePkgJson.devDependencies,
    //   ...loosePkgJson.dependencies,
    // };
    // const cactiDependencies = Object.entries(packageDependencies).filter(
    //   ([key, value]) => key.startsWith("@hyperledger"),
    // );
    // cactiDependencies.forEach((entry) => {
    //   if (entry[1] !== "2.1.0") {
    //     errors.push(
    //       `ERROR: ${pathRel} dependency version invalid for ${entry[0]}, should be: ${"2.1.0"}}`,
    //     );
    //   }
    // });
  });

  await Promise.all(checks);

  return [errors.length === 0, errors];
}

checkCommonPackageFields({ argv: 1, env: 2 } as any)
  .then((errors) => console.log("Total:", errors[1].length, errors[1]))
  .catch((err) => console.error(err));
