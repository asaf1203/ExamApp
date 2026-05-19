import { describe, it, expect } from 'vitest';

describe('Simple Math Tests', () => {
  it('should correctly add two numbers', () => {
    const sum = 1 + 1;
    expect(sum).toBe(2);
  });

  it('should correctly subtract two numbers', () => {
    const difference = 5 - 3;
    expect(difference).toBe(2);
  });
});
