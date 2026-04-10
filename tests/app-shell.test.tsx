import { MemoryRouter } from 'react-router';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';

import HomeRoute from '../app/routes/home';

describe('home route', () => {
  test('renders the Weatherpane placeholder shell', () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <HomeRoute />
      </MemoryRouter>
    );

    expect(markup).toContain('Weatherpane');
    expect(markup).toContain('Home placeholder');
    expect(markup).toContain('/search');
    expect(markup).toContain('/favorites');
  });
});
