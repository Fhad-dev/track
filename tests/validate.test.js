const test = require('node:test');
const assert = require('node:assert');
const { isValidUsername, isValidPassword, isValidEmail, isUuid, isSlug } = require('../backend/utils/validate');

test('isValidUsername accepts valid usernames', () => {
  assert.strictEqual(isValidUsername('Player_One1'), true);
  assert.strictEqual(isValidUsername('ab'), false); // too short
  assert.strictEqual(isValidUsername('has space'), false);
  assert.strictEqual(isValidUsername('semicolon;drop'), false);
});

test('isValidPassword enforces minimum length', () => {
  assert.strictEqual(isValidPassword('short'), false);
  assert.strictEqual(isValidPassword('longenough123'), true);
});

test('isValidEmail allows blank/optional and validates format', () => {
  assert.strictEqual(isValidEmail(''), true);
  assert.strictEqual(isValidEmail(undefined), true);
  assert.strictEqual(isValidEmail('not-an-email'), false);
  assert.strictEqual(isValidEmail('user@example.com'), true);
});

test('isUuid validates UUID format', () => {
  assert.strictEqual(isUuid('123e4567-e89b-12d3-a456-426614174000'), true);
  assert.strictEqual(isUuid('not-a-uuid'), false);
});

test('isSlug validates slug format', () => {
  assert.strictEqual(isSlug('kilo-141'), true);
  assert.strictEqual(isSlug('Kilo 141'), false);
  assert.strictEqual(isSlug('DROP TABLE'), false);
});
