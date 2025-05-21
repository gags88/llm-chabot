import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  const { history } = await req.json();

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const chat = await model.startChat({
    history: history.map((msg: any) => ({
      role: msg.role === 'assistant' ? 'model' : msg.role,
      parts: [{ text: msg.content }],
    })),
  });

  const userInput = history[history.length - 1].content;

  const result = await chat.sendMessage(userInput);
  const response = await result.response.text();

  return Response.json({ reply: response });
}
