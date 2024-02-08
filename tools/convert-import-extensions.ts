#!/usr/bin/env node

//  TS_NODE_PROJECT=tools/tsconfig.json node --experimental-modules --abort-on-uncaught-exception --loader ts-node/esm --experimental-specifier-resolution=node ./tools/convert-import-extensions.ts

import * as fs from "fs/promises";
import * as fsSync from "fs";
import * as path from "path";
import ignore from "ignore";
import log from "loglevel";

// log.setDefaultLevel(level);
// log.setLevel(level, [persist]);

log.warn("Start");

function resolveRelativePath(basePath: string, relativePath: string): string {
  const baseDir = path.dirname(basePath);
  const resolvedPath = path.resolve(baseDir, relativePath);
  return resolvedPath;
}

function isDirectory(filePath: string) {
  try {
    const stats = fsSync.statSync(filePath);
    return stats.isDirectory();
  } catch (error) {
    return false;
  }
}

async function processFile(filePath: string) {
  try {
    const data = await fs.readFile(filePath, "utf8");

    const updatedData = data.replace(
      /(import|export)\s+({[^}]*}|[^]*?)\s+from\s+['"]((?:\.{1,2}\/)+.*?)['"]/g,
      (_match, verb, imports, modulePath) => {
        const resolvedPath = resolveRelativePath(filePath, modulePath);
        if (isDirectory(resolvedPath)) {
          if (
            fsSync.existsSync(path.join(resolvedPath, "index.ts")) ||
            fsSync.existsSync(path.join(resolvedPath, "index.d.ts"))
          ) {
            console.log("index found");
            // todo - flag skipDirUpdates
            // modulePath = path.join(modulePath, "index.js");
            console.log("new modulePath", modulePath);
            return _match;
          } else {
            console.error("INVALID PATH:", modulePath);
          }
          // TODO - parse epackage.json?
        }

        const fullPath = `${
          path.extname(modulePath) ? modulePath : `${modulePath}.js`
        }`;
        return `${verb} ${imports} from "${fullPath}"`;
      },
    );

    await fs.writeFile(filePath, updatedData, "utf8");
    console.log(`Updated file: ${filePath}`);
  } catch (error) {
    console.error(`Error processing file: ${filePath}`, error);
  }
}

async function processDirectory(dirPath: string): Promise<void> {
  const ignorefile = await fs.readFile(".gitignore", "utf8");
  const ig = ignore().add(ignorefile);
  console.log("dirPath", dirPath);
  if (dirPath !== "./" && ig.ignores(dirPath)) {
    log.error(`${dirPath} is ignored`);
    return; // Skip processing if path includes 'node_modules'
  }
  for (const file of await fs.readdir(dirPath)) {
    const filePath = path.join(dirPath, file);

    try {
      if ((await fs.stat(filePath)).isDirectory()) {
        await processDirectory(filePath);
      } else if (path.extname(file) === ".ts") {
        await processFile(filePath);
      }
    } catch (error) {
      console.error(`Error on file ${filePath}:`, error);
    }
  }
}

processDirectory("./").catch((error) => {
  console.error("Error:", error);
});

// --ignore ./.gitignore --logLevel info --cjs <Dir / File>
