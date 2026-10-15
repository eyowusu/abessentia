import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getCanonicalSiteUrl, getSiteUrl, resolveCallbackUrl, withQueryParam } from './site';

function withSiteUrl(value: string | undefined, fn: () => void) {
  const prev = process.env.NEXT_PUBLIC_SITE_URL;
  if (value === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = value;
  try {
    fn();
  } finally {
    if (prev === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = prev;
  }
}

test('getSiteUrl prefers the configured canonical URL, trailing slash stripped', () => {
  withSiteUrl('https://www.abessentiagh.com/', () => {
    assert.equal(getSiteUrl('https://preview-abc.vercel.app'), 'https://www.abessentiagh.com');
  });
});

test('getSiteUrl falls back to the request origin, then localhost', () => {
  withSiteUrl(undefined, () => {
    assert.equal(getSiteUrl('http://localhost:3000'), 'http://localhost:3000');
    assert.equal(getSiteUrl('https://preview-abc.vercel.app'), 'https://preview-abc.vercel.app');
    assert.equal(getSiteUrl(null), 'http://localhost:3000');
    assert.equal(getSiteUrl('  '), 'http://localhost:3000');
  });
});

test('getCanonicalSiteUrl returns the production host when unconfigured', () => {
  withSiteUrl(undefined, () => {
    assert.equal(getCanonicalSiteUrl(), 'https://www.abessentiagh.com');
  });
  withSiteUrl('https://staging.abessentiagh.com/', () => {
    assert.equal(getCanonicalSiteUrl(), 'https://staging.abessentiagh.com');
  });
});

test('resolveCallbackUrl accepts a same-origin callback as given', () => {
  withSiteUrl('https://www.abessentiagh.com', () => {
    assert.equal(
      resolveCallbackUrl('https://www.abessentiagh.com/checkout/success', null),
      'https://www.abessentiagh.com/checkout/success'
    );
    // A relative path resolves against the site, so it is same-origin by construction.
    assert.equal(
      resolveCallbackUrl('/checkout/success', null),
      'https://www.abessentiagh.com/checkout/success'
    );
  });
});

test('resolveCallbackUrl falls back to the default when nothing is provided', () => {
  withSiteUrl('https://www.abessentiagh.com', () => {
    const expected = 'https://www.abessentiagh.com/checkout/success';
    assert.equal(resolveCallbackUrl(undefined, null), expected);
    assert.equal(resolveCallbackUrl('', null), expected);
    assert.equal(resolveCallbackUrl(42, null), expected);
  });
});

test('resolveCallbackUrl rejects a foreign host (open-redirect guard)', () => {
  withSiteUrl('https://www.abessentiagh.com', () => {
    const expected = 'https://www.abessentiagh.com/checkout/success';
    assert.equal(resolveCallbackUrl('https://evil.example/checkout/success', null), expected);
    // Same host but http - an https->http downgrade is still a different origin.
    assert.equal(resolveCallbackUrl('http://www.abessentiagh.com/checkout/success', null), expected);
    // Non-http schemes never carry our origin.
    assert.equal(resolveCallbackUrl('javascript:alert(1)', null), expected);
  });
});

test('withQueryParam appends with ? or & and encodes both sides', () => {
  assert.equal(withQueryParam('https://a.com/x', 'reference', 'abess-1'), 'https://a.com/x?reference=abess-1');
  assert.equal(withQueryParam('https://a.com/x?y=1', 'trxref', 'abess-1'), 'https://a.com/x?y=1&trxref=abess-1');
  assert.equal(withQueryParam('https://a.com/x', 'a b', 'c d'), 'https://a.com/x?a%20b=c%20d');
});
