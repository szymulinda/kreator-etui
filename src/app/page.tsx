'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Navbar from '@/components/Navbar';
import StepModelColor from '@/components/steps/StepModelColor';
import StepGraphic from '@/components/steps/StepGraphic';
import StepEditor from '@/components/steps/StepEditor';
import {
  PHONE_MODELS,
  CASE_COLORS,
  PhoneModel,
  CaseColor,
  mmToPixels,
  DPI_PRINT,
} from '@/config/phoneModels';
import { GraphicTransform, TextItem } from '@/types';
import { exportPrintFile, triggerFileDownload } from '@/lib/exportPrint';

// Dynamiczny import płótna Konva (tylko po stronie klienta, bez SSR)
const CaseCanvas = dynamic(() => import('@/components/editor/CaseCanvas'), {
  ssr: false,
  loading: () => (
    <div className="w-[300px] h-[600px] rounded-[34px] bg-[#F3EFEA] animate-pulse flex flex-col items-center justify-center text-[#6B6B66] gap-3 border border-[rgba(17,17,17,0.08)]">
      <div className="w-8 h-8 rounded-full border-2 border-[#111111] border-t-transparent animate-spin" />
      <span className="text-[12px] font-medium">Ładowanie edytora etui...</span>
    </div>
  ),
});

