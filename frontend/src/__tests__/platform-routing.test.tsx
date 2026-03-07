import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '@/App';

const AUTH_KEY = 'lunchbox.demo-auth';

describe('platform routing', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('redirects unauthenticated users to login', async () => {
    render(
      <MemoryRouter initialEntries={['/platform']}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByText('Log me in using these credentials')).toBeInTheDocument();
  });

  it('allows authenticated users to view the overview', async () => {
    localStorage.setItem(AUTH_KEY, 'true');

    render(
      <MemoryRouter initialEntries={['/platform']}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByText('Backups at a glance')).toBeInTheDocument();
  });

  it('routes to the databases page when authed', async () => {
    localStorage.setItem(AUTH_KEY, 'true');

    render(
      <MemoryRouter initialEntries={['/platform/databases']}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByText('Database inventory')).toBeInTheDocument();
  });
});
