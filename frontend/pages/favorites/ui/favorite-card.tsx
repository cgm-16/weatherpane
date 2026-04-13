import { useState, useReducer, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useCoreWeather } from '~/features/weather-queries/use-core-weather';
import { CORE_WEATHER_STALE_TIME } from '~/features/weather-queries/weather-query-options';
import { useActiveLocation } from '~/features/app-bootstrap/active-location-context';
import type { FavoriteLocation } from '~/entities/location/model/types';
import type { CoreWeather } from '~/entities/weather/model/core-weather';

const VERY_STALE_MS = 60 * 60_000;

type Staleness = 'fresh' | 'stale' | 'very-stale';

function getStaleness(fetchedAt: string): Staleness {
  const ageMs = Date.now() - new Date(fetchedAt).getTime();
  if (ageMs > VERY_STALE_MS) return 'very-stale';
  if (ageMs > CORE_WEATHER_STALE_TIME) return 'stale';
  return 'fresh';
}

function CardSkeleton() {
  return (
    <div
      data-testid="card-skeleton"
      className="h-44 animate-pulse rounded-[--radius-md] bg-card p-6"
    >
      <div className="mb-4 h-6 w-1/2 rounded-full bg-muted" />
      <div className="mb-2 h-12 w-1/3 rounded-full bg-muted" />
      <div className="flex gap-2">
        <div className="h-6 w-14 rounded-full bg-muted" />
        <div className="h-6 w-14 rounded-full bg-muted" />
      </div>
    </div>
  );
}

function CardError({
  isOffline,
  onRetry,
}: {
  isOffline: boolean;
  onRetry: () => void;
}) {
  return (
    <div className="flex h-44 flex-col items-center justify-center gap-3 rounded-[--radius-md] bg-card p-6 text-center">
      <span className="material-symbols-outlined text-3xl text-muted-foreground opacity-50">
        {isOffline ? 'wifi_off' : 'cloud_off'}
      </span>
      <p className="font-body text-sm text-muted-foreground">
        {isOffline ? '오프라인 상태입니다' : '날씨 정보를 불러오지 못했습니다'}
      </p>
      {!isOffline && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-full bg-muted px-4 py-1.5 font-body text-xs font-semibold text-foreground"
        >
          다시 시도
        </button>
      )}
    </div>
  );
}

function StaleIndicator({ staleness }: { staleness: Staleness }) {
  if (staleness === 'fresh') return null;
  return (
    <span className="font-body text-[10px] font-medium text-muted-foreground opacity-70">
      {staleness === 'very-stale' ? '매우 오래된 정보' : '오래된 정보'}
    </span>
  );
}

