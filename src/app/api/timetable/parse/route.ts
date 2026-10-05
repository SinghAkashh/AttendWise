import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const PROMPT = `Read this timetable image and return ONLY valid JSON.
Format:
{
  "days": ["Mon","Tue",...],
  "periods": [{"id":1,"start":"HH:MM","end":"HH:MM"}],
  "slots": [{"day":"Mon","period":1,"subject":"","room":""}]
}
Rules:
- Use 24-hour time.
- Skip empty cells and breaks/lunch.
- If a cell has multiple batches (Batch A / Batch B), join them in one subject text.
- If a class spans several periods, repeat it in each period.
- Unreadable text = empty string.`;

const MODELS = [
  process.env.GEMINI_MODEL || 'gemini-3.8-flash',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function callGemini(base64: string, mimeType: string): Promise<string> {
  let lastError: any;

  for (const model of MODELS) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [
            {
              role: 'user',
              parts: [
                { inlineData: { mimeType, data: base64 } },
                { text: PROMPT },
              ],
            },
          ],
          config: { responseMimeType: 'application/json' },
        });
        console.log(`Success with ${model} (attempt ${attempt})`);
        return response.text ?? '';
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.message || err);
        const retryable =
          msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('429');
        console.error(`${model} attempt ${attempt} failed:`, msg);

        if (!retryable) break; // 404 etc → skip to next model
        await sleep(1500 * attempt); // wait 1.5s, 3s, 4.5s
      }
    }
  }
  throw lastError;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_free_gemini_api_key_here') {
      console.error('GEMINI_API_KEY is missing or placeholder');
      return NextResponse.json({ error: 'Gemini API key is missing. Please set it in your .env file.' }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get('image') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No image uploaded' }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString('base64');

    const text = await callGemini(base64, file.type || 'image/jpeg');
    console.log('Gemini raw output:', text);

    const clean = text.replace(/\`\`\`json|\`\`\`/g, '').trim();
    return NextResponse.json(JSON.parse(clean));
  } catch (err: any) {
    const msg = String(err?.message || err);
    console.error('TIMETABLE PARSE ERROR:', msg);

    const friendly =
      msg.includes('503') || msg.includes('UNAVAILABLE')
        ? 'The AI is busy right now. Please try again in a minute, or fill your timetable manually in the grid below.'
        : msg.includes('429')
          ? 'Too many requests. Please wait a minute and retry.'
          : msg.includes('API key')
            ? 'Invalid Gemini API key. Please check your .env file.'
            : 'Could not read the timetable. Try a clearer image, or fill your timetable manually in the grid below.';

    return NextResponse.json({ error: friendly }, { status: 500 });
  }
}
