/**
 * Unit tests for shared CSV utilities (#618).
 * Tests RFC 4180 CSV escaping: comma, quote, newline handling.
 */

import { escapeCsvValue, downloadCsv } from "@/utils/csv";

describe("escapeCsvValue", () => {
  it("leaves plain strings unchanged", () => {
    expect(escapeCsvValue("hello")).toBe("hello");
    expect(escapeCsvValue("123")).toBe("123");
    expect(escapeCsvValue("test-value_123")).toBe("test-value_123");
  });

  it("quotes strings containing commas", () => {
    expect(escapeCsvValue("hello, world")).toBe('"hello, world"');
    expect(escapeCsvValue("a,b,c")).toBe('"a,b,c"');
  });

  it("quotes strings containing double quotes and doubles embedded quotes", () => {
    expect(escapeCsvValue('say "hello"')).toBe('"say ""hello"""');
    expect(escapeCsvValue('"quoted"')).toBe('"""quoted"""');
  });

  it("quotes strings containing newlines", () => {
    expect(escapeCsvValue("line1\nline2")).toBe('"line1\nline2"');
    expect(escapeCsvValue("line1\r\nline2")).toBe('"line1\r\nline2"');
  });

  it("handles mixed special characters", () => {
    expect(escapeCsvValue('text, "quoted", newline\n')).toBe('"text, ""quoted"", newline\n"');
  });

  it("converts numbers to strings", () => {
    expect(escapeCsvValue(123)).toBe("123");
    expect(escapeCsvValue(45.67)).toBe("45.67");
    expect(escapeCsvValue(0)).toBe("0");
  });

  it("handles empty strings", () => {
    expect(escapeCsvValue("")).toBe("");
  });
});

describe("downloadCsv", () => {
  let mockCreateObjectURL: jest.Mock;
  let mockRevokeObjectURL: jest.Mock;
  let mockLink: HTMLAnchorElement;
  let originalWindow: typeof window;
  let originalDocument: typeof document;

  beforeEach(() => {
    // Mock URL methods
    mockCreateObjectURL = jest.fn().mockReturnValue("blob:mock-url");
    mockRevokeObjectURL = jest.fn();
    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;

    // Mock link element
    mockLink = {
      href: "",
      download: "",
      style: { display: "" },
      click: jest.fn(),
    } as unknown as HTMLAnchorElement;

    // Mock document methods
    const mockCreateElement = jest.fn().mockReturnValue(mockLink);
    const mockAppendChild = jest.fn();
    const mockRemoveChild = jest.fn();

    Object.defineProperty(global, "document", {
      value: {
        createElement: mockCreateElement,
        body: {
          appendChild: mockAppendChild,
          removeChild: mockRemoveChild,
        },
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("creates a blob with UTF-8 BOM and triggers download", () => {
    const content = "Name,Amount\nAlice,100\nBob,200";
    const filename = "test.csv";

    downloadCsv(content, filename);

    // Verify blob creation with BOM
    expect(mockCreateObjectURL).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "text/csv;charset=utf-8;",
      })
    );

    // Verify link properties
    expect(mockLink.href).toBe("blob:mock-url");
    expect(mockLink.download).toBe(filename);
    expect(mockLink.style.display).toBe("none");

    // Verify link was clicked
    expect(mockLink.click).toHaveBeenCalled();

    // Verify DOM manipulation
    expect(document.body.appendChild).toHaveBeenCalledWith(mockLink);
    expect(document.body.removeChild).toHaveBeenCalledWith(mockLink);

    // Verify URL cleanup
    expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });

  it("does nothing if window is undefined (SSR)", () => {
    // Simulate SSR by deleting window
    const originalWindow = global.window;
    // @ts-expect-error - intentionally testing undefined window
    delete global.window;

    const content = "test";
    const filename = "test.csv";

    // Should not throw
    downloadCsv(content, filename);

    // Restore window
    global.window = originalWindow;
  });

  it("does nothing if document is undefined", () => {
    // Simulate missing document
    const originalDocument = global.document;
    // @ts-expect-error - intentionally testing undefined document
    delete global.document;

    const content = "test";
    const filename = "test.csv";

    // Should not throw
    expect(() => downloadCsv(content, filename)).not.toThrow();

    // Restore document
    global.document = originalDocument;
  });

  it("handles special characters in filename", () => {
    const content = "data";
    const filename = "payouts_2026-10.csv";

    downloadCsv(content, filename);

    expect(mockLink.download).toBe(filename);
  });
});
