import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AnalyticsDemographics from "@/components/AnalyticsDemographics";
import { DemographicsData } from "@/services/analyticsService";

const mockDemographics: DemographicsData = {
  age: [
    { range: "18-24", percentage: 38 },
    { range: "25-34", percentage: 42 },
  ],
  gender: [
    { category: "Female", percentage: 48 },
    { category: "Male", percentage: 46 },
  ],
  device: [
    { device: "Mobile App", percentage: 65 },
    { device: "Desktop / Web", percentage: 25 },
  ],
};

describe("AnalyticsDemographics Component (#403)", () => {
  it("renders listener demographics section title and metrics", () => {
    render(<AnalyticsDemographics data={mockDemographics} />);

    expect(screen.getByText("Listener Demographics Breakdown")).toBeInTheDocument();
    expect(screen.getByText("Age Distribution")).toBeInTheDocument();
    expect(screen.getByText("Gender Breakdown")).toBeInTheDocument();
    expect(screen.getByText("Listening Devices")).toBeInTheDocument();

    expect(screen.getByText("18-24 years")).toBeInTheDocument();
    expect(screen.getByText("38%")).toBeInTheDocument();
    expect(screen.getByText("Female")).toBeInTheDocument();
    expect(screen.getByText("48%")).toBeInTheDocument();
    expect(screen.getByText("Mobile App")).toBeInTheDocument();
    expect(screen.getByText("65%")).toBeInTheDocument();
  });

  it("returns null when no data is provided", () => {
    const { container } = render(<AnalyticsDemographics data={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });
});
