import { Type } from '@sinclair/typebox';
import envSchema from 'env-schema';

describe('Environment Configuration for API_RESULTS_MAX_LIMIT', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('should use default API_RESULTS_MAX_LIMIT when not specified', () => {
    delete process.env.API_RESULTS_MAX_LIMIT;

    const schema = Type.Object({
      API_RESULTS_MAX_LIMIT: Type.Number({ default: 60, minimum: 1 }),
    });

    const env = envSchema({ schema, dotenv: false });
    expect(env.API_RESULTS_MAX_LIMIT).toBe(60);
  });

  test('should use configured API_RESULTS_MAX_LIMIT when specified', () => {
    process.env.API_RESULTS_MAX_LIMIT = '1000';

    const schema = Type.Object({
      API_RESULTS_MAX_LIMIT: Type.Number({ default: 60, minimum: 1 }),
    });

    const env = envSchema({ schema, dotenv: false });
    expect(env.API_RESULTS_MAX_LIMIT).toBe(1000);
  });

  test('should accept very high API_RESULTS_MAX_LIMIT values', () => {
    process.env.API_RESULTS_MAX_LIMIT = '5000';

    const schema = Type.Object({
      API_RESULTS_MAX_LIMIT: Type.Number({ default: 60, minimum: 1 }),
    });

    const env = envSchema({ schema, dotenv: false });
    expect(env.API_RESULTS_MAX_LIMIT).toBe(5000);
  });

  test('should accept minimum API_RESULTS_MAX_LIMIT value of 1', () => {
    process.env.API_RESULTS_MAX_LIMIT = '1';

    const schema = Type.Object({
      API_RESULTS_MAX_LIMIT: Type.Number({ default: 60, minimum: 1 }),
    });

    const env = envSchema({ schema, dotenv: false });
    expect(env.API_RESULTS_MAX_LIMIT).toBe(1);
  });

  test('should reject invalid API_RESULTS_MAX_LIMIT values', () => {
    process.env.API_RESULTS_MAX_LIMIT = '0';

    const schema = Type.Object({
      API_RESULTS_MAX_LIMIT: Type.Number({ default: 60, minimum: 1 }),
    });

    expect(() => {
      envSchema({ schema, dotenv: false });
    }).toThrow();
  });

  test('should reject negative API_RESULTS_MAX_LIMIT values', () => {
    process.env.API_RESULTS_MAX_LIMIT = '-10';

    const schema = Type.Object({
      API_RESULTS_MAX_LIMIT: Type.Number({ default: 60, minimum: 1 }),
    });

    expect(() => {
      envSchema({ schema, dotenv: false });
    }).toThrow();
  });

  test('should reject non-numeric API_RESULTS_MAX_LIMIT values', () => {
    process.env.API_RESULTS_MAX_LIMIT = 'invalid';

    const schema = Type.Object({
      API_RESULTS_MAX_LIMIT: Type.Number({ default: 60, minimum: 1 }),
    });

    expect(() => {
      envSchema({ schema, dotenv: false });
    }).toThrow();
  });
});
