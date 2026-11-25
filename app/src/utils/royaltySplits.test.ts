import { describe, expect, it } from "vitest";
import {
  basisPointsToPercent,
  formatPercent,
  isSplitDraftValid,
  MAX_COLLABORATORS,
  parsePercent,
  percentToBasisPoints,
  rebalanceToTotal,
  totalBasisPoints,
  toBasisPointEntries,
  totalPercent,
  validateRoyaltySplit,
  validateSplitDraft,
  type SplitParticipant,
} from "./royaltySplits";
import { saveSplit, resetRoyaltySplits } from "@/services/royaltySplitService";

// Real Ed25519 Stellar keys generated with `@stellar/stellar-base` (valid CRC16 checksums).
const VALID_ADDRESSES = [
  "GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR",
  "GCATS5YOVB6ROX2WUNKGNQ2MP3GMXDMKSG2O4N5CLX3A6W4PZGZZI55U",
  "GDWUSKGGFDI4FRXK5EBTRECZSVQSSWJHHJOGH6JWG3AUMFFMQ435DIAG",
  "GDFJHLAXAUMHA4OWPOB4P7YO72AQR2HMIUYFOXLXE2DZGM633K7HZDQP",
  "GBXHUHG5FGYLPD6RHL2MKWMP572O6KUXCZXDZJXS4T57ZTMAKBN7DWXN",
  "GCFIOX77D2ZYIUKXPLGVV7XEAVCWK2G5PSE6BEEGHICVPPD26SPRPPVB",
  "GDVEU3DD4KOFECV66VIHWEZOYX4ZKR3WV27L464SIIPOU2IUI3JCZA57",
  "GAJZR5RMNUNEK7CRXJVEWXZ5XUXWT7FJGILCDDOITF7EC26RPWJ4UVOE",
  "GD6ROJBYLKQMOW3E7N4M2YBPUHMZD7PL65VRHRMO24BOVSBV5H3BQRSL",
  "GBB2OLTRIQAXMLPWNNUME3P334TIFKXMT4SHJ3FEME7EESQPXL6TZAU6",
  "GBTL47RTFR5EKMZSXWOQU735WBK7LRPPDIDK3JTNTCZZ7NUBBRDTVSK2",
];
const ADDRESS_A = VALID_ADDRESSES[0];
const ADDRESS_B = VALID_ADDRESSES[1];
const ADDRESS_C = VALID_ADDRESSES[2];
const SECRET_KEY = "SAAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQC5MY";

const rows = (...percents: number[]): SplitParticipant[] =>
  percents.map((percent, index) => ({
    id: `row_${index}`,
    name: `Collaborator ${index}`,
    address: index === 0 ? ADDRESS_A : index === 1 ? ADDRESS_B : ADDRESS_C,
    percent,
  }));

describe("percent <-> basis points", () => {
  it("parses user input, treating blanks as zero and junk as NaN", () => {
    expect(parsePercent("")).toBe(0);
    expect(parsePercent("  ")).toBe(0);
    expect(parsePercent("12.5")).toBe(12.5);
    expect(parsePercent(30)).toBe(30);
    expect(Number.isNaN(parsePercent("abc"))).toBe(true);
  });

  it("round-trips through integer basis points", () => {
    expect(percentToBasisPoints(50)).toBe(5000);
    expect(percentToBasisPoints(33.33)).toBe(3333);
    expect(percentToBasisPoints(33.333)).toBe(3333);
    expect(basisPointsToPercent(2500)).toBe(25);
  });

  it("formats without trailing zero noise", () => {
    expect(formatPercent(50)).toBe("50");
    expect(formatPercent(33.33)).toBe("33.33");
    expect(formatPercent(NaN)).toBe("0");
  });
});

describe("totalPercent", () => {
  it("ignores unparseable rows instead of producing NaN", () => {
    expect(totalPercent([...rows(50, 50), { ...rows(0)[0], percent: NaN }])).toBe(100);
  });
});

