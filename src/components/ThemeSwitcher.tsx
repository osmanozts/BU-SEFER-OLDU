import { useState } from 'react';
import { Palette } from 'lucide-react';
import { themes, Theme } from '../lib/themes';

interface ThemeSwitcherProps {
  currentTheme: Theme;
  onThemeChange: (theme: Theme) => void;
}

export default function ThemeSwitcher({ currentTheme, onThemeChange }: ThemeSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-white/10 rounded-full transition-colors"
        title="Tema Değiştir"
      >
        <Palette className="w-6 h-6 text-white" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white/10 backdrop-blur-sm border border-white/10 rounded-lg shadow-xl">
          <div className="py-2">
            {themes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => {
                  onThemeChange(theme);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-2 text-left text-white hover:bg-white/20 transition-colors flex items-center space-x-2 ${
                  currentTheme.id === theme.id ? 'bg-white/20' : ''
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-gradient-to-r ${theme.gradient}`} />
                <span>{theme.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}