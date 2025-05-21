'use client';

import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';

type Message = {
  role: 'user' | 'assistant' | 'streaming';
  content: string;
  timestamp: string;
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [queue, setQueue] = useState<string[]>([]);
  const [warning, setWarning] = useState('');
  const [darkMode, setDarkMode] = useState(false);

  const queueRef = useRef<string[]>([]);
  const isProcessing = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
      document.documentElement.classList.add('dark');
      setDarkMode(true);
    }
  }, []);

  const toggleDark = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    document.documentElement.classList.toggle('dark', newMode);
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
  };

  useEffect(() => {
    if (isProcessing.current || queueRef.current.length === 0) return;
    processNextMessage();
  }, [queue]);

  const processNextMessage = async () => {
    const nextMessage = queueRef.current.shift();
    if (!nextMessage) {
      return;
    }
    isProcessing.current = true;
    const timestamp = new Date().toISOString();
    const userMessage: Message = { role: 'user', content: nextMessage, timestamp };
    const updatedHistory = [...messages, userMessage];
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: updatedHistory }),
      });
      const reader = res.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      let aiContent = '';
      const timestamp = new Date().toISOString();
      while (reader) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        const chunk = decoder.decode(value, { stream: true });
        aiContent += chunk;
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.role !== 'streaming');
          return [...filtered, { role: 'streaming', content: aiContent, timestamp }];
        });
      }

      setMessages((prev) => {
        const filtered = prev.filter((m) => m.role !== 'streaming');
        return [...filtered, { role: 'assistant', content: aiContent, timestamp }];
      });
    } catch (err) {
      console.error('Streaming error:', err);
    } finally {
      setLoading(false);
      isProcessing.current = false;
      setQueue([...queueRef.current]);
    }
  };

  const sendMessage = () => {
    if (!input.trim()) {
      return;
    }
    if (loading || isProcessing.current) {
      setWarning('⚠️ You’re typing too fast. Wait for a reply.');
      setTimeout(() => setWarning(''), 2000);
    }
    const updatedQueue = [...queueRef.current, input];
    queueRef.current = updatedQueue;
    setQueue(updatedQueue);
    setInput('');
  };

  return (
    <main className='min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4'>
      <div className='w-full max-w-2xl h-[90vh] bg-white dark:bg-gray-800 shadow-md rounded-lg flex flex-col overflow-hidden'>
        <header className='bg-gray-800 dark:bg-gray-700 text-white text-lg font-semibold py-3 px-5 flex justify-between items-center'>
          <span>AI Support Assistant</span>
          <button onClick={toggleDark} className='cursor-pointer text-sm bg-gray-600 hover:bg-gray-500 px-3 py-1 rounded'>
            {darkMode ? '☀️ Light' : '🌙 Dark'}
          </button>
        </header>
        <section className='flex-1 overflow-y-auto p-4 space-y-4'>
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className='flex items-start gap-2 max-w-[75%]'>
                {msg.role !== 'user' && (
                  <div className='w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center min-w-[40px]'>🤖</div>
                )}
                <div
                  className={`rounded-lg p-3 text-sm shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-gray-100 dark:bg-gray-700 dark:text-gray-100 text-gray-900 rounded-bl-none'
                  } prose prose-sm dark:prose-invert max-w-none`}
                >
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                  <div className='text-xs mt-1 text-right opacity-70'>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                {msg.role === 'user' && (
                  <div className='w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center'>😊</div>
                )}
              </div>
            </div>
          ))}
          {messages.some((m) => m.role === 'streaming') && (
            <div className='flex justify-start text-gray-500 text-sm animate-pulse px-3'>
              <span className='rounded-full bg-gray-400 w-2 h-2 mr-1 inline-block'></span>
              <span className='rounded-full bg-gray-400 w-2 h-2 mr-1 inline-block'></span>
              <span className='rounded-full bg-gray-400 w-2 h-2 inline-block'></span>
            </div>
          )}
          {warning && <p className='text-sm text-center text-yellow-600 dark:text-yellow-400'>{warning}</p>}
          <div ref={messagesEndRef} />
        </section>
        <footer className='flex items-center gap-2 border-t dark:border-gray-700 px-4 py-3 bg-gray-50 dark:bg-gray-800'>
          <input
            type='text'
            className='flex-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
            placeholder='Type a new message'
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className='bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-full disabled:opacity-50'
          >
            Send
          </button>
        </footer>
      </div>
    </main>
  );
}
