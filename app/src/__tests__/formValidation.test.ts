import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  albumFormSchema,
  artistNameSchema,
  eventFormSchema,
  getFormErrors,
  loginFormSchema,
  merchFormSchema,
  parseFormDate,
  verificationFormSchema,
} from "@/types/formValidation";

describe("parseFormDate", () => {
  it("parses DD-MM-YYYY and YYYY-MM-DD", () => {
    expect(parseFormDate("25-12-2030")?.getMonth()).toBe(11);
    expect(parseFormDate("2030-12-25")?.getDate()).toBe(25);
  });

  it("rejects malformed text and impossible calendar dates", () => {
    expect(parseFormDate("tomorrow")).toBeNull();
    expect(parseFormDate("31-02-2030")).toBeNull();
    expect(parseFormDate("2030-13-01")).toBeNull();
    expect(parseFormDate("1-1-2030")).toBeNull();
  });
});

describe("getFormErrors", () => {
  it("returns an empty object for valid input", () => {
    expect(getFormErrors(loginFormSchema, { email: "a@b.co", password: "x" })).toEqual({});
  });

  it("returns only the first message per field", () => {
    const errors = getFormErrors(loginFormSchema, { email: "", password: "" });
    expect(errors).toEqual({ email: "Email is required", password: "Password is required" });
  });
});

describe("loginFormSchema", () => {
  it("rejects a malformed email", () => {
    expect(getFormErrors(loginFormSchema, { email: "nope", password: "x" }).email).toBe(
      "Please enter a valid email address"
    );
  });

  it("trims surrounding whitespace from the email", () => {
    const result = loginFormSchema.parse({ email: "  a@b.co ", password: "x" });
    expect(result.email).toBe("a@b.co");
  });
});

describe("eventFormSchema", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2030, 5, 15, 12, 0, 0));
  });
  afterEach(() => vi.useRealTimers());

  const valid = {
    name: "Album launch",
    price: "25.50",
    description: "Live set",
    time: "18:30",
    date: "20-06-2030",
  };

  it("accepts a valid event", () => {
    expect(getFormErrors(eventFormSchema, valid)).toEqual({});
  });

  it("accepts today's date and 12-hour times", () => {
    expect(
      getFormErrors(eventFormSchema, { ...valid, date: "15-06-2030", time: "6:30 PM", price: "$0" })
    ).toEqual({});
  });

  it("requires every field", () => {
    const errors = getFormErrors(eventFormSchema, {
      name: "",
      price: "",
      description: "",
      time: "",
      date: "",
    });
    expect(Object.keys(errors).sort()).toEqual(["date", "description", "name", "price", "time"]);
    expect(errors.name).toBe("Event name is required");
  });

  it("rejects dates in the past", () => {
    expect(getFormErrors(eventFormSchema, { ...valid, date: "14-06-2030" }).date).toBe(
      "Event date cannot be in the past"
    );
  });

  it("rejects malformed dates, times and prices", () => {
    const errors = getFormErrors(eventFormSchema, {
      ...valid,
      date: "soon",
      time: "25:99",
      price: "ten dollars",
    });
    expect(errors.date).toMatch(/valid date/);
    expect(errors.time).toMatch(/18:30/);
    expect(errors.price).toMatch(/valid amount/);
  });

  it("enforces name and description length limits", () => {
    const errors = getFormErrors(eventFormSchema, {
      ...valid,
      name: "x".repeat(101),
      description: "x".repeat(2001),
    });
    expect(errors.name).toMatch(/100 characters/);
    expect(errors.description).toMatch(/2000 characters/);
  });
});

describe("merchFormSchema", () => {
  const valid = { title: "Tour tee", detail: "", date: "", time: "", price: "20", image: "" };

  it("only requires title and price", () => {
    expect(getFormErrors(merchFormSchema, valid)).toEqual({});
    const errors = getFormErrors(merchFormSchema, { ...valid, title: " ", price: "" });
    expect(Object.keys(errors).sort()).toEqual(["price", "title"]);
  });

  it("rejects non-numeric and oversized prices", () => {
    expect(getFormErrors(merchFormSchema, { ...valid, price: "free" }).price).toMatch(
      /valid amount/
    );
    expect(getFormErrors(merchFormSchema, { ...valid, price: "1000000" }).price).toBeDefined();
  });

  it("validates optional fields only when filled in", () => {
    expect(
      getFormErrors(merchFormSchema, {
        ...valid,
        date: "01-01-2020",
        time: "9:00 AM",
        image: "https://cdn.example.com/a.png",
      })
    ).toEqual({});

    const errors = getFormErrors(merchFormSchema, {
      ...valid,
      date: "yesterday",
      time: "noon",
      image: "javascript:alert(1)",
    });
    expect(errors.date).toBeDefined();
    expect(errors.time).toBeDefined();
    expect(errors.image).toBe("Image must be a valid http(s) URL");
  });
});

describe("verificationFormSchema", () => {
  it("accepts a name and https link", () => {
    expect(
      getFormErrors(verificationFormSchema, {
        legalName: "Jane Doe",
        proofUrl: "https://example.com/jane",
        note: "",
      })
    ).toEqual({});
  });

  it("requires both fields", () => {
    expect(getFormErrors(verificationFormSchema, { legalName: "", proofUrl: "" })).toEqual({
      legalName: "Legal name is required",
      proofUrl: "A link proving your identity is required",
    });
  });

  it("rejects links that are not http(s) URLs", () => {
    for (const proofUrl of ["example.com", "ftp://example.com", "javascript:alert(1)"]) {
      expect(
        getFormErrors(verificationFormSchema, { legalName: "Jane", proofUrl }).proofUrl
      ).toMatch(/valid link/);
    }
  });
});

describe("artistNameSchema", () => {
  it("accepts ordinary and non-ASCII names", () => {
    for (const name of ["Misty Brown", "Beyoncé", "AC-DC", "  Lil' Wayne  "]) {
      expect(artistNameSchema.safeParse(name).success).toBe(true);
    }
  });

  it("rejects too-short names and disallowed characters", () => {
    expect(artistNameSchema.safeParse("A").success).toBe(false);
    expect(artistNameSchema.safeParse("<script>").success).toBe(false);
    expect(artistNameSchema.safeParse("x".repeat(101)).success).toBe(false);
  });
});

describe("albumFormSchema purchasePrice", () => {
  const base = { albumTitle: "A", genre: "Afrobeats", songTitle: "S" };

  it("allows empty, zero and decimal prices", () => {
    for (const purchasePrice of [undefined, "", "0", "9.99"]) {
      expect(albumFormSchema.safeParse({ ...base, purchasePrice }).success).toBe(true);
    }
  });

  it("rejects negative and non-numeric prices", () => {
    for (const purchasePrice of ["-1", "abc"]) {
      expect(albumFormSchema.safeParse({ ...base, purchasePrice }).success).toBe(false);
    }
  });
});
