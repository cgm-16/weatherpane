import { useSettings, useTheme } from '~/features/settings';
import { cn } from '~/shared/lib/utils';

interface PreferenceOption<Value extends string> {
  label: string;
  value: Value;
}

interface PreferenceGroupProps<Value extends string> {
  legend: string;
  name: string;
  onValueChange: (value: Value) => void;
  options: readonly PreferenceOption<Value>[];
  value: Value;
}

function PreferenceGroup<Value extends string>({
  legend,
  name,
  onValueChange,
  options,
  value,
}: PreferenceGroupProps<Value>) {
  return (
    <fieldset className="rounded-[var(--radius-md)] bg-muted p-4 md:p-6">
      <legend className="px-2 text-sm font-bold text-foreground">
        {legend}
      </legend>
      <div
        className={cn(
          'mt-2 grid gap-2',
          options.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
        )}
      >
        {options.map((option) => {
          const checked = option.value === value;

          return (
            <label
              key={option.value}
              className={cn(
                'flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-card px-3 py-3 text-center text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                checked &&
                  'bg-primary text-primary-foreground ring-2 ring-primary hover:bg-primary hover:text-primary-foreground'
              )}
            >
              <input
                checked={checked}
                className={cn(
                  'size-4 shrink-0 accent-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-muted focus-visible:outline-none',
                  checked && 'accent-primary-foreground'
                )}
                name={name}
                onChange={() => onValueChange(option.value)}
                type="radio"
                value={option.value}
              />
              <span>{option.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

const THEME_OPTIONS = [
  { label: '시스템', value: 'system' },
  { label: '밝게', value: 'light' },
  { label: '어둡게', value: 'dark' },
] as const;

const TEMPERATURE_OPTIONS = [
  { label: '섭씨', value: 'C' },
  { label: '화씨', value: 'F' },
] as const;

const MOTION_OPTIONS = [
  { label: '시스템 설정', value: 'system' },
  { label: '줄이기', value: 'reduced' },
  { label: '허용', value: 'full' },
] as const;

export function SettingsControls() {
  const { preference, setPreference } = useTheme();
  const {
    motionPreference,
    setMotionPreference,
    setTemperatureUnit,
    temperatureUnit,
  } = useSettings();

  return (
    <section aria-label="환경 설정" className="flex flex-col gap-6">
      <PreferenceGroup
        legend="테마"
        name="theme"
        onValueChange={setPreference}
        options={THEME_OPTIONS}
        value={preference}
      />
      <PreferenceGroup
        legend="온도 단위"
        name="temperature-unit"
        onValueChange={setTemperatureUnit}
        options={TEMPERATURE_OPTIONS}
        value={temperatureUnit}
      />
      <PreferenceGroup
        legend="동작 줄이기"
        name="motion-preference"
        onValueChange={setMotionPreference}
        options={MOTION_OPTIONS}
        value={motionPreference}
      />
    </section>
  );
}
