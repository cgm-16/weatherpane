// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import userEvent from '@testing-library/user-event';
import { LocationUnsupported } from '../frontend/pages/location/ui/location-unsupported';
import { LocationNotFound } from '../frontend/pages/location/ui/location-not-found';
import { LocationConnectionError } from '../frontend/pages/location/ui/location-connection-error';

describe('LocationUnsupported', () => {
  test('지원 불가 메시지를 표시한다', () => {
    render(
      <MemoryRouter>
        <LocationUnsupported />
      </MemoryRouter>
    );
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('heading')).toBeInTheDocument();
  });

  test('검색으로 돌아가기 링크가 /search로 연결된다', () => {
    render(
      <MemoryRouter>
        <LocationUnsupported />
      </MemoryRouter>
    );
    expect(
      screen.getByRole('link', { name: /검색으로 돌아가기/ })
    ).toHaveAttribute('href', '/search');
  });

  test('현재 위치로 돌아가기 링크가 /로 연결된다', () => {
    render(
      <MemoryRouter>
        <LocationUnsupported />
      </MemoryRouter>
    );
    expect(
      screen.getByRole('link', { name: /현재 위치로 돌아가기/ })
    ).toHaveAttribute('href', '/');
  });

  test('홈으로 링크가 /로 연결된다', () => {
    render(
      <MemoryRouter>
        <LocationUnsupported />
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: /홈으로/ })).toHaveAttribute(
      'href',
      '/'
    );
  });
});

describe('LocationNotFound', () => {
  test('404 메시지를 표시한다', () => {
    render(
      <MemoryRouter>
        <LocationNotFound />
      </MemoryRouter>
    );
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('heading')).toBeInTheDocument();
  });

  test('홈으로 링크가 /로 연결된다', () => {
    render(
      <MemoryRouter>
        <LocationNotFound />
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: /홈으로/ })).toHaveAttribute(
      'href',
      '/'
    );
  });

  test('검색하기 링크가 /search로 연결된다', () => {
    render(
      <MemoryRouter>
        <LocationNotFound />
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: /검색하기/ })).toHaveAttribute(
      'href',
      '/search'
    );
  });
});

describe('LocationConnectionError', () => {
  test('오류 메시지를 표시한다', () => {
    render(
      <MemoryRouter>
        <LocationConnectionError onRetry={vi.fn()} />
      </MemoryRouter>
    );
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('heading')).toBeInTheDocument();
  });

  test('다시 시도 버튼 클릭 시 onRetry가 호출된다', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <MemoryRouter>
        <LocationConnectionError onRetry={onRetry} />
      </MemoryRouter>
    );
    await user.click(screen.getByRole('button', { name: /다시 시도/ }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  test('검색하기 링크가 /search로 연결된다', () => {
    render(
      <MemoryRouter>
        <LocationConnectionError onRetry={vi.fn()} />
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: /검색하기/ })).toHaveAttribute(
      'href',
      '/search'
    );
  });

  test('현재 위치로 돌아가기 링크가 /로 연결된다', () => {
    render(
      <MemoryRouter>
        <LocationConnectionError onRetry={vi.fn()} />
      </MemoryRouter>
    );
    expect(
      screen.getByRole('link', { name: /현재 위치로 돌아가기/ })
    ).toHaveAttribute('href', '/');
  });
});
