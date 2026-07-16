import { beforeEach, describe, expect, it } from "vitest";

import { clearAccessToken, getAccessToken, setAccessToken, subscribeToAuth } from "./auth";

describe("auth memory store", () => {
  beforeEach(() => {
    window.localStorage.clear();
    clearAccessToken();
  });

  it("keeps the access token in memory and never in localStorage", () => {
    let notifications = 0;
    const unsubscribe = subscribeToAuth(() => notifications++);
    setAccessToken("access-token");

    expect(getAccessToken()).toBe("access-token");
    expect(window.localStorage.length).toBe(0);
    expect(notifications).toBe(1);

    clearAccessToken();
    expect(getAccessToken()).toBeNull();
    expect(notifications).toBe(2);
    unsubscribe();
  });
});
