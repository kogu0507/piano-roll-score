import { describe, expect, it } from "vitest";

import {
  createHandBadgeLayout,
  getHandRenderingStyle,
} from "../../src/renderers/hand-styles";

describe("hand rendering styles", () => {
  it("uses subdued note block fills and hand-specific small badges", () => {
    const right = getHandRenderingStyle("right");
    const left = getHandRenderingStyle("left");
    const unspecified = getHandRenderingStyle("unspecified");

    expect(right.fill).toBe("#f7f8f5");
    expect(left.fill).toBe(right.fill);
    expect(unspecified.fill).toBe(right.fill);
    expect(right.badgeFill).not.toBe(left.badgeFill);
    expect(left.badgeFill).not.toBe(unspecified.badgeFill);
    expect(right.marker).toBe("右");
    expect(left.marker).toBe("左");
    expect(unspecified.marker).toBe("—");
  });

  it("keeps hand badges small and hides them when a note is too short", () => {
    const visible = createHandBadgeLayout(
      { x: 10, y: 20, width: 64, height: 18 },
      "right",
    );

    expect(visible.visible).toBe(true);
    expect(visible.text).toBe("右");
    expect(visible.width).toBeLessThanOrEqual(18);
    expect(visible.height).toBeLessThanOrEqual(13);
    expect(visible.x).toBeGreaterThan(10);
    expect(visible.y).toBeGreaterThan(20);

    const hidden = createHandBadgeLayout(
      { x: 10, y: 20, width: 18, height: 18 },
      "left",
    );

    expect(hidden.visible).toBe(false);
    expect(hidden.text).toBe("左");
  });
});
