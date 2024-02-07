#!/usr/bin/env node

//  TS_NODE_PROJECT=tools/tsconfig.json node  --trace-deprecation --experimental-modules --abort-on-uncaught-exception --loader ts-node/esm --experimental-specifier-resolution=node ./tools/convert-import-extensions.ts

import * as fs from "fs/promises";
import * as path from "path";

async function processFile(filePath: string) {
  try {
    const data = await fs.readFile(filePath, "utf8");

    const updatedData = data.replace(
      /import\s*({[^}]*}|[^]*?)\s*from\s*['"]((?:\.{1,2}\/)+.*?)['"]/g,
      (_match, imports, modulePath) => {
        // Add .js extension if not present
        const fullPath = `${
          path.extname(modulePath) ? modulePath : `${modulePath}.js`
        }`;
        return `import ${imports} from "${fullPath}"`;
      },
    );

    await fs.writeFile(filePath, updatedData, "utf8");
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

processDirectory("../").catch((error) => {
  console.error("Error:", error);
});
