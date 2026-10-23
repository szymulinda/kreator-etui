import { NextRequest, NextResponse } from 'next/server';
import { STYLE_OPTIONS } from '@/config/phoneModels';
import { translatePromptWithClaude, STYLE_MODIFIERS } from '@/lib/translatePrompt';
import { fal } from '@fal-ai/client';

// Przykładowe grafiki demonstracyjne dla trybu bez klucza API
const DEMO_FALLBACK_IMAGES: Record<string, string[]> = {
  standard: [
    'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1024&auto=format&fit=crop&q=85',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1024&auto=format&fit=crop&q=85',
  ],
  anime: [
    'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1024&auto=format&fit=crop&q=85',
    'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1024&auto=format&fit=crop&q=85',
  ],
  realism: [
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1024&auto=format&fit=crop&q=85',
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1024&auto=format&fit=crop&q=85',
  ],
  cyberpunk: [
    'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=1024&auto=format&fit=crop&q=85',
    'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1024&auto=format&fit=crop&q=85',
  ],
  minimalism: [
    'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1024&auto=format&fit=crop&q=85',
    'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1024&auto=format&fit=crop&q=85',
  ],
  watercolor: [
    'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1024&auto=format&fit=crop&q=85',
    'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=1024&auto=format&fit=crop&q=85',
  ],
};

// Endpoint GET sprawdzający status konfiguracji kluczy oraz obsługujący testowy dryRun
export async function GET(request: NextRequest) {
  const isDryRun = request.nextUrl.searchParams.get('dryRun') === '1';
  if (isDryRun) {
    const prompt = request.nextUrl.searchParams.get('prompt') || 'Bukiet kwiatów';
    const styleId = request.nextUrl.searchParams.get('styleId') || 'watercolor';

    // Generowanie 2 różnych losowych seedów
    const seed1 = Math.floor(Math.random() * 1000000000);
    let seed2 = Math.floor(Math.random() * 1000000000);
    if (seed2 === seed1) seed2 += 1;
    const seeds = [seed1, seed2];

    const translation = await translatePromptWithClaude(prompt, styleId);

    console.log('[Server dryRun GET] Original prompt:', prompt);
    console.log('[Server dryRun GET] Translated subject:', translation.translatedSubject);
    console.log('[Server dryRun GET] Final assembled prompt:', translation.finalPrompt);
    console.log('[Server dryRun GET] 2 Seeds:', seeds);

    return NextResponse.json({
      success: true,
      dryRun: true,
      originalPrompt: prompt,
      translatedSubject: translation.translatedSubject,
      styleId,
      styleModifier: STYLE_MODIFIERS[styleId] || STYLE_MODIFIERS.anime,
      finalPrompt: translation.finalPrompt,
      seeds,
      translationEngine: translation.engine,
      translationDurationMs: translation.durationMs,
    });
  }

  const hasCloudflare = Boolean(
    process.env.CLOUDFLARE_ACCOUNT_ID?.trim() && process.env.CLOUDFLARE_API_TOKEN?.trim()
  );
  const hasAnthropic = Boolean(process.env.ANTHROPIC_API_KEY?.trim());
  const hasFalKey = Boolean(process.env.FAL_KEY?.trim());
  const hasOpenAiKey = Boolean(process.env.OPENAI_API_KEY?.trim());
  const isExampleMode = !hasCloudflare && !hasFalKey && !hasOpenAiKey;

  const defaultEngine = hasCloudflare
    ? 'cloudflare'
    : hasFalKey
    ? 'fal'
    : hasOpenAiKey
    ? 'openai'
    : 'demo-fallback';

  return NextResponse.json({
    hasCloudflare,
    hasAnthropic,
    hasFalKey,
    hasOpenAiKey,
    isExampleMode,
    defaultEngine,
    defaultModel: hasCloudflare
      ? '@cf/black-forest-labs/flux-1-schnell'
      : hasFalKey
      ? 'fal-ai/flux/schnell'
      : hasOpenAiKey
      ? 'dall-e-3'
      : 'Tryb przykładowy',
  });
}

