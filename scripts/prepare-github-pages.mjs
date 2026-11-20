import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const basePath = process.env.PUBLIC_BASE_PATH;
if (!basePath?.startsWith('/') || !basePath.endsWith('/')) {
  throw new Error('PUBLIC_BASE_PATH must be an absolute path ending in "/".');
}

const outputDirectory = path.resolve('dist');
const textExtensions = new Set(['.css', '.html', '.js', '.json', '.webmanifest']);
const rootAssetPath = /(["'`(])\/(assets\/|manifest\.webmanifest|offline\.html|sw\.js)/g;
const unprefixedRootAssetPath = new RegExp(rootAssetPath.source);

async function processDirectory(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await processDirectory(filePath);
      continue;
    }

    if (!textExtensions.has(path.extname(entry.name))) continue;
    const source = await readFile(filePath, 'utf8');
    let output = source.replace(rootAssetPath, (_match, boundary, assetPath) => `${boundary}${basePath}${assetPath}`);
    if (path.basename(filePath) === 'sw.js') {
      output = output.replace(/(["'`])\/(?=["'`])/g, (_match, quote) => `${quote}${basePath}`);
    }
    if (path.basename(filePath) === 'manifest.webmanifest') {
      output = output.replace(/("(?:start_url|scope)"\s*:\s*")\/(?=")/g, `$1${basePath}`);
    }
    if (unprefixedRootAssetPath.test(output)) {
      throw new Error(`Unprefixed root asset path remains in ${path.relative(outputDirectory, filePath)}.`);
    }
    if (output !== source) await writeFile(filePath, output);
  }
}

await processDirectory(outputDirectory);
