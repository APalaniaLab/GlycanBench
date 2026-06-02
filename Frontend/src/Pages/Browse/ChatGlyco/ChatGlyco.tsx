import React, { useState, useRef, useEffect } from "react";
import { FiUpload, FiSend } from "react-icons/fi";
import { LucideUser } from "lucide-react";
import { BASE_URL } from "../../../utils/const";

// TypeScript interfaces
interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  image?: string;
}

interface ChatGlycoProps {
  className?: string;
}

interface SendMessageParams {
  text?: string;
  files?: File[];
}

interface ChatResponse {
  reply?: string;
}

export default function ChatGlyco({ className = "" }: ChatGlycoProps): React.ReactElement {
  const [input, setInput] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const addMessage = (msg: Omit<Message, 'id'>): void =>
    setMessages((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), ...msg },
    ]);

  const sendMessage = async ({ text = "", files = [] }: SendMessageParams = {}): Promise<void> => {
    if (!text && files.length === 0) return;
    setInput("");
    setError(null);
    setLoading(true);

    // Optimistic UI
    files.forEach((file) =>
      addMessage({
        role: "user",
        content: text || "Image attached",
        image: URL.createObjectURL(file),
      })
    );

    if (text) addMessage({ role: "user", content: text });

    try {
      const images = await Promise.all(files.map(fileToBase64));

      const resp = await fetch(`${BASE_URL}/api/GlycomicsChat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: text || "Image attached",
          images: images.length > 0 ? images : undefined 
        }),
      });

      if (!resp.ok) throw new Error(`Server error: ${resp.statusText}`);
      const data: ChatResponse = await resp.json();

      addMessage({ role: "assistant", content: data.reply || "" });
    } catch (error: unknown) {
      console.error(error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    sendMessage({ text: input });
  };

  const handleFiles = (files: File[]): void => {
    if (files.length) sendMessage({ files });
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    handleFiles(Array.from(e.dataTransfer.files));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setInput(e.target.value);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
  };

  // Auto-scroll
  useEffect(() => {
    if (!mainRef.current || !chatEndRef.current) return;
    const main = mainRef.current;
    const isNearBottom =
      main.scrollHeight - main.scrollTop - main.clientHeight < 100;
    if (isNearBottom)
      chatEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  return (
    <div
      className={`flex flex-col bg-white text-black h-full w-full p-2 ${className}`}
    >
      {/* Header */}
      <header className="flex items-center gap-2 mb-2 bg-gray-100 px-2 py-1 rounded">
        <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
          <LucideUser className="w-4 h-4 text-black" />
        </div>
        <div className="text-sm font-semibold">Glyco Chat</div>
      </header>

      {/* Messages */}
      <main
        className="flex-1 flex flex-col overflow-auto p-1 space-y-1 bg-gray-50 rounded"
        ref={mainRef}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-2 text-xs">
            No messages yet — type or drop images
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[70%] p-1 rounded-xl break-words text-xs ${
                msg.role === "user" ? "bg-gray-300" : "bg-gray-200"
              }`}
            >
              {msg.image && (
                <img
                  src={msg.image}
                  alt="preview"
                  className="max-h-32 w-auto rounded mb-1 border border-gray-400"
                />
              )}
              <div style={{ whiteSpace: "pre-wrap" }}>{msg.content}</div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="flex space-x-1 bg-gray-200 rounded px-2 py-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </main>

      {/* Input */}
      <form onSubmit={handleSubmit} className="mt-1 flex items-center gap-1">
        <label className="inline-flex items-center gap-1 cursor-pointer p-1 rounded bg-gray-200 hover:bg-gray-300">
          <FiUpload className="w-4 h-4" />
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>

        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Type a message"
          className="flex-1 px-2 py-1 rounded border border-gray-400 bg-gray-100 text-xs"
        />

        <button
          type="submit"
          disabled={loading}
          className="px-2 py-1 rounded bg-gray-300 text-xs flex items-center gap-1 disabled:opacity-50"
        >
          <FiSend className="w-4 h-4" />
        </button>
      </form>

      {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
    </div>
  );
}