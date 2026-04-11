export interface MockOpenWeatherCondition {
  id: number;
  main: string;
  description: string;
  icon: string;
}

export interface MockOpenWeatherCoreWeatherResponse {
  fetchedAt: string;
  current: {
    dt: number;
    temp: number;
    feels_like: number;
    humidity: number;
    wind_speed: number;
    dew_point: number;
    uvi: number;
    clouds: number;
    rain?: {
      '1h'?: number;
    };
    snow?: {
      '1h'?: number;
    };
    weather: MockOpenWeatherCondition[];
  };
  daily: Array<{
    dt: number;
    temp: {
      min: number;
      max: number;
    };
  }>;
  hourly: Array<{
    dt: number;
    temp: number;
    pop: number;
    clouds: number;
    rain?: {
      '1h'?: number;
    };
    snow?: {
      '1h'?: number;
    };
    weather: MockOpenWeatherCondition[];
  }>;
}

export interface MockOpenWeatherAqiResponse {
  fetchedAt: string;
  list: Array<{
    dt: number;
    main: {
      aqi: number;
    };
    components: {
      co: number;
      no2: number;
      o3: number;
      pm2_5: number;
      pm10: number;
      so2: number;
      nh3?: number;
    };
  }>;
}

const observedAt = Date.parse('2026-04-11T08:50:00+09:00') / 1000;
const hourlyStart = Date.parse('2026-04-11T09:00:00+09:00') / 1000;

export const mockOpenWeatherCoreWeatherFixture: MockOpenWeatherCoreWeatherResponse =
  {
    fetchedAt: '2026-04-11T09:00:00+09:00',
    current: {
      dt: observedAt,
      temp: 17.2,
      feels_like: 16.4,
      humidity: 56,
      wind_speed: 2.8,
      dew_point: 8.1,
      uvi: 5.3,
      clouds: 8,
      weather: [
        {
          id: 800,
          main: 'Clear',
          description: '맑음',
          icon: '01d',
        },
      ],
    },
    daily: [
      {
        dt: hourlyStart,
        temp: {
          min: 12.1,
          max: 21.4,
        },
      },
    ],
    hourly: Array.from({ length: 12 }, (_, index) => ({
      dt: hourlyStart + index * 60 * 60,
      temp: 17.2 + index * 0.4,
      pop: index < 4 ? 0 : 0.15,
      clouds: index < 4 ? 8 : 42,
      weather: [
        {
          id: index < 6 ? 800 : 803,
          main: index < 6 ? 'Clear' : 'Clouds',
          description: index < 6 ? '맑음' : '구름 많음',
          icon: index < 3 ? '01d' : index < 6 ? '01n' : '03n',
        },
      ],
    })),
  };

export const mockOpenWeatherAqiFixture: MockOpenWeatherAqiResponse = {
  fetchedAt: '2026-04-11T09:00:00+09:00',
  list: [
    {
      dt: Date.parse('2026-04-11T08:45:00+09:00') / 1000,
      main: {
        aqi: 2,
      },
      components: {
        co: 210.4,
        no2: 14.1,
        o3: 52.8,
        pm2_5: 18.4,
        pm10: 27.3,
        so2: 3.2,
        nh3: 1.4,
      },
    },
  ],
};
