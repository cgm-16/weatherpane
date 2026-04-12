// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import { FavoritesEmptyState } from '../frontend/pages/favorites/ui/favorites-empty-state';

describe('FavoritesEmptyState', () => {
  function renderEmptyState() {
    return render(
      <MemoryRouter>
        <FavoritesEmptyState />
      </MemoryRouter>
    );
  }

  test('renders the 장소 검색하기 CTA linking to /search', () => {
    renderEmptyState();
    const link = screen.getByRole('link', { name: /장소 검색하기/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/search');
  });

  test('renders the 현재 위치 보기 CTA linking to /', () => {
    renderEmptyState();
    const link = screen.getByRole('link', { name: /현재 위치 보기/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/');
  });
});
