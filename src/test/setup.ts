import "@testing-library/dom";
import { vi, beforeAll, afterEach, afterAll } from "vitest";
import { cleanup } from "@testing-library/react";
import { setupServer } from "msw/node";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  };
})();

vi.stubGlobal("localStorage", localStorageMock);

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  };
})();

vi.stubGlobal("sessionStorage", sessionStorageMock);

// Mock crypto.subtle for PKCE
const cryptoMock = {
  getRandomValues: vi.fn((array: Uint8Array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  }),
  subtle: {
    digest: vi.fn(async (_algorithm: string, _data: ArrayBuffer) => {
      // Return a mock hash
      return new Uint8Array(32).fill(0).buffer;
    }),
  },
};

vi.stubGlobal("crypto", cryptoMock);

// Mock AbortSignal.timeout
if (!AbortSignal.timeout) {
  Object.defineProperty(AbortSignal, "timeout", {
    value: (ms: number) => {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), ms);
      return controller.signal;
    },
  });
}

// MSW server for mocking HTTP requests
export const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
  localStorageMock.clear();
  sessionStorageMock.clear();
  vi.clearAllMocks();
});
afterAll(() => server.close());