describe("rebalanceToTotal", () => {
  it("keeps the total at exactly 100% after an edit", () => {
    const result = rebalanceToTotal(rows(50, 50), "row_0", 60);
    expect(result[0].percent).toBe(60);
    expect(totalPercent(result)).toBe(100);
  });

  it("honours an uneven remainder without losing basis points", () => {
    const result = rebalanceToTotal(rows(34, 33, 33), "row_0", 10);
    expect(result[0].percent).toBe(10);
    expect(percentToBasisPoints(10)).toBe(1000);
    expect(result.reduce((sum, row) => sum + percentToBasisPoints(row.percent), 0)).toBe(10_000);
    expect(totalPercent(result)).toBe(100);
  });

  it("clamps out-of-range input", () => {
    expect(rebalanceToTotal(rows(50, 50), "row_0", 150)[0].percent).toBe(100);
    expect(rebalanceToTotal(rows(50, 50), "row_0", -20)[0].percent).toBe(0);
  });

  it("keeps a single-recipient split at 100%", () => {
    const result = rebalanceToTotal(rows(100), "row_0", 40);
    expect(result[0].percent).toBe(100);
    expect(totalBasisPoints(result)).toBe(10_000);
  });

  it("distributes across empty rows rather than losing the remainder", () => {
    const result = rebalanceToTotal(rows(0, 0, 0), "row_0", 40);
    expect(totalPercent(result)).toBe(100);
  });

  it("normalizes edits to on-chain basis-point precision", () => {
    const result = rebalanceToTotal(rows(50, 50), "row_0", 33.333);
    expect(result.map((row) => row.percent)).toEqual([33.33, 66.67]);
    expect(totalBasisPoints(result)).toBe(10_000);
  });

  it("keeps every rebalanced share set at exactly 10,000 basis points", () => {
    for (let count = 1; count <= MAX_COLLABORATORS; count += 1) {
      for (let requested = 0; requested <= 100; requested += 7) {
        const participants = rows(...Array(count).fill(100 / count));
        const result = rebalanceToTotal(participants, "row_0", requested);
        expect(totalBasisPoints(result)).toBe(10_000);
      }
    }
  });

  it("is a no-op for an unknown row id", () => {
    const input = rows(50, 50);
    expect(rebalanceToTotal(input, "nope", 10)).toBe(input);
  });
});

