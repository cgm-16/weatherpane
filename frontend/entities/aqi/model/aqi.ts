export type AqiCategory = 'good' | 'fair' | 'moderate' | 'poor' | 'very-poor';

export interface Aqi {
  locationId: string;
  fetchedAt: string;
  observedAt: string;
  summary: {
    aqi: number;
    category: AqiCategory;
  };
  pollutants: {
    co: number;
    no2: number;
    o3: number;
    pm10: number;
    pm25: number;
    so2: number;
    nh3?: number;
  };
  source: {
    provider: string;
    modelVersion?: string;
  };
}
