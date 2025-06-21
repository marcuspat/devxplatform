import { render, screen } from '@testing-library/react';
import { Hero } from '../hero';

describe('Hero Component', () => {
  it('renders hero heading', () => {
    render(<Hero />);
    const heading = screen.getByRole('heading', { name: /build faster with next\.js/i });
    expect(heading).toBeInTheDocument();
  });

  it('renders get started button', () => {
    render(<Hero />);
    const button = screen.getByRole('link', { name: /get started/i });
    expect(button).toBeInTheDocument();
  });

  it('renders github link', () => {
    render(<Hero />);
    const githubLink = screen.getByRole('link', { name: /view on github/i });
    expect(githubLink).toBeInTheDocument();
  });
});