export default function Home() {
  // Stan modelu i koloru
  const [selectedModel, setSelectedModel] = useState<PhoneModel>(PHONE_MODELS[0]);
  const [selectedColor, setSelectedColor] = useState<CaseColor>(CASE_COLORS[0]);

  // Stan grafiki
  const [graphicUrl, setGraphicUrl] = useState<string | null>(
    'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1024&auto=format&fit=crop&q=85'
  );
  const [isExampleGraphic, setIsExampleGraphic] = useState<boolean>(true);
  const [isExampleMode, setIsExampleMode] = useState<boolean>(true);

  const [graphicTransform, setGraphicTransform] = useState<GraphicTransform>({
    x: 0,
    y: 0,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
  });

  // Stan tekstu i elementu obrazu
  const [textItem, setTextItem] = useState<TextItem | null>(null);
  const [cachedImageElement, setCachedImageElement] = useState<HTMLImageElement | null>(null);

  // Licznik sesji dla generacji AI (maks. 10)
  const [generationCount, setGenerationCount] = useState<number>(0);
  const maxGenerations = 10;

  // Wymiary podglądu etui dla przeliczenia proporcji
  const previewCaseWidth = 280;
  const mmToPreviewRatio = previewCaseWidth / selectedModel.dimensionsMm.width;
  const previewCaseHeight = selectedModel.dimensionsMm.height * mmToPreviewRatio;

  // Sprawdzenie statusu API na starcie
  useEffect(() => {
    fetch('/api/generate')
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data.isExampleMode === 'boolean') {
          setIsExampleMode(data.isExampleMode);
          setIsExampleGraphic(data.isExampleMode);
        }
      })
      .catch(() => {});
  }, []);

  // Szybki eksport z paska nawigacji
  const handleQuickExport = async () => {
    try {
      const result = await exportPrintFile({
        model: selectedModel,
        color: selectedColor,
        graphicUrl,
        graphicTransform,
        previewWidth: previewCaseWidth,
        previewHeight: previewCaseHeight,
        textItem,
        imageElement: cachedImageElement,
      });
      triggerFileDownload(result.blob, result.fileName);
    } catch {
      alert('Nie udało się pobrać pliku do druku.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FBF8F3] text-[#111111]">
      {/* Pasek nawigacji 72px */}
      <Navbar onExportClick={handleQuickExport} />

      <main className="flex-1 max-w-[1360px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Nagłówek strony: waga 300, duży, letter-spacing -0.035em, line-height 0.98 */}
        <header className="text-center mb-10 sm:mb-12">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light tracking-[-0.035em] leading-[0.98] text-[#111111] max-w-[800px] mx-auto">
            Zaprojektuj unikalne etui na telefon z AI
          </h1>
          <p className="text-[16px] sm:text-[17px] text-[#6B6B66] font-normal leading-relaxed max-w-[520px] mx-auto mt-4">
            Stwórz autorską grafikę generowaną przez sztuczną inteligencję lub wgraj własne zdjęcie, dopasuj kadr i pobierz plik do druku w 300 DPI.
          </p>
        </header>

        {/* Klasyczny układ 2-kolumnowy:
            Desktop: Lewa kolumna (podgląd etui z kołem #E6DCFB) + Prawa kolumna (panel z sekcjami 1-2-3)
            Mobile: Kolumna pojedyncza (podgląd u góry, sekcje pod spodem)
        */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ================= LEWA KOLUMNA: PODGLĄD ETUI ================= */}
          <section className="lg:col-span-5 flex flex-col items-center">
            <div className="sticky top-24 w-full flex flex-col items-center">
              {/* Kontener podglądu etui na czystym białym tle */}
              <div className="relative w-full max-w-[420px] flex flex-col items-center justify-center p-6 bg-white border border-[rgba(17,17,17,0.08)] rounded-[16px] card-shadow">
                {/* Nagłówek podglądu etui */}
                <div className="w-full flex items-center justify-between mb-2 text-xs text-[#111111]">
                  <span className="font-medium flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#111111]" />
                    {selectedModel.name}
                  </span>
                  <span className="text-[#6B6B66] bg-[#FBF8F3] px-2.5 py-0.5 rounded-full border border-[rgba(17,17,17,0.08)] text-[11px]">
                    Kolor: {selectedColor.name}
                  </span>
                </div>

                {/* Komponent płótna Konva */}
                <div>
                  <CaseCanvas
                    model={selectedModel}
                    color={selectedColor}
                    graphicUrl={graphicUrl}
                    graphicTransform={graphicTransform}
                    onTransformChange={setGraphicTransform}
                    textItem={textItem}
                    onTextChange={setTextItem}
                    onImageLoaded={setCachedImageElement}
                    showCameraCutout={true}
                    isExampleGraphic={isExampleGraphic}
                  />
                </div>

                {/* Wskazówka manipulacji na podglądzie */}
                <p className="mt-3 text-[11px] text-center text-[#6B6B66]">
                  Przesuwaj, skaluj i obracaj grafikę lub napis myszką lub dotykiem na etui.
                </p>
              </div>
            </div>
          </section>

          {/* ================= PRAWA KOLUMNA: PANEL Z SEKVJAMI 1-2-3 (ODSTĘP 24PX) ================= */}
          <section className="lg:col-span-7 space-y-6">
            {/* KARTA 1: WYBÓR MODELU I KOLORU ETUI */}
            <div className="bg-white border border-[rgba(17,17,17,0.08)] rounded-[16px] p-5 sm:p-6 card-shadow">
              <div className="pb-3 mb-4 border-b border-[rgba(17,17,17,0.06)] flex items-center justify-between">
                <h2 className="text-base sm:text-lg font-medium text-[#111111]">
                  Krok 1: Wybór modelu i koloru etui
                </h2>
                <span className="text-[11px] text-[#6B6B66] bg-[#FBF8F3] px-2.5 py-0.5 rounded-full border border-[rgba(17,17,17,0.08)]">
                  Krok 1 z 3
                </span>
              </div>

              <StepModelColor
                selectedModel={selectedModel}
                onSelectModel={setSelectedModel}
                selectedColor={selectedColor}
                onSelectColor={setSelectedColor}
              />
            </div>

            {/* KARTA 2: GRAFIKA Z AI LUB WŁASNE ZDJĘCIE */}
            <div className="bg-white border border-[rgba(17,17,17,0.08)] rounded-[16px] p-5 sm:p-6 card-shadow">
              <div className="pb-3 mb-4 border-b border-[rgba(17,17,17,0.06)] flex items-center justify-between">
                <h2 className="text-base sm:text-lg font-medium text-[#111111]">
                  Krok 2: Generowanie grafiki lub własne zdjęcie
                </h2>
                <span className="text-[11px] text-[#6B6B66] bg-[#FBF8F3] px-2.5 py-0.5 rounded-full border border-[rgba(17,17,17,0.08)]">
                  Krok 2 z 3
                </span>
              </div>

              <StepGraphic
                currentGraphicUrl={graphicUrl}
                onSelectGraphic={(url, isEx) => {
                  setGraphicUrl(url);
                  if (typeof isEx === 'boolean') {
                    setIsExampleGraphic(isEx);
                  }
                }}
                onClearGraphic={() => setGraphicUrl(null)}
                generationCount={generationCount}
                maxGenerations={maxGenerations}
                onIncrementGeneration={() => setGenerationCount((prev) => prev + 1)}
                isExampleMode={isExampleMode}
                onSetExampleMode={setIsExampleMode}
              />
            </div>

            {/* KARTA 3: EDYCJA NAPISU I PLIK DO DRUKU (300 DPI) */}
            <div className="bg-white border border-[rgba(17,17,17,0.08)] rounded-[16px] p-5 sm:p-6 card-shadow">
              <div className="pb-3 mb-4 border-b border-[rgba(17,17,17,0.06)] flex items-center justify-between">
                <h2 className="text-base sm:text-lg font-medium text-[#111111]">
                  Krok 3: Edycja i plik do druku (300 DPI)
                </h2>
                <span className="text-[11px] text-[#6B6B66] bg-[#FBF8F3] px-2.5 py-0.5 rounded-full border border-[rgba(17,17,17,0.08)]">
                  Krok 3 z 3
                </span>
              </div>

              <StepEditor
                model={selectedModel}
                color={selectedColor}
                graphicUrl={graphicUrl}
                graphicTransform={graphicTransform}
                textItem={textItem}
                onTextChange={setTextItem}
                imageElement={cachedImageElement}
              />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
