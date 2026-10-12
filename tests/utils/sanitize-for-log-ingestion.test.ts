import { describe, it, expect } from 'vitest';
import { sanitizeForLogIngestion } from '../../src/utils/structured-logger.js';

describe('sanitizeForLogIngestion (BigQuery list-of-lists safety)', () => {
  it('preserves primitives, null, and undefined', () => {
    expect(sanitizeForLogIngestion('hello')).toBe('hello');
    expect(sanitizeForLogIngestion(123)).toBe(123);
    expect(sanitizeForLogIngestion(true)).toBe(true);
    expect(sanitizeForLogIngestion(null)).toBe(null);
    expect(sanitizeForLogIngestion(undefined)).toBe(undefined);
  });

  it('preserves flat 1D arrays', () => {
    const arr = ['a', 'b', 'c'];
    expect(sanitizeForLogIngestion(arr)).toEqual(['a', 'b', 'c']);
    const numArr = [1, 2, 3];
    expect(sanitizeForLogIngestion(numArr)).toEqual([1, 2, 3]);
  });

  it('serializes inner arrays when a 2D array / list of lists is detected', () => {
    const matrix = [
      ['1', '2'],
      ['3', '4'],
    ];
    const result = sanitizeForLogIngestion(matrix);
    expect(result).toEqual(['["1","2"]', '["3","4"]']);
  });

  it('handles nested objects containing 2D arrays (like matrix_multiply args)', () => {
    const input = {
      tool: 'matrix_multiply',
      a: [
        [1, 2],
        [3, 4],
      ],
      b: [
        [5, 6],
        [7, 8],
      ],
      metadata: {
        dimensions: [2, 2],
        rows: [['header1', 'header2']],
      },
    };

    const sanitized = sanitizeForLogIngestion(input) as Record<string, unknown>;
    expect(sanitized.tool).toBe('matrix_multiply');
    expect(sanitized.a).toEqual(['[1,2]', '[3,4]']);
    expect(sanitized.b).toEqual(['[5,6]', '[7,8]']);
    expect((sanitized.metadata as Record<string, unknown>).dimensions).toEqual([2, 2]);
    expect((sanitized.metadata as Record<string, unknown>).rows).toEqual(['["header1","header2"]']);
  });
});
