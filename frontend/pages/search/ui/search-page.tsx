import { useId, useState, type KeyboardEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

import { useSearchSelection } from '../../../features/search';
import { useActiveLocation } from '../../../features/app-bootstrap/active-location-context';

import { POPULAR_LOCATIONS } from '../../../entities/location/data/popular-locations';
import {
  getCatalogLocationResultsByCanonicalPath,
  searchCatalogLocations,
  type SearchCatalogResult,
} from '../../../entities/location/model/search';
import type {
  RecentLocation,
  ResolvedLocation,
} from '../../../entities/location/model/types';
import { createRecentsRepository } from '../../../shared/lib/storage/repositories/location-repositories';
import { cn } from '../../../shared/lib/utils';

const popularResults =
  getCatalogLocationResultsByCanonicalPath(POPULAR_LOCATIONS);
const visibleResultLimit = 8;
const searchResultRowMinHeightRem = 5.5;
const searchResultGapRem = 0.75;

function buildAccessibleResultLabel(result: SearchCatalogResult): string {
  return result.secondaryPath
    ? `${result.secondaryPath}-${result.primaryLabel}`
    : result.primaryLabel;
}

function SearchResultOption({
  result,
  id,
  isHighlighted,
  isResolving,
  onSelect,
}: {
  result: SearchCatalogResult;
  id: string;
  isHighlighted: boolean;
  isResolving: boolean;
  onSelect: (result: SearchCatalogResult) => void;
}) {
  return (
    <li
      id={id}
      aria-label={buildAccessibleResultLabel(result)}
      aria-selected={isHighlighted}
      className={cn(
        'min-h-[5.5rem] rounded-[var(--radius-md)] bg-card px-4 py-4 shadow-[var(--shadow-float)] transition-colors',
        isResolving ? 'cursor-wait' : 'cursor-pointer',
        isHighlighted && !isResolving
          ? 'bg-accent text-accent-foreground'
          : 'text-foreground'
      )}
      role="option"
      onClick={() => !isResolving && onSelect(result)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p
            className="text-lg leading-none font-semibold"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {result.primaryLabel}
          </p>
          {result.secondaryPath ? (
            <p className="text-sm text-muted-foreground">
              {result.secondaryPath}
            </p>
          ) : null}
        </div>
        <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
          {isResolving ? '…' : '선택'}
        </p>
      </div>
    </li>
  );
}

function PopularLocationButton({
  result,
  onSelect,
}: {
  result: SearchCatalogResult;
  onSelect: (result: SearchCatalogResult) => void;
}) {
  return (
    <button
      className="rounded-[var(--radius-md)] bg-card px-4 py-4 text-left shadow-[var(--shadow-float)] transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
      type="button"
      onClick={() => onSelect(result)}
    >
      <p
        className="text-base leading-none font-semibold text-foreground"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {result.primaryLabel}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        {result.secondaryPath ?? '대표 지역'}
      </p>
    </button>
  );
}

// 최근 지역 버튼 — 인기 지역 버튼과 동일한 외형이지만 이미 해결된 위치 데이터를 사용합니다.
function RecentLocationButton({
  recent,
  onSelect,
}: {
  recent: RecentLocation & { location: ResolvedLocation };
  onSelect: (recent: RecentLocation & { location: ResolvedLocation }) => void;
}) {
  const secondaryPath = recent.location.admin2
    ? `${recent.location.admin1}-${recent.location.admin2}`
    : recent.location.admin1;

  return (
    <button
      className="rounded-[var(--radius-md)] bg-card px-4 py-4 text-left shadow-[var(--shadow-float)] transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
      type="button"
      onClick={() => onSelect(recent)}
    >
      <p
        className="text-base leading-none font-semibold text-foreground"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {recent.location.name}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">{secondaryPath}</p>
    </button>
  );
}

export function SearchPage() {
  const navigate = useNavigate();
  const { selectResult, resolvingId, selectionError, retrySelection } =
    useSearchSelection();
  const { setActiveLocation } = useActiveLocation();
  const [resolvedRecents] = useState<
    Array<RecentLocation & { location: ResolvedLocation }>
  >(() =>
    createRecentsRepository()
      .getAll()
      .filter(
        (r): r is RecentLocation & { location: ResolvedLocation } =>
          r.location.kind === 'resolved'
      )
  );
  const optionBaseId = useId();
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') ?? '';
  const [manualHighlightedIndex, setManualHighlightedIndex] = useState(0);
  const [highlightedQuery, setHighlightedQuery] = useState(initialQuery);
  const [isHighlightActive, setIsHighlightActive] = useState(
    initialQuery.trim().length > 0
  );
  const query = searchParams.get('q') ?? '';
  const hasActiveQuery = query.trim().length > 0;
  const queryResults = hasActiveQuery ? searchCatalogLocations(query) : [];
  const hasHighlightForCurrentQuery =
    hasActiveQuery &&
    queryResults.length > 0 &&
    (highlightedQuery !== query ? true : isHighlightActive);
  const highlightedIndex = !hasHighlightForCurrentQuery
    ? -1
    : highlightedQuery !== query
      ? 0
      : Math.min(manualHighlightedIndex, queryResults.length - 1);
  const activeOptionId =
    hasActiveQuery && queryResults[highlightedIndex]
      ? `${optionBaseId}-option-${highlightedIndex}`
      : undefined;

  function updateQuery(nextQuery: string) {
    const nextSearchParams = new URLSearchParams(searchParams);
    const normalizedQuery = nextQuery.trim().length === 0 ? '' : nextQuery;

    setHighlightedQuery(normalizedQuery);
    setManualHighlightedIndex(0);
    setIsHighlightActive(normalizedQuery.length > 0);

    if (normalizedQuery.length === 0) {
      nextSearchParams.delete('q');
    } else {
      nextSearchParams.set('q', normalizedQuery);
    }

    const nextSearch = nextSearchParams.toString();

    navigate(
      {
        pathname: '/search',
        search: nextSearch.length > 0 ? `?${nextSearch}` : '',
      },
      {
        preventScrollReset: true,
        replace: true,
      }
    );
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // IME 조합 중 키 이벤트를 무시하여 한국어 입력이 방해받지 않도록 함
    if (event.nativeEvent.isComposing) {
      return;
    }

    if (!hasActiveQuery) {
      return;
    }

    if (event.key === 'ArrowDown' && queryResults.length > 0) {
      event.preventDefault();
      setHighlightedQuery(query);
      setIsHighlightActive(true);
      setManualHighlightedIndex(
        Math.min(
          highlightedIndex < 0 ? 0 : highlightedIndex + 1,
          queryResults.length - 1
        )
      );
      return;
    }

    if (event.key === 'ArrowUp' && queryResults.length > 0) {
      event.preventDefault();
      setHighlightedQuery(query);
      setIsHighlightActive(true);
      setManualHighlightedIndex(
        Math.max(highlightedIndex < 0 ? 0 : highlightedIndex - 1, 0)
      );
      return;
    }

    if (event.key === 'Enter' && queryResults[highlightedIndex]) {
      event.preventDefault();
      selectResult(queryResults[highlightedIndex]);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();

      if (hasHighlightForCurrentQuery) {
        setHighlightedQuery(query);
        setManualHighlightedIndex(0);
        setIsHighlightActive(false);
      } else {
        updateQuery('');
      }
    }
  }

  function selectRecent(
    recent: RecentLocation & { location: ResolvedLocation }
  ) {
    setActiveLocation({
      kind: 'resolved',
      location: recent.location,
      source: 'recent',
      changedAt: new Date().toISOString(),
    });
    navigate(`/location/${recent.location.catalogLocationId}`);
  }

  return (
    <main className="min-h-screen bg-background px-5 py-6 text-foreground sm:px-8 sm:py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="overflow-hidden rounded-[calc(var(--radius-lg)+0.5rem)] bg-muted px-5 py-6 sm:px-8 sm:py-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)] lg:items-end">
            <div className="space-y-3">
              <p className="text-sm font-medium tracking-[0.24em] text-muted-foreground uppercase">
                Korea catalog search
              </p>
              <div className="space-y-2">
                <h1
                  className="text-4xl leading-none font-semibold text-foreground sm:text-5xl"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  찾고 싶은 지역을
                  <br />
                  바로 여세요
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                  URL이 검색 상태를 그대로 담고, 결과는 로컬 카탈로그에서 즉시
                  정렬됩니다.
                </p>
              </div>
            </div>

            <div className="rounded-[calc(var(--radius-lg)+0.25rem)] bg-card p-4 shadow-[var(--shadow-float)] sm:p-5">
              <label className="sr-only" htmlFor="search-query">
                지역 검색
              </label>
              <input
                id="search-query"
                aria-activedescendant={activeOptionId}
                aria-controls="search-results"
                className="h-14 w-full rounded-[var(--radius-md)] bg-background px-4 text-base text-foreground ring-0 outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary"
                name="q"
                placeholder="도시, 구, 동을 입력하세요"
                role="searchbox"
                type="search"
                value={query}
                onChange={(event) => updateQuery(event.currentTarget.value)}
                onKeyDown={handleInputKeyDown}
              />
            </div>
          </div>
        </section>

        {selectionError !== null && (
          <div
            aria-live="polite"
            className="flex items-center justify-between gap-4 rounded-[calc(var(--radius-lg)+0.25rem)] bg-destructive/10 px-5 py-4 text-destructive"
            role="alert"
          >
            <p className="text-sm font-medium">
              위치를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
            </p>
            <button
              className="shrink-0 rounded-[var(--radius-md)] bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-destructive focus-visible:outline-none"
              type="button"
              onClick={retrySelection}
            >
              다시 시도
            </button>
          </div>
        )}

        {hasActiveQuery ? (
          <section className="space-y-4 rounded-[calc(var(--radius-lg)+0.25rem)] bg-muted p-4 sm:p-5">
            {queryResults.length > 0 ? (
              <>
                <div className="flex items-center justify-between gap-4 px-1">
                  <h2
                    className="text-xl font-semibold text-foreground"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    검색 결과
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {queryResults.length}개 결과
                  </p>
                </div>
                <ul
                  aria-label="검색 결과"
                  aria-busy={resolvingId !== null}
                  data-visible-result-limit={visibleResultLimit}
                  className="grid max-h-[36rem] gap-3 overflow-y-auto pr-1"
                  id="search-results"
                  role="listbox"
                  style={{
                    maxHeight: `calc((${searchResultRowMinHeightRem}rem * ${visibleResultLimit}) + (${searchResultGapRem}rem * ${visibleResultLimit - 1}))`,
                  }}
                >
                  {queryResults.map((result, index) => (
                    <SearchResultOption
                      key={result.catalogLocationId}
                      id={`${optionBaseId}-option-${index}`}
                      isHighlighted={index === highlightedIndex}
                      isResolving={resolvingId === result.catalogLocationId}
                      result={result}
                      onSelect={selectResult}
                    />
                  ))}
                </ul>
              </>
            ) : (
              <div className="rounded-[calc(var(--radius-lg)+0.25rem)] bg-card px-5 py-8 text-center shadow-[var(--shadow-float)]">
                <p
                  className="text-xl font-semibold text-foreground"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  검색 결과가 없습니다.
                </p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  다른 시, 구, 동 이름으로 다시 입력해 보세요.
                </p>
              </div>
            )}
          </section>
        ) : (
          <>
            {resolvedRecents.length > 0 && (
              <section className="space-y-4 rounded-[calc(var(--radius-lg)+0.25rem)] bg-muted p-4 sm:p-5">
                <div className="space-y-2 px-1">
                  <h2
                    className="text-xl font-semibold text-foreground"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    최근 지역
                  </h2>
                  <p className="text-sm leading-6 text-muted-foreground">
                    최근에 열어본 지역입니다.
                  </p>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {resolvedRecents.map((recent) => (
                    <RecentLocationButton
                      key={recent.location.locationId}
                      recent={recent}
                      onSelect={selectRecent}
                    />
                  ))}
                </div>
              </section>
            )}

            <section className="space-y-4 rounded-[calc(var(--radius-lg)+0.25rem)] bg-muted p-4 sm:p-5">
              <div className="space-y-2 px-1">
                <h2
                  className="text-xl font-semibold text-foreground"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  인기 지역
                </h2>
                <p className="text-sm leading-6 text-muted-foreground">
                  빠르게 열 수 있는 대표 지역을 먼저 보여줍니다.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {popularResults.map((result) => (
                  <PopularLocationButton
                    key={result.catalogLocationId}
                    result={result}
                    onSelect={selectResult}
                  />
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
