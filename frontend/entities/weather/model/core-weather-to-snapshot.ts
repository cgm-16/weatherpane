// CoreWeather 도메인 모델을 퍼시스턴스 스냅샷 형식으로 변환합니다.
import type { CoreWeather } from './core-weather';
import type { PersistedWeatherSnapshot } from './persisted-weather-snapshot';

export function coreWeatherToSnapshot(weather: CoreWeather): PersistedWeatherSnapshot {
  return {
    locationId: weather.locationId,
    fetchedAt: weather.fetchedAt,
    observedAt: weather.observedAt,
    temperatureC: weather.current.temperatureC,
    conditionCode: weather.current.condition.code,
    conditionText: weather.current.condition.text,
    todayMinC: weather.today.minC,
    todayMaxC: weather.today.maxC,
    source: weather.source,
  };
}
