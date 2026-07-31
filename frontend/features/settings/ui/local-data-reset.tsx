import { useState, type MouseEvent } from 'react';
import { AlertDialog } from 'radix-ui';
import { Button } from '~/shared/ui/button';
import {
  resetLocalData,
  type ResetLocalDataResult,
} from '../model/reset-local-data';

interface LocalDataResetProps {
  reload?: () => void;
  reset?: () => ResetLocalDataResult;
}

function reloadPage() {
  window.location.reload();
}

export function LocalDataReset({
  reload = reloadPage,
  reset = resetLocalData,
}: LocalDataResetProps) {
  const [open, setOpen] = useState(false);
  const [hasError, setHasError] = useState(false);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setHasError(false);
    }
  }

  function handleReset(event: MouseEvent<HTMLButtonElement>) {
    const result = reset();

    if (!result.ok) {
      event.preventDefault();
      setHasError(true);
      return;
    }

    setHasError(false);
    reload();
  }

  return (
    <section
      aria-labelledby="local-data-title"
      className="rounded-[var(--radius-md)] bg-destructive/10 p-5 md:p-6"
    >
      <h2 className="text-lg font-bold text-foreground" id="local-data-title">
        데이터 관리
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        이 브라우저에 저장된 Weatherpane 데이터를 삭제할 수 있습니다.
      </p>
      <AlertDialog.Root open={open} onOpenChange={handleOpenChange}>
        <AlertDialog.Trigger asChild>
          <Button className="mt-4" size="lg" variant="destructive">
            로컬 데이터 초기화
          </Button>
        </AlertDialog.Trigger>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm" />
          <AlertDialog.Content className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-lg)] bg-popover p-6 text-popover-foreground shadow-[var(--shadow-float)] md:p-8">
            <AlertDialog.Title className="text-2xl font-extrabold">
              로컬 데이터 초기화
            </AlertDialog.Title>
            <AlertDialog.Description className="mt-3 leading-7 text-muted-foreground">
              현재 위치, 즐겨찾기, 최근 위치, 저장된 날씨 및 AQI, 테마, 온도
              단위와 동작 줄이기 설정, 지원하지 않는 위치 이동 정보를 이
              브라우저에서 삭제합니다.
            </AlertDialog.Description>
            {hasError && (
              <p
                className="mt-4 rounded-[var(--radius-sm)] bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
                role="alert"
              >
                일부 로컬 데이터를 삭제하지 못했습니다. 다시 시도해 주세요.
              </p>
            )}
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <AlertDialog.Cancel asChild>
                <Button size="lg" variant="secondary">
                  취소
                </Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Button onClick={handleReset} size="lg" variant="destructive">
                  초기화
                </Button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </section>
  );
}
