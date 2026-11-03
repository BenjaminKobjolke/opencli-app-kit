// Builds in-page fetch scripts and decodes the data URLs returned by browser pages.

const DATA_URL_PATTERN = /^data:([^;,]*)[^,]*,(.*)$/s;

export function imageDataUrlScript(url, authHeader = '') {
  const init = authHeader
    ? `{ credentials: 'include', headers: { authorization: ${JSON.stringify(authHeader)} } }`
    : `{ credentials: 'include' }`;
  return `
    fetch(${JSON.stringify(url)}, ${init})
      .then((response) => (response.ok ? response.blob() : null))
      .then((blob) => (blob ? new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => resolve('');
        reader.readAsDataURL(blob);
      }) : ''))
      .catch(() => '')
  `;
}

export function decodeDataUrl(value) {
  const match = typeof value === 'string' ? value.match(DATA_URL_PATTERN) : null;
  if (!match) return null;

  const buffer = Buffer.from(match[2], 'base64');
  return buffer.length ? { mime: match[1], buffer } : null;
}

export function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
