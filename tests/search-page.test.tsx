// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter, useParams } from 'react-router';
import { describe, expect, test } from 'vitest';

import SearchRoute from '../app/routes/search';

function LocationStub() {
  const { resolvedLocationId } = useParams();

  return <p>선택된 위치: {resolvedLocationId}</p>;
}

function renderSearchRoute(initialEntry = '/search') {
  const router = createMemoryRouter(
    [
      {
        path: '/search',
        element: <SearchRoute />,
      },
      {
        path: '/location/:resolvedLocationId',
        element: <LocationStub />,
      },
    ],
    {
      initialEntries: [initialEntry],
    }
  );

  render(<RouterProvider router={router} />);

  return {
    router,
    user: userEvent.setup(),
  };
}

describe('search route', () => {
  test('hydrates the input and results from q on direct open', async () => {
    renderSearchRoute('/search?q=%EC%B2%AD%EC%9A%B4%EB%8F%99');

    expect(
      await screen.findByRole('searchbox', { name: '지역 검색' })
    ).toHaveValue('청운동');
    expect(
      await screen.findByRole('listbox', { name: '검색 결과' })
    ).toBeVisible();
    expect(
      await screen.findByRole('option', { name: /서울특별시-종로구-청운동/i })
    ).toBeVisible();
  });

  test('replaces history while typing and removes q when the input is cleared', async () => {
    const { router, user } = renderSearchRoute();
    const input = await screen.findByRole('searchbox', { name: '지역 검색' });

    await user.type(input, '종로');

    await waitFor(() => {
      expect(router.state.location.search).toBe('?q=%EC%A2%85%EB%A1%9C');
    });
    expect(router.state.historyAction).toBe('REPLACE');

    await user.clear(input);

    await waitFor(() => {
      expect(router.state.location.search).toBe('');
    });
    expect(router.state.historyAction).toBe('REPLACE');
  });

  test('shows only search results during an active query', async () => {
    const { user } = renderSearchRoute();
    const input = await screen.findByRole('searchbox', { name: '지역 검색' });

    expect(screen.getByRole('heading', { name: '인기 지역' })).toBeVisible();

    await user.type(input, '종로');

    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { name: '인기 지역' })
      ).not.toBeInTheDocument();
    });
    expect(screen.getByRole('listbox', { name: '검색 결과' })).toBeVisible();
  });

  test('caps the initial result viewport at 8 rows before scrolling', async () => {
    renderSearchRoute('/search?q=%EC%A2%85%EB%A1%9C');

    const listbox = await screen.findByRole('listbox', { name: '검색 결과' });

    expect(within(listbox).getAllByRole('option').length).toBeGreaterThan(8);
    expect(listbox).toHaveAttribute('data-visible-result-limit', '8');
  });

  test('shows the empty-state copy only for a true no-match query', async () => {
    const { user } = renderSearchRoute();
    const input = await screen.findByRole('searchbox', { name: '지역 검색' });

    await user.type(input, '없는지역이름');

    expect(await screen.findByText('검색 결과가 없습니다.')).toBeVisible();
    expect(
      screen.queryByRole('heading', { name: '인기 지역' })
    ).not.toBeInTheDocument();
  });

  test('auto-highlights the first result, supports arrow navigation, and pushes stub navigation on Enter', async () => {
    const { router, user } = renderSearchRoute('/search?q=%EB%AA%85%EB%8F%99');
    const input = await screen.findByRole('searchbox', { name: '지역 검색' });
    const listbox = await screen.findByRole('listbox', { name: '검색 결과' });

    await waitFor(() => {
      expect(
        within(listbox).getAllByRole('option').length
      ).toBeGreaterThanOrEqual(2);
    });

    const options = within(listbox).getAllByRole('option');

    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    expect(options[1]).toHaveAttribute('aria-selected', 'false');

    await user.click(input);
    await user.keyboard('{ArrowDown}');
    expect(options[1]).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{ArrowUp}');
    expect(options[0]).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(router.state.location.pathname).toMatch(
        /^\/location\/[0-9a-f]{12}$/
      );
    });
    expect(router.state.historyAction).toBe('PUSH');
    expect(
      await screen.findByText(
        `선택된 위치: ${router.state.location.pathname.replace('/location/', '')}`
      )
    ).toBeVisible();
  });

  test('clears the auto-highlight on the first Esc, then clears the query on the next Esc', async () => {
    const { router, user } = renderSearchRoute(
      '/search?q=%EC%B2%AD%EC%9A%B4%EB%8F%99'
    );
    const input = await screen.findByRole('searchbox', { name: '지역 검색' });
    const listbox = await screen.findByRole('listbox', { name: '검색 결과' });

    const options = within(listbox).getAllByRole('option');

    await user.click(input);
    expect(options[0]).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{Escape}');
    expect(options[0]).toHaveAttribute('aria-selected', 'false');
    expect(input).toHaveValue('청운동');
    expect(input).not.toHaveAttribute('aria-activedescendant');

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(router.state.location.search).toBe('');
    });
    expect(input).toHaveValue('');
  });
});
