import { useState, useRef, useEffect, useCallback } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

function App() {
  const [messages, setMessages] = useState([]);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const chatEndRef = useRef(null);
  const [currentAiResponse, setCurrentAiResponse] = useState("");
  const intervalIdRef = useRef(null);

  // Scroll chat to bottom when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, currentAiResponse]);

  // Copy code to clipboard
  const copyToClipboard = (text) => navigator.clipboard.writeText(text);

  // Markdown renderer
  const renderMarkdown = useCallback((text) => {
    return (
      <ReactMarkdown
        children={text}
        components={{
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold mt-3 mb-2">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-semibold mt-3 mb-2">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold mt-2 mb-1">{children}</h3>
          ),
          p: ({ children }) => <p className="my-2 leading-relaxed">{children}</p>,
          strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
          em: ({ children }) => <em className="italic text-gray-300">{children}</em>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-gray-500 pl-4 italic text-gray-400 my-2">
              {children}
            </blockquote>
          ),
          ul: ({ children }) => (
            <ul className="list-disc ml-6 space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal ml-6 space-y-1">{children}</ol>
          ),
          li: ({ children }) => <li>{children}</li>,
          hr: () => <hr className="my-3 border-gray-600" />,
          code({ inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const codeContent = String(children).replace(/\n$/, "");

            if (!inline) {
              return (
                <div className="relative my-3">
                  <button
                    onClick={() => copyToClipboard(codeContent)}
                    className="absolute right-2 top-2 px-2 py-1 bg-blue-600 rounded text-white text-xs hover:bg-blue-700 z-10"
                  >
                    Copy
                  </button>
                  <SyntaxHighlighter
                    style={oneDark}
                    language={match ? match[1] : ""}
                    PreTag="div"
                    {...props}
                  >
                    {codeContent}
                  </SyntaxHighlighter>
                </div>
              );
            }

            return (
              <code className="bg-gray-700 px-1 py-0.5 rounded text-sm" {...props}>
                {children}
              </code>
            );
          },
        }}
      />
    );
  }, []);

  // Stop streaming
  const stopStreaming = useCallback(() => {
    if (intervalIdRef.current !== null) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;

      if (currentAiResponse) {
        setMessages((prev) => [
          ...prev,
          { sender: "ai", text: currentAiResponse + " *(Stopped)*" },
        ]);
        setCurrentAiResponse("");
      }

      setLoading(false);
      inputRef.current?.focus();
    }
  }, [currentAiResponse]);

  // Simulated typing effect
  const streamText = (fullText) => {
    let index = 0;
    setCurrentAiResponse("");
    if (intervalIdRef.current) clearInterval(intervalIdRef.current);

    const speed = 15;
    intervalIdRef.current = setInterval(() => {
      if (index < fullText.length) {
        setCurrentAiResponse((prev) => prev + fullText[index]);
        index++;
      } else {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
        setMessages((prev) => [...prev, { sender: "ai", text: fullText }]);
        setCurrentAiResponse("");
        setLoading(false);
        inputRef.current?.focus();
      }
    }, speed);
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!prompt.trim()) return;

    if (loading) {
      stopStreaming();
      return;
    }

    setMessages((prev) => [...prev, { sender: "user", text: prompt }]);
    setPrompt("");
    setLoading(true);

    try {
      const res = await axios.post(
        "/api/generate",
        { prompt }
      );
      const fullResponseText = res.data.text;
      streamText(fullResponseText);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { sender: "ai", text: "⚠️ Error generating response. Please try again." },
      ]);
      setLoading(false);
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
      console.error(err);
    }
  };

  // Cleanup interval
  useEffect(() => {
    return () => {
      if (intervalIdRef.current) clearInterval(intervalIdRef.current);
    };
  }, []);

  return (
    <div className="py-[10vh] flex flex-col max-h[100vh] min-h-[100vh] bg-zinc-800 text-white relative">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-zinc-800 border-b border-zinc-700 z-50">
        <div className="py-4 shadow-md max-w-[90vw] mx-auto">
          <h1 className="text-2xl font-bold text-center text-zinc-300">
            AiChatBot
          </h1>
        </div>
      </header>

      {/* Chat area */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4 relative">
        {messages.length === 0 && !loading && !currentAiResponse && (
          <div className="absolute inset-0 flex items-center justify-center text-center px-4">
            <h2 className="text-2xl text-zinc-300 font-bold">
              Welcome to AI Chat! <br /> Ask anything, and AI will respond.
            </h2>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${
              msg.sender === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[75%] p-3 rounded-lg break-words ${
                msg.sender === "user"
                  ? "bg-zinc-900 text-zinc-100 rounded-br-none"
                  : "bg-zinc-900 text-zinc-100 rounded-bl-none"
              }`}
            >
              {msg.sender === "ai" ? renderMarkdown(msg.text) : msg.text}
            </div>
          </div>
        ))}

        {currentAiResponse && (
          <div className="flex justify-start">
            <div className="max-w-[75%] p-3 bg-zinc-900 text-zinc-100 rounded-bl-none rounded-lg">
              {renderMarkdown(currentAiResponse)}
              <span className="animate-blink inline-block w-2 h-4 bg-zinc-100 ml-1 align-bottom"></span>
            </div>
          </div>
        )}

        {loading && !currentAiResponse && (
          <div className="flex justify-start">
            <div className="max-w-[75%] p-3 bg-zinc-900 text-zinc-100 rounded-bl-none animate-pulse rounded-lg">
              Thinking...
            </div>
          </div>
        )}

        <div ref={chatEndRef}></div>
      </main>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="fixed bottom-0 left-0 right-0 border-2 border-zinc-700 rounded-lg p-4 flex items-center m-3 gap-x-3 bg-zinc-800"
      >
        <input
          ref={inputRef}
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Type your message..."
          disabled={!!currentAiResponse}
          className="p-2 rounded-lg bg-zinc-900 text-white flex-1 disabled:cursor-not-allowed disabled:opacity-70 focus:outline-none"
        />
        {currentAiResponse ? (
          <button
            type="button"
            onClick={stopStreaming}
            className="px-6 py-2 bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
          >
            Stop
          </button>
        ) : (
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            Send
          </button>
        )}
      </form>
    </div>
  );
}

export default App;
