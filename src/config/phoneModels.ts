// Konfiguracja modeli telefonów i wymiarów etui
// UWAGA: Wszystkie wymiary w milimetrach są szacunkowe, do potwierdzenia z drukarnią

export interface CameraCutoutConfig {
  type: 'iphone-island' | 'iphone-pro-island' | 'samsung-vertical-lenses';
  // Pozycja i wymiary wycięcia w milimetrach
  xMm: number; // od lewej krawędzi etui
  yMm: number; // od górnej krawędzi etui
  widthMm: number;
  heightMm: number;
  cornerRadiusMm: number;
  // Dodatkowe detale wizualne aparatów na podglądzie
  lenses: Array<{
    xMm: number; // środek soczewki wzgl. lewej krawędzi etui
    yMm: number; // środek soczewki wzgl. górnej krawędzi etui
    radiusMm: number;
  }>;
}

export interface PhoneModel {
  id: 'iphone-15' | 'iphone-15-pro' | 'samsung-s24';
  name: string;
  brand: 'Apple' | 'Samsung';
  description: string;
  // Wymiary etui w mm (szacunkowe, do potwierdzenia z drukarnią)
  dimensionsMm: {
    width: number;
    height: number;
    cornerRadius: number;
    thicknessMm: number;
  };
  cameraCutout: CameraCutoutConfig;
}

export const PHONE_MODELS: PhoneModel[] = [
  {
    id: 'iphone-15',
    name: 'iPhone 15',
    brand: 'Apple',
    description: 'Format standardowy (6.1")',
    // Wymiary szacunkowe, do potwierdzenia z drukarnią
    dimensionsMm: {
      width: 75.0, // szerokość etui w mm
      height: 151.0, // wysokość etui w mm
      cornerRadius: 15.0, // promień zaokrąglenia narożników
      thicknessMm: 2.0,
    },
    cameraCutout: {
      type: 'iphone-island',
      xMm: 5.0,
      yMm: 5.0,
      widthMm: 33.0,
      heightMm: 33.0,
      cornerRadiusMm: 9.0,
      lenses: [
        { xMm: 14.0, yMm: 14.0, radiusMm: 6.5 },
        { xMm: 28.0, yMm: 28.0, radiusMm: 6.5 },
      ],
    },
  },
  {
    id: 'iphone-15-pro',
    name: 'iPhone 15 Pro',
    brand: 'Apple',
    description: 'Format Pro (6.1") z potrójnym aparatem',
    // Wymiary szacunkowe, do potwierdzenia z drukarnią
    dimensionsMm: {
      width: 74.5,
      height: 150.0,
      cornerRadius: 15.0,
      thicknessMm: 2.2,
    },
    cameraCutout: {
      type: 'iphone-pro-island',
      xMm: 4.5,
      yMm: 4.5,
      widthMm: 38.0,
      heightMm: 38.0,
      cornerRadiusMm: 10.0,
      lenses: [
        { xMm: 14.5, yMm: 14.5, radiusMm: 7.0 },
        { xMm: 14.5, yMm: 32.5, radiusMm: 7.0 },
        { xMm: 32.5, yMm: 23.5, radiusMm: 7.0 },
      ],
    },
  },
  {
    id: 'samsung-s24',
    name: 'Samsung Galaxy S24',
    brand: 'Samsung',
    description: 'Format kompaktowy (6.2") z pionową wyspą obiektywów',
    // Wymiary szacunkowe, do potwierdzenia z drukarnią
    dimensionsMm: {
      width: 74.0,
      height: 150.5,
      cornerRadius: 13.0,
      thicknessMm: 2.0,
    },
    cameraCutout: {
      type: 'samsung-vertical-lenses',
      xMm: 5.0,
      yMm: 8.0,
      widthMm: 16.0,
      heightMm: 56.0,
      cornerRadiusMm: 8.0,
      lenses: [
        { xMm: 13.0, yMm: 16.0, radiusMm: 6.0 },
        { xMm: 13.0, yMm: 36.0, radiusMm: 6.0 },
        { xMm: 13.0, yMm: 56.0, radiusMm: 6.0 },
      ],
    },
  },
];

export interface CaseColor {
  id: 'black' | 'white' | 'transparent' | 'navy';
  name: string;
  hex: string;
  borderHex: string;
  textColorHint: string;
  isTransparent?: boolean;
}

