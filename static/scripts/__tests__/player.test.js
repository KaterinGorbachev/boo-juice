import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const playerSource = readFileSync(
  resolve(__dirname, "../player.js"),
  "utf8"
);

// ─── DOM setup ───────────────────────────────────────────────────────────────

function buildDOM() {
  document.documentElement.lang = "es";
  document.body.innerHTML = `
    <div id="speech-error" class="hidden"></div>
    <button id="play_recepy"></button>
    <button id="pause_recepy" class="hidden"></button>
    <button id="resume_recepy" class="hidden"></button>
    <div class="step" data-medida="Cortar la cebolla en trozos"></div>
    <div class="step" data-medida="Añadir aceite de oliva"></div>
    <button class="player-by-step">1</button>
    <button class="player-by-step">2</button>
  `;
}

// ─── Speech API mocks ─────────────────────────────────────────────────────────

let capturedUtterances = [];

function buildSpeechMocks() {
  capturedUtterances = [];

  const mock = {
    speak: vi.fn((u) => capturedUtterances.push(u)),
    cancel: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    getVoices: vi.fn(() => [
      { lang: "es-ES", name: "Spanish Female", default: true },
    ]),
    speaking: false,
    paused: false,
    onvoiceschanged: null,
  };

  global.speechSynthesis = mock;

  global.SpeechSynthesisUtterance = class {
    constructor(text) {
      this.text = text;
      this.lang = "";
      this.voice = null;
      this.rate = 1;
      this.onstart = null;
      this.onend = null;
      this.onerror = null;
      this.onpause = null;
      this.onresume = null;
    }
  };

  return mock;
}

// ─── Load player.js inside the test environment ───────────────────────────────
//
// player.js wraps everything in DOMContentLoaded. In Vitest/jsdom the document
// is already "complete", so the event never fires when we eval the script.
// We intercept addEventListener to capture the callback, then call it directly.

