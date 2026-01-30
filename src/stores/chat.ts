import { create } from "zustand";

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result?: unknown;
  status: "pending" | "running" | "complete" | "error";
  error?: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCall[];
  createdAt: Date;
}

export interface ChatState {
  messages: Message[];
  isStreaming: boolean;
  error: string | null;
  
  // Actions
  addMessage: (message: Omit<Message, "id" | "createdAt">) => string;
  updateMessage: (id: string, content: string) => void;
  addToolCall: (messageId: string, toolCall: Omit<ToolCall, "status">) => void;
  updateToolCall: (messageId: string, toolCallId: string, update: Partial<ToolCall>) => void;
  setStreaming: (streaming: boolean) => void;
  setError: (error: string | null) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>()((set) => ({
  messages: [],
  isStreaming: false,
  error: null,

  addMessage: (message) => {
    const id = crypto.randomUUID();
    set((state) => ({
      messages: [
        ...state.messages,
        { ...message, id, createdAt: new Date() },
      ],
    }));
    return id;
  },

  updateMessage: (id, content) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, content } : msg
      ),
    })),

  addToolCall: (messageId, toolCall) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === messageId
          ? {
              ...msg,
              toolCalls: [
                ...(msg.toolCalls || []),
                { ...toolCall, status: "pending" as const },
              ],
            }
          : msg
      ),
    })),

  updateToolCall: (messageId, toolCallId, update) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === messageId
          ? {
              ...msg,
              toolCalls: msg.toolCalls?.map((tc) =>
                tc.id === toolCallId ? { ...tc, ...update } : tc
              ),
            }
          : msg
      ),
    })),

  setStreaming: (streaming) => set({ isStreaming: streaming }),
  
  setError: (error) => set({ error }),

  clearMessages: () => set({ messages: [] }),
}));
