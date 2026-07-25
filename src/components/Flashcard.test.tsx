import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Flashcard } from './Flashcard';
import type { Question } from '../domain/types';

const q: Question = { id: 'S0001', section: '区分A', chapter: 'A', chapterNo: 1, question: 'Qテキスト', answer: 'Aテキスト' };

describe('Flashcard', () => {
  it('問題文を表示する', () => {
    render(<Flashcard question={q} onJudge={() => {}} />);
    expect(screen.getByText('Qテキスト')).toBeInTheDocument();
  });

  it('→キーで known 判定', () => {
    const onJudge = vi.fn();
    render(<Flashcard question={q} onJudge={onJudge} />);
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(onJudge).toHaveBeenCalledWith('known');
  });

  it('↑キーで unsure, ←キーで failed', () => {
    const onJudge = vi.fn();
    render(<Flashcard question={q} onJudge={onJudge} />);
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(onJudge).toHaveBeenNthCalledWith(1, 'unsure');
    expect(onJudge).toHaveBeenNthCalledWith(2, 'failed');
  });

  it('↓キーで解答が表示される', () => {
    render(<Flashcard question={q} onJudge={() => {}} />);
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    const ans = screen.getByText('Aテキスト');
    expect(ans).toBeVisible();
  });

  it('解答を表示したまま次の問題に切り替わっても、解答は再びぼかされる', () => {
    const q2: Question = { id: 'S0002', section: '区分A', chapter: 'A', chapterNo: 1, question: 'Q2テキスト', answer: 'A2テキスト' };
    const { rerender } = render(<Flashcard key={q.id} question={q} onJudge={() => {}} />);
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(screen.getByText('Aテキスト')).toHaveStyle({ opacity: '1' });

    // 親が key を変えてカードを作り直す（＝状態リセット）
    rerender(<Flashcard key={q2.id} question={q2} onJudge={() => {}} />);
    const next = screen.getByText('A2テキスト');
    expect(next).toHaveStyle({ opacity: '0.25' });
    expect(next.style.filter).toBe('blur(9px)');
  });

  it('↓キーを2回押すと解説・ポイントまで鮮明化される', () => {
    const q3: Question = {
      id: 'S0003', section: '区分A', chapter: 'A', chapterNo: 1,
      question: 'Q3テキスト', answer: 'A3テキスト',
      explanation: '解説テキスト', point: 'ポイントテキスト',
    };
    render(<Flashcard question={q3} onJudge={() => {}} />);
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(screen.getByText('A3テキスト')).toHaveStyle({ opacity: '1' });
    const detailWrap = screen.getByText('解説テキスト').parentElement!;
    expect(detailWrap.style.opacity).not.toBe('1');

    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(detailWrap.style.opacity).toBe('1');
  });

  it('選択肢・解説・ポイントを表示する', () => {
    const q4: Question = {
      id: 'S0004', section: '区分A', chapter: 'A', chapterNo: 1,
      question: 'Q4テキスト', answer: 'A4テキスト',
      choices: 'ア／イ／ウ', explanation: '解説4', point: 'ポイント4',
    };
    render(<Flashcard question={q4} onJudge={() => {}} />);
    expect(screen.getByText('ア／イ／ウ')).toBeInTheDocument();
    expect(screen.getByText('解説4')).toBeInTheDocument();
    expect(screen.getByText(/ポイント4/)).toBeInTheDocument();
  });
});
