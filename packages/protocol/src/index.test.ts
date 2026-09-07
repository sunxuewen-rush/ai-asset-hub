import { describe, expect, it } from 'bun:test';
import { protocolVersion } from './index.js';

describe('protocol package scaffold', () => {
  it('exports a version placeholder', () => {
    expect(protocolVersion).toBe('0.1.0');
  });
});
