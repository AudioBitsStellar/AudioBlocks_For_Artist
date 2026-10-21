import { escapeCsvValue } from "@/utils/csv";

describe("CSV utility", () => {
  describe("escapeCsvValue", () => {
    it("should not quote simple values", () => {
      expect(escapeCsvValue("simple")).toBe("simple");
      expect(escapeCsvValue("123")).toBe("123");
      expect(escapeCsvValue(456)).toBe("456");
    });

    it("should quote values containing commas", () => {
      expect(escapeCsvValue("hello, world")).toBe('"hello, world"');
    });

    it("should quote values containing quotes and double them", () => {
      expect(escapeCsvValue('say "hello"')).toBe('"say ""hello"""');
    });

    it("should quote values containing newlines", () => {
      expect(escapeCsvValue("line1\nline2")).toBe('"line1\nline2"');
      expect(escapeCsvValue("line1\r\nline2")).toBe('"line1\r\nline2"');
    });

    it("should handle empty strings", () => {
      expect(escapeCsvValue("")).toBe("");
    });

    it("should handle complex cases with multiple special characters", () => {
      expect(escapeCsvValue('a, "b", c\nd')).toBe('"a, ""b"", c\nd"');
    });

    it("should convert numbers to strings", () => {
      expect(escapeCsvValue(0)).toBe("0");
      expect(escapeCsvValue(3.14)).toBe("3.14");
    });
  });
});
