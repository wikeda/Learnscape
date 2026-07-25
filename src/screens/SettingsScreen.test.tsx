import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { AppDataProvider } from '../state/AppDataContext';
import { SettingsScreen } from './SettingsScreen';

const NOTE = 'この端末は振動に対応していません';
const STORAGE_KEY = 'learnscape:data';

function setVibrate(fn: unknown) {
  Object.defineProperty(navigator, 'vibrate', { value: fn, configurable: true, writable: true });
}

function renderScreen() {
  return render(<AppDataProvider><SettingsScreen /></AppDataProvider>);
}

beforeEach(() => {
  localStorage.clear();
  setVibrate(vi.fn());
});

afterEach(() => {
  Reflect.deleteProperty(navigator, 'vibrate');
  vi.restoreAllMocks();
});

describe('SettingsScreen の振動フィードバック', () => {
  it('項目が表示され、既定はONである', () => {
    renderScreen();
    expect(screen.getByText('振動フィードバック')).toBeInTheDocument();
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(saved.settings.hapticEnabled).toBe(true);
  });

  it('OFFを押すと設定に保存される', () => {
    renderScreen();
    const row = screen.getByText('振動フィードバック').parentElement!;
    fireEvent.click(within(row).getByText('OFF'));
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(saved.settings.hapticEnabled).toBe(false);
  });

  it('対応端末では注記を出さない', () => {
    renderScreen();
    expect(screen.queryByText(NOTE)).not.toBeInTheDocument();
  });

  it('非対応端末では注記を出す', () => {
    // 行ごと隠すと「なぜ無効なのか」が伝わらないため、表示したうえで理由を書く
    Reflect.deleteProperty(navigator, 'vibrate');
    renderScreen();
    expect(screen.getByText(NOTE)).toBeInTheDocument();
  });
});

describe('SettingsScreen の区分表示', () => {
  it('項目が表示され、既定はONである', () => {
    renderScreen();
    expect(screen.getByText('区分表示')).toBeInTheDocument();
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(saved.settings.showSections).toBe(true);
  });

  it('OFFにすると設定に保存される', () => {
    renderScreen();
    const row = screen.getByText('区分表示').parentElement!;
    fireEvent.click(within(row).getByText('OFF'));
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(saved.settings.showSections).toBe(false);
  });
});

describe('SettingsScreen のコンテンツ読み込み', () => {
  it('「コンテンツ」セクションが表示され、初期搭載コンテンツが一覧される', () => {
    renderScreen();
    expect(screen.getByText('コンテンツ')).toBeInTheDocument();
    expect(screen.getByText('コンテンツを読み込む（JSON）')).toBeInTheDocument();
    expect(screen.getAllByText(/初期搭載/).length).toBeGreaterThanOrEqual(2);
  });

  it('不正なJSONファイルを読み込むとエラー表示され、コンテンツは追加されない', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    renderScreen();
    const before = screen.getAllByText(/初期搭載/).length;

    const inputs = document.querySelectorAll('input[type="file"]');
    const contentInput = inputs[0] as HTMLInputElement;
    const file = new File(['not valid json'], 'bad.json', { type: 'application/json' });
    fireEvent.change(contentInput, { target: { files: [file] } });

    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
    expect(alertSpy).toHaveBeenCalledWith(expect.stringMatching(/JSONの読み込みに失敗しました/));
    expect(screen.getAllByText(/初期搭載/).length).toBe(before);
  });

  it('schemaVersionが未知のコンテンツJSONを読み込むとエラー表示される', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    renderScreen();

    const inputs = document.querySelectorAll('input[type="file"]');
    const contentInput = inputs[0] as HTMLInputElement;
    const bad = JSON.stringify({ schemaVersion: 999, id: 'x', title: 'X', questions: [] });
    const file = new File([bad], 'bad-content.json', { type: 'application/json' });
    fireEvent.change(contentInput, { target: { files: [file] } });

    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
    expect(alertSpy).toHaveBeenCalledWith(expect.stringMatching(/コンテンツの読み込みに失敗しました/));
  });
});
