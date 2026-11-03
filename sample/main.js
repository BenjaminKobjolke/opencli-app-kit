import { runMain } from '../src/core/main_entry.js';
import { withSitePage } from '../src/core/session.js';

await runMain(async () => {
  await withSitePage({ appName: 'sample-app', session: 'site:sample' }, async () => {});
  return 0;
});
