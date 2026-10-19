import { describe, it, expect } from "vitest";
import { renderTemplate, normalizePhone, smsSegments, parseCsv } from "./sms";

describe("sms helpers", () => {
  it("fills contact placeholders", () => {
    expect(renderTemplate("Hi {{name}}, call {{ phone }}", { name: "Ada", phone: "+234" })).toBe("Hi Ada, call +234");
  });
  it("normalizes phones", () => {
    expect(normalizePhone(" +234 (803) 123-4567 ")).toBe("+2348031234567");
  });
  it("counts segments", () => {
    expect(smsSegments("a".repeat(160))).toBe(1);
    expect(smsSegments("a".repeat(161))).toBe(2);
  });
  it("parses quoted csv", () => {
    expect(parseCsv('name,phone\n"Doe, J",+1\n')).toEqual([{ name: "Doe, J", phone: "+1" }]);
  });
});
