export const weatherQueryKeys = {
  coreWeather: (locationId: string) => ['weather', 'core', locationId] as const,
  aqi: (locationId: string) => ['weather', 'aqi', locationId] as const,
} as const;
