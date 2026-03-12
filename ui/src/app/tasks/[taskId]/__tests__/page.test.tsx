import "@testing-library/jest-dom";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";

import TaskDetailPage from "../page";
import { getScoreClass } from "../utils";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useParams: () => ({ taskId: "1" }),
  useRouter: () => ({ push: jest.fn() }),
}));

// Mock next/link
jest.mock("next/link", () => {
  return function MockLink({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) {
    return <a href={href}>{children}</a>;
  };
});

// Mock useAuth
const mockGetAccessToken = jest.fn().mockResolvedValue("test-token");
const mockRedirectToLogin = jest.fn();
jest.mock("@/lib/auth", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "test@example.com" },
    getAccessToken: mockGetAccessToken,
    redirectToLogin: mockRedirectToLogin,
    loading: false,
  }),
}));

const mockTask = {
  id: 1,
  name: "Seafarer Batch Q1",
  template: "Maritime Screener",
  status: "paused",
  is_active: true,
  total_candidates: 3,
  processed_candidates: 1,
  avg_score: 75,
  created_at: "2026-03-01T10:00:00Z",
};

const mockCandidates = [
  {
    id: 1,
    name: "Alice Smith",
    phone: "+1234567890",
    call_status: "completed",
    ai_score: 90,
    strengths: ["STCW certified", "10 years experience"],
    red_flags: [],
    summary: "Excellent candidate with strong maritime background.",
    recording_url: null,
  },
  {
    id: 2,
    name: "Bob Jones",
    phone: "+0987654321",
    call_status: "ringing",
    ai_score: 70,
    strengths: ["Good communication"],
    red_flags: ["No GMDSS"],
    summary: "Decent candidate, missing some certifications.",
    recording_url: null,
  },
  {
    id: 3,
    name: "Carol Lee",
    phone: "+1122334455",
    call_status: "pending",
    ai_score: 50,
    strengths: [],
    red_flags: ["No experience", "Missing COC"],
    summary: "Needs more experience.",
    recording_url: null,
  },
];

function setupFetch(candidates = mockCandidates) {
  global.fetch = jest.fn().mockImplementation((url: string) => {
    if (String(url).includes("/candidates")) {
      return Promise.resolve({ ok: true, json: async () => candidates });
    }
    return Promise.resolve({ ok: true, json: async () => mockTask });
  });
}

describe("TaskDetailPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders stats row with correct counts", async () => {
    setupFetch();
    render(<TaskDetailPage />);

    await waitFor(() => {
      expect(screen.getByTestId("stats-row")).toBeInTheDocument();
    });

    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("Processed")).toBeInTheDocument();
    expect(screen.getByText("Score Avg")).toBeInTheDocument();
    expect(screen.getByText("High Scorers (85+)")).toBeInTheDocument();
    expect(screen.getByText("In Progress")).toBeInTheDocument();

    // Total = 3, Processed (completed) = 1, High Scorers (>=85) = 1, In Progress (ringing/connected) = 1
    const statValues = screen.getAllByText("1");
    expect(statValues.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders empty state when no candidates", async () => {
    setupFetch([]);
    render(<TaskDetailPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/no candidates yet/i)
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText(/start the task to begin screening/i)
    ).toBeInTheDocument();
  });

  it("applies green class for score >= 85", async () => {
    expect(getScoreClass(90)).toContain("text-green-600");
    expect(getScoreClass(85)).toContain("text-green-600");
  });

  it("applies yellow class for score 60-84", async () => {
    expect(getScoreClass(70)).toContain("text-yellow-600");
    expect(getScoreClass(60)).toContain("text-yellow-600");
    expect(getScoreClass(84)).toContain("text-yellow-600");
  });

  it("applies red class for score < 60", async () => {
    expect(getScoreClass(50)).toContain("text-red-600");
    expect(getScoreClass(0)).toContain("text-red-600");
  });

  it("score coloring renders correct class in DOM", async () => {
    setupFetch();
    render(<TaskDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    });

    // Score 90 → green (find the span, not any other element)
    const score90 = screen.getAllByText("90").find((el) => el.tagName === "SPAN");
    expect(score90).toHaveClass("text-green-600");

    // Score 70 → yellow (may also appear in Score Avg stat, find the span)
    const score70 = screen.getAllByText("70").find((el) => el.tagName === "SPAN");
    expect(score70).toHaveClass("text-yellow-600");

    // Score 50 → red
    const score50 = screen.getAllByText("50").find((el) => el.tagName === "SPAN");
    expect(score50).toHaveClass("text-red-600");
  });

  it("filter by call status hides non-matching rows", async () => {
    setupFetch();
    render(<TaskDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    });

    // All 3 candidates visible initially
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    expect(screen.getByText("Bob Jones")).toBeInTheDocument();
    expect(screen.getByText("Carol Lee")).toBeInTheDocument();

    // Filter to "completed" only
    const statusSelect = screen.getByRole("combobox", {
      name: /call status filter/i,
    });
    fireEvent.change(statusSelect, { target: { value: "completed" } });

    // Only Alice (completed) should be visible
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    expect(screen.queryByText("Bob Jones")).not.toBeInTheDocument();
    expect(screen.queryByText("Carol Lee")).not.toBeInTheDocument();
  });

  it("renders task name and header controls", async () => {
    setupFetch();
    render(<TaskDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Seafarer Batch Q1")).toBeInTheDocument();
    });

    expect(screen.getByRole("switch")).toBeInTheDocument();
    // status is 'paused' so Start button should show
    expect(screen.getByRole("button", { name: /start/i })).toBeInTheDocument();
  });

  it("Start button calls POST /api/v1/tasks/{id}/start", async () => {
    setupFetch();
    render(<TaskDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Seafarer Batch Q1")).toBeInTheDocument();
    });

    const startBtn = screen.getByRole("button", { name: /start/i });
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/v1/tasks/1/start",
        expect.objectContaining({ method: "POST" })
      );
    });
  });
});
