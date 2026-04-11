export type WeatherVisualBucket = 'clear' | 'cloudy' | 'rainy' | 'snowy';

export type WeatherPrecipitationKind = 'none' | 'rain' | 'snow';

export type WeatherConditionIntensity = 'none' | 'light' | 'moderate' | 'heavy';

export interface WeatherTextMappingInput {
  conditionCode: string;
  isDay: boolean;
  precipitationKind: WeatherPrecipitationKind;
  cloudCoverPct: number;
  intensity: WeatherConditionIntensity;
}

export interface WeatherCondition {
  code: string;
  text: string;
  isDay: boolean;
  visualBucket: WeatherVisualBucket;
  textMapping: WeatherTextMappingInput;
}

export interface CoreWeatherCurrent {
  temperatureC: number;
  feelsLikeC?: number;
  humidityPct?: number;
  windMps?: number;
  precipitationMm?: number;
  uvIndex?: number;
  dewPointC?: number;
  condition: WeatherCondition;
}

export interface CoreWeatherHourlyEntry {
  at: string;
  temperatureC: number;
  popPct: number;
  condition: WeatherCondition;
}

export interface CoreWeather {
  locationId: string;
  fetchedAt: string;
  observedAt: string;
  current: CoreWeatherCurrent;
  today: {
    minC: number;
    maxC: number;
  };
  hourly: CoreWeatherHourlyEntry[];
  source: {
    provider: string;
    modelVersion?: string;
  };
}
