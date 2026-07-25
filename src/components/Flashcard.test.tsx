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

  it('解答を表示したまま次の問題に切り替わっても、解答は再びマスクで隠れる', () => {
    const q2: Question = { id: 'S0002', section: '区分A', chapter: 'A', chapterNo: 1, question: 'Q2テキスト', answer: 'A2テキスト' };
    const { rerender } = render(<Flashcard key={q.id} question={q} onJudge={() => {}} />);
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    const ans = screen.getByText('Aテキスト');
    // 鮮明化: 解答のぼかしが消え、目隠しバー(隣接要素)が透明になる
    expect(ans.style.filter).toBe('blur(0px)');
    expect((ans.nextElementSibling as HTMLElement).style.opacity).toBe('0');

    // 親が key を変えてカードを作り直す（＝状態リセット）
    rerender(<Flashcard key={q2.id} question={q2} onJudge={() => {}} />);
    const next = screen.getByText('A2テキスト');
    // 再びぼかし＋目隠しバー復活（文字数も見えない）
    expect(next.style.filter).toBe('blur(10px)');
    expect((next.nextElementSibling as HTMLElement).style.opacity).toBe('1');
  });

  it('↓キーを2回押すと解説・ポイントまで鮮明化される', () => {
    const q3: Question = {
      id: 'S0003', section: '区分A', chapter: 'A', chapterNo: 1,
      question: 'Q3テキスト', answer: 'A3テキスト',
      explanation: '解説テキスト', point: 'ポイントテキスト',
    };
    render(<Flashcard question={q3} onJudge={() => {}} />);
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    // 1回目: 正解は鮮明化するが、解説はまだ目隠しバーで隠れている
    expect(screen.getByText('A3テキスト').style.filter).toBe('blur(0px)');
    const detailWrap = screen.getByText('解説テキスト').parentElement!;
    const detailMask = detailWrap.nextElementSibling as HTMLElement;
    expect(detailMask.style.opacity).not.toBe('0');

    fireEvent.keyDown(window, { key: 'ArrowDown' });
    // 2回目: 解説・ポイントも鮮明化（バーが透明に）
    expect(detailWrap.style.filter).toBe('blur(0px)');
    expect(detailMask.style.opacity).toBe('0');
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
