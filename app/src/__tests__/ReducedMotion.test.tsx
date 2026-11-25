import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MotionConfig, motion } from "framer-motion";

describe("Reduced Motion Accessibility (#795)", () => {
  it("renders motion components with MotionConfig reducedMotion='user'", () => {
    render(
      <MotionConfig reducedMotion="user">
        <motion.div animate={{ opacity: 1 }} data-testid="motion-el">
          Animated text
        </motion.div>
      </MotionConfig>
    );
    expect(screen.getByTestId("motion-el")).toBeInTheDocument();
  });

  it("renders motion components with MotionConfig reducedMotion='always'", () => {
    render(
      <MotionConfig reducedMotion="always">
        <motion.div animate={{ opacity: 1 }} data-testid="motion-el-always">
          Static text
        </motion.div>
      </MotionConfig>
    );
    expect(screen.getByTestId("motion-el-always")).toBeInTheDocument();
  });
});
