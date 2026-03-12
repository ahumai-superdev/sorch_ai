import "@testing-library/jest-dom";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";

import TasksPage from "../page";

// Mock next/navigation
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock next/link
jest.mock("next/link", () => {
  return function MockLink({ children, href }: { children: React.ReactNode; href: string }) {
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

const mockTasks = [
  {
    id: 1,
    name: "Seafarer Batch Q1",
    template: "Maritime Screener",
    status: "running",
    total_candidates: 50,
    processed_candidates: 20,
    avg_score: 78,
    is_active: true,
    created_at: "2026-03-01T10:00:00Z",
  },
  {
    id: 2,
    name: "Engineer Screening",
    template: "Maritime Screener",
    status: "paused",
    total_candidates: 30,
    processed_candidates: 30,
    avg_score: 91,
    is_active: false,
    created_at: "2026-03-05T12:00:00Z",
  },
];

describe("TasksPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders empty state when no tasks exist", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    render(<TasksPage />);

    await waitFor(() => {
      expect(screen.getByText(/no tasks yet/i)).toBeInTheDocument();
    });

    expect(
      screen.getByText(/create your first maritime screening task/i)
    ).toBeInTheDocument();
  });

  it("renders table rows when tasks are present", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockTasks,
    });

    render(<TasksPage />);

    await waitFor(() => {
      expect(screen.getByText("Seafarer Batch Q1")).toBeInTheDocument();
    });

    expect(screen.getByText("Engineer Screening")).toBeInTheDocument();
    expect(screen.getByText("Task Name")).toBeInTheDocument();
    expect(screen.getByText("Template")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Total Candidates")).toBeInTheDocument();
    expect(screen.getByText("Processed")).toBeInTheDocument();
    expect(screen.getByText("Score Avg")).toBeInTheDocument();
    expect(screen.getByText("Created At")).toBeInTheDocument();
  });

  it("New Task button links to /tasks/new", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    render(<TasksPage />);

    await waitFor(() => {
      expect(screen.getByText(/no tasks yet/i)).toBeInTheDocument();
    });

    const newTaskLinks = screen.getAllByRole("link", { name: /new task/i });
    expect(newTaskLinks.length).toBeGreaterThan(0);
    expect(newTaskLinks[0]).toHaveAttribute("href", "/tasks/new");
  });

  it("clicking a row navigates to /tasks/{id}", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockTasks,
    });

    render(<TasksPage />);

    await waitFor(() => {
      expect(screen.getByText("Seafarer Batch Q1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Seafarer Batch Q1").closest("tr")!);
    expect(mockPush).toHaveBeenCalledWith("/tasks/1");
  });

  it("Switch toggle calls PATCH /api/v1/tasks/{id}/toggle", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => mockTasks })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    render(<TasksPage />);

    await waitFor(() => {
      expect(screen.getByText("Seafarer Batch Q1")).toBeInTheDocument();
    });

    const switches = screen.getAllByRole("switch");
    fireEvent.click(switches[0]);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/v1/tasks/1/toggle",
        expect.objectContaining({ method: "PATCH" })
      );
    });
  });
});
