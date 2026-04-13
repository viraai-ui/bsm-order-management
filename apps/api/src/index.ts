import { buildConfigFromEnv, createApp } from './app.js';

async function main() {
  const config = await buildConfigFromEnv();
  const app = createApp(config);

  app.listen(config.port, () => {
    console.log(`BSM API listening on port ${config.port}`);
  });
}

main().catch((error) => {
  console.error('Failed to start API', error);
  process.exit(1);
});
