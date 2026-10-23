'use client';

import React, { useState, useRef, useEffect } from 'react';
import { STYLE_OPTIONS, StyleOption } from '@/config/phoneModels';
import { GeneratedProposal } from '@/types';
import {
  Sparkles,
  Upload,
  Loader2,
  Check,
  AlertCircle,
  AlertTriangle,
  Trash2,
} from 'lucide-react';

interface StepGraphicProps {
  currentGraphicUrl: string | null;
  onSelectGraphic: (url: string, isExample?: boolean) => void;
  onClearGraphic: () => void;
  generationCount: number;
  maxGenerations: number;
  onIncrementGeneration: () => void;
  isExampleMode?: boolean;
  onSetExampleMode?: (isExample: boolean) => void;
}

const SAMPLE_INSPIRATIONS = [
  'Bukiet kwiatów',
  'Kot w kosmosie',
  'Górski szczyt we mgle o wschodzie słońca',
  'Geometryczny złoty lis w lesie iglastym',
  'Neonowe miasto w deszczu',
];

// Mapowanie pastelowych kolorów chipów stylu:
// anime: #CFEBC4, realizm: #F9CFCA, cyberpunk: #E6DCFB, minimalizm: białe z obramowaniem, akwarela: #CFEBC4
function getStyleChipClass(styleId: string, isSelected: boolean): string {
  if (isSelected) {
    return 'bg-[#111111] text-white border border-[#111111] shadow-xs';
  }
  switch (styleId) {
    case 'standard':
      return 'bg-white text-[#111111] border border-[rgba(17,17,17,0.15)] hover:bg-[#FBF8F3]';
    case 'anime':
      return 'bg-[#CFEBC4] text-[#111111] border border-transparent hover:brightness-95';
    case 'realism':
      return 'bg-[#F9CFCA] text-[#111111] border border-transparent hover:brightness-95';
    case 'cyberpunk':
      return 'bg-[#E6DCFB] text-[#111111] border border-transparent hover:brightness-95';
    case 'minimalism':
      return 'bg-white text-[#111111] border border-[rgba(17,17,17,0.15)] hover:bg-[#FBF8F3]';
    case 'watercolor':
    default:
      return 'bg-[#CFEBC4] text-[#111111] border border-transparent hover:brightness-95';
  }
}

