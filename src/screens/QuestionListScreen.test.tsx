import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AppDataProvider } from '../state/AppDataContext';
import { QuestionListScreen } from './QuestionListScreen';

beforeEach(() => localStorage.clear());

function renderList() {
  return render(
    <AppDataProvider>
      <MemoryRouter initialEntries={['/chapter/古代オリエント/questions']}>
        <Routes>
          <Route path="/chapter/:chapter/questions" element={<QuestionListScreen />} />
        </Routes>
      </MemoryRouter>
    </AppDataProvider>,
  );
}

describe('QuestionListScreen', () => {
  it('初期表示では解答が隠れている', () => {
    renderList();
    expect(screen.queryByText('オリエント')).toBeNull();
  });

  it('一括トグルで解答が表示され、もう一度押すと隠れる', () => {
    renderList();
    fireEvent.click(screen.getByText('🔓 解答を表示'));
    expect(screen.getByText('オリエント')).toBeInTheDocument();

    fireEvent.click(screen.getByText('🔒 解答を隠す'));
    expect(screen.queryByText('オリエント')).toBeNull();
  });

  it('隠している時に行をタップすると、その問題だけ解答が出る', () => {
    renderList();
    expect(screen.queryByText('オリエント')).toBeNull();

    // No.1 の問題文をタップ（行のクリックが伝播する）
    fireEvent.click(screen.getByText(/ラテン語で日の昇るところ/));
    expect(screen.getByText('オリエント')).toBeInTheDocument();
    // 他の問題（No.2 メソポタミア）は隠れたまま
    expect(screen.queryByText('メソポタミア')).toBeNull();
  });

  it('絞り込みで「未回答」を外すと該当なしになる', () => {
    renderList();
    fireEvent.click(screen.getByText('絞り込み ▾'));
    fireEvent.click(screen.getByText('未回答'));
    expect(screen.getByText('該当する問題がありません')).toBeInTheDocument();
  });
});
