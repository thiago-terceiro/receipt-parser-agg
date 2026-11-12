import { createMessagesObject } from "./messages-client";

describe("createMessagesObject", () => {
  it("evaluates namespaces lazily on first access and memoizes them", () => {
    const t = jest.fn((key: string, values?: Record<string, unknown>) =>
      values && Object.keys(values).length > 0
        ? `${key} ${JSON.stringify(values)}`
        : key,
    );

    const messages = createMessagesObject(t, "en");

    // Creating the wrapper must not eagerly resolve any translation keys.
    expect(t).not.toHaveBeenCalled();

    const firstReceipt = messages.receipt;
    expect(firstReceipt.total("$4.00")).toBe('receipt.total {"amount":"$4.00"}');

    const calledKeys = t.mock.calls.map(([key]) => key);
    expect(calledKeys.some((key) => key.startsWith("receipt."))).toBe(true);
    expect(calledKeys.some((key) => key.startsWith("groceries."))).toBe(false);
    expect(calledKeys.some((key) => key.startsWith("invite."))).toBe(false);
    expect(calledKeys.some((key) => key.startsWith("auth."))).toBe(false);

    // Repeated property reads return the cached namespace object without re-querying t.
    const callsAfterFirstRead = t.mock.calls.length;
    const secondReceipt = messages.receipt;
    expect(secondReceipt).toBe(firstReceipt);
    expect(t).toHaveBeenCalledTimes(callsAfterFirstRead);
  });
});
