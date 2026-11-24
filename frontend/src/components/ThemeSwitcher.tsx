import { THEMES, useThemeStore } from '@/stores/themeStore';

export function ThemeSwitcher() {
  const { theme, setTheme } = useThemeStore();
  return (
    <div className="seg" role="group" aria-label="Theme">
      {THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          aria-pressed={theme === t.id}
          title={t.description}
          onClick={() => setTheme(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
