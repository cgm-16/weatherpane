import { LocalDataReset, SettingsControls } from '~/features/settings';

export function SettingsPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-12" role="main">
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <header>
          <h1 className="font-display text-4xl font-extrabold text-foreground">
            설정
          </h1>
          <p className="mt-2 text-muted-foreground">
            화면 표시와 접근성 환경을 관리합니다.
          </p>
        </header>
        <SettingsControls />
        <LocalDataReset />
      </div>
    </main>
  );
}
