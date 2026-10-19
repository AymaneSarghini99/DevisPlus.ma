import { afterEach, describe, expect, it } from "vitest";
import { newQuote, saveQuote, loadQuotes } from "./quotes";
import { isTrialLimit, setTrialLimit, trialQuotesLeft } from "./trial";

describe("free trial", () => {
  afterEach(() => {
    setTrialLimit(null);
    localStorage.clear();
  });

  it("allows 2 new quotes, then refuses a 3rd one; existing quotes stay editable", () => {
    setTrialLimit(2);
    const a = saveQuote(newQuote(loadQuotes()));
    const b = saveQuote(newQuote(loadQuotes()));
    expect(trialQuotesLeft(loadQuotes().length)).toBe(0);
    let error: unknown = null;
    try {
      saveQuote(newQuote(loadQuotes()));
    } catch (e) {
      error = e;
    }
    expect(isTrialLimit(error)).toBe(true);
    expect(saveQuote({ ...a, delivery: "edited" }).delivery).toBe("edited");
    expect(
      loadQuotes()
        .map((q) => q.id)
        .sort(),
    ).toEqual([a.id, b.id].sort());
  });

  it("has no limit once approved", () => {
    setTrialLimit(null);
    for (let i = 0; i < 3; i++) saveQuote(newQuote(loadQuotes()));
    expect(loadQuotes()).toHaveLength(3);
    expect(trialQuotesLeft(3)).toBeNull();
  });
});
