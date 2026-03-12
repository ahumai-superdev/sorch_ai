import "@testing-library/jest-dom";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";

import NewTaskPage from "../page";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("next/link", () => {
  return function MockLink({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>;
  };
});

const mockGetAccessToken = jest.fn().mockResolvedValue("test-token");
jest.mock("@/lib/auth", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "test@example.com" },
    getAccessToken: mockGetAccessToken,
    redirectToLogin: jest.fn(),
    loading: false,
  }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn();
});

describe("NewTaskPage", () => {
  it("renders Maritime Screener card on step 1", () => {
    render(<NewTaskPage />);
    expect(screen.getByTestId("maritime-screener-card")).toBeInTheDocument();
    expect(screen.getByText("Maritime Screener")).toBeInTheDocument();
    expect(screen.getByText(/AI-powered Hindi\/Hinglish/)).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 3")).toBeInTheDocument();
  });

  it("clicking Next on step 1 advances to step 2", () => {
    render(<NewTaskPage />);
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText("Step 2 of 3")).toBeInTheDocument();
    expect(screen.getByText("CSV Upload")).toBeInTheDocument();
    expect(screen.getByText("CV Upload")).toBeInTheDocument();
  });

  it("step 2 CSV tab shows sample format with phone_number and name columns", () => {
    render(<NewTaskPage />);
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText("phone_number")).toBeInTheDocument();
    expect(screen.getByText("name")).toBeInTheDocument();
  });

  it("step 2 CV tab shows drag-drop zone with max 50 files note", () => {
    render(<NewTaskPage />);
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.click(screen.getByRole("tab", { name: /CV Upload/i }));
    // Radix Tabs renders all content; cv-dropzone may be hidden but present in DOM
    expect(screen.getByTestId("cv-dropzone")).toBeInTheDocument();
    expect(screen.getByText(/Max 50 files/)).toBeInTheDocument();
    expect(screen.getByText(/CV parsing coming soon/)).toBeInTheDocument();
  });

  it("step 3 shows task name input, custom instructions, and maritime vocab hints", () => {
    render(<NewTaskPage />);
    // advance to step 2
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    // advance to step 3
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText("Step 3 of 3")).toBeInTheDocument();
    expect(screen.getByLabelText(/Task Name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Custom Instructions/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Maritime Vocabulary Hints/)).toBeInTheDocument();
  });

  it("submit button is disabled when task name is empty", () => {
    render(<NewTaskPage />);
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    const submitBtn = screen.getByRole("button", { name: /create task/i });
    expect(submitBtn).toBeDisabled();
  });

  it("submit button is enabled when task name is filled", () => {
    render(<NewTaskPage />);
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.change(screen.getByLabelText(/Task Name/), { target: { value: "Test Task" } });
    const submitBtn = screen.getByRole("button", { name: /create task/i });
    expect(submitBtn).not.toBeDisabled();
  });

  it("on successful submit navigates to /tasks/{id}", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ id: "task-42" }),
    });
    render(<NewTaskPage />);
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.change(screen.getByLabelText(/Task Name/), { target: { value: "My Task" } });
    fireEvent.click(screen.getByRole("button", { name: /create task/i }));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/tasks/task-42"));
  });

  it("Back button on step 2 returns to step 1", () => {
    render(<NewTaskPage />);
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(screen.getByText("Step 1 of 3")).toBeInTheDocument();
    expect(screen.getByTestId("maritime-screener-card")).toBeInTheDocument();
  });
});