function loadPlayer() {
  let callback = null;

  const origAdd = document.addEventListener.bind(document);
  vi.spyOn(document, "addEventListener").mockImplementation((type, fn, ...rest) => {
    if (type === "DOMContentLoaded") {
      callback = fn;
    } else {
      origAdd(type, fn, ...rest);
    }
  });

  // Indirect eval runs in global scope so jsdom globals (document, window, …)
  // are accessible, matching the real browser execution context.
  (0, eval)(playerSource);

  document.addEventListener.mockRestore();

  if (!callback) throw new Error("DOMContentLoaded callback was not captured");
  callback();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function errorBanner() {
  return document.getElementById("speech-error");
}

function steps() {
  return document.querySelectorAll(".step");
}

function triggerPlay(index = 0) {
  window.__playerTest__.SpeechController.play(index, steps());
  // play() → speakChunk() → speechSynthesis.speak(utterance)
  return capturedUtterances[capturedUtterances.length - 1];
}

function fireUtteranceError(utterance, errorType) {
  utterance?.onerror?.({ error: errorType });
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe("SpeechController – handleSpeechError", () => {
  let speechMock;

  beforeEach(() => {
    buildDOM();
    speechMock = buildSpeechMocks();
    loadPlayer();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // ── Silenced errors ──────────────────────────────────────────────────────
  describe('silenced errors ("canceled" / "interrupted")', () => {
    it('does not show error banner for "canceled"', () => {
      const u = triggerPlay();
      fireUtteranceError(u, "canceled");
      expect(errorBanner().classList.contains("hidden")).toBe(true);
      expect(errorBanner().textContent).toBe("");
    });

    it('does not show error banner for "interrupted"', () => {
      const u = triggerPlay();
      fireUtteranceError(u, "interrupted");
      expect(errorBanner().classList.contains("hidden")).toBe(true);
    });

    it('does not call speechSynthesis.cancel() for "canceled"', () => {
      const u = triggerPlay();
      speechMock.cancel.mockClear();
      fireUtteranceError(u, "canceled");
      expect(speechMock.cancel).not.toHaveBeenCalled();
    });

    it('does not call speechSynthesis.cancel() for "interrupted"', () => {
      const u = triggerPlay();
      speechMock.cancel.mockClear();
      fireUtteranceError(u, "interrupted");
      expect(speechMock.cancel).not.toHaveBeenCalled();
    });

    it('does not change UI state for "canceled"', () => {
      const u = triggerPlay();
      const playBtn = document.getElementById("play_recepy");
      const pauseBtn = document.getElementById("pause_recepy");
      // Simulate speech actually starting (updateUI("playing") runs inside onstart)
      u.onstart?.();
      expect(pauseBtn.classList.contains("hidden")).toBe(false);
      expect(playBtn.classList.contains("hidden")).toBe(true);

      fireUtteranceError(u, "canceled");
      // UI must NOT have been reset
      expect(pauseBtn.classList.contains("hidden")).toBe(false);
      expect(playBtn.classList.contains("hidden")).toBe(true);
    });
  });

  // ── Fatal errors – reset player ─────────────────────────────────────────
  describe("fatal errors – show message and reset player", () => {
    const fatalCases = [
      ["audio-busy", /busy|audio/i],
      ["audio-hardware", /hardware|audio/i],
      ["synthesis-unavailable", /not available|unavailable/i],
      ["not-allowed", /not allowed|permission/i],
    ];

    it.each(fatalCases)('shows error message for "%s"', (errorType, pattern) => {
      const u = triggerPlay();
      fireUtteranceError(u, errorType);
      expect(errorBanner().classList.contains("hidden")).toBe(false);
      expect(errorBanner().textContent).toMatch(pattern);
    });

    it.each(fatalCases.map(([e]) => [e]))(
      'calls speechSynthesis.cancel() on "%s"',
      (errorType) => {
        const u = triggerPlay();
        speechMock.cancel.mockClear();
        fireUtteranceError(u, errorType);
        expect(speechMock.cancel).toHaveBeenCalled();
      }
    );

    it.each(fatalCases.map(([e]) => [e]))(
      'resets UI to idle (play button visible) on "%s"',
      (errorType) => {
        const u = triggerPlay();
        fireUtteranceError(u, errorType);
        expect(document.getElementById("play_recepy").classList.contains("hidden")).toBe(false);
        expect(document.getElementById("pause_recepy").classList.contains("hidden")).toBe(true);
        expect(document.getElementById("resume_recepy").classList.contains("hidden")).toBe(true);
      }
    );
  });

  // ── Retriable errors ─────────────────────────────────────────────────────
  describe("retriable errors – show message and retry", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    const retriableCases = [
      ["network", /network/i],
      ["synthesis-failed", /failed|retry/i],
    ];

    it.each(retriableCases)('shows retry message for "%s"', (errorType, pattern) => {
      const u = triggerPlay();
      fireUtteranceError(u, errorType);
      expect(errorBanner().classList.contains("hidden")).toBe(false);
      expect(errorBanner().textContent).toMatch(pattern);
    });

    it.each(retriableCases.map(([e]) => [e]))(
      'calls speechSynthesis.cancel() before retry on "%s"',
      (errorType) => {
        const u = triggerPlay();
        speechMock.cancel.mockClear();
        fireUtteranceError(u, errorType);
        expect(speechMock.cancel).toHaveBeenCalled();
      }
    );

    it.each(retriableCases.map(([e]) => [e]))(
      'issues a new speak() call after timeout for "%s"',
      (errorType) => {
        const u = triggerPlay();
        const countBefore = speechMock.speak.mock.calls.length;
        fireUtteranceError(u, errorType);
        vi.advanceTimersByTime(200);
        expect(speechMock.speak.mock.calls.length).toBeGreaterThan(countBefore);
      }
    );

    it.each(retriableCases.map(([e]) => [e]))(
      'does NOT reset UI to idle on "%s" (player stays active)',
      (errorType) => {
        const u = triggerPlay();
        // Simulate speech starting so UI enters "playing" state
        u.onstart?.();
        expect(document.getElementById("play_recepy").classList.contains("hidden")).toBe(true);

        fireUtteranceError(u, errorType);
        // Retriable errors must NOT reset to idle — play button stays hidden
        expect(document.getElementById("play_recepy").classList.contains("hidden")).toBe(true);
      }
    );
  });

  // ── Voice fallback errors ────────────────────────────────────────────────
  describe("voice fallback errors – fallback voice then retry", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    const fallbackCases = [
      ["language-unavailable", /unavailable|voice|default/i],
      ["voice-unavailable", /unavailable|voice|default/i],
    ];

    it.each(fallbackCases)(
      'shows fallback message for "%s"',
      (errorType, pattern) => {
        const u = triggerPlay();
        fireUtteranceError(u, errorType);
        expect(errorBanner().classList.contains("hidden")).toBe(false);
        expect(errorBanner().textContent).toMatch(pattern);
      }
    );

    it.each(fallbackCases.map(([e]) => [e]))(
      'calls getVoices() to pick fallback for "%s"',
      (errorType) => {
        const u = triggerPlay();
        speechMock.getVoices.mockClear();
        fireUtteranceError(u, errorType);
        expect(speechMock.getVoices).toHaveBeenCalled();
      }
    );

    it.each(fallbackCases.map(([e]) => [e]))(
      'retries speech after fallback for "%s"',
      (errorType) => {
        const u = triggerPlay();
        const countBefore = speechMock.speak.mock.calls.length;
        fireUtteranceError(u, errorType);
        vi.advanceTimersByTime(200);
        expect(speechMock.speak.mock.calls.length).toBeGreaterThan(countBefore);
      }
    );
  });

  // ── Unknown / default errors ─────────────────────────────────────────────
  describe("unknown errors – show generic message and reset", () => {
    it("shows a non-empty generic message for an unknown error type", () => {
      const u = triggerPlay();
      fireUtteranceError(u, "totally-unknown-error");
      expect(errorBanner().classList.contains("hidden")).toBe(false);
      expect(errorBanner().textContent.length).toBeGreaterThan(0);
    });

    it("resets player UI for an unknown error", () => {
      const u = triggerPlay();
      fireUtteranceError(u, "some-weird-error");
      expect(document.getElementById("play_recepy").classList.contains("hidden")).toBe(false);
      expect(document.getElementById("pause_recepy").classList.contains("hidden")).toBe(true);
    });

    it("calls speechSynthesis.cancel() for an unknown error", () => {
      const u = triggerPlay();
      speechMock.cancel.mockClear();
      fireUtteranceError(u, "mystery-error");
      expect(speechMock.cancel).toHaveBeenCalled();
    });
  });

  // ── Error banner cleared on next play ────────────────────────────────────
  describe("error cleared when playback starts again", () => {
    it("hides error banner when SpeechController.play() is called after an error", () => {
      const u = triggerPlay();
      fireUtteranceError(u, "audio-busy");
      expect(errorBanner().classList.contains("hidden")).toBe(false);

      // Start a new play session – error should disappear
      triggerPlay(0);
      expect(errorBanner().classList.contains("hidden")).toBe(true);
      expect(errorBanner().textContent).toBe("");
    });

    it("does not leave a stale error message visible between steps", () => {
      let u = triggerPlay(0);
      fireUtteranceError(u, "not-allowed");
      expect(errorBanner().classList.contains("hidden")).toBe(false);

      triggerPlay(1);
      expect(errorBanner().classList.contains("hidden")).toBe(true);
    });
  });

  // ── showError / clearError unit tests ────────────────────────────────────
  describe("showError and clearError helpers", () => {
    it("showError sets textContent and removes hidden class", () => {
      window.__playerTest__.showError("Test message");
      expect(errorBanner().textContent).toBe("Test message");
      expect(errorBanner().classList.contains("hidden")).toBe(false);
    });

    it("clearError empties textContent and adds hidden class", () => {
      window.__playerTest__.showError("Test message");
      window.__playerTest__.clearError();
      expect(errorBanner().textContent).toBe("");
      expect(errorBanner().classList.contains("hidden")).toBe(true);
    });

    it("showError overwrites a previous error message", () => {
      window.__playerTest__.showError("First error");
      window.__playerTest__.showError("Second error");
      expect(errorBanner().textContent).toBe("Second error");
    });
  });
});
