import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clientIp, rateLimit } from './rate-limit';

function req(headers: Record<string, string>): Request {
  return new Request('https://www.abessentiagh.com/api/x', { headers });
}

test('clientIp trusts x-vercel-forwarded-for over everything (edge-set, unforgeable)', () => {
  assert.equal(
    clientIp(
      req({
        'x-vercel-forwarded-for': '203.0.113.9',
        'x-forwarded-for': '1.2.3.4, 5.6.7.8',
        'x-real-ip': '9.9.9.9',
      })
    ),
    '203.0.113.9'
  );
});

test('clientIp takes the LAST x-forwarded-for entry, never the client-supplied first', () => {
  assert.equal(
    clientIp(req({ 'x-forwarded-for': 'spoofed.first, real.last' })),
    'real.last'
  );
  assert.equal(clientIp(req({ 'x-forwarded-for': 'only.one' })), 'only.one');
});

test('clientIp falls back to x-real-ip, then unknown', () => {
  assert.equal(clientIp(req({ 'x-real-ip': '10.0.0.1' })), '10.0.0.1');
  assert.equal(clientIp(req({})), 'unknown');
});

test('rateLimit allows up to the limit within a window, then denies', () => {
  const request = req({ 'x-vercel-forwarded-for': '198.51.100.1' });
  assert.equal(rateLimit(request, 't-allow', 3, 600).ok, true);
  assert.equal(rateLimit(request, 't-allow', 3, 600).ok, true);
  assert.equal(rateLimit(request, 't-allow', 3, 600).ok, true);

  const denied = rateLimit(request, 't-allow', 3, 600);
  assert.equal(denied.ok, false);
  assert.ok(denied.retryAfter > 0);
  assert.equal(denied.remaining, 0);
});

test('rateLimit counts different buckets and different IPs independently', () => {
  const ip1 = req({ 'x-vercel-forwarded-for': '198.51.100.2' });
  const ip2 = req({ 'x-vercel-forwarded-for': '198.51.100.3' });

  rateLimit(ip1, 't-ind-a', 1, 600);
  assert.equal(rateLimit(ip1, 't-ind-a', 1, 600).ok, false); // ip1 exhausted t-ind-a
  assert.equal(rateLimit(ip2, 't-ind-a', 1, 600).ok, true); // different ip, fresh bucket
  assert.equal(rateLimit(ip1, 't-ind-b', 1, 600).ok, true); // different bucket, fresh
});

test('rateLimit opens a fresh window once the old one has expired', () => {
  const request = req({ 'x-vercel-forwarded-for': '198.51.100.4' });
  const windowSeconds = 1;

  rateLimit(request, 't-reset', 1, windowSeconds);
  assert.equal(rateLimit(request, 't-reset', 1, windowSeconds).ok, false);

  const realNow = Date.now;
  try {
    Date.now = () => realNow() + windowSeconds * 1000 + 1;
    assert.equal(rateLimit(request, 't-reset', 1, windowSeconds).ok, true);
  } finally {
    Date.now = realNow;
  }
});
