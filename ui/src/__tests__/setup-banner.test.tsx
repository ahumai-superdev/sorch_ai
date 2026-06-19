'use client';
import '@testing-library/jest-dom';

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import SetupBanner from '@/components/onboarding/SetupBanner';

jest.mock('next/link', () => {
  return function MockLink({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>;
  };
});

const mockFetch = (isComplete: boolean) => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ ai_services: true, telephony: true, is_complete: isComplete }),
  });
};

describe('SetupBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('renders banner when is_complete is false and not dismissed', async () => {
    mockFetch(false);
    render(<SetupBanner />);
    expect(
      await screen.findByText('Complete your setup to start screening seafarers')
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /finish setup/i })).toHaveAttribute(
      'href',
      '/onboarding'
    );
  });

  it('renders nothing when is_complete is true', async () => {
    mockFetch(true);
    render(<SetupBanner />);
    // Wait briefly for fetch to resolve, then assert nothing rendered
    await new Promise((r) => setTimeout(r, 50));
    expect(
      screen.queryByText('Complete your setup to start screening seafarers')
    ).not.toBeInTheDocument();
  });

  it('renders nothing when localStorage key sorch_setup_banner_dismissed is set', async () => {
    localStorage.setItem('sorch_setup_banner_dismissed', '1');
    mockFetch(false);
    render(<SetupBanner />);
    await new Promise((r) => setTimeout(r, 50));
    expect(
      screen.queryByText('Complete your setup to start screening seafarers')
    ).not.toBeInTheDocument();
  });

  it('clicking X button hides banner and sets localStorage', async () => {
    mockFetch(false);
    render(<SetupBanner />);
    await screen.findByText('Complete your setup to start screening seafarers');

    const dismissBtn = screen.getByRole('button');
    fireEvent.click(dismissBtn);

    expect(
      screen.queryByText('Complete your setup to start screening seafarers')
    ).not.toBeInTheDocument();
    expect(localStorage.getItem('sorch_setup_banner_dismissed')).toBe('1');
  });
});
