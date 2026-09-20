import { useState, useReducer, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useCoreWeather } from '~/features/weather-queries/use-core-weather';
import { CORE_WEATHER_STALE_TIME } from '~/features/weather-queries/weather-query-options';
import { useActiveLocation } from '~/features/app-bootstrap/active-location-context';
import { isWeatherSnapshotFresh } from '~/features/app-bootstrap/snapshot-cutoff';
import { useOnlineStatus } from '~/shared/hooks/use-online-status';
import { createWeatherSnapshotRepository } from '~/shared/lib/storage/repositories/snapshot-repositories';
import { coreWeatherToSnapshot } from '~/entities/weather/model/core-weather-to-snapshot';
import { SketchBackground } from '~/entities/asset';
import type { FavoriteLocation } from '~/entities/location/model/types';
import type {
  CoreWeather,
  WeatherCondition,
} from '~/entities/weather/model/core-weather';
import type { PersistedWeatherSnapshot } from '~/entities/weather/model/persisted-weather-snapshot';
import {
  formatTemperature,
  type TemperatureUnit,
} from '~/shared/lib/temperature';

const VERY_STALE_MS = 60 * 60_000;

type Staleness = 'fresh' | 'stale' | 'very-stale';

function getStaleness(fetchedAt: string): Staleness {
  const ageMs = Date.now() - new Date(fetchedAt).getTime();
  if (ageMs > VERY_STALE_MS) return 'very-stale';
  if (ageMs > CORE_WEATHER_STALE_TIME) return 'stale';
  return 'fresh';
}

// 카드가 실제로 그리는 날씨 필드만 담는 뷰 모델.
// 세션 내 쿼리 결과(CoreWeather)와 영속 스냅샷(PersistedWeatherSnapshot)을
// 같은 표면으로 렌더링하기 위한 어댑터 대상이다.
interface CardWeather {
  fetchedAt: string;
  temperatureC: number;
  conditionText: string;
  // 스케치 배경 선택에는 visualBucket/isDay가 필요하다.
  // 영속 스냅샷은 이 값들을 저장하지 않으므로 없을 수 있으며, 그때는 배경을 생략한다.
  condition: WeatherCondition | null;
  todayMinC: number;
  todayMaxC: number;
}

function toCardWeather(weather: CoreWeather): CardWeather {
  return {
    fetchedAt: weather.fetchedAt,
    temperatureC: weather.current.temperatureC,
    conditionText: weather.current.condition.text,
    condition: weather.current.condition,
    todayMinC: weather.today.minC,
    todayMaxC: weather.today.maxC,
  };
}

function snapshotToCardWeather(
  snapshot: PersistedWeatherSnapshot
): CardWeather {
  return {
    fetchedAt: snapshot.fetchedAt,
    temperatureC: snapshot.temperatureC,
    conditionText: snapshot.conditionText,
    condition: null,
    todayMinC: snapshot.todayMinC,
    todayMaxC: snapshot.todayMaxC,
  };
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
  temperatureUnit,
}: {
  favorite: FavoriteLocation;
  weather: CardWeather;
  hasRefreshError: boolean;
  onCardClick: () => void;
  editProps?: CardEditProps;
  temperatureUnit: TemperatureUnit;
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
        {formatTemperature(weather.temperatureC, temperatureUnit)}
      </span>
      <div className="flex items-center gap-2">
        <span className="font-body text-xs font-medium text-muted-foreground">
          {weather.conditionText}
        </span>
        <div className="ml-auto flex gap-1.5">
          <span className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 font-body text-[10px] font-bold text-foreground">
            <span className="text-muted-foreground">H</span>
            <span>{formatTemperature(weather.todayMaxC, temperatureUnit)}</span>
          </span>
          <span className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 font-body text-[10px] font-bold text-foreground">
            <span className="text-muted-foreground">L</span>
            <span>{formatTemperature(weather.todayMinC, temperatureUnit)}</span>
          </span>
        </div>
      </div>
    </div>
  );

  const cardClasses =
    'group relative flex h-44 w-full flex-col justify-between overflow-hidden rounded-[--radius-md] bg-card p-6 text-left';

  // 영속 스냅샷 폴백에는 condition이 없어 스케치 키를 결정할 수 없다.
  // 배경은 장식이므로 이때는 생략한다(레이아웃은 그대로 유지된다).
  const sketch = weather.condition && (
    <SketchBackground
      location={favorite.location}
      condition={weather.condition}
      sizeHint="compact"
      className="absolute inset-0 h-full w-full object-cover opacity-30"
    />
  );

  if (isEditMode) {
    return (
      <div className={cardClasses}>
        {sketch}
        <div className="relative flex h-full flex-col justify-between">
          {topSection}
          {bottomSection}
        </div>
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
      {sketch}
      <div className="relative flex h-full flex-col justify-between">
        {topSection}
        {bottomSection}
      </div>
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
  temperatureUnit: TemperatureUnit;
}

export function FavoriteCard({
  favorite,
  editProps,
  temperatureUnit,
}: FavoriteCardProps) {
  const navigate = useNavigate();
  const { setActiveLocation } = useActiveLocation();
  const weatherQuery = useCoreWeather(favorite.location);
  const { isOnline } = useOnlineStatus();
  const isOffline = !isOnline;
  const { locationId } = favorite.location;

  // 조회 성공 시 스냅샷을 저장한다 — 다음 오프라인 진입에서 이 카드가 폴백할 대상이다.
  // Home/Detail을 거치지 않고 즐겨찾기 화면에서만 본 위치도 폴백을 갖게 된다.
  useEffect(() => {
    if (weatherQuery.data) {
      createWeatherSnapshotRepository().set(
        locationId,
        coreWeatherToSnapshot(weatherQuery.data)
      );
    }
  }, [weatherQuery.data, locationId]);

  function handleCardClick() {
    setActiveLocation({
      kind: 'resolved',
      location: favorite.location,
      source: 'favorite',
      changedAt: new Date().toISOString(),
    });
    navigate(`/location/${favorite.location.locationId}`);
  }

  // 세션 내 쿼리 결과가 없으면 24h 이내 영속 스냅샷으로 폴백한다.
  // 스냅샷이 있으면 카드는 stale 표기와 함께 유지되고 네비게이션도 가능하다.
  // 스냅샷이 없거나 cutoff를 넘겼을 때만 스켈레톤/인라인 오류로 내려간다(UX-03/04/05).
  if (!weatherQuery.data) {
    const snapshot = createWeatherSnapshotRepository().get(locationId);

    if (snapshot && isWeatherSnapshotFresh(snapshot.fetchedAt)) {
      return (
        <CardSnapshot
          key={editProps ? 'edit' : 'read'}
          favorite={favorite}
          weather={snapshotToCardWeather(snapshot)}
          hasRefreshError={weatherQuery.isError}
          onCardClick={handleCardClick}
          editProps={editProps}
          temperatureUnit={temperatureUnit}
        />
      );
    }

    if (weatherQuery.isLoading) return <CardSkeleton />;
    return (
      <CardError isOffline={isOffline} onRetry={() => weatherQuery.refetch()} />
    );
  }

  return (
    <CardSnapshot
      key={editProps ? 'edit' : 'read'}
      favorite={favorite}
      weather={toCardWeather(weatherQuery.data)}
      hasRefreshError={weatherQuery.isError}
      onCardClick={handleCardClick}
      editProps={editProps}
      temperatureUnit={temperatureUnit}
    />
  );
}
