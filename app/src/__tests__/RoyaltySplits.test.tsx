import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import RoyaltySplitsPage from "@/app/dashboard/collaborators/royalties/page";
import { resetRoyaltySplits } from "@/services/royaltySplitService";

const VALID_SECRET_KEY = "SAAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQC5MY";

beforeEach(() => {
  resetRoyaltySplits();
  localStorage.clear();
});

describe("RoyaltySplitsPage (#417)", () => {
  it("seeds the form with the release's collaborators", () => {
    render(<RoyaltySplitsPage />);

    expect(screen.getByDisplayValue("Jaden Cole")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Mara Voss")).toBeInTheDocument();
    expect(screen.getByText("Total: 0%")).toBeInTheDocument();
  });

  it("rebalances to exactly 100% when a share is increased", () => {
    render(<RoyaltySplitsPage />);

    fireEvent.click(screen.getByRole("button", { name: /Increase Jaden Cole share by 5%/ }));

    expect(screen.getByText("Total: 100%")).toBeInTheDocument();
    expect(screen.getByText("5%")).toBeInTheDocument();
    expect(screen.getByText("95%")).toBeInTheDocument();
  });

  it("splits evenly on demand", () => {
    render(<RoyaltySplitsPage />);

    fireEvent.click(screen.getByRole("button", { name: "Split evenly" }));

    expect(screen.getByText("Total: 100%")).toBeInTheDocument();
    expect(screen.getAllByText("50%")).toHaveLength(2);
  });

  it("disables saving and explains the problem while the split is unbalanced", () => {
    render(<RoyaltySplitsPage />);

    expect(screen.getByRole("button", { name: /Save split for/ })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent(/greater than 0/i);
    expect(localStorage.getItem("audioblocks:royalty-splits:v1")).toBeNull();
  });

  it("saves a valid split and keeps it in localStorage", () => {
    render(<RoyaltySplitsPage />);

    fireEvent.click(screen.getByRole("button", { name: "Split evenly" }));
    fireEvent.click(screen.getByRole("button", { name: /Save split for/ }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(localStorage.getItem("audioblocks:royalty-splits:v1")).toContain("Jaden Cole");
  });

  it("adds and removes collaborator rows", () => {
    render(<RoyaltySplitsPage />);

    fireEvent.click(screen.getByRole("button", { name: "Add collaborator" }));
    expect(screen.getAllByLabelText("Collaborator name")).toHaveLength(3);

    fireEvent.click(screen.getByRole("button", { name: /Remove Mara Voss from the split/ }));
    expect(screen.getAllByLabelText("Collaborator name")).toHaveLength(2);
  });

  it("rejects duplicate recipients and invalid/secret addresses inline (#590, #591)", () => {
    render(<RoyaltySplitsPage />);

    fireEvent.click(screen.getByRole("button", { name: "Split evenly" }));

    const jadenAddressInput = screen.getByLabelText(
      "Stellar address for Jaden Cole"
    ) as HTMLInputElement;
    const maraAddressInput = screen.getByLabelText(
      "Stellar address for Mara Voss"
    ) as HTMLInputElement;

    // Duplicate recipient
    fireEvent.change(maraAddressInput, { target: { value: jadenAddressInput.value } });
    expect(screen.getByRole("alert")).toHaveTextContent(/Duplicate recipient/i);

    // Pasting a secret key warns inline and clears the value so it is not stored
    fireEvent.change(maraAddressInput, { target: { value: VALID_SECRET_KEY } });
    expect(maraAddressInput.value).toBe("");
    expect(
      screen.getAllByRole("alert").some((el) => /secret key/i.test(el.textContent ?? ""))
    ).toBe(true);
  });
});