export const CASE_COLORS: CaseColor[] = [
  {
    id: 'black',
    name: 'Czarny',
    hex: '#18181b',
    borderHex: '#27272a',
    textColorHint: 'Czysta głęboka czerń, matowe wykończenie',
  },
  {
    id: 'white',
    name: 'Biały',
    hex: '#ffffff',
    borderHex: '#e4e4e7',
    textColorHint: 'Śnieżnobiały, gładka powierzchnia',
  },
  {
    id: 'transparent',
    name: 'Przezroczysty',
    hex: 'rgba(255, 255, 255, 0.25)',
    borderHex: 'rgba(200, 200, 200, 0.6)',
    isTransparent: true,
    textColorHint: 'Silikon krystaliczny (widoczny tył telefonu)',
  },
  {
    id: 'navy',
    name: 'Granatowy',
    hex: '#0f172a',
    borderHex: '#1e293b',
    textColorHint: 'Elegancki głęboki granat (Navy Blue)',
  },
];

export interface StyleOption {
  id: 'standard' | 'anime' | 'realism' | 'cyberpunk' | 'minimalism' | 'watercolor';
  name: string;
  promptSuffix: string;
  description: string;
  badgeColor: string;
}

export const STYLE_OPTIONS: StyleOption[] = [
  {
    id: 'standard',
    name: 'Normalny',
    promptSuffix: 'natural style, high resolution, clean balanced lighting, crisp details',
    description: 'Naturalny wygląd bez filtra artystycznego',
    badgeColor: 'from-slate-500 to-zinc-600',
  },
  {
    id: 'anime',
    name: 'Anime',
    promptSuffix: 'in stunning anime style, vibrant studio ghibli / makoto shinkai aesthetics, clean cel shaded, expressive artwork, high quality wallpaper illustration, masterwork',
    description: 'Japońska animacja, żywe barwy',
    badgeColor: 'from-pink-500 to-rose-500',
  },
  {
    id: 'realism',
    name: 'Realizm',
    promptSuffix: 'photorealistic 8k, ultra-detailed macro photograph, cinematic lighting, octane render, masterpiece, crisp depth of field',
    description: 'Fotorealizm i detale 8k',
    badgeColor: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    promptSuffix: 'cyberpunk style, neon lights, futuristic synthwave, glowing cyan and magenta accents, dark night city reflection, high tech aesthetic',
    description: 'Neony i klimat sci-fi',
    badgeColor: 'from-purple-500 to-violet-600',
  },
  {
    id: 'minimalism',
    name: 'Minimalizm',
    promptSuffix: 'minimalist design, clean vector lines, elegant simple shapes, tasteful negative space, modern scandinavian art, subtle palette',
    description: 'Proste formy i czystość',
    badgeColor: 'from-emerald-500 to-teal-500',
  },
  {
    id: 'watercolor',
    name: 'Akwarela',
    promptSuffix: 'soft watercolor painting, wet-on-wet paint bleeding, pastel colors, paper texture, delicate brushstrokes, artistic splash',
    description: 'Delikatne plamy farby i pastele',
    badgeColor: 'from-amber-500 to-orange-500',
  },
];

export interface FontOption {
  id: string;
  name: string;
  fontFamily: string;
  sampleText: string;
}

export const FONT_OPTIONS: FontOption[] = [
  {
    id: 'inter',
    name: 'Nowoczesny (Sans)',
    fontFamily: 'Inter, system-ui, sans-serif',
    sampleText: 'Minimal Clean',
  },
  {
    id: 'playfair',
    name: 'Elegancki (Serif)',
    fontFamily: '"Playfair Display", Georgia, serif',
    sampleText: 'Luxury Signature',
  },
  {
    id: 'bebas',
    name: 'Odważny (Display)',
    fontFamily: '"Bebas Neue", Impact, sans-serif',
    sampleText: 'BOLD STATEMENT',
  },
];

// Przelicznik mm na piksele w 300 DPI
// 1 cal = 25.4 mm
export const DPI_PRINT = 300;

export function mmToPixels(mm: number, dpi: number = DPI_PRINT): number {
  return Math.round((mm / 25.4) * dpi);
}

// Funkcja generująca nazwę pliku do druku
export function getPrintFileName(modelId: string): string {
  const dateStr = new Date().toISOString().split('T')[0];
  return `${modelId}_${dateStr}.png`;
}
