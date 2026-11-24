import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { USE_MOCK } from '@/api/config';
import '../../design/tokens/themes.css';
import './styles/base.css';

async function start() {
  if (USE_MOCK) {
    const { worker } = await import('./mocks/browser');
    await worker.start({
      onUnhandledRequest: 'bypass',
      serviceWorker: { url: '/mockServiceWorker.js' },
    });
  }
  const root = document.getElementById('root');
  if (!root) throw new Error('Root element not found');
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void start();
