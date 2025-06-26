import { Type } from '@sinclair/typebox';
import { TypeCompiler } from '@sinclair/typebox/compiler';

describe('LimitSchema Validation with Different Max Values', () => {
  describe('Schema validation with different maximum limits', () => {
    test('should validate correctly with default limit of 60', () => {
      const LimitSchema = Type.Integer({
        minimum: 1,
        maximum: 60,
        title: 'Limit',
        description: 'Results per page',
      });
      const validator = TypeCompiler.Compile(LimitSchema);

      expect(validator.Check(1)).toBe(true);
      expect(validator.Check(30)).toBe(true);
      expect(validator.Check(60)).toBe(true);
      expect(validator.Check(61)).toBe(false);
      expect(validator.Check(100)).toBe(false);
    });

    test('should validate correctly with higher limit of 1000', () => {
      const LimitSchema = Type.Integer({
        minimum: 1,
        maximum: 1000,
        title: 'Limit',
        description: 'Results per page',
      });
      const validator = TypeCompiler.Compile(LimitSchema);

      expect(validator.Check(1)).toBe(true);
      expect(validator.Check(500)).toBe(true);
      expect(validator.Check(1000)).toBe(true);
      expect(validator.Check(1001)).toBe(false);
      expect(validator.Check(5000)).toBe(false);
    });

    test('should validate correctly with very high limit of 5000', () => {
      const LimitSchema = Type.Integer({
        minimum: 1,
        maximum: 5000,
        title: 'Limit',
        description: 'Results per page',
      });
      const validator = TypeCompiler.Compile(LimitSchema);

      expect(validator.Check(1)).toBe(true);
      expect(validator.Check(2500)).toBe(true);
      expect(validator.Check(5000)).toBe(true);
      expect(validator.Check(5001)).toBe(false);
      expect(validator.Check(10000)).toBe(false);
    });

    test('should validate correctly with minimum limit of 1', () => {
      const LimitSchema = Type.Integer({
        minimum: 1,
        maximum: 1,
        title: 'Limit',
        description: 'Results per page',
      });
      const validator = TypeCompiler.Compile(LimitSchema);

      expect(validator.Check(1)).toBe(true);
      expect(validator.Check(2)).toBe(false);
      expect(validator.Check(10)).toBe(false);
    });

    test('should reject zero and negative values regardless of max limit', () => {
      const LimitSchema = Type.Integer({
        minimum: 1,
        maximum: 1000,
        title: 'Limit',
        description: 'Results per page',
      });
      const validator = TypeCompiler.Compile(LimitSchema);

      expect(validator.Check(0)).toBe(false);
      expect(validator.Check(-1)).toBe(false);
      expect(validator.Check(-100)).toBe(false);
    });

    test('should reject non-integer values', () => {
      const LimitSchema = Type.Integer({
        minimum: 1,
        maximum: 100,
        title: 'Limit',
        description: 'Results per page',
      });
      const validator = TypeCompiler.Compile(LimitSchema);

      expect(validator.Check(1.5)).toBe(false);
      expect(validator.Check('50')).toBe(false);
      expect(validator.Check(null)).toBe(false);
      expect(validator.Check(undefined)).toBe(false);
      expect(validator.Check({})).toBe(false);
    });
  });
});
