import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle({ className = 'icon-button' }) {
  const { theme, toggle } = useTheme();
  const dark = theme === 'dark';
  return (
    <button
      type="button"
      className={className}
      aria-label={dark ? 'Mode terang' : 'Mode gelap'}
      aria-pressed={dark}
      title={dark ? 'Mode terang' : 'Mode gelap'}
      onClick={toggle}
    >
      <span className="material-symbols-outlined" aria-hidden="true">{dark ? 'light_mode' : 'dark_mode'}</span>
    </button>
  );
}
