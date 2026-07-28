import { describe, it, expect } from "vitest";
import { encodeHtmlEntities } from "@/utils/textEncoder";

describe("encodeHtmlEntities", () => {
  it("encodes ampersand", () => {
    expect(encodeHtmlEntities("&")).toBe("&amp;");
  });

  it("encodes less-than angle bracket", () => {
    expect(encodeHtmlEntities("<")).toBe("&lt;");
  });

  it("encodes greater-than angle bracket", () => {
    expect(encodeHtmlEntities(">")).toBe("&gt;");
  });

  it("encodes double quote", () => {
    expect(encodeHtmlEntities('"')).toBe("&quot;");
  });

  it("encodes single quote", () => {
    expect(encodeHtmlEntities("'")).toBe("&#x27;");
  });

  it("encodes all special characters in one string", () => {
    expect(encodeHtmlEntities('<script>alert("xss")</script>')).toBe(
      "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"
    );
  });

  it("handles single quotes with apostrophe encoding", () => {
    expect(encodeHtmlEntities("It's fine")).toBe("It&#x27;s fine");
  });

  it("returns an empty string as-is", () => {
    expect(encodeHtmlEntities("")).toBe("");
  });

  it("leaves safe text unchanged", () => {
    expect(encodeHtmlEntities("Hello world")).toBe("Hello world");
  });

  it("handles mixed content with safe and unsafe characters", () => {
    expect(encodeHtmlEntities("5 > 3 & 3 < 5")).toBe("5 &gt; 3 &amp; 3 &lt; 5");
  });
});