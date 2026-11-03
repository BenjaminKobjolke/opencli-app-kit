export async function pollUntil(page, step, { attempts = 15, delaySeconds = 2 } = {}) {
  let last = { done: false, value: undefined };
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    last = await step(attempt);
    if (last && last.done) return last;
    await page.wait(delaySeconds);
  }
  return last;
}
