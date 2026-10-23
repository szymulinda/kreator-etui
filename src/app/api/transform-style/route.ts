import { NextRequest, NextResponse } from 'next/server';
import { STYLE_OPTIONS } from '@/config/phoneModels';
import { translatePromptWithClaude, STYLE_MODIFIERS } from '@/lib/translatePrompt';
import { fal } from '@fal-ai/client';

export async function POST(request: NextRequest) {
  const overallStartTime = Date.now();

  try {
    const isDryRunParam = request.nextUrl.searchParams.get('dryRun') === '1';
    const body = await request.json().catch(() => ({}));
    const { imageBase64, styleId, userPrompt, dryRun: isDryRunBody } = body;
    const isDryRun = isDryRunParam || Boolean(isDryRunBody);

    if (!imageBase64 && !isDryRun) {
      return NextResponse.json(
        { success: false, error: 'Nie udało się wygenerować, spróbuj ponownie' },
        { status: 400 }
      );
    }

    const selectedStyle = STYLE_OPTIONS.find((s) => s.id === styleId) || STYLE_OPTIONS[0];

    // Jeśli użytkownik podał własny opis do zdjęcia, przepuszczamy go przez Claude API
    const baseSubject = (userPrompt && typeof userPrompt === 'string' && userPrompt.trim() !== '')
      ? userPrompt.trim()
      : 'the subject from the input photo';

    const translation = await translatePromptWithClaude(baseSubject, selectedStyle.id);
    const finalPrompt = translation.finalPrompt;

    console.log('--- [PRZERÓB W STYLU (IMG2IMG)] ---');
    console.log(`[Opis wejściowy]: "${baseSubject}"`);
    console.log(`[Tłumaczenie Claude]: "${translation.translatedSubject}" (${translation.engine})`);
    console.log(`[Finalny Prompt]: "${finalPrompt}"`);

    // Obsługa trybu testowego ?dryRun=1
    if (isDryRun) {
      console.log('[dryRun transform-style]: Zwracam JSON z promptem bez wywoływania FLUX.2 klein 4B.');
      return NextResponse.json({
        success: true,
        dryRun: true,
        originalPrompt: baseSubject,
        translatedSubject: translation.translatedSubject,
        styleId: selectedStyle.id,
        styleModifier: STYLE_MODIFIERS[selectedStyle.id],
        finalPrompt,
        translationEngine: translation.engine,
        translationDurationMs: translation.durationMs,
      });
    }

    const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
    const cfApiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
    const falApiKey = process.env.FAL_KEY?.trim();

    // 1. DOMYŚLNY SILNIK: Cloudflare Workers AI (@cf/black-forest-labs/flux-2-klein-4b)
    if (cfAccountId && cfApiToken) {
      try {
        const fluxStartTime = Date.now();

        // Przygotowanie danych multipart/form-data
        let blob: Blob;
        if (imageBase64.startsWith('data:')) {
          const [header, base64Data] = imageBase64.split(',');
          const mimeMatch = header.match(/:(.*?);/);
          const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
          const buffer = Buffer.from(base64Data, 'base64');
          blob = new Blob([buffer], { type: mimeType });
        } else {
          const fetched = await fetch(imageBase64);
          blob = await fetched.blob();
        }

        const formData = new FormData();
        formData.append('prompt', finalPrompt);
        formData.append('image', blob, 'input.jpg');
        formData.append('width', '1024');
        formData.append('height', '1024');

        const cfRes = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/run/@cf/black-forest-labs/flux-2-klein-4b`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${cfApiToken}`,
            },
            body: formData,
          }
        );

        if (!cfRes.ok) {
          const errText = await cfRes.text().catch(() => '');
          throw new Error(`Cloudflare Workers AI HTTP ${cfRes.status}: ${errText}`);
        }

        const contentType = cfRes.headers.get('content-type') || '';
        let resultUrl: string;

        if (contentType.includes('application/json')) {
          const data = await cfRes.json();
          const imgData = data.result?.image || data.image;
          if (!imgData) throw new Error('Brak pola image w odpowiedzi Cloudflare');
          resultUrl = imgData.startsWith('data:') ? imgData : `data:image/jpeg;base64,${imgData}`;
        } else {
          const arrayBuffer = await cfRes.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString('base64');
          resultUrl = `data:image/jpeg;base64,${base64}`;
        }

        const totalDuration = Date.now() - overallStartTime;
        const totalSecFormatted = (totalDuration / 1000).toFixed(1);

        console.log(`[FLUX.2 klein Sukces]: Przerobiono 1 zdjęcie w ${Date.now() - fluxStartTime}ms (Łącznie: ${totalSecFormatted}s)`);

        return NextResponse.json({
          success: true,
          imageUrl: resultUrl,
          finalPrompt,
          durationSeconds: totalSecFormatted,
          durationMs: totalDuration,
          isExampleMode: false,
        });
      } catch (cfErr) {
        console.error('Błąd Cloudflare Workers AI FLUX.2 klein 4B:', cfErr);
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

    // 2. ALTERNATYWA: fal.ai FLUX.1 [dev] Image-to-Image
    if (falApiKey && falApiKey !== '') {
      try {
        fal.config({ credentials: falApiKey });

        const falStartTime = Date.now();
        const result: any = await fal.subscribe('fal-ai/flux/dev/image-to-image', {
          input: {
            prompt: finalPrompt,
            image_url: imageBase64,
            strength: 0.75,
            num_images: 1,
            enable_safety_checker: true,
          } as any,
          logs: false,
        });

        const totalDuration = Date.now() - overallStartTime;
        const totalSecFormatted = (totalDuration / 1000).toFixed(1);

        if (result.data?.images && Array.isArray(result.data.images) && result.data.images.length > 0) {
          console.log(`[fal.ai Sukces]: Image-to-Image wygenerował 1 obraz w ${Date.now() - falStartTime}ms`);
          return NextResponse.json({
            success: true,
            imageUrl: result.data.images[0].url,
            finalPrompt,
            durationSeconds: totalSecFormatted,
            durationMs: totalDuration,
            isExampleMode: false,
          });
        } else {
          throw new Error('Brak wygenerowanego obrazu w odpowiedzi fal.ai');
        }
      } catch (falErr) {
        console.error('Błąd fal.ai img2img:', falErr);
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

    // 3. TRYB PRZYKŁADOWY (BRAK KLUCZY)
    const totalDuration = Date.now() - overallStartTime;
    const totalSecFormatted = (totalDuration / 1000).toFixed(1);

    return NextResponse.json({
      success: true,
      imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1024&auto=format&fit=crop&q=85',
      finalPrompt,
      durationSeconds: totalSecFormatted,
      durationMs: totalDuration,
      isExampleMode: true,
    });
  } catch (err) {
    console.error('Błąd route handlera /api/transform-style:', err);
    return NextResponse.json(
      { success: false, error: 'Nie udało się wygenerować, spróbuj ponownie' },
      { status: 500 }
    );
  }
}
