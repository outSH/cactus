#!/usr/bin/env node

//  TS_NODE_PROJECT=tools/tsconfig.json node --experimental-modules --abort-on-uncaught-exception --loader ts-node/esm --experimental-specifier-resolution=node ./tools/convert-import-extensions.ts

import * as fs from "fs/promises";
import * as fsSync from "fs";
import * as path from "path";

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
      /import\s*({[^}]*}|[^]*?)\s*from\s*['"]((?:\.{1,2}\/)+.*?)['"]/g,
      (_match, imports, modulePath) => {
        // Add .js extension if not present
        console.log("imports", imports);
        console.log("modulePath", modulePath);
        const resolvedPath = resolveRelativePath(filePath, modulePath);
        console.log("HODOR RESOLVED IMPORT:", resolvedPath);
        console.log("HODOR isDir", isDirectory(resolvedPath));

        if (isDirectory(resolvedPath)) {
          if (
            fsSync.existsSync(path.join(resolvedPath, "index.ts")) ||
            fsSync.existsSync(path.join(resolvedPath, "index.d.ts"))
          ) {
            console.log("index found");
            modulePath = path.join(modulePath, "index.js");
            console.log("new modulePath", modulePath);
          }
        }

        const fullPath = `${
          path.extname(modulePath) ? modulePath : `${modulePath}.js`
        }`;
        return `import ${imports} from "${fullPath}"`;
      },
    );

    const updatedDataExport = updatedData.replace(
      /export\s+({[^}]*}|[^]*?)\s*from\s*['"]((?:\.{1,2}\/)+.*?)['"]/g,
      (_match, exports, modulePath) => {
        // Add .js extension if not present
        const fullPath = `${
          path.extname(modulePath) ? modulePath : `${modulePath}.js`
        }`;
        return `export ${exports} from "${fullPath}"`;
      },
    );

    await fs.writeFile(filePath, updatedDataExport, "utf8");
    console.log(`Updated file: ${filePath}`);
  } catch (error) {
    console.error(`Error processing file: ${filePath}`, error);
  }
}

async function processDirectory(dirPath: string): Promise<void> {
  if (dirPath.includes("node_modules")) {
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

processFile(
  "./extensions/cactus-plugin-htlc-coordinator-besu/src/main/typescript/web-services/withdraw-counterparty-endpoint.ts",
).catch((error) => {
  console.error("Error:", error);
});
