import { createContext, use, useLayoutEffect, useState } from 'react';
import type { TemperatureUnit } from '~/shared/lib/temperature';
import {
  createSettingsRepository,
  SETTINGS_DEFAULTS,
  type MotionPreference,
} from './settings-repository';

interface SettingsContextValue {
  temperatureUnit: TemperatureUnit;
  motionPreference: MotionPreference;
  reduceMotion: boolean;
  setTemperatureUnit: (temperatureUnit: TemperatureUnit) => void;
  setMotionPreference: (motionPreference: MotionPreference) => void;
}

const SettingsContext = createContext<SettingsContextValue>({
  ...SETTINGS_DEFAULTS,
  reduceMotion: false,
  setMotionPreference: () => {},
  setTemperatureUnit: () => {},
});

function resolveReduceMotion(
  motionPreference: MotionPreference,
  systemReduceMotion: boolean
) {
  return (
    motionPreference === 'reduced' ||
    (motionPreference === 'system' && systemReduceMotion)
  );
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState(SETTINGS_DEFAULTS);
  const [hydrated, setHydrated] = useState(false);
  const [systemReduceMotion, setSystemReduceMotion] = useState(false);

  useLayoutEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    // eslint-disable-next-line @eslint-react/set-state-in-effect -- hydration 뒤에만 저장된 설정을 반영한다.
    setPreferences(createSettingsRepository().get());
    // eslint-disable-next-line @eslint-react/set-state-in-effect -- hydration 뒤에만 시스템 모션 상태를 읽는다.
    setSystemReduceMotion(mediaQuery.matches);
    // eslint-disable-next-line @eslint-react/set-state-in-effect -- 첫 클라이언트 렌더의 기본값을 유지한 뒤 완료 상태를 반영한다.
    setHydrated(true);
  }, []);

  useLayoutEffect(() => {
    if (!hydrated || preferences.motionPreference !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (event: MediaQueryListEvent) => {
      setSystemReduceMotion(event.matches);
    };
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [hydrated, preferences.motionPreference]);

  const reduceMotion = resolveReduceMotion(
    preferences.motionPreference,
    systemReduceMotion
  );

  useLayoutEffect(() => {
    if (!hydrated) return;

    document.documentElement.dataset.motion = reduceMotion ? 'reduced' : 'full';
  }, [hydrated, reduceMotion]);

  function updatePreferences(nextPreferences: typeof preferences) {
    setPreferences(nextPreferences);
    createSettingsRepository().set(nextPreferences);
  }

  function setTemperatureUnit(temperatureUnit: TemperatureUnit) {
    updatePreferences({ ...preferences, temperatureUnit });
  }

  function setMotionPreference(motionPreference: MotionPreference) {
    updatePreferences({ ...preferences, motionPreference });
  }

  return (
    <SettingsContext
      value={{
        ...preferences,
        reduceMotion,
        setMotionPreference,
        setTemperatureUnit,
      }}
    >
      {children}
    </SettingsContext>
  );
}

export function useSettings(): SettingsContextValue {
  return use(SettingsContext);
}
