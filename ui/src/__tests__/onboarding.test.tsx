'use client';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import OnboardingPage from '@/app/onboarding/page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

// Mock next/link
jest.mock('next/link', () => {
  return function MockLink({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>;
  };
});

// Mock fetch
global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) });

describe('OnboardingPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders step 1 with welcome title and Get Started button', () => {
    render(<OnboardingPage />);
    expect(screen.getByText('Welcome to Sorch AI')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /get started/i })).toBeInTheDocument();
  });

  it('step 1 bullet points mention Hindi/Hinglish, 0-100 scoring, and Google Sheets', () => {
    render(<OnboardingPage />);
    expect(screen.getByText(/hindi\/hinglish/i)).toBeInTheDocument();
    expect(screen.getByText(/0.?100/i)).toBeInTheDocument();
    expect(screen.getByText(/google sheet/i)).toBeInTheDocument();
  });

  it('clicking Get Started advances to step 2', () => {
    render(<OnboardingPage />);
    fireEvent.click(screen.getByRole('button', { name: /get started/i }));
    expect(screen.getByText(/ai services/i)).toBeInTheDocument();
  });

  it('step 2 renders two password inputs for OpenAI and Sarvam API keys', () => {
    render(<OnboardingPage />);
    fireEvent.click(screen.getByRole('button', { name: /get started/i }));
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    expect(passwordInputs).toHaveLength(2);
  });

  it('step 2 has a skip link that advances to step 3', () => {
    render(<OnboardingPage />);
    fireEvent.click(screen.getByRole('button', { name: /get started/i }));
    const skipButton = screen.getByText(/skip for now/i);
    expect(skipButton).toBeInTheDocument();
    fireEvent.click(skipButton);
    expect(screen.getByText(/telephony/i)).toBeInTheDocument();
  });

  it('step 2 Save button calls POST /api/v1/user/service-keys', async () => {
    render(<OnboardingPage />);
    fireEvent.click(screen.getByRole('button', { name: /get started/i }));

    const [openaiInput, sarvamInput] = document.querySelectorAll('input[type="password"]');
    fireEvent.change(openaiInput, { target: { value: 'sk-test-key' } });
    fireEvent.change(sarvamInput, { target: { value: 'sarvam-test-key' } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await screen.findByText(/telephony/i);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/v1/user/service-keys',
      expect.objectContaining({ method: 'POST' })
    );
  });
});
