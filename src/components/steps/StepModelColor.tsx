'use client';

import React from 'react';
import { PHONE_MODELS, CASE_COLORS, PhoneModel, CaseColor } from '@/config/phoneModels';
import { Check, Smartphone, Info } from 'lucide-react';

interface StepModelColorProps {
  selectedModel: PhoneModel;
  onSelectModel: (model: PhoneModel) => void;
  selectedColor: CaseColor;
  onSelectColor: (color: CaseColor) => void;
}

export default function StepModelColor({
  selectedModel,
  onSelectModel,
  selectedColor,
  onSelectColor,
}: StepModelColorProps) {
  return (
    <div className="space-y-6">
      {/* 1. Wybór modelu smartfona (3 modele) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-[#111111] flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-[#111111]" />
            <span>1. Wybór modelu telefonu (3 modele)</span>
          </label>
          <span className="text-[11px] text-[#6B6B66] bg-[#FBF8F3] px-2.5 py-0.5 rounded-full border border-[rgba(17,17,17,0.08)] font-normal">
            3 modele w ofercie
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {PHONE_MODELS.map((model) => {
            const isSelected = selectedModel.id === model.id;
            return (
              <button
                key={model.id}
                type="button"
                onClick={() => onSelectModel(model)}
                className={`relative p-3.5 rounded-[14px] border text-left transition-all duration-150 flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? 'border-[#111111] bg-[#FBF8F3] ring-1 ring-[#111111]'
                    : 'border-[rgba(17,17,17,0.08)] bg-white hover:border-[rgba(17,17,17,0.2)]'
                }`}
              >
                {isSelected && (
                  <span className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-[#111111] text-white flex items-center justify-center">
                    <Check className="w-3 h-3 stroke-[2.5]" />
                  </span>
                )}

                <div>
                  <span className="text-[10px] uppercase font-medium tracking-wider text-[#6B6B66] block mb-0.5">
                    {model.brand}
                  </span>
                  <h4 className="font-medium text-sm text-[#111111] leading-tight">
                    {model.name}
                  </h4>
                  <p className="text-xs text-[#6B6B66] mt-0.5">{model.description}</p>
                </div>

                {/* Miniaturowy schemat kształtu SVG etui */}
                <div className="mt-3 pt-2.5 border-t border-[rgba(17,17,17,0.06)] flex items-center justify-between text-[11px] text-[#6B6B66]">
                  <span>
                    {model.dimensionsMm.width} × {model.dimensionsMm.height} mm
                  </span>
                  <svg width="20" height="30" viewBox="0 0 24 38" className="text-[#6B6B66]">
                    <rect
                      x="1"
                      y="1"
                      width="22"
                      height="36"
                      rx={model.id === 'samsung-s24' ? '4' : '5'}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    {model.cameraCutout.type === 'samsung-vertical-lenses' ? (
                      <>
                        <circle cx="5" cy="5" r="1.5" fill="currentColor" />
                        <circle cx="5" cy="10" r="1.5" fill="currentColor" />
                        <circle cx="5" cy="15" r="1.5" fill="currentColor" />
                      </>
                    ) : (
                      <rect
                        x="3"
                        y="3"
                        width={model.id === 'iphone-15-pro' ? '8' : '7'}
                        height={model.id === 'iphone-15-pro' ? '8' : '7'}
                        rx="2"
                        fill="currentColor"
                      />
                    )}
                  </svg>
                </div>
              </button>
            );
          })}
        </div>

        <p className="mt-2 text-[11px] text-[#6B6B66] flex items-center gap-1">
          <Info className="w-3.5 h-3.5 text-[#6B6B66] shrink-0" />
          <span>Wymiary szacunkowe etui w mm (do potwierdzenia z drukarnią).</span>
        </p>
      </div>

      {/* 2. Wybór koloru etui (4 kolory) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-[#111111]">
            2. Wybór koloru etui (4 kolory)
          </label>
          <span className="text-xs text-[#111111] font-medium">
            Wybrany: {selectedColor.name}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {CASE_COLORS.map((col) => {
            const isSelected = selectedColor.id === col.id;
            return (
              <button
                key={col.id}
                type="button"
                onClick={() => onSelectColor(col)}
                className={`p-3 rounded-[14px] border text-left transition-all duration-150 flex flex-col items-center gap-2 cursor-pointer ${
                  isSelected
                    ? 'border-[#111111] bg-[#FBF8F3] ring-1 ring-[#111111]'
                    : 'border-[rgba(17,17,17,0.08)] bg-white hover:border-[rgba(17,17,17,0.2)]'
                }`}
              >
                {/* Próbnik koloru */}
                <div
                  className="w-10 h-10 rounded-full border border-[rgba(17,17,17,0.1)] relative flex items-center justify-center transition-transform hover:scale-105"
                  style={{
                    backgroundColor: col.isTransparent ? '#ffffff' : col.hex,
                    borderColor: col.borderHex,
                    backgroundImage: col.isTransparent
                      ? 'linear-gradient(45deg, #e5e5e5 25%, transparent 25%), linear-gradient(-45deg, #e5e5e5 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e5e5 75%), linear-gradient(-45deg, transparent 75%, #e5e5e5 75%)'
                      : undefined,
                    backgroundSize: col.isTransparent ? '8px 8px' : undefined,
                    backgroundPosition: col.isTransparent ? '0 0, 0 4px, 4px -4px, -4px 0px' : undefined,
                  }}
                >
                  {isSelected && (
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center ${
                        col.id === 'white' || col.id === 'transparent'
                          ? 'bg-[#111111] text-white'
                          : 'bg-white text-[#111111]'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                  )}
                </div>

                <div className="text-center">
                  <span className="text-xs font-medium text-[#111111] block">
                    {col.name}
                  </span>
                  <span className="text-[10px] text-[#6B6B66] leading-tight block">
                    {col.isTransparent ? 'Przezroczysty' : col.name}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
