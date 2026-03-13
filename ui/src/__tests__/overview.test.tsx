'use client';
import '@testing-library/jest-dom';

import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock SetupBanner to isolate overview page test
jest.mock('@/components/onboarding/SetupBanner', () => {
  return function MockSetupBanner() {
    return <div data-testid="setup-banner">SetupBanner</div>;
  };
});

jest.mock('next/link', () => {
  return function MockLink({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>;
  };
});

jest.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: null, provider: 'stack' }),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, asChild, ...props }: { children: React.ReactNode; asChild?: boolean; [key: string]: unknown }) => {
    if (asChild && React.isValidElement(children)) return children;
    return <button {...props}>{children}</button>;
  },
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('lucide-react', () => ({
  Star: () => <svg data-testid="star-icon" />,
}));

import OverviewPage from '@/app/overview/page';

describe('OverviewPage', () => {
  it('renders SetupBanner as the first element', () => {
    const { container } = render(<OverviewPage />);
    const banner = screen.getByTestId('setup-banner');
    expect(banner).toBeInTheDocument();
    // SetupBanner should be the first child of the fragment root
    expect(container.firstChild).toBe(banner);
  });

  it('renders welcome content after SetupBanner', () => {
    render(<OverviewPage />);
    expect(screen.getByTestId('setup-banner')).toBeInTheDocument();
    expect(screen.getByText(/welcome/i)).toBeInTheDocument();
  });

  it('renders navigation links to workflow and model-configurations', () => {
    render(<OverviewPage />);
    expect(screen.getByRole('link', { name: /go to agents/i })).toHaveAttribute('href', '/workflow');
    expect(screen.getByRole('link', { name: /configure models/i })).toHaveAttribute('href', '/model-configurations');
  });
});
