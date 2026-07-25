import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { StackedBarChart } from './StackedBarChart';
import type { RoundRecord } from '../domain/types';

const rounds: RoundRecord[] = [
  { round: 1, timestamp: 1, counts: { mastered: 2, unsure: 8, failed: 10, unanswered: 11 }, masteryPct: 6 },
  { round: 2, timestamp: 2, counts: { mastered: 31, unsure: 0, failed: 0, unanswered: 0 }, masteryPct: 100 },
];

describe('StackedBarChart', () => {
  it('各回の%ラベルを描画', () => {
    const { container } = render(<StackedBarChart rounds={rounds} total={31} />);
    const texts = [...container.querySelectorAll('text')].map((t) => t.textContent);
    expect(texts).toContain('6%');
    expect(texts).toContain('100%');
  });

  it('rounds分の緑矩形がある', () => {
    const { container } = render(<StackedBarChart rounds={rounds} total={31} />);
    const greens = container.querySelectorAll('rect[fill="#3f9e5a"]');
    expect(greens.length).toBe(2);
  });
});
