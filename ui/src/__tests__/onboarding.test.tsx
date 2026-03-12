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

  // Step 3 tests
  it('step 3 renders SIP Domain, SIP Username, SIP Password inputs', () => {
    render(<OnboardingPage />);
    fireEvent.click(screen.getByRole('button', { name: /get started/i }));
    fireEvent.click(screen.getByText(/skip for now/i));

    expect(screen.getByLabelText('SIP Domain')).toBeInTheDocument();
    expect(screen.getByLabelText('SIP Username')).toBeInTheDocument();
    expect(screen.getByLabelText('SIP Password')).toBeInTheDocument();
  });

  it('step 3 Save button calls POST /api/v1/organizations/telephony-config', async () => {
    render(<OnboardingPage />);
    fireEvent.click(screen.getByRole('button', { name: /get started/i }));
    fireEvent.click(screen.getByText(/skip for now/i));

    fireEvent.change(screen.getByLabelText('SIP Domain'), { target: { value: 'test.vobiz.ai' } });
    fireEvent.change(screen.getByLabelText('SIP Username'), { target: { value: 'user123' } });
    fireEvent.change(screen.getByLabelText('SIP Password'), { target: { value: 'pass123' } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await screen.findByText(/talk to your maritime screener/i);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/v1/organizations/telephony-config',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('step 3 has a skip link that advances to step 4', () => {
    render(<OnboardingPage />);
    fireEvent.click(screen.getByRole('button', { name: /get started/i }));
    fireEvent.click(screen.getByText(/skip for now/i));

    // Now on step 3 — click skip again
    fireEvent.click(screen.getByText(/skip for now/i));
    expect(screen.getByText(/talk to your maritime screener/i)).toBeInTheDocument();
  });

  it('step 3 Back button returns to step 2', () => {
    render(<OnboardingPage />);
    fireEvent.click(screen.getByRole('button', { name: /get started/i }));
    fireEvent.click(screen.getByText(/skip for now/i));
    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(screen.getByText(/ai services/i)).toBeInTheDocument();
  });

  // Step 4 tests
  it('step 4 renders title Talk to your Maritime Screener and disabled Start Call when no workflow', () => {
    render(<OnboardingPage />);
    fireEvent.click(screen.getByRole('button', { name: /get started/i }));
    fireEvent.click(screen.getByText(/skip for now/i));
    fireEvent.click(screen.getByText(/skip for now/i));

    expect(screen.getByText(/talk to your maritime screener/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /no agent configured yet/i })).toBeDisabled();
  });

  it('step 4 renders Start Call link when workflow is found', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [{ id: 'wf-abc', name: 'Maritime Screener' }],
    });

    render(<OnboardingPage />);
    fireEvent.click(screen.getByRole('button', { name: /get started/i }));
    fireEvent.click(screen.getByText(/skip for now/i));
    fireEvent.click(screen.getByText(/skip for now/i));

    const link = await screen.findByRole('link', { name: /start call/i });
    expect(link).toHaveAttribute('href', '/workflow/wf-abc/run/new');
  });

  it('step 4 has a Skip for now link that advances to step 5', () => {
    render(<OnboardingPage />);
    fireEvent.click(screen.getByRole('button', { name: /get started/i }));
    fireEvent.click(screen.getByText(/skip for now/i));
    fireEvent.click(screen.getByText(/skip for now/i));
    fireEvent.click(screen.getByText(/skip for now/i));

    expect(screen.getByText(/you are ready to screen seafarers/i)).toBeInTheDocument();
  });

  it('step 4 Back button returns to step 3', () => {
    render(<OnboardingPage />);
    fireEvent.click(screen.getByRole('button', { name: /get started/i }));
    fireEvent.click(screen.getByText(/skip for now/i));
    fireEvent.click(screen.getByText(/skip for now/i));
    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(screen.getByText(/telephony/i)).toBeInTheDocument();
  });

  // Step 5 tests
  it('step 5 renders title You are ready to screen seafarers!', () => {
    render(<OnboardingPage />);
    fireEvent.click(screen.getByRole('button', { name: /get started/i }));
    fireEvent.click(screen.getByText(/skip for now/i));
    fireEvent.click(screen.getByText(/skip for now/i));
    fireEvent.click(screen.getByText(/skip for now/i));

    expect(screen.getByText(/you are ready to screen seafarers!/i)).toBeInTheDocument();
  });

  it('step 5 has Create First Task link to /tasks/new', () => {
    render(<OnboardingPage />);
    fireEvent.click(screen.getByRole('button', { name: /get started/i }));
    fireEvent.click(screen.getByText(/skip for now/i));
    fireEvent.click(screen.getByText(/skip for now/i));
    fireEvent.click(screen.getByText(/skip for now/i));

    const link = screen.getByRole('link', { name: /create first task/i });
    expect(link).toHaveAttribute('href', '/tasks/new');
  });

  it('step 5 has Go to Dashboard link to /overview', () => {
    render(<OnboardingPage />);
    fireEvent.click(screen.getByRole('button', { name: /get started/i }));
    fireEvent.click(screen.getByText(/skip for now/i));
    fireEvent.click(screen.getByText(/skip for now/i));
    fireEvent.click(screen.getByText(/skip for now/i));

    const link = screen.getByRole('link', { name: /go to dashboard/i });
    expect(link).toHaveAttribute('href', '/overview');
  });
});
