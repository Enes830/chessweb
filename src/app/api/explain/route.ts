import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 15;

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ explanation: null, note: 'No API key configured, using local heuristic' });
    }

    const {
      san,
      bestMoveSan,
      classification,
      fenBefore,
      fenAfter,
      turn,
      openingName,
      winPctLoss,
    } = await req.json();

    const color = turn === 'w' ? 'White' : 'Black';

    const systemPrompt = `You are a concise, instructive National Master chess coach. Provide an insightful 1-2 sentence plain-English explanation for why a player's move was classified as it was, and what tactic/concept was played or missed. Keep it crisp, encouraging, and under 50 words.`;

    const userPrompt = `Game Context:
- Moving Player: ${color}
- Move Played: ${san} (Classified as: ${classification}, Win% Drop: ${winPctLoss?.toFixed(1) || 0}%)
- Best Move Recommended: ${bestMoveSan}
- Opening: ${openingName || 'N/A'}
- Position FEN before: ${fenBefore}
- Position FEN after: ${fenAfter}

Explain why ${san} was ${classification} and what ${bestMoveSan} achieved instead.`;

    const openAiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 120,
      }),
    });

    if (!openAiRes.ok) {
      return NextResponse.json({ explanation: null });
    }

    const data = await openAiRes.json();
    const explanation = data.choices?.[0]?.message?.content?.trim() || null;

    return NextResponse.json({ explanation });
  } catch (error) {
    console.error('AI Explanation API error:', error);
    return NextResponse.json({ explanation: null });
  }
}
