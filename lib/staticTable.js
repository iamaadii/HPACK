/**
 * RFC 7541 Appendix A - Static Table Definition
 * 61 hardcoded static entries (1-indexed)
 */
export const STATIC_TABLE = [
  null, // 0 index unused to allow 1-based indexing matching RFC
  { name: ':authority', value: '' },
  { name: ':method', value: 'GET' },
  { name: ':method', value: 'POST' },
  { name: ':path', value: '/' },
  { name: ':path', value: '/index.html' },
  { name: ':scheme', value: 'http' },
  { name: ':scheme', value: 'https' },
  { name: ':status', value: '200' },
  { name: ':status', value: '204' },
  { name: ':status', value: '206' },
  { name: ':status', value: '304' },
  { name: ':status', value: '400' },
  { name: ':status', value: '404' },
  { name: ':status', value: '500' },
  { name: 'accept-charset', value: '' },
  { name: 'accept-encoding', value: 'gzip, deflate' },
  { name: 'accept-language', value: '' },
  { name: 'accept-ranges', value: '' },
  { name: 'accept', value: '' },
  { name: 'access-control-allow-origin', value: '' },
  { name: 'age', value: '' },
  { name: 'allow', value: '' },
  { name: 'authorization', value: '' },
  { name: 'cache-control', value: '' },
  { name: 'content-disposition', value: '' },
  { name: 'content-encoding', value: '' },
  { name: 'content-language', value: '' },
  { name: 'content-length', value: '' },
  { name: 'content-location', value: '' },
  { name: 'content-range', value: '' },
  { name: 'content-type', value: '' },
  { name: 'cookie', value: '' },
  { name: 'date', value: '' },
  { name: 'etag', value: '' },
  { name: 'expect', value: '' },
  { name: 'expires', value: '' },
  { name: 'from', value: '' },
  { name: 'host', value: '' },
  { name: 'if-match', value: '' },
  { name: 'if-modified-since', value: '' },
  { name: 'if-none-match', value: '' },
  { name: 'if-range', value: '' },
  { name: 'if-unmodified-since', value: '' },
  { name: 'last-modified', value: '' },
  { name: 'link', value: '' },
  { name: 'location', value: '' },
  { name: 'max-forwards', value: '' },
  { name: 'proxy-authenticate', value: '' },
  { name: 'proxy-authorization', value: '' },
  { name: 'range', value: '' },
  { name: 'referer', value: '' },
  { name: 'refresh', value: '' },
  { name: 'retry-after', value: '' },
  { name: 'server', value: '' },
  { name: 'set-cookie', value: '' },
  { name: 'strict-transport-security', value: '' },
  { name: 'transfer-encoding', value: '' },
  { name: 'user-agent', value: '' },
  { name: 'vary', value: '' },
  { name: 'via', value: '' },
  { name: 'www-authenticate', value: '' }
];

/**
 * Lookup in static table
 * @returns { index: number, exact: boolean } | null
 */
export function lookupStaticTable(name, value) {
  const lowerName = name.toLowerCase();
  let nameMatchIndex = null;

  for (let i = 1; i <= 61; i++) {
    const entry = STATIC_TABLE[i];
    if (entry.name.toLowerCase() === lowerName) {
      if (entry.value === value) {
        return { index: i, exact: true };
      }
      if (nameMatchIndex === null) {
        nameMatchIndex = i;
      }
    }
  }

  if (nameMatchIndex !== null) {
    return { index: nameMatchIndex, exact: false };
  }

  return null;
}
