import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AppDataProvider } from '../state/AppDataContext';
import { SettingsScreen } from './SettingsScreen';

const NOTE = 'この端末は振動に対応していません';

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
});

describe('SettingsScreen の振動フィードバック', () => {
  it('項目が表示され、既定はONである', () => {
    renderScreen();
    expect(screen.getByText('振動フィードバック')).toBeInTheDocument();
    const saved = JSON.parse(localStorage.getItem('whq:data')!);
    expect(saved.settings.hapticEnabled).toBe(true);
  });

  it('OFFを押すと設定に保存される', () => {
    renderScreen();
    fireEvent.click(screen.getByText('OFF'));
    const saved = JSON.parse(localStorage.getItem('whq:data')!);
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
