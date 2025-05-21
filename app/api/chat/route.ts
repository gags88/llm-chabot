import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  const { history } = await req.json();
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const cleanHistory = [];
  for (let i = 0; i < history.length - 1; i++) {
    const curr = history[i];
    const next = history[i + 1];

    if (curr.role === 'user' && next?.role === 'assistant') {
      cleanHistory.push(
        {
          role: 'user',
          parts: [{ text: curr.content }],
        },
        {
          role: 'model',
          parts: [{ text: next.content }],
        }
      );
      i++;
    }
  }

  const chat = await model.startChat({ history: cleanHistory });

  const userInput = history[history.length - 1].content;
  const stream = await chat.sendMessageStream(userInput);

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream.stream) {
        const text = chunk.text();
        controller.enqueue(encoder.encode(text));
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
    },
  });
}
