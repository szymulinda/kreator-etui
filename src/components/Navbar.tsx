'use client';

import React from 'react';
import { ArrowUpRight } from 'lucide-react';

interface NavbarProps {
  onExportClick?: () => void;
}

export default function Navbar({ onExportClick }: NavbarProps) {
  return (
    <header className="w-full h-[72px] bg-[#FBF8F3] border-b border-[rgba(17,17,17,0.06)] sticky top-0 z-40 transition-all">
      <div className="max-w-[1360px] mx-auto h-full px-6 sm:px-8 flex items-center justify-between">
        {/* Logo po lewej w Instrument Serif */}
        <div className="flex items-center gap-2">
          <span className="font-serif text-2xl sm:text-[26px] tracking-tight text-[#111111]">
            Case Studio
          </span>
        </div>

        {/* Linki na środku rozdzielone kropką " · " */}
        <nav className="hidden md:flex items-center gap-3 text-[13px] font-medium text-[#6B6B66]">
          <span className="hover:text-[#111111] cursor-pointer transition-colors">Modele</span>
          <span className="text-[#6B6B66]/50">·</span>
          <span className="hover:text-[#111111] cursor-pointer transition-colors">Style AI</span>
          <span className="text-[#6B6B66]/50">·</span>
          <span className="hover:text-[#111111] cursor-pointer transition-colors">Edytor</span>
          <span className="text-[#6B6B66]/50">·</span>
          <span className="hover:text-[#111111] cursor-pointer transition-colors">Druk 300 DPI</span>
        </nav>

        {/* Przycisk główny: czarna pigułka z ikoną ↗ po prawej */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onExportClick}
            className="bg-[#111111] text-white text-[13px] sm:text-[14px] font-medium px-5 py-2.5 rounded-full hover:bg-black transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <span>Plik do druku</span>
            <span className="text-xs">↗</span>
          </button>
        </div>
      </div>
    </header>
  );
}
