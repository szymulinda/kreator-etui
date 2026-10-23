'use client';

import React, { useState } from 'react';
import { FONT_OPTIONS, PhoneModel, CaseColor, mmToPixels, DPI_PRINT } from '@/config/phoneModels';
import { GraphicTransform, TextItem } from '@/types';
import { exportPrintFile, triggerFileDownload, ExportResult } from '@/lib/exportPrint';
import {
  Type,
  Palette,
  Loader2,
  CheckCircle2,
  Trash2,
  Plus,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface StepEditorProps {
  model: PhoneModel;
  color: CaseColor;
  graphicUrl: string | null;
  graphicTransform: GraphicTransform;
  textItem: TextItem | null;
  onTextChange: (text: TextItem | null) => void;
  imageElement?: HTMLImageElement | null;
}

const COLOR_PRESETS = [
  { name: 'Biały', hex: '#ffffff' },
  { name: 'Czarny', hex: '#111111' },
  { name: 'Złoty', hex: '#f59e0b' },
  { name: 'Błękit', hex: '#06b6d4' },
  { name: 'Róż', hex: '#f43f5e' },
  { name: 'Mięta', hex: '#10b981' },
];

export default function StepEditor({
  model,
  color,
  graphicUrl,
  graphicTransform,
  textItem,
  onTextChange,
  imageElement,
}: StepEditorProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);

  // Wymiary podglądu etui dla przeliczenia proporcji
  const previewCaseWidth = 280;
  const mmToPreviewRatio = previewCaseWidth / model.dimensionsMm.width;
  const previewCaseHeight = model.dimensionsMm.height * mmToPreviewRatio;

  // Wymiary docelowe 300 DPI
  const printWidthPx = mmToPixels(model.dimensionsMm.width, DPI_PRINT);
  const printHeightPx = mmToPixels(model.dimensionsMm.height, DPI_PRINT);

  // Dodanie początkowego tekstu
  const handleAddText = () => {
    const defaultFont = FONT_OPTIONS[0];
    onTextChange({
      id: `text-${Date.now()}`,
      text: 'Twój Tekst',
      fontId: defaultFont.id,
      fontFamily: defaultFont.fontFamily,
      fontSize: 28,
      color: color.id === 'white' ? '#111111' : '#ffffff',
      x: 35,
      y: previewCaseHeight * 0.65,
      rotation: 0,
    });
  };

  const handleUpdateTextValue = (val: string) => {
    if (!textItem) return;
    onTextChange({
      ...textItem,
      text: val,
    });
  };

  const handleSelectFont = (fontId: string) => {
    if (!textItem) return;
    const font = FONT_OPTIONS.find((f) => f.id === fontId);
    if (!font) return;
    onTextChange({
      ...textItem,
      fontId: font.id,
      fontFamily: font.fontFamily,
    });
  };

  const handleSelectColor = (hex: string) => {
    if (!textItem) return;
    onTextChange({
      ...textItem,
      color: hex,
    });
  };

  const handleFontSizeChange = (size: number) => {
    if (!textItem) return;
    onTextChange({
      ...textItem,
      fontSize: size,
    });
  };

  // Eksport pliku do druku (300 DPI)
  const handleExportPrint = async () => {
    setIsExporting(true);
    setExportResult(null);

    try {
      const result = await exportPrintFile({
        model,
        color,
        graphicUrl,
        graphicTransform,
        previewWidth: previewCaseWidth,
        previewHeight: previewCaseHeight,
        textItem,
        imageElement,
      });

      setExportResult(result);
      triggerFileDownload(result.blob, result.fileName);

      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
        });
      } catch {}
    } catch (err) {
      console.error('Błąd eksportu pliku produkcyjnego:', err);
      alert('Nie udało się wyeksportować pliku do druku.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* 8. SEKCJA EDYCJI TEKSTU NA ETUI */}
      <div className="p-4 bg-[#FBF8F3] rounded-[14px] border border-[rgba(17,17,17,0.08)] space-y-3.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-[#111111] flex items-center gap-1.5">
            <Type className="w-3.5 h-3.5 text-[#111111]" />
            <span>8. Edytor tekstu na etui (font, kolor, rozmiar)</span>
          </label>

          {textItem ? (
            <button
              type="button"
              onClick={() => onTextChange(null)}
              className="text-[11px] text-[#6B6B66] hover:text-[#111111] font-medium flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Usuń tekst</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleAddText}
              className="text-[11px] bg-white border border-[rgba(17,17,17,0.12)] text-[#111111] hover:bg-[#F3EFEA] px-3 py-1 rounded-full font-medium flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Dodaj tekst</span>
            </button>
          )}
        </div>

        {textItem ? (
          <div className="space-y-3 pt-1">
            {/* Pole tekstowe */}
            <div>
              <input
                type="text"
                value={textItem.text}
                onChange={(e) => handleUpdateTextValue(e.target.value)}
                placeholder="Wpisz treść napisu..."
                maxLength={40}
                className="w-full text-xs font-medium p-2.5 rounded-[12px] border border-[rgba(17,17,17,0.12)] focus:border-[#111111] outline-none bg-white text-[#111111] placeholder:text-[#6B6B66]"
              />
            </div>

            {/* Wybór 3 fontów */}
            <div>
              <span className="block text-[11px] font-medium text-[#111111] mb-1.5">
                Wybierz krój pisma (3 fonty):
              </span>
              <div className="grid grid-cols-3 gap-2">
                {FONT_OPTIONS.map((f) => {
                  const isSelected = textItem.fontId === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => handleSelectFont(f.id)}
                      className={`py-2 px-1 rounded-full border text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#111111] text-white border-[#111111] font-medium shadow-xs'
                          : 'bg-white border-[rgba(17,17,17,0.12)] hover:border-[#111111] text-[#111111]'
                      }`}
                    >
                      <span
                        className="block text-xs truncate"
                        style={{ fontFamily: f.fontFamily }}
                      >
                        {f.sampleText.split(' ')[0]}
                      </span>
                      <span className="text-[9px] text-[#6B6B66] block">
                        {f.name.split(' ')[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Kolor tekstu */}
            <div>
              <span className="block text-[11px] font-medium text-[#111111] mb-1.5">
                Kolor napisu:
              </span>
              <div className="flex items-center gap-2">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => handleSelectColor(c.hex)}
                    className={`w-6 h-6 rounded-full border shadow-xs transition-transform hover:scale-110 flex items-center justify-center cursor-pointer ${
                      textItem.color.toLowerCase() === c.hex.toLowerCase()
                        ? 'ring-2 ring-[#111111] ring-offset-2 scale-105'
                        : 'border-[rgba(17,17,17,0.15)]'
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                  />
                ))}

                {/* Próbnik własnego koloru HEX */}
                <label
                  className="w-6 h-6 rounded-full border border-[rgba(17,17,17,0.2)] bg-white flex items-center justify-center cursor-pointer hover:bg-[#F3EFEA] transition-colors"
                  title="Wybierz własny kolor"
                >
                  <Palette className="w-3 h-3 text-[#111111]" />
                  <input
                    type="color"
                    value={textItem.color}
                    onChange={(e) => handleSelectColor(e.target.value)}
                    className="sr-only"
                  />
                </label>
              </div>
            </div>

            {/* Rozmiar czcionki */}
            <div>
              <div className="flex items-center justify-between text-[11px] text-[#6B6B66] mb-1">
                <span>Wielkość napisu:</span>
                <span className="font-medium text-[#111111]">{textItem.fontSize}px</span>
              </div>
              <input
                type="range"
                min="16"
                max="60"
                value={textItem.fontSize}
                onChange={(e) => handleFontSizeChange(Number(e.target.value))}
                className="w-full accent-[#111111] cursor-pointer"
              />
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-[#6B6B66]">
            Kliknij &quot;Dodaj tekst&quot;, aby umieścić napis na etui. Możesz go przesuwać, obracać i skalować bezpośrednio na podglądzie.
          </p>
        )}
      </div>

      {/* 10. SEKCJA: PLIK DO DRUKU (300 DPI) Z INFORMACJĄ O WYMIARACH */}
      <div className="pt-2">
        <button
          type="button"
          onClick={handleExportPrint}
          disabled={isExporting}
          className="w-full py-3 px-5 rounded-full bg-[#111111] hover:bg-[#222222] text-white font-medium text-[14px] transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 shadow-xs"
        >
          {isExporting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>Generowanie pliku 300 DPI...</span>
            </>
          ) : (
            <>
              <span>Pobierz plik do druku</span>
              <span className="text-xs">↗</span>
            </>
          )}
        </button>

        {/* Informacja o wymiarach bezpośrednio pod przyciskiem */}
        <div className="mt-2.5 text-center text-xs text-[#6B6B66] leading-relaxed">
          <div>
            Format: <span className="font-medium text-[#111111]">{model.dimensionsMm.width} × {model.dimensionsMm.height} mm</span> · Rozdzielczość: <span className="font-medium text-[#111111]">{printWidthPx} × {printHeightPx} px</span> (300 DPI)
          </div>
          <div className="text-[11px] text-[#6B6B66] mt-0.5">
            Plik: <span className="font-mono text-[#111111]">{model.id}_data.png</span> (bez warstwy aparatu)
          </div>
        </div>

        {/* Potwierdzenie pobrania */}
        {exportResult && (
          <div className="mt-3 p-3 bg-[#CFEBC4] border border-[rgba(17,17,17,0.08)] rounded-[12px] flex items-center gap-2.5 text-xs text-[#111111]">
            <CheckCircle2 className="w-4 h-4 text-[#111111] shrink-0" />
            <div className="leading-tight">
              <span className="font-medium block">
                Wygenerowano: {exportResult.fileName}
              </span>
              <span className="text-[11px] text-[#6B6B66] block mt-0.5">
                {exportResult.widthPx} × {exportResult.heightPx} px ({exportResult.fileSizeFormatted}, 300 DPI)
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