export async function POST(request: NextRequest) {
  const overallStartTime = Date.now();

  try {
    const isDryRunParam = request.nextUrl.searchParams.get('dryRun') === '1';
    const body = await request.json().catch(() => ({}));
    const { prompt, styleId, dryRun: isDryRunBody } = body;
    const isDryRun = isDryRunParam || Boolean(isDryRunBody);

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Nie udało się wygenerować, spróbuj ponownie' },
        { status: 400 }
      );
    }

    const selectedStyle = STYLE_OPTIONS.find((s) => s.id === styleId) || STYLE_OPTIONS[0];

    // 1. Tłumaczenie i uogólnienie promptu przez Claude API (z limitem 5s i fallbackiem)
    const translation = await translatePromptWithClaude(prompt, selectedStyle.id);
    const finalPrompt = translation.finalPrompt;

    // Generowanie 2 losowych seedów dla 2 propozycji
    const seed1 = Math.floor(Math.random() * 1000000000);
    let seed2 = Math.floor(Math.random() * 1000000000);
    if (seed2 === seed1) seed2 += 1;
    const seeds = [seed1, seed2];

    // Szczegóły techniczne logowane w konsoli serwera
    console.log('--- [GENERATOR AI - 2 PROPOZYCJE NA KLIKNIĘCIE] ---');
    console.log(`[Prompt Użytkownika]: "${prompt}"`);
    console.log(`[Tłumaczenie Claude]: "${translation.translatedSubject}" (${translation.engine}, ${translation.durationMs}ms)`);
    console.log(`[Styl]: ${selectedStyle.name} -> "${STYLE_MODIFIERS[selectedStyle.id]}"`);
    console.log(`[Finalny Prompt dla FLUX]: "${finalPrompt}"`);
    console.log(`[2 Losowe Seedy]: [${seed1}, ${seed2}]`);

    // 2. Obsługa trybu testowego ?dryRun=1 (zwraca finalny prompt i 2 seedy, bez wywołania FLUX - wymóg pkt 6)
    if (isDryRun) {
      console.log('[dryRun Mode]: Zwracam JSON z finalnym promptem i 2 seedami bez generowania FLUX.');
      return NextResponse.json({
        success: true,
        dryRun: true,
        originalPrompt: prompt,
        translatedSubject: translation.translatedSubject,
        styleId: selectedStyle.id,
        styleModifier: STYLE_MODIFIERS[selectedStyle.id],
        finalPrompt,
        seeds,
        translationEngine: translation.engine,
        translationDurationMs: translation.durationMs,
      });
    }

    const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
    const cfApiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
    const falApiKey = process.env.FAL_KEY?.trim();
    const openaiApiKey = process.env.OPENAI_API_KEY?.trim();

    // 3. CLOUDFLARE WORKERS AI: 2 równoległe zapytania do FLUX z różnymi seedami
    if (cfAccountId && cfApiToken) {
      try {
        const fluxStartTime = Date.now();

        const promises = seeds.map(async (seed, index) => {
          const cfRes = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${cfApiToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                prompt: finalPrompt,
              }),
            }
          );

          if (!cfRes.ok) {
            const errText = await cfRes.text().catch(() => '');
            console.error(`[Cloudflare Error Details - Propozycja ${index + 1}]: HTTP ${cfRes.status}: ${errText}`);
            throw new Error(`Cloudflare Workers AI HTTP ${cfRes.status}: ${errText}`);
          }

          const contentType = cfRes.headers.get('content-type') || '';
          let imageUrl: string;

          if (contentType.includes('application/json')) {
            const data = await cfRes.json();
            const imgData = data.result?.image || data.image;
            if (!imgData) throw new Error('Brak obrazu w odpowiedzi Cloudflare Workers AI');
            imageUrl = imgData.startsWith('data:') ? imgData : `data:image/jpeg;base64,${imgData}`;
          } else {
            const arrayBuffer = await cfRes.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString('base64');
            imageUrl = `data:image/jpeg;base64,${base64}`;
          }

          return imageUrl;
        });

        const results = await Promise.allSettled(promises);
        const successfulImages = results
          .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
          .map((r, i) => ({
            url: r.value,
            seed: seeds[i],
          }));

        results.forEach((r, idx) => {
          if (r.status === 'rejected') {
            console.error(`[Cloudflare Propozycja ${idx + 1} błąd]:`, r.reason);
          }
        });

        if (successfulImages.length === 0) {
          const firstErr = results.find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined;
          throw new Error(firstErr?.reason?.message || 'Żadne z 2 zapytań do Cloudflare Workers AI nie powiodło się');
        }

        // Wymóg pkt 4: Jeśli jedno z 2 zapytań się nie uda, pokaż tę, która się udała, i krótki komunikat
        const partialWarning =
          results.some((r) => r.status === 'rejected')
            ? 'Jedna propozycja nie wygenerowała się'
            : null;

        const fluxDuration = Date.now() - fluxStartTime;
        const totalDuration = Date.now() - overallStartTime;
        const totalSecFormatted = (totalDuration / 1000).toFixed(1);

        console.log(
          `[FLUX Sukces]: Wygenerowano ${successfulImages.length}/2 propozycji w ${fluxDuration}ms (Łącznie: ${totalSecFormatted}s)`
        );

        return NextResponse.json({
          success: true,
          images: successfulImages,
          seeds,
          finalPrompt,
          partialWarning,
          durationSeconds: totalSecFormatted,
          generationTimeMs: totalDuration,
          isExampleMode: false,
        });
      } catch (cfErr) {
        console.error('Błąd Cloudflare Workers AI:', cfErr);
        return NextResponse.json(
          {
            success: false,
            error: 'Nie udało się wygenerować, spróbuj ponownie',
            details: cfErr instanceof Error ? cfErr.message : undefined,
          },
          { status: 500 }
        );
      }
    }

    // 4. ALTERNATYWA 1: Fal.ai (gdy brak zmiennych Cloudflare) - 2 obrazy
    if (falApiKey && falApiKey !== '') {
      try {
        fal.config({ credentials: falApiKey });

        const falStartTime = Date.now();
        const result: any = await fal.subscribe('fal-ai/flux/schnell', {
          input: {
            prompt: finalPrompt,
            image_size: 'square_hd',
            num_images: 2,
            seed: seed1,
            enable_safety_checker: true,
          },
          logs: false,
        });

        const totalDuration = Date.now() - overallStartTime;
        const totalSecFormatted = (totalDuration / 1000).toFixed(1);

        if (result.data?.images && Array.isArray(result.data.images) && result.data.images.length > 0) {
          console.log(`[fal.ai Sukces]: Wygenerowano ${result.data.images.length} obrazy w ${Date.now() - falStartTime}ms`);
          return NextResponse.json({
            success: true,
            images: result.data.images.map((img: { url: string }) => ({ url: img.url })),
            seeds,
            finalPrompt,
            durationSeconds: totalSecFormatted,
            generationTimeMs: totalDuration,
            isExampleMode: false,
          });
        } else {
          throw new Error('Brak wygenerowanego obrazu w odpowiedzi fal.ai');
        }
      } catch (falErr) {
        console.error('Błąd fal.ai:', falErr);
        return NextResponse.json(
          {
            success: false,
            error: 'Nie udało się wygenerować, spróbuj ponownie',
            details: falErr instanceof Error ? falErr.message : undefined,
          },
          { status: 500 }
        );
      }
    }

    // 5. ALTERNATYWA 2: OpenAI DALL-E 3 (2 równoległe zapytania)
    if (openaiApiKey && openaiApiKey !== '') {
      try {
        const oaiPromises = [1, 2].map(async () => {
          const oaiRes = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${openaiApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'dall-e-3',
              prompt: finalPrompt,
              n: 1,
              size: '1024x1024',
              quality: 'standard',
            }),
          });
          const oaiData = await oaiRes.json();
          if (!oaiRes.ok || !oaiData.data?.[0]?.url) throw new Error('Błąd API OpenAI');
          return oaiData.data[0].url;
        });

        const oaiResults = await Promise.allSettled(oaiPromises);
        const oaiImages = oaiResults
          .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
          .map((r) => ({ url: r.value }));

        if (oaiImages.length === 0) throw new Error('Brak obrazów z OpenAI');

        const totalDuration = Date.now() - overallStartTime;
        const totalSecFormatted = (totalDuration / 1000).toFixed(1);

        return NextResponse.json({
          success: true,
          images: oaiImages,
          seeds,
          finalPrompt,
          partialWarning: oaiImages.length === 1 ? 'Jedna propozycja nie wygenerowała się' : null,
          durationSeconds: totalSecFormatted,
          generationTimeMs: totalDuration,
          isExampleMode: false,
        });
      } catch (oaiErr) {
        console.error('Błąd OpenAI:', oaiErr);
        return NextResponse.json(
          {
            success: false,
            error: 'Nie udało się wygenerować, spróbuj ponownie',
            details: oaiErr instanceof Error ? oaiErr.message : undefined,
          },
          { status: 500 }
        );
      }
    }

    // 6. TRYB PRZYKŁADOWY (BRAK KLUCZY API) - 2 obrazy poglądowe
    const fallbackList = DEMO_FALLBACK_IMAGES[selectedStyle.id] || DEMO_FALLBACK_IMAGES.anime;
    const img1 = fallbackList[0] || fallbackList[fallbackList.length - 1];
    const img2 = fallbackList[1] || fallbackList[0];
    const totalDuration = Date.now() - overallStartTime;
    const totalSecFormatted = (totalDuration / 1000).toFixed(1);

    console.log('[Tryb Przykładowy]: Zwracam 2 grafiki poglądowe z 2 seedami');

    return NextResponse.json({
      success: true,
      images: [{ url: img1 }, { url: img2 }],
      seeds,
      finalPrompt,
      durationSeconds: totalSecFormatted,
      generationTimeMs: totalDuration,
      isExampleMode: true,
    });
  } catch (err) {
    console.error('Błąd route handlera /api/generate:', err);
    return NextResponse.json(
      { success: false, error: 'Nie udało się wygenerować, spróbuj ponownie' },
      { status: 500 }
    );
  }
}
