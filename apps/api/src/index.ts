import { existsSync } from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { buildConfigFromEnv, createApp } from './app.js';

function loadEnvFile() {
  let currentDir = process.cwd();

  for (let depth = 0; depth < 4; depth += 1) {
    const envPath = path.join(currentDir, '.env');

    if (existsSync(envPath)) {
      dotenv.config({ path: envPath });
      return envPath;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break;
    currentDir = parentDir;
  }

  return null;
}

async function main() {
  loadEnvFile();
  const config = await buildConfigFromEnv();
  const app = createApp(config);
  const host = '0.0.0.0';

  app.listen(config.port, host, () => {
    console.log(`BSM API listening on ${host}:${config.port}`);
  });
}

main().catch((error) => {
  console.error('Failed to start API', error);
  process.exit(1);
});
