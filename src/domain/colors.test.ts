import { describe, it, expect } from 'vitest';
import { masteryColor, STATE_COLORS } from './colors';

describe('masteryColor', () => {
  it('境界値', () => {
    expect(masteryColor(0)).toBe('#c9ccd6');   // 灰
    expect(masteryColor(1)).toBe('#e5736b');   // 赤
    expect(masteryColor(25)).toBe('#e5736b');
    expect(masteryColor(26)).toBe('#f0993c');  // 橙
    expect(masteryColor(50)).toBe('#f0993c');
    expect(masteryColor(51)).toBe('#9cc93f');  // 黄緑
    expect(masteryColor(75)).toBe('#9cc93f');
    expect(masteryColor(76)).toBe('#3f9e5a');  // 緑
    expect(masteryColor(99)).toBe('#3f9e5a');
    expect(masteryColor(100)).toBe('#e3b23c'); // 金
  });
});

describe('STATE_COLORS', () => {
  it('4状態の色', () => {
    expect(STATE_COLORS.mastered).toBe('#3f9e5a');
    expect(STATE_COLORS.unsure).toBe('#e6b800');
    expect(STATE_COLORS.failed).toBe('#e5736b');
    expect(STATE_COLORS.unanswered).toBe('#c9ccd6');
  });
});