describe("validateSplitDraft and validateRoyaltySplit (#591)", () => {
  it("accepts a balanced, well-formed split", () => {
    expect(validateSplitDraft(rows(50, 50))).toEqual({ rows: {} });
    expect(isSplitDraftValid(rows(60, 40))).toBe(true);
    expect(validateRoyaltySplit(toBasisPointEntries(rows(60, 40))).valid).toBe(true);
  });

  it("requires at least one collaborator and caps the list", () => {
    expect(validateSplitDraft([]).total).toMatch(/at least one/i);
    expect(validateRoyaltySplit([]).valid).toBe(false);

    const many = Array.from({ length: MAX_COLLABORATORS + 1 }, (_, i) => ({
      id: `r${i}`,
      name: `N${i}`,
      address: VALID_ADDRESSES[i],
      percent: 100 / (MAX_COLLABORATORS + 1),
    }));
    expect(validateSplitDraft(many).total).toMatch(new RegExp(`${MAX_COLLABORATORS}`));
    expect(validateRoyaltySplit(toBasisPointEntries(many)).valid).toBe(false);
  });

  it("flags missing names, missing or malformed addresses, and secret keys", () => {
    const draft: SplitParticipant[] = [
      { id: "a", name: "  ", address: ADDRESS_A, percent: 40 },
      { id: "b", name: "B", address: "", percent: 20 },
      { id: "c", name: "C", address: "GABC", percent: 20 },
      { id: "d", name: "D", address: SECRET_KEY, percent: 20 },
    ];
    const errors = validateSplitDraft(draft);
    expect(errors.rows.a).toMatch(/name/i);
    expect(errors.rows.b).toMatch(/Stellar address/i);
    expect(errors.rows.c).toMatch(/valid Stellar/i);
    expect(errors.rows.d).toMatch(/secret key/i);
  });

  it("rejects duplicate recipients (including case-insensitive duplicates)", () => {
    const draft: SplitParticipant[] = [
      { id: "a", name: "A", address: ADDRESS_A, percent: 50 },
      { id: "b", name: "B", address: ADDRESS_A.toLowerCase(), percent: 50 },
    ];
    expect(validateSplitDraft(draft).rows.b).toMatch(/Duplicate recipient/i);
    const contractResult = validateRoyaltySplit(toBasisPointEntries(draft));
    expect(contractResult.valid).toBe(false);
    expect(contractResult.issues.some((i) => i.code === "duplicate_recipient")).toBe(true);
  });

  it("requires the shares to add up to 100% (10 000 basis points)", () => {
    expect(validateSplitDraft(rows(50, 40)).total).toMatch(/100%/);
    expect(isSplitDraftValid(rows(50, 40))).toBe(false);
    const result = validateRoyaltySplit([
      { recipient: ADDRESS_A, basisPoints: 5000 },
      { recipient: ADDRESS_B, basisPoints: 4999 },
    ]);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === "invalid_total")).toBe(true);
  });

  it("rejects a zero, negative, or oversized share", () => {
    const zero = validateSplitDraft([
      { id: "a", name: "A", address: ADDRESS_A, percent: 0 },
      { id: "b", name: "B", address: ADDRESS_B, percent: 100 },
    ]);
    expect(zero.rows.a).toMatch(/greater than 0/i);

    const huge = validateSplitDraft([
      { id: "a", name: "A", address: ADDRESS_A, percent: 120 },
      { id: "b", name: "B", address: ADDRESS_B, percent: 0 },
    ]);
    expect(huge.rows.a).toMatch(/more than 100/i);
  });

  it("produces identical validation results between the UI draft validator and saveSplit service", () => {
    resetRoyaltySplits();

    const fixtures: { label: string; draft: SplitParticipant[]; expectValid: boolean }[] = [
      {
        label: "valid 50/50 split",
        draft: rows(50, 50),
        expectValid: true,
      },
      {
        label: "duplicate recipient",
        draft: [
          { id: "r0", name: "A", address: ADDRESS_A, percent: 50 },
          { id: "r1", name: "B", address: ADDRESS_A, percent: 50 },
        ],
        expectValid: false,
      },
      {
        label: "total not equal to 100% (99.99%)",
        draft: [
          { id: "r0", name: "A", address: ADDRESS_A, percent: 50 },
          { id: "r1", name: "B", address: ADDRESS_B, percent: 49.99 },
        ],
        expectValid: false,
      },
      {
        label: "zero share",
        draft: [
          { id: "r0", name: "A", address: ADDRESS_A, percent: 0 },
          { id: "r1", name: "B", address: ADDRESS_B, percent: 100 },
        ],
        expectValid: false,
      },
      {
        label: "invalid checksum address",
        draft: [
          {
            id: "r0",
            name: "A",
            address: `${ADDRESS_A.slice(0, 10)}${ADDRESS_A[10] === "A" ? "B" : "A"}${ADDRESS_A.slice(11)}`,
            percent: 50,
          },
          { id: "r1", name: "B", address: ADDRESS_B, percent: 50 },
        ],
        expectValid: false,
      },
    ];

    for (const fixture of fixtures) {
      const uiErrors = validateSplitDraft(fixture.draft);
      const uiValid = Object.keys(uiErrors.rows).length === 0 && !uiErrors.total;
      const serviceResult = saveSplit("rel_parity_test", fixture.draft);
      const contractResult = validateRoyaltySplit(toBasisPointEntries(fixture.draft));

      expect(uiValid, fixture.label).toBe(fixture.expectValid);
      expect(serviceResult.ok, fixture.label).toBe(fixture.expectValid);
      expect(contractResult.valid, fixture.label).toBe(fixture.expectValid);

      if (!serviceResult.ok) {
        expect(serviceResult.errors, fixture.label).toEqual(uiErrors);
      }
    }
  });
});

describe("toBasisPointEntries", () => {
  it("hands the contract normalized addresses and integer shares", () => {
    const entries = toBasisPointEntries([
      { id: "a", name: "A", address: ` ${ADDRESS_A.toLowerCase()} `, percent: 62.5 },
      { id: "b", name: "B", address: ADDRESS_B, percent: 37.5 },
    ]);
    expect(entries).toEqual([
      { recipient: ADDRESS_A, basisPoints: 6250 },
      { recipient: ADDRESS_B, basisPoints: 3750 },
    ]);
    expect(entries.reduce((sum, e) => sum + e.basisPoints, 0)).toBe(10_000);
  });
});
