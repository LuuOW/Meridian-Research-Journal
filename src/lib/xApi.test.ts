import { test } from "node:test";
import assert from "node:assert";
import {
  percentEncode,
  generateOAuth1Header,
  clearInvalidRefreshTokens,
  setInMemoryOAuth2Tokens,
  refreshOAuth2AccessToken,
  getOAuth2Tokens,
} from "./xApi";

test("percentEncode encodes according to RFC 3986", () => {
  assert.strictEqual(percentEncode("hello world!"), "hello%20world%21");
  assert.strictEqual(percentEncode("test@example.com"), "test%40example.com");
  assert.strictEqual(percentEncode("a+b=c"), "a%2Bb%3Dc");
});

test("generateOAuth1Header generates valid OAuth 1.0a header", () => {
  const credentials = {
    apiKey: "dummy_key",
    apiSecretKey: "dummy_secret",
    accessToken: "dummy_token",
    accessTokenSecret: "dummy_token_secret",
  };
  const header = generateOAuth1Header("POST", "https://api.twitter.com/2/tweets", credentials);
  assert.ok(header.startsWith("OAuth "), "Header must start with OAuth ");
  assert.ok(header.includes('oauth_consumer_key="dummy_key"'), "Must include consumer key");
  assert.ok(header.includes('oauth_token="dummy_token"'), "Must include access token");
  assert.ok(header.includes("oauth_signature="), "Must include signature");
  assert.ok(header.includes('oauth_signature_method="HMAC-SHA1"'), "Must use HMAC-SHA1");
});

test("refreshOAuth2AccessToken suppresses infinite error loops on unauthorized_client", async () => {
  clearInvalidRefreshTokens();
  
  // Set in-memory token with dummy refresh token
  setInMemoryOAuth2Tokens("expired_access_token", "invalid_refresh_token_test_123");
  
  // First refresh will trigger network call which fails and adds to invalidRefreshTokens
  const token1 = await refreshOAuth2AccessToken();
  assert.strictEqual(token1, null, "Should return null for invalid refresh");
  
  // Second refresh should immediately return null without network request because token is marked invalid
  const token2 = await refreshOAuth2AccessToken();
  assert.strictEqual(token2, null, "Subsequent refresh must return null without re-attempting");
  
  // getOAuth2Tokens() should return null after verified expiration & invalidation to allow fallback
  const currentTokens = getOAuth2Tokens();
  assert.strictEqual(currentTokens, null, "Should return null when expired and refresh token is invalid");
  
  clearInvalidRefreshTokens();
});
