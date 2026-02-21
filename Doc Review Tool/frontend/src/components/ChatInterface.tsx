import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Sparkles, MessageCircle } from 'lucide-react';
import type { ChatMessage, AnalysisResult } from '../types';

interface ChatInterfaceProps {
  sessionId: string;
  analysisResult: AnalysisResult;
  targetDocumentText: string;
  targetDocumentName: string;
  referenceDocumentText?: string;
  referenceDocumentName?: string;
  onNewMessage?: (message: ChatMessage) => void;
}

const SUGGESTED_PROMPTS = [
  "Explain the ERISA implications in detail",
  "What are my negotiation options for the management fee structure?",
  "How does the waterfall work with a specific example?",
  "Draft a revised version of the indemnification clause",
  "What happens if a key person leaves?",
  "Show me all references to co-invest rights",
];

export default function ChatInterface({
  sessionId,
  analysisResult,
  targetDocumentText,
  targetDocumentName,
  referenceDocumentText,
  referenceDocumentName,
  onNewMessage,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (content?: string) => {
    const messageContent = content || inputValue.trim();
    if (!messageContent || isLoading) return;

    // Create user message
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: messageContent,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    onNewMessage?.(userMessage);

    try {
      // Call backend chat API
      const response = await fetch('https://railway-up-production-7cf4.up.railway.app/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          message: messageContent,
          conversationHistory: messages,
          analysisContext: analysisResult,
          documentTexts: {
            target: targetDocumentText,
            targetName: targetDocumentName,
            reference: referenceDocumentText,
            referenceName: referenceDocumentName,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from AI');
      }

      const data = await response.json();

      // Create assistant message
      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      onNewMessage?.(assistantMessage);
    } catch (error) {
      console.error('Chat error:', error);
      // Add error message
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now()}-error`,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestedPrompt = (prompt: string) => {
    setInputValue(prompt);
    // Optionally auto-send
    // handleSendMessage(prompt);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="bg-stone-925 border border-bronze-500/20 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <MessageCircle className="w-6 h-6 text-bronze-500" strokeWidth={1.5} />
        <h3 className="text-xl font-semibold text-bronze-50">Ask Questions or Request Drafts</h3>
      </div>

      {/* Suggested Prompts (show only if no messages yet) */}
      {messages.length === 0 && (
        <div className="mb-6">
          <p className="text-sm text-bronze-200/70 mb-3">Try asking:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {SUGGESTED_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSuggestedPrompt(prompt)}
                className="text-left px-3 py-2 bg-stone-950/50 hover:bg-bronze-500/10 border border-stone-800 hover:border-bronze-500/30 rounded text-sm text-bronze-200/80 transition-all"
              >
                <Sparkles className="w-3 h-3 inline mr-2 text-bronze-500" />
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      {messages.length > 0 && (
        <div className="mb-6 space-y-4 max-h-96 overflow-y-auto pr-2">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-bronze-500/20 border border-bronze-500/30 text-bronze-50'
                    : 'bg-stone-950/50 border border-stone-800 text-bronze-200/90'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-bronze-500" />
                    <span className="text-xs font-semibold text-bronze-500">AI Legal Assistant</span>
                  </div>
                )}
                <div className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <div className="mb-4 flex items-center gap-2 text-bronze-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Thinking...</span>
        </div>
      )}

      {/* Input Area */}
      <div className="relative">
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask anything about this document... e.g., 'What does Section 4.2 mean?' or 'Draft a revised clause for Issue #3'"
          className="w-full px-4 py-3 pr-12 bg-stone-950/50 border border-stone-800 focus:border-bronze-500/50 rounded-lg text-bronze-200 placeholder-bronze-200/40 resize-none focus:outline-none focus:ring-1 focus:ring-bronze-500/30 transition-all"
          rows={3}
          disabled={isLoading}
        />
        <button
          onClick={() => handleSendMessage()}
          disabled={!inputValue.trim() || isLoading}
          className="absolute bottom-3 right-3 p-2 bg-bronze-500 hover:bg-bronze-400 disabled:bg-bronze-500/30 disabled:cursor-not-allowed rounded-lg transition-colors"
          title="Send message (Enter)"
        >
          <Send className="w-5 h-5 text-stone-950" strokeWidth={2} />
        </button>
      </div>

      {/* Helper text */}
      <p className="mt-3 text-xs text-bronze-200/50">
        Press Enter to send • Shift+Enter for new line • I have full context of your documents and analysis
      </p>
    </div>
  );
}
