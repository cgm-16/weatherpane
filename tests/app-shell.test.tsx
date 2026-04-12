// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router';

vi.mock('../frontend/features/app-bootstrap/use-home-bootstrap', () => ({
  useHomeBootstrap: vi.fn(() => ({ kind: 'no-location' })),
}));
vi.mock('@tanstack/react-query', async (orig) => {
  const real = await orig<typeof import('@tanstack/react-query')>();
  return { ...real, useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })) };
});

import HomeRoute from '../app/routes/home';

describe('home route', () => {
  test('renders the home page without crashing', () => {
    render(
      <MemoryRouter>
        <HomeRoute />
      </MemoryRouter>
    );
    // 활성 위치 없음 → HomeNoLocation이 렌더링됨
    expect(screen.getByRole('link', { name: '지역 검색' })).toBeInTheDocument();
  });

  test('home route links to /search', () => {
    render(
      <MemoryRouter>
        <HomeRoute />
      </MemoryRouter>
    );
    const searchLink = screen.getByRole('link', { name: '지역 검색' });
    expect(searchLink).toHaveAttribute('href', '/search');
  });
});
