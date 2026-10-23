import { STYLE_OPTIONS } from '@/config/phoneModels';

// Modyfikatory stylu zgodnie ze specyfikacją:
export const STYLE_MODIFIERS: Record<string, string> = {
  standard: 'natural style, clean composition, high quality',
  anime: 'in anime illustration style, clean line art',
  realism: 'photorealistic, natural lighting',
  cyberpunk: 'cyberpunk style, neon accents',
  minimalism: 'minimalist flat illustration, simple shapes, plenty of empty space',
  watercolor: 'watercolor painting, soft washes on white paper',
};

// Stały sufiks na końcu każdego promptu:
export const PROMPT_SUFFIX =
  'the main subject clearly recognizable and centered, no text, no watermark';

// Dokładne polecenie systemowe dla Claude:
export const CLAUDE_SYSTEM_PROMPT =
  'Przetłumacz opis grafiki na angielski i zapisz go jako krótki prompt do generatora obrazów (maks. 40 słów). Zacznij od głównego tematu, opisz go konkretnie. Nie dodawaj stylu artystycznego. Jeśli opis zawiera nazwisko znanej osoby, postać z filmu, serialu, gry lub bajki albo znak towarowy, zastąp je ogólnym opisem (np. \'a man in a 1920s flat cap and wool coat\'). Zwróć tylko prompt.';

export interface TranslationResult {
  translatedSubject: string;
  finalPrompt: string;
  engine: 'claude-haiku-5-5' | 'fallback';
  durationMs: number;
}

// Słownik reguł fallback dla znanych postaci i powszechnych polskich fraz (w razie braku klucza lub błędu Claude)
const FALLBACK_GENERALIZATIONS: Array<{ match: RegExp; replacement: string }> = [
  {
    match: /\b(thomas\s+shelby|peaky\s+blinders|tommy\s+shelby)\b/i,
    replacement: 'a man in a 1920s flat cap and wool coat with a sharp jawline',
  },
  {
    match: /\b(geralt|wiedźmin|witcher)\b/i,
    replacement: 'a white-haired fantasy warrior with twin swords on his back',
  },
  {
    match: /\b(batman|mroczny\s+rycerz)\b/i,
    replacement: 'a masked vigilante hero in armored suit and dark cape',
  },
  {
    match: /\b(spiderman|spider-man|człowiek\s+pająk)\b/i,
    replacement: 'an acrobatic superhero in red and blue suit',
  },
  {
    match: /\b(bukiet\s+kwiatów|bukiet\s+polnych\s+kwiatów)\b/i,
    replacement: 'a lush bouquet of blooming flowers in a vase',
  },
  {
    match: /\b(kot\s+w\s+kosmosie|koteł\s+w\s+kosmosie)\b/i,
    replacement: 'a cat floating peacefully in cosmic space surrounded by stars',
  },
  {
    match: /\b(górski\s+szczyt|góry\s+we\s+mgle)\b/i,
    replacement: 'a misty mountain peak at sunrise with golden morning rays',
  },
  {
    match: /\b(złoty\s+lis|geometryczny\s+lis)\b/i,
    replacement: 'a geometric golden fox walking through a coniferous evergreen forest',
  },
  {
    match: /\b(neonowe\s+miasto|miasto\s+przyszłości)\b/i,
    replacement: 'a futuristic neon city at night in rainy atmosphere',
  },
];

/**
 * Tłumaczenie i uogólnienie promptu:
 * 1. Wywołanie Claude API (model claude-haiku-5-5, klucz ANTHROPIC_API_KEY) z limitem 5s.
 * 2. W razie błędu / timeoutu / braku klucza: fallback na oryginalny opis (oraz bezpieczne reguły).
 * 3. Złożenie finalnego promptu: [temat], [styl], "the main subject clearly recognizable and centered, no text, no watermark".
 */
export async function translatePromptWithClaude(
  userPrompt: string,
  styleId: string
): Promise<TranslationResult> {
  const startTime = Date.now();
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  const styleModifier = STYLE_MODIFIERS[styleId] || STYLE_MODIFIERS.anime;

  let translatedSubject: string | null = null;
  let engine: 'claude-haiku-5-5' | 'fallback' = 'fallback';

  if (apiKey) {
    try {
      // 5-sekundowy timeout zgodnie z wymaganiem pkt 5
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      // Model claude-haiku-5-5 zgodnie ze specyfikacją
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-5-5',
          max_tokens: 120,
          system: CLAUDE_SYSTEM_PROMPT,
          messages: [
            {
              role: 'user',
              content: userPrompt.trim(),
            },
          ],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const text = data.content?.[0]?.text?.trim();
        if (text) {
          translatedSubject = text.replace(/^["']|["']$/g, '').trim();
          engine = 'claude-haiku-5-5';
          console.log(`[Claude API] Przetłumaczono prompt przez claude-haiku-5-5 w ${Date.now() - startTime}ms`);
        }
      } else {
        const errBody = await response.text().catch(() => '');
        console.warn(`[Claude API Warning] Status ${response.status}: ${errBody}. Używam fallbacku.`);
      }
    } catch (err) {
      console.warn(
        `[Claude API Warning] Timeout (5s) lub błąd połączenia: ${
          err instanceof Error ? err.message : err
        }. Kontynuuję generowanie z fallbackiem.`
      );
    }
  }

  // Fallback jeśli Claude API nie odpowiedziało lub brak klucza ANTHROPIC_API_KEY
  if (!translatedSubject) {
    let fallbackText = userPrompt.trim();
    for (const rule of FALLBACK_GENERALIZATIONS) {
      if (rule.match.test(fallbackText)) {
        fallbackText = fallbackText.replace(rule.match, rule.replacement);
        break;
      }
    }
    translatedSubject = fallbackText;
    engine = 'fallback';
  }

  // Złożenie finalnego promptu w ściśle określonej kolejności:
  // [przetłumaczony temat], [styl], the main subject clearly recognizable and centered, no text, no watermark
  const finalPrompt = `${translatedSubject}, ${styleModifier}, ${PROMPT_SUFFIX}`;
  const durationMs = Date.now() - startTime;

  return {
    translatedSubject,
    finalPrompt,
    engine,
    durationMs,
  };
}