export default function StepGraphic({
  currentGraphicUrl,
  onSelectGraphic,
  onClearGraphic,
  generationCount,
  maxGenerations,
  onIncrementGeneration,
  isExampleMode: parentIsExampleMode = true,
  onSetExampleMode,
}: StepGraphicProps) {
  const [activeTab, setActiveTab] = useState<'ai' | 'upload'>('ai');
  const [prompt, setPrompt] = useState('Bukiet kwiatów');
  const [selectedStyle, setSelectedStyle] = useState<StyleOption>(STYLE_OPTIONS[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  // Historia wygenerowanych obrazów z tej sesji (najnowsze pierwsze, maks. 20)
  const [proposals, setProposals] = useState<GeneratedProposal[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warningNotice, setWarningNotice] = useState<string | null>(null);
  const [engineNotice, setEngineNotice] = useState<string | null>(null);
  const [isExampleMode, setIsExampleMode] = useState<boolean>(parentIsExampleMode);

  // Stan dla własnego zdjęcia
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [isTransforming, setIsTransforming] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const remainingQuota = Math.max(0, maxGenerations - generationCount);
  const isQuotaExceeded = remainingQuota <= 0;

  // Sprawdzenie statusu API na starcie
  useEffect(() => {
    fetch('/api/generate')
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data.isExampleMode === 'boolean') {
          setIsExampleMode(data.isExampleMode);
          if (onSetExampleMode) {
            onSetExampleMode(data.isExampleMode);
          }
        }
      })
      .catch(() => {});
  }, [onSetExampleMode]);

  // 1. Obsługa generowania 1 obrazu na kliknięcie
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setErrorMessage('Wpisz opis grafiki, którą chcesz wygenerować.');
      return;
    }
    if (isQuotaExceeded) {
      setErrorMessage('Osiągnięto limit 10 generacji na sesję.');
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);
    setWarningNotice(null);
    setEngineNotice(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          styleId: selectedStyle.id,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error('Nie udało się wygenerować, spróbuj ponownie');
      }

      onIncrementGeneration();

      const exampleFlag = Boolean(data.isExampleMode);
      setIsExampleMode(exampleFlag);
      if (onSetExampleMode) {
        onSetExampleMode(exampleFlag);
      }

      // Wymóg pkt 4: jeśli jedno z 2 zapytań się nie udało, krótki komunikat
      if (data.partialWarning) {
        setWarningNotice(data.partialWarning);
      }

      const incomingImages: Array<{ url: string }> = data.images || [];
      if (incomingImages.length > 0) {
        const newProposals: GeneratedProposal[] = incomingImages.map((img, index) => ({
          id: `gen-${Date.now()}-${index}`,
          url: img.url,
          prompt: prompt.trim(),
          styleId: selectedStyle.id,
          model: data.modelUsed || 'FLUX.1 [schnell]',
          timestamp: Date.now() + index,
          isExampleMode: exampleFlag,
        }));

        // Obie propozycje trafiają na początek historii miniatur (najnowsze pierwsze, maks. 20 miniatur)
        setProposals((prev) => [
          ...newProposals,
          ...prev.filter((p) => !newProposals.some((np) => np.url === p.url)),
        ].slice(0, 20));

        // Pierwsza z nowych automatycznie nakłada się na etui
        onSelectGraphic(newProposals[0].url, exampleFlag);
      }

      // Wymóg pkt 6: Pokaż tylko "Wygenerowano w X s"
      const secFormatted = data.durationSeconds || (data.generationTimeMs ? (data.generationTimeMs / 1000).toFixed(1) : '1.8');
      setEngineNotice(`Wygenerowano w ${secFormatted} s`);
    } catch {
      setErrorMessage('Nie udało się wygenerować, spróbuj ponownie');
    } finally {
      setIsGenerating(false);
    }
  };

  // Obsługa przesłania pliku z dysku
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Proszę wybrać plik graficzny (JPG, PNG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const resultUrl = uploadEvent.target?.result as string;
      setUploadedImageUrl(resultUrl);
      onSelectGraphic(resultUrl, false);
      setErrorMessage(null);
    };
    reader.readAsDataURL(file);
  };

  // 4. Obsługa przycisku "Przerób w stylu ..." (Image-to-Image z 1 obrazem i trafieniem do historii)
  const handleTransformUploadedImage = async () => {
    if (!uploadedImageUrl) return;

    if (isQuotaExceeded) {
      setErrorMessage('Osiągnięto limit 10 generacji na sesję.');
      return;
    }

    setIsTransforming(true);
    setErrorMessage(null);
    setEngineNotice(null);

    try {
      const response = await fetch('/api/transform-style', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: uploadedImageUrl,
          styleId: selectedStyle.id,
          userPrompt: prompt.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error('Nie udało się wygenerować, spróbuj ponownie');
      }

      onIncrementGeneration();

      if (data.imageUrl) {
        const exampleFlag = Boolean(data.isExampleMode);
        const transformedProposal: GeneratedProposal = {
          id: `transform-${Date.now()}`,
          url: data.imageUrl,
          prompt: prompt.trim() ? `Przeróbka: ${prompt.trim()}` : `Przeróbka w stylu ${selectedStyle.name}`,
          styleId: selectedStyle.id,
          model: data.modelUsed || 'FLUX.2 klein 4B',
          timestamp: Date.now(),
          isExampleMode: exampleFlag,
        };

        // Trafia do historii miniatur (najnowsza pierwsza, maks. 20)
        setProposals((prev) => [transformedProposal, ...prev.filter((p) => p.url !== data.imageUrl)].slice(0, 20));

        // Nałożenie na etui
        onSelectGraphic(data.imageUrl, exampleFlag);

        // Wymóg pkt 6: Pokaż tylko "Wygenerowano w X s"
        const secFormatted = data.durationSeconds || (data.durationMs ? (data.durationMs / 1000).toFixed(1) : '1.5');
        setEngineNotice(`Wygenerowano w ${secFormatted} s`);
      }
    } catch {
      setErrorMessage('Nie udało się wygenerować, spróbuj ponownie');
    } finally {
      setIsTransforming(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Zakładki wyboru: Generator AI vs Własne zdjęcie */}
      <div className="flex p-1 bg-[#FBF8F3] rounded-full border border-[rgba(17,17,17,0.08)]">
        <button
          type="button"
          onClick={() => setActiveTab('ai')}
          className={`flex-1 py-2 px-3 rounded-full text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'ai'
              ? 'bg-[#111111] text-white shadow-xs'
              : 'text-[#6B6B66] hover:text-[#111111]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Generator AI</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className={`flex-1 py-2 px-3 rounded-full text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'upload'
              ? 'bg-[#111111] text-white shadow-xs'
              : 'text-[#6B6B66] hover:text-[#111111]'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Własne zdjęcie</span>
        </button>
      </div>

      {activeTab === 'ai' ? (
        /* ================= SEKCJA GENERATORA AI ================= */
        <div className="space-y-4">
          {/* PASEK TRYBU BEZ KLUCZA API */}
          {isExampleMode && (
            <div className="p-3 bg-[#E6DCFB] border border-[rgba(17,17,17,0.08)] rounded-[14px] flex items-center gap-2.5 text-[#111111]">
              <AlertTriangle className="w-4 h-4 text-[#111111] shrink-0" />
              <div className="flex-1 text-[11px] leading-tight">
                <span className="font-semibold block">
                  Tryb przykładowy - grafiki poglądowe, nie generowane na żywo
                </span>
                <span className="text-[#6B6B66] block mt-0.5">
                  Dodaj klucze w .env.local, aby uruchomić generowanie na żywo z FLUX schnell.
                </span>
              </div>
            </div>
          )}

          {/* 3. Pole opisu tekstowego */}
          <div>
            <label className="block text-xs font-medium text-[#111111] mb-1.5">
              Opis grafiki:
            </label>
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Np. Bukiet kwiatów, Kot w kosmosie..."
                rows={3}
                maxLength={300}
                className="w-full text-xs p-3 rounded-[12px] border border-[rgba(17,17,17,0.12)] focus:border-[#111111] outline-none resize-none bg-white text-[#111111] placeholder:text-[#6B6B66]"
              />
              <span className="absolute bottom-2.5 right-3 text-[10px] text-[#6B6B66]">
                {prompt.length}/300
              </span>
            </div>

            {/* Szybkie inspiracje */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {SAMPLE_INSPIRATIONS.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPrompt(sample)}
                  className="text-[11px] px-3 py-1 rounded-full bg-[#FBF8F3] hover:bg-[#F3EFEA] border border-[rgba(17,17,17,0.08)] text-[#111111] transition-colors cursor-pointer"
                >
                  {sample}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Wybór stylu (anime, realizm, cyberpunk, minimalizm, akwarela) */}
          <div>
            <label className="block text-xs font-medium text-[#111111] mb-2">
              Styl grafiki:
            </label>
            <div className="flex flex-wrap gap-2">
              {STYLE_OPTIONS.map((style) => {
                const isSelected = selectedStyle.id === style.id;
                return (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => setSelectedStyle(style)}
                    className={`px-4 py-2 rounded-full text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${getStyleChipClass(
                      style.id,
                      isSelected
                    )}`}
                  >
                    <span>{style.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 1 & 5. Przycisk "Generuj" (1 obraz na kliknięcie) i licznik */}
          <div className="pt-1">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || isQuotaExceeded || !prompt.trim()}
              className="w-full py-3 px-5 rounded-full bg-[#111111] hover:bg-[#222222] text-white font-medium text-[14px] transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Generowanie obrazu...</span>
                </>
              ) : (
                <>
                  <span>Generuj</span>
                  <span className="text-xs">↗</span>
                </>
              )}
            </button>

            {/* Licznik pojedynczych generacji pod przyciskiem */}
            <div className="mt-2 text-center text-xs text-[#6B6B66] font-normal">
              Pozostało {remainingQuota} z 10 generacji
            </div>
          </div>

          {/* Komunikat błędu */}
          {errorMessage && (
            <div className="p-3 bg-[#F9CFCA] border border-[rgba(17,17,17,0.08)] rounded-[12px] text-[#111111] text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-[#111111]" />
                <span className="font-medium">{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-[11px] underline cursor-pointer"
              >
                Zamknij
              </button>
            </div>
          )}

          {/* Ostrzeżenie: jeśli jedno z 2 zapytań się nie udało */}
          {warningNotice && (
            <div className="p-3 bg-[#E6DCFB] border border-[rgba(17,17,17,0.08)] rounded-[12px] text-[#111111] text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-[#111111]" />
                <span className="font-medium">{warningNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setWarningNotice(null)}
                className="text-[11px] underline cursor-pointer"
              >
                Zamknij
              </button>
            </div>
          )}

          {/* Wymóg pkt 6: Pasek pod przyciskiem - tylko "Wygenerowano w X s" */}
          {engineNotice && (
            <div className="p-2.5 bg-[#FBF8F3] border border-[rgba(17,17,17,0.08)] rounded-[12px] text-[#111111] text-xs text-center font-medium">
              {engineNotice}
            </div>
          )}

          {/* 6. Historia miniatur: "Twoje projekty (kliknij, aby wybrać)" */}
          {proposals.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-[rgba(17,17,17,0.06)]">
              <div className="flex items-center justify-between text-xs text-[#111111]">
                <span className="font-medium">
                  Twoje projekty (kliknij, aby wybrać):
                </span>
                <span className="text-[11px] text-[#6B6B66]">
                  {proposals.length} z 20 w historii
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {proposals.map((item, index) => {
                  const isActive = currentGraphicUrl === item.url;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelectGraphic(item.url, item.isExampleMode)}
                      className={`group relative aspect-square rounded-[12px] overflow-hidden border-2 transition-all cursor-pointer ${
                        isActive
                          ? 'border-[#111111] shadow-xs'
                          : 'border-[rgba(17,17,17,0.1)] hover:border-[#111111]'
                      }`}
                    >
                      <img
                        src={item.url}
                        alt={`Projekt ${index + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        crossOrigin="anonymous"
                      />
                      <div className="absolute top-1 left-1 bg-[#111111]/70 text-white text-[9px] font-medium px-1.5 py-0.2 rounded-full">
                        #{index + 1}
                      </div>

                      {item.isExampleMode && (
                        <div className="absolute bottom-1 inset-x-1 bg-[#E6DCFB] text-[#111111] text-[8px] font-medium px-1 py-0.5 rounded text-center truncate">
                          Poglądowe
                        </div>
                      )}

                      {isActive && (
                        <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#111111] text-white flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ================= 7. SEKCJA WŁASNEGO ZDJĘCIA ================= */
        <div className="space-y-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/png, image/jpeg, image/webp"
            className="hidden"
          />

          {!uploadedImageUrl ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border border-dashed border-[rgba(17,17,17,0.2)] hover:border-[#111111] rounded-[16px] p-6 text-center cursor-pointer transition-colors bg-[#FBF8F3] hover:bg-white"
            >
              <div className="w-10 h-10 rounded-full bg-white border border-[rgba(17,17,17,0.08)] mx-auto flex items-center justify-center mb-2.5">
                <Upload className="w-5 h-5 text-[#111111]" />
              </div>
              <p className="text-xs font-medium text-[#111111]">
                Przesłanie własnego zdjęcia z dysku
              </p>
              <p className="text-[11px] text-[#6B6B66] mt-0.5">
                Formaty: JPG, PNG, WebP
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 bg-white border border-[rgba(17,17,17,0.08)] rounded-[14px] flex items-center gap-3">
                <div className="w-14 h-14 rounded-[10px] overflow-hidden shrink-0 border border-[rgba(17,17,17,0.08)] bg-[#FBF8F3]">
                  <img
                    src={uploadedImageUrl}
                    alt="Przesłane zdjęcie"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-[#111111] block truncate">
                    Twoje zdjęcie z dysku
                  </span>
                  <span className="text-[11px] text-[#111111] flex items-center gap-1 font-normal mt-0.5">
                    <Check className="w-3 h-3" /> Naniesiono na podgląd etui
                  </span>
                  <div className="flex gap-3 mt-1.5">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[11px] text-[#111111] hover:underline font-medium cursor-pointer"
                    >
                      Zmień plik
                    </button>
                    <span className="text-[rgba(17,17,17,0.2)]">·</span>
                    <button
                      type="button"
                      onClick={() => {
                        setUploadedImageUrl(null);
                        onClearGraphic();
                      }}
                      className="text-[11px] text-[#6B6B66] hover:text-[#111111] font-medium flex items-center gap-0.5 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" /> Usuń
                    </button>
                  </div>
                </div>
              </div>

              {/* Przycisk: Przerób w stylu... (tworzy 1 obraz i dodaje do historii miniatur) */}
              <div className="p-3.5 rounded-[14px] bg-[#FBF8F3] border border-[rgba(17,17,17,0.08)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#111111]">
                    Przerób w stylu:
                  </span>
                  <span className="text-[10px] text-[#6B6B66]">Image-to-Image</span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {STYLE_OPTIONS.map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setSelectedStyle(st)}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all cursor-pointer ${getStyleChipClass(
                        st.id,
                        selectedStyle.id === st.id
                      )}`}
                    >
                      {st.name}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleTransformUploadedImage}
                  disabled={isTransforming || isQuotaExceeded}
                  className="w-full py-3 px-5 rounded-full bg-[#111111] hover:bg-[#222222] text-white font-medium text-[14px] flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs disabled:opacity-40"
                >
                  {isTransforming ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Przetwarzanie przez FLUX...</span>
                    </>
                  ) : (
                    <>
                      <span>Przerób w stylu: {selectedStyle.name}</span>
                      <span className="text-xs">↗</span>
                    </>
                  )}
                </button>

                {errorMessage && (
                  <div className="p-2.5 bg-[#F9CFCA] border border-[rgba(17,17,17,0.08)] rounded-[10px] text-[#111111] text-xs flex items-center justify-between">
                    <span>{errorMessage}</span>
                    <button
                      type="button"
                      onClick={() => setErrorMessage(null)}
                      className="underline text-[10px] ml-2 cursor-pointer"
                    >
                      Zamknij
                    </button>
                  </div>
                )}

                {engineNotice && (
                  <div className="p-2.5 bg-white border border-[rgba(17,17,17,0.08)] rounded-[10px] text-[#111111] text-xs text-center font-medium">
                    {engineNotice}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
