export interface Theme {
  id: string;
  name: string;
  gradient: string;
  headerBg: string;
  cardBg: string;
  hoverBg: string;
  accentColor: string;
  accentHover: string;
}

export const themes: Theme[] = [
  {
    id: 'default',
    name: 'Mor Gece',
    gradient: 'from-slate-900 via-purple-900 to-slate-900',
    headerBg: 'bg-black/30',
    cardBg: 'bg-white/10',
    hoverBg: 'hover:bg-white/20',
    accentColor: 'bg-purple-600',
    accentHover: 'hover:bg-purple-700'
  },
  {
    id: 'dark',
    name: 'Karanlık',
    gradient: 'from-black via-zinc-900 to-black',
    headerBg: 'bg-zinc-950/30',
    cardBg: 'bg-zinc-900/20',
    hoverBg: 'hover:bg-zinc-800/30',
    accentColor: 'bg-zinc-700',
    accentHover: 'hover:bg-zinc-600'
  },
  {
    id: 'ocean',
    name: 'Okyanus',
    gradient: 'from-blue-900 via-cyan-900 to-blue-900',
    headerBg: 'bg-blue-950/30',
    cardBg: 'bg-white/10',
    hoverBg: 'hover:bg-white/20',
    accentColor: 'bg-cyan-600',
    accentHover: 'hover:bg-cyan-700'
  },
  {
    id: 'sunset',
    name: 'Gün Batımı',
    gradient: 'from-orange-900 via-red-900 to-orange-900',
    headerBg: 'bg-orange-950/30',
    cardBg: 'bg-white/10',
    hoverBg: 'hover:bg-white/20',
    accentColor: 'bg-orange-600',
    accentHover: 'hover:bg-orange-700'
  },
  {
    id: 'forest',
    name: 'Orman',
    gradient: 'from-green-900 via-emerald-900 to-green-900',
    headerBg: 'bg-green-950/30',
    cardBg: 'bg-white/10',
    hoverBg: 'hover:bg-white/20',
    accentColor: 'bg-emerald-600',
    accentHover: 'hover:bg-emerald-700'
  }
];