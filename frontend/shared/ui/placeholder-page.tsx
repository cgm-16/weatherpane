import type { ReactNode } from 'react';

import { Link } from 'react-router';

type PlaceholderPageProps = {
  title: string;
  description: string;
  children?: ReactNode;
};

const navigationLinks = [
  { to: '/', label: 'Home' },
  { to: '/search', label: 'Search' },
  { to: '/favorites', label: 'Favorites' },
  { to: '/location/seoul-jongno', label: 'Location placeholder' },
];

export function PlaceholderPage({
  title,
  description,
  children,
}: PlaceholderPageProps) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-10 px-6 py-10">
      <header className="space-y-3">
        <p className="text-sm font-medium tracking-[0.35em] text-sky-300 uppercase">
          South Korea weather app
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-white">
          Weatherpane
        </h1>
        <p className="max-w-2xl text-base text-slate-300">{description}</p>
      </header>

      <nav
        aria-label="Primary"
        className="rounded-3xl border border-white/10 bg-slate-950/40 p-4 shadow-2xl shadow-slate-950/30 backdrop-blur"
      >
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {navigationLinks.map((link) => (
            <li key={link.to}>
              <Link
                className="flex rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-slate-100 transition hover:border-sky-300/50 hover:bg-sky-400/10"
                to={link.to}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <section className="rounded-[2rem] border border-white/10 bg-slate-950/55 p-6 shadow-2xl shadow-slate-950/30 backdrop-blur">
        <h2 className="text-2xl font-semibold text-white">{title}</h2>
        {children}
      </section>
    </main>
  );
}