function CardSnapshot({
  favorite,
  weather,
  hasRefreshError,
  onCardClick,
  editProps,
}: {
  favorite: FavoriteLocation;
  weather: CoreWeather;
  hasRefreshError: boolean;
  onCardClick: () => void;
  editProps?: CardEditProps;
}) {
  // 시간이 지남에 따라 신선도 뱃지를 갱신하기 위해 1분마다 리렌더링한다
  const [, tick] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [tick]);

  const isEditMode = editProps !== undefined;
  const displayName = favorite.nickname ?? favorite.location.name;
  const staleness = getStaleness(weather.fetchedAt);
  const effectiveStaleness =
    hasRefreshError && staleness === 'fresh' ? 'stale' : staleness;

  // 닉네임 인풋 draft 상태 — 편집 모드 진입/종료 시 컴포넌트가 remount되어 초기화됨
  const [draft, setDraft] = useState(favorite.nickname ?? '');
  const discardRef = useRef(false);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
    if (e.key === 'Escape') {
      discardRef.current = true;
      // Escape: draft를 현재 닉네임으로 되돌리고 blur
      setDraft(favorite.nickname ?? '');
      e.currentTarget.blur();
    }
  }

  function handleBlur() {
    if (discardRef.current) {
      discardRef.current = false;
      return;
    }
    if (editProps) {
      const trimmed = draft.trim();
      editProps.onNicknameCommit(trimmed.length > 0 ? trimmed : null);
    }
  }

  const topSection = (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0 flex-1">
        {isEditMode ? (
          <input
            type="text"
            className="font-headline w-full rounded bg-transparent text-xl leading-tight font-bold text-card-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            value={draft}
            maxLength={20}
            aria-label={`${displayName} 닉네임 편집`}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
          />
        ) : (
          <h3 className="font-headline text-xl leading-tight font-bold text-card-foreground">
            {displayName}
          </h3>
        )}
        {favorite.nickname && (
          <p className="font-body text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase">
            {favorite.location.name}
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {(hasRefreshError || staleness !== 'fresh') && !isEditMode && (
          <StaleIndicator staleness={effectiveStaleness} />
        )}
        {editProps && (
          <>
            {/* 드래그 핸들 */}
            <div
              draggable={true}
              onDragStart={editProps.onDragStart}
              onDragEnd={editProps.onDragEnd}
              className="flex h-8 w-8 cursor-grab items-center justify-center rounded-full bg-muted active:cursor-grabbing"
              aria-hidden="true"
            >
              <span className="material-symbols-outlined text-muted-foreground opacity-50">
                drag_handle
              </span>
            </div>
            {/* 위로/아래로 버튼 */}
            <div className="flex flex-col gap-1">
              {!editProps.isFirst && (
                <button
                  type="button"
                  aria-label={`즐겨찾기 ${displayName} 위로 이동`}
                  onClick={editProps.onMoveUp}
                  className="flex h-7 w-7 items-center justify-center rounded bg-muted text-foreground transition-colors hover:bg-accent"
                >
                  <span className="material-symbols-outlined text-sm">
                    keyboard_arrow_up
                  </span>
                </button>
              )}
              {!editProps.isLast && (
                <button
                  type="button"
                  aria-label={`즐겨찾기 ${displayName} 아래로 이동`}
                  onClick={editProps.onMoveDown}
                  className="flex h-7 w-7 items-center justify-center rounded bg-muted text-foreground transition-colors hover:bg-accent"
                >
                  <span className="material-symbols-outlined text-sm">
                    keyboard_arrow_down
                  </span>
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );

  const bottomSection = (
    <div className="flex flex-col gap-2">
      <span className="font-headline text-5xl leading-none font-extrabold text-card-foreground">
        {Math.round(weather.current.temperatureC)}°
      </span>
      <div className="flex items-center gap-2">
        <span className="font-body text-xs font-medium text-muted-foreground">
          {weather.current.condition.text}
        </span>
        <div className="ml-auto flex gap-1.5">
          <span className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 font-body text-[10px] font-bold text-foreground">
            <span className="text-muted-foreground">H</span>
            <span>{Math.round(weather.today.maxC)}°</span>
          </span>
          <span className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 font-body text-[10px] font-bold text-foreground">
            <span className="text-muted-foreground">L</span>
            <span>{Math.round(weather.today.minC)}°</span>
          </span>
        </div>
      </div>
    </div>
  );

  const cardClasses =
    'group relative flex h-44 w-full flex-col justify-between overflow-hidden rounded-[--radius-md] bg-card p-6 text-left';

  if (isEditMode) {
    return (
      <div className={cardClasses}>
        {topSection}
        {bottomSection}
      </div>
    );
  }

  return (
    <button
      type="button"
      aria-label={`${displayName} 날씨 보기`}
      onClick={onCardClick}
      className={`${cardClasses} cursor-pointer transition-colors hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary`}
    >
      {topSection}
      {bottomSection}
    </button>
  );
}

export interface CardEditProps {
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onNicknameCommit: (nickname: string | null) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

interface FavoriteCardProps {
  favorite: FavoriteLocation;
  editProps?: CardEditProps;
}

export function FavoriteCard({ favorite, editProps }: FavoriteCardProps) {
  const navigate = useNavigate();
  const { setActiveLocation } = useActiveLocation();
  const weatherQuery = useCoreWeather(favorite.location);
  const isOffline = !navigator.onLine;

  function handleCardClick() {
    setActiveLocation({
      kind: 'resolved',
      location: favorite.location,
      source: 'favorite',
      changedAt: new Date().toISOString(),
    });
    navigate(`/location/${favorite.location.locationId}`);
  }

  if (!weatherQuery.data) {
    if (weatherQuery.isLoading) return <CardSkeleton />;
    return (
      <CardError isOffline={isOffline} onRetry={() => weatherQuery.refetch()} />
    );
  }

  return (
    <CardSnapshot
      key={editProps ? 'edit' : 'read'}
      favorite={favorite}
      weather={weatherQuery.data}
      hasRefreshError={weatherQuery.isError}
      onCardClick={handleCardClick}
      editProps={editProps}
    />
  );
}
