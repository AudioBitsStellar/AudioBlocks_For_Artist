import { describe, it, expect, beforeEach, vi } from "vitest";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TeamPage from "@/app/dashboard/team/page";
import RoleProvider from "@/context/RoleContext";
import { clearAuditLog, getAuditLog, recordDeniedAttempt } from "@/services/auditLogService";
import {
  clearTeamRoster,
  getTeamRoster,
  inviteTeamMember,
  type WorkspaceOwner,
} from "@/services/teamService";

vi.mock("js-cookie", () => ({
  default: { get: vi.fn(() => undefined) },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const ADA: WorkspaceOwner = {
  id: "self",
  name: "Ada Artist",
  email: "ada@studio.com",
  role: "owner",
};

function renderAs(role: "owner" | "manager" | "viewer") {
  return render(
    <RoleProvider initialRole={role}>
      <TeamPage />
    </RoleProvider>
  );
}

/** Types the invite form and submits it. */
async function invite(email: string, name = "Bo") {
  await userEvent.type(screen.getByLabelText(/^name$/i), name);
  await userEvent.type(screen.getByLabelText(/^email$/i), email);
  await userEvent.click(screen.getByRole("button", { name: /send invite/i }));
}

describe("Team & staff page (#460)", () => {
  beforeEach(() => {
    localStorage.clear();
    clearTeamRoster();
    clearAuditLog();
  });

  it("shows the owner their seat budget and an empty roster", () => {
    renderAs("owner");

    expect(screen.getByRole("heading", { name: /team & staff/i })).toBeInTheDocument();
    expect(screen.getByTestId("seat-count")).toHaveTextContent("1 of 8 seats in use");
    expect(screen.getByRole("status", { name: /no one else has access/i })).toBeInTheDocument();
  });

  it("hides the invite form from staff roles and explains why", () => {
    renderAs("manager");

    expect(screen.queryByRole("button", { name: /send invite/i })).not.toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent(/managed by the workspace owner/i);
  });

  it("shows a viewer who has access, without any controls", () => {
    inviteTeamMember({ name: "Bo", email: "bo@studio.com", role: "viewer" }, ADA);

    renderAs("viewer");

    expect(screen.getByText("bo@studio.com")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /remove/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/role for bo@studio\.com/i)).not.toBeInTheDocument();
  });

  it("invites a manager, updates the seats, and writes the event to the log", async () => {
    renderAs("owner");
    await userEvent.selectOptions(screen.getByLabelText(/^role$/i), "manager");

    await invite("bo@studio.com");

    expect(await screen.findByText("bo@studio.com")).toBeInTheDocument();
    expect(screen.getByText("Invite pending")).toBeInTheDocument();
    expect(screen.getByTestId("seat-count")).toHaveTextContent("2 of 8");

    expect(getTeamRoster()[0]).toMatchObject({ email: "bo@studio.com", role: "manager" });
    expect(getAuditLog()[0]).toMatchObject({
      action: "member.invited",
      outcome: "success",
      targetName: "bo@studio.com",
    });
    expect(screen.getByRole("list", { name: "Team activity" }).textContent).toContain(
      "bo@studio.com"
    );
  });

  it("defaults an invite to the viewer role", async () => {
    renderAs("owner");
    expect(screen.getByLabelText(/^role$/i)).toHaveValue("viewer");

    await invite("cy@studio.com");

    await screen.findByText("cy@studio.com");
    expect(getTeamRoster()[0].role).toBe("viewer");
  });

  it("rejects a duplicate address without adding a row", async () => {
    renderAs("owner");
    await invite("bo@studio.com");
    await screen.findByText("bo@studio.com");

    await invite("bo@studio.com", "Bo Again");

    expect(await screen.findByRole("alert")).toHaveTextContent(/already on this team/i);
    expect(getTeamRoster()).toHaveLength(1);
  });

  it("changes a member's role from the table and records the switch", async () => {
    renderAs("owner");
    await invite("bo@studio.com");
    const row = await screen.findByRole("row", { name: /bo@studio\.com/i });

    await userEvent.selectOptions(
      within(row).getByLabelText(/role for bo@studio\.com/i),
      "manager"
    );

    // The badge is a span; the row's own role picker contains the same words.
    expect(await within(row).findByText("Manager", { selector: "span" })).toBeInTheDocument();
    expect(getAuditLog()[0]).toMatchObject({
      action: "member.role_changed",
      detail: "viewer -> manager",
    });
  });

  it("only removes a member after confirmation", async () => {
    renderAs("owner");
    await invite("bo@studio.com");
    const row = await screen.findByRole("row", { name: /bo@studio\.com/i });

    await userEvent.click(within(row).getByRole("button", { name: /remove/i }));
    const dialog = await screen.findByRole("dialog");
    expect(getTeamRoster()).toHaveLength(1);

    await userEvent.click(within(dialog).getByRole("button", { name: /keep access/i }));
    expect(dialog).not.toBeInTheDocument();
    expect(getTeamRoster()).toHaveLength(1);

    await userEvent.click(
      within(screen.getByRole("row", { name: /bo@studio\.com/i })).getByRole("button", {
        name: /remove/i,
      })
    );
    const secondDialog = await screen.findByRole("dialog");
    await userEvent.click(within(secondDialog).getByRole("button", { name: /^remove$/i }));

    expect(
      await screen.findByRole("status", { name: /no one else has access/i })
    ).toBeInTheDocument();
    expect(getTeamRoster()).toEqual([]);
    expect(getAuditLog()[0].action).toBe("member.invite_revoked");
  });
});

describe("Activity log panel (#461)", () => {
  beforeEach(() => {
    localStorage.clear();
    clearTeamRoster();
    clearAuditLog();
  });

  it("says so when nothing has happened yet", () => {
    renderAs("owner");

    expect(screen.getByText(/no matching events yet/i)).toBeInTheDocument();
  });

  it("filters to the blocked attempts only", async () => {
    renderAs("owner");
    await invite("bo@studio.com");
    act(() => {
      recordDeniedAttempt(
        { id: "m-1", name: "Bo Manager", role: "manager" },
        "member.removed",
        "ada@studio.com"
      );
    });

    const list = screen.getByRole("list", { name: "Team activity" });
    // The attempt is written straight to storage, outside React, so the panel
    // catches up on the subscription rather than in the same tick.
    await waitFor(() => expect(within(list).getAllByRole("listitem")).toHaveLength(2));

    await userEvent.selectOptions(screen.getByLabelText(/^result$/i), "denied");

    const rows = within(list).getAllByRole("listitem");
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toMatch(/denied/i);
  });

  it("filters out team events when looking at content activity", async () => {
    renderAs("owner");
    await invite("bo@studio.com");

    await userEvent.selectOptions(screen.getByLabelText(/^show$/i), "content");

    expect(screen.queryByRole("list", { name: "Team activity" })).not.toBeInTheDocument();
    expect(screen.getByText(/no matching events/i)).toBeInTheDocument();
  });

  it("exports the filtered rows as CSV", async () => {
    const createObjectURL = vi.fn(() => "blob:audioblocks-audit");
    const revokeObjectURL = vi.fn();
    Object.defineProperty(window.URL, "createObjectURL", {
      value: createObjectURL,
      configurable: true,
    });
    Object.defineProperty(window.URL, "revokeObjectURL", {
      value: revokeObjectURL,
      configurable: true,
    });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    renderAs("owner");
    await invite("bo@studio.com");

    await userEvent.click(screen.getByRole("button", { name: /export csv/i }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    clickSpy.mockRestore();
  });

  it("refuses to export an empty view", async () => {
    renderAs("owner");
    await userEvent.selectOptions(screen.getByLabelText(/^show$/i), "settings");

    await userEvent.click(screen.getByRole("button", { name: /export csv/i }));

    const { toast } = await import("sonner");
    expect(toast.error).toHaveBeenCalledWith("Nothing to export for this filter.");
  });
});
