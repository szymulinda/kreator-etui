'use client';

import React, { useRef, useState, useEffect } from 'react';
import {
  Stage,
  Layer,
  Group,
  Image as KonvaImage,
  Text as KonvaText,
  Rect as KonvaRect,
  Circle as KonvaCircle,
  Transformer,
} from 'react-konva';
import Konva from 'konva';
import { PhoneModel, CaseColor } from '@/config/phoneModels';
import { GraphicTransform, TextItem } from '@/types';
import { Eye, EyeOff, RotateCcw, Maximize, Move, AlertTriangle } from 'lucide-react';

interface CaseCanvasProps {
  model: PhoneModel;
  color: CaseColor;
  graphicUrl: string | null;
  graphicTransform: GraphicTransform;
  onTransformChange: (newTransform: GraphicTransform) => void;
  textItem: TextItem | null;
  onTextChange?: (newText: TextItem) => void;
  onSelectGraphic?: () => void;
  onSelectText?: () => void;
  showCameraCutout?: boolean;
  onToggleCameraCutout?: () => void;
  onImageLoaded?: (img: HTMLImageElement) => void;
  isExampleGraphic?: boolean;
}

export default function CaseCanvas({
  model,
  color,
  graphicUrl,
  graphicTransform,
  onTransformChange,
  textItem,
  onTextChange,
  showCameraCutout = true,
  onImageLoaded,
  isExampleGraphic = false,
}: CaseCanvasProps) {
  const stageRef = useRef<Konva.Stage | null>(null);
  const imageRef = useRef<Konva.Image | null>(null);
  const textRef = useRef<Konva.Text | null>(null);
  const trRef = useRef<Konva.Transformer | null>(null);

  const [selectedNode, setSelectedNode] = useState<'image' | 'text' | null>('image');
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 340, height: 680 });
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Wymiary etui w przestrzeni podglądu (preview)
  // Skalujemy proporcjonalnie wg wymiarów w mm modelu
  const caseWidth = 280;
  const mmToPreviewRatio = caseWidth / model.dimensionsMm.width;
  const caseHeight = model.dimensionsMm.height * mmToPreviewRatio;
  const cornerRadius = model.dimensionsMm.cornerRadius * mmToPreviewRatio;

  // Odstępy wewnątrz sceny
  const stageWidth = caseWidth + 40;
  const stageHeight = caseHeight + 40;
  const caseOffsetX = 20;
  const caseOffsetY = 20;

  // Ładowanie obrazu
  useEffect(() => {
    if (!graphicUrl) {
      setImageElement(null);
      return;
    }
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = graphicUrl;
    img.onload = () => {
      setImageElement(img);
      if (onImageLoaded) onImageLoaded(img);

      // Jeśli skala wynosi 0 lub domyślną, dopasuj wstępnie grafikę do etui
      if (graphicTransform.scaleX === 1 && graphicTransform.x === 0 && graphicTransform.y === 0) {
        const coverScale = Math.max(caseWidth / img.width, caseHeight / img.height);
        const initialX = (caseWidth - img.width * coverScale) / 2;
        const initialY = (caseHeight - img.height * coverScale) / 2;

        onTransformChange({
          x: initialX,
          y: initialY,
          scaleX: coverScale,
          scaleY: coverScale,
          rotation: 0,
        });
      }
    };
  }, [graphicUrl, model.id]);

  // Aktualizacja transformera do aktywnego elementu
  useEffect(() => {
    if (!trRef.current) return;

    if (selectedNode === 'image' && imageRef.current) {
      trRef.current.nodes([imageRef.current]);
      trRef.current.getLayer()?.batchDraw();
    } else if (selectedNode === 'text' && textRef.current) {
      trRef.current.nodes([textRef.current]);
      trRef.current.getLayer()?.batchDraw();
    } else {
      trRef.current.nodes([]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [selectedNode, imageElement, textItem]);

  // Funkcja rysowania zaokrąglonego prostokąta
  const clipCaseFunc = (ctx: any) => {
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(0, 0, caseWidth, caseHeight, cornerRadius);
    } else {
      const r = cornerRadius;
      ctx.moveTo(r, 0);
      ctx.lineTo(caseWidth - r, 0);
      ctx.quadraticCurveTo(caseWidth, 0, caseWidth, r);
      ctx.lineTo(caseWidth, caseHeight - r);
      ctx.quadraticCurveTo(caseWidth, caseHeight, caseWidth - r, caseHeight);
      ctx.lineTo(r, caseHeight);
      ctx.quadraticCurveTo(0, caseHeight, 0, caseHeight - r);
      ctx.lineTo(0, r);
      ctx.quadraticCurveTo(0, 0, r, 0);
    }
    ctx.closePath();
  };

  // Helpery do szybkiego pozycjonowania
  const handleFitToCase = () => {
    if (!imageElement) return;
    const fitScale = Math.min(caseWidth / imageElement.width, caseHeight / imageElement.height);
    const newX = (caseWidth - imageElement.width * fitScale) / 2;
    const newY = (caseHeight - imageElement.height * fitScale) / 2;
    onTransformChange({
      x: newX,
      y: newY,
      scaleX: fitScale,
      scaleY: fitScale,
      rotation: 0,
    });
  };

  const handleFillCase = () => {
    if (!imageElement) return;
    const coverScale = Math.max(caseWidth / imageElement.width, caseHeight / imageElement.height);
    const newX = (caseWidth - imageElement.width * coverScale) / 2;
    const newY = (caseHeight - imageElement.height * coverScale) / 2;
    onTransformChange({
      x: newX,
      y: newY,
      scaleX: coverScale,
      scaleY: coverScale,
      rotation: 0,
    });
  };

  const handleCenter = () => {
    if (!imageElement) return;
    const currentW = imageElement.width * graphicTransform.scaleX;
    const currentH = imageElement.height * graphicTransform.scaleY;
    onTransformChange({
      ...graphicTransform,
      x: (caseWidth - currentW) / 2,
      y: (caseHeight - currentH) / 2,
    });
  };

  // Renderowanie wycięcia aparatu wg modelu
  const renderCameraCutout = () => {
    if (!showCameraCutout) return null;

    const { cameraCutout } = model;
    const cutoutX = cameraCutout.xMm * mmToPreviewRatio;
    const cutoutY = cameraCutout.yMm * mmToPreviewRatio;
    const cutoutW = cameraCutout.widthMm * mmToPreviewRatio;
    const cutoutH = cameraCutout.heightMm * mmToPreviewRatio;
    const cutoutR = cameraCutout.cornerRadiusMm * mmToPreviewRatio;

    return (
      <Group x={cutoutX} y={cutoutY} listening={false}>
        {/* Korpus wyspy aparatu (wypukłość etui) */}
        {cameraCutout.type === 'samsung-vertical-lenses' ? (
          // Samsung S24: 3 oddzielne soczewki
          cameraCutout.lenses.map((lens, i) => {
            const lx = (lens.xMm - cameraCutout.xMm) * mmToPreviewRatio;
            const ly = (lens.yMm - cameraCutout.yMm) * mmToPreviewRatio;
            const lr = lens.radiusMm * mmToPreviewRatio;

            return (
              <Group key={`lens-${i}`} x={lx} y={ly}>
                {/* Zewnętrzny pierścień metalowy etui */}
                <KonvaCircle
                  radius={lr + 2.5}
                  fill="#1e293b"
                  stroke="#475569"
                  strokeWidth={1.5}
                  shadowColor="black"
                  shadowBlur={6}
                  shadowOpacity={0.4}
                />
                {/* Wnętrze obiektywu ze szkłem */}
                <KonvaCircle radius={lr} fill="#090d16" />
                <KonvaCircle radius={lr * 0.75} fill="#020617" stroke="#1e293b" strokeWidth={1} />
                {/* Refleks światła na szkle soczewki */}
                <KonvaCircle
                  x={-lr * 0.25}
                  y={-lr * 0.25}
                  radius={lr * 0.25}
                  fill="rgba(255,255,255,0.45)"
                />
              </Group>
            );
          })
        ) : (
          // iPhone 15 & iPhone 15 Pro: Zaokrąglona wyspa aparatu
          <Group>
            {/* Cień wyspy etui */}
            <KonvaRect
              width={cutoutW}
              height={cutoutH}
              cornerRadius={cutoutR}
              fill="rgba(15, 23, 42, 0.85)"
              stroke="rgba(255, 255, 255, 0.2)"
              strokeWidth={1.5}
              shadowColor="black"
              shadowBlur={10}
              shadowOpacity={0.35}
              shadowOffset={{ x: 2, y: 3 }}
            />
            {/* Soczewki aparatu */}
            {cameraCutout.lenses.map((lens, i) => {
              const lx = (lens.xMm - cameraCutout.xMm) * mmToPreviewRatio;
              const ly = (lens.yMm - cameraCutout.yMm) * mmToPreviewRatio;
              const lr = lens.radiusMm * mmToPreviewRatio;

              return (
                <Group key={`lens-pro-${i}`} x={lx} y={ly}>
                  <KonvaCircle
                    radius={lr + 1.5}
                    fill="#0f172a"
                    stroke="#334155"
                    strokeWidth={1.5}
                  />
                  <KonvaCircle radius={lr} fill="#020617" />
                  <KonvaCircle
                    x={-lr * 0.3}
                    y={-lr * 0.3}
                    radius={lr * 0.28}
                    fill="rgba(255,255,255,0.4)"
                  />
                </Group>
              );
            })}
            {/* Dioda doświetlająca (Flash) */}
            <KonvaCircle
              x={cutoutW - 8}
              y={8}
              radius={3}
              fill="#fef08a"
              stroke="#ca8a04"
              strokeWidth={0.8}
            />
          </Group>
        )}
      </Group>
    );
  };

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center select-none"
      onClick={() => setSelectedNode(null)}
    >
      {/* Pływające szybkie akcje nad płótnem */}
      <div className="flex items-center gap-1 mb-3 bg-[#FFFFFF] px-3 py-1 rounded-full border border-[rgba(17,17,17,0.08)] text-[12px] text-[#111111] card-shadow">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleFitToCase();
          }}
          disabled={!graphicUrl}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full hover:bg-[#FBF8F3] disabled:opacity-40 transition-colors cursor-pointer"
          title="Dopasuj całość do etui"
        >
          <Maximize className="w-3 h-3 text-[#111111]" />
          <span>Dopasuj</span>
        </button>
        <span className="text-[rgba(17,17,17,0.15)]">·</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleFillCase();
          }}
          disabled={!graphicUrl}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full hover:bg-[#FBF8F3] disabled:opacity-40 transition-colors font-medium text-[#111111] cursor-pointer"
          title="Wypełnij całe etui bez marginesów"
        >
          <span>Wypełnij</span>
        </button>
        <span className="text-[rgba(17,17,17,0.15)]">·</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleCenter();
          }}
          disabled={!graphicUrl}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full hover:bg-[#FBF8F3] disabled:opacity-40 transition-colors cursor-pointer"
          title="Wyśrodkuj grafikę"
        >
          <Move className="w-3 h-3 text-[#111111]" />
          <span>Środek</span>
        </button>
      </div>

      {/* Kontener sceny Konva - telefon na czystym białym tle */}
      <div className="relative group">
        <div
          className="relative transition-all duration-300 flex items-center justify-center"
          style={{
            width: stageWidth,
            height: stageHeight,
          }}
        >
          <Stage
            ref={stageRef}
            width={stageWidth}
            height={stageHeight}
            className="cursor-grab active:cursor-grabbing"
            onMouseDown={(e) => {
              if (e.target === stageRef.current) {
                setSelectedNode(null);
              }
            }}
            onTouchStart={(e) => {
              if (e.target === stageRef.current) {
                setSelectedNode(null);
              }
            }}
          >
            <Layer>
              {/* Grupa etui przesunięta o margines wewnątrz sceny */}
              <Group x={caseOffsetX} y={caseOffsetY}>
                {/* Realistyczny cień pod etui na czystym białym tle */}
                <KonvaRect
                  x={0}
                  y={0}
                  width={caseWidth}
                  height={caseHeight}
                  cornerRadius={cornerRadius}
                  fill={color.isTransparent ? '#ffffff' : color.hex}
                  shadowColor="rgba(0, 0, 0, 0.12)"
                  shadowBlur={20}
                  shadowOffset={{ x: 0, y: 8 }}
                  shadowOpacity={0.7}
                  listening={false}
                />

                {/* Grupa przycięta do dokładnego kształtu etui (Clipped group) */}
                <Group clipFunc={clipCaseFunc}>
                  {/* Tło etui wybranego koloru */}
                  {color.isTransparent ? (
                    <Group>
                      {/* Subtelna szachownica oznaczająca przezroczystość silikonu */}
                      <KonvaRect
                        x={0}
                        y={0}
                        width={caseWidth}
                        height={caseHeight}
                        fill="#f1f5f9"
                      />
                      <KonvaRect
                        x={0}
                        y={0}
                        width={caseWidth}
                        height={caseHeight}
                        fill="rgba(255,255,255,0.7)"
                      />
                    </Group>
                  ) : (
                    <KonvaRect
                      x={0}
                      y={0}
                      width={caseWidth}
                      height={caseHeight}
                      fill={color.hex}
                    />
                  )}

                  {/* Grafika użytkownika (z obsługą drag & transform) */}
                  {imageElement && (
                    <KonvaImage
                      ref={imageRef}
                      image={imageElement}
                      x={graphicTransform.x}
                      y={graphicTransform.y}
                      scaleX={graphicTransform.scaleX}
                      scaleY={graphicTransform.scaleY}
                      rotation={graphicTransform.rotation}
                      draggable
                      onClick={(e) => {
                        e.cancelBubble = true;
                        setSelectedNode('image');
                      }}
                      onTap={(e) => {
                        e.cancelBubble = true;
                        setSelectedNode('image');
                      }}
                      onDragEnd={(e) => {
                        onTransformChange({
                          ...graphicTransform,
                          x: e.target.x(),
                          y: e.target.y(),
                        });
                      }}
                      onTransformEnd={() => {
                        const node = imageRef.current;
                        if (!node) return;
                        onTransformChange({
                          x: node.x(),
                          y: node.y(),
                          scaleX: node.scaleX(),
                          scaleY: node.scaleY(),
                          rotation: node.rotation(),
                        });
                      }}
                    />
                  )}

                  {/* Warstwa tekstu (jeśli wpisany) */}
                  {textItem && textItem.text.trim() !== '' && (
                    <KonvaText
                      ref={textRef}
                      text={textItem.text}
                      x={textItem.x}
                      y={textItem.y}
                      fontFamily={textItem.fontFamily}
                      fontSize={textItem.fontSize}
                      fill={textItem.color}
                      rotation={textItem.rotation}
                      draggable
                      shadowColor="rgba(0,0,0,0.3)"
                      shadowBlur={4}
                      shadowOffset={{ x: 1, y: 1 }}
                      onClick={(e) => {
                        e.cancelBubble = true;
                        setSelectedNode('text');
                      }}
                      onTap={(e) => {
                        e.cancelBubble = true;
                        setSelectedNode('text');
                      }}
                      onDragEnd={(e) => {
                        if (onTextChange) {
                          onTextChange({
                            ...textItem,
                            x: e.target.x(),
                            y: e.target.y(),
                          });
                        }
                      }}
                      onTransformEnd={() => {
                        const node = textRef.current;
                        if (!node || !onTextChange) return;
                        onTextChange({
                          ...textItem,
                          x: node.x(),
                          y: node.y(),
                          rotation: node.rotation(),
                        });
                      }}
                    />
                  )}

                  {/* Realistyczny połysk szkła/lakieru na powierzchni etui */}
                  <KonvaRect
                    x={0}
                    y={0}
                    width={caseWidth}
                    height={caseHeight}
                    listening={false}
                    fillLinearGradientStartPoint={{ x: 0, y: 0 }}
                    fillLinearGradientEndPoint={{ x: caseWidth, y: caseHeight }}
                    fillLinearGradientColorStops={[
                      0,
                      'rgba(255, 255, 255, 0.15)',
                      0.4,
                      'rgba(255, 255, 255, 0.03)',
                      1,
                      'rgba(0, 0, 0, 0.08)',
                    ]}
                  />
                </Group>

                {/* Subtelny rant ochronny etui (bezel) */}
                <KonvaRect
                  x={0}
                  y={0}
                  width={caseWidth}
                  height={caseHeight}
                  cornerRadius={cornerRadius}
                  stroke={color.isTransparent ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.15)'}
                  strokeWidth={1.5}
                  listening={false}
                />

                {/* WARSTWA WYCIĘCIA NA APARAT - ZAWSZE WIDOCZNA NA WIERZCHU */}
                {renderCameraCutout()}
              </Group>

              {/* Transformer do manipulacji (skalowanie, rotacja) */}
              <Transformer
                ref={trRef}
                boundBoxFunc={(oldBox, newBox) => {
                  // Ograniczenie minimalnego rozmiaru
                  if (Math.abs(newBox.width) < 20 || Math.abs(newBox.height) < 20) {
                    return oldBox;
                  }
                  return newBox;
                }}
                anchorFill="#111111"
                anchorStroke="#ffffff"
                anchorSize={9}
                anchorCornerRadius={4}
                borderStroke="#111111"
                borderDash={[3, 3]}
                rotateAnchorOffset={24}
              />
            </Layer>
          </Stage>
        </div>
      </div>

      {/* Pomocnicze oznaczenie wymiarów i wycięć */}
      <div className="mt-3 flex items-center justify-between w-full max-w-[280px] text-[11px] text-[#6B6B66]">
        <span>
          Format: {model.dimensionsMm.width} x {model.dimensionsMm.height} mm
        </span>
        <span className="flex items-center gap-1 text-[#111111] font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-[#111111]" />
          Aparat na wierzchu
        </span>
      </div>

      {/* Wyraźny pasek trybu przykładowego pod podglądem etui */}
      {isExampleGraphic && (
        <div className="mt-2.5 w-full max-w-[320px] px-3.5 py-1.5 bg-[#E6DCFB] border border-[rgba(17,17,17,0.08)] rounded-full text-center">
          <span className="text-[11px] font-medium text-[#111111] flex items-center justify-center gap-1.5 leading-snug">
            <AlertTriangle className="w-3.5 h-3.5 text-[#111111] shrink-0" />
            <span>Tryb przykładowy - grafiki poglądowe, nie generowane na żywo</span>
          </span>
        </div>
      )}
    </div>
  );
}
