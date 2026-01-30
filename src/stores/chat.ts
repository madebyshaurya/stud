import { create } from "zustand";

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result?: unknown;
  status: "pending" | "running" | "complete" | "error" | "waiting";
  error?: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCall[];
  contextChips?: string[]; // Which context chips were applied to this message
  createdAt: Date;
}

export interface QuestionOption {
  label: string;
  value?: string; // If different from label
  imageUrl?: string;
  description?: string;
}

export interface Question {
  question: string;
  options?: (string | QuestionOption)[];
  type: "single" | "multi" | "text";
}

export interface PendingQuestion {
  id: string;
  toolCallId: string;
  messageId: string;
  questions: Question[];
  answers?: (string | string[])[];
}

export interface ChatState {
  messages: Message[];
  isStreaming: boolean;
  error: string | null;
  pendingQuestion: PendingQuestion | null;
  questionResolver: ((answers: (string | string[])[]) => void) | null;

  // Actions
  addMessage: (message: Omit<Message, "id" | "createdAt">) => string;
  updateMessage: (id: string, content: string) => void;
  addToolCall: (messageId: string, toolCall: Omit<ToolCall, "status">) => void;
  updateToolCall: (messageId: string, toolCallId: string, update: Partial<ToolCall>) => void;
  setStreaming: (streaming: boolean) => void;
  setError: (error: string | null) => void;
  clearMessages: () => void;

  // Question handling
  setPendingQuestion: (question: PendingQuestion | null) => void;
  setQuestionResolver: (resolver: ((answers: (string | string[])[]) => void) | null) => void;
  answerQuestion: (answers: (string | string[])[]) => void;
}

export const useChatStore = create<ChatState>()((set, get) => ({
  messages: [],
  isStreaming: false,
  error: null,
  pendingQuestion: null,
  questionResolver: null,

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

  // Question handling
  setPendingQuestion: (question) => set({ pendingQuestion: question }),

  setQuestionResolver: (resolver) => set({ questionResolver: resolver }),

  answerQuestion: (answers) => {
    const { questionResolver, pendingQuestion } = get();
    if (questionResolver && pendingQuestion) {
      questionResolver(answers);
      set({ pendingQuestion: null, questionResolver: null });
    }
  },
}));
