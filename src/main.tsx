import { h, render, Component, ComponentChildren } from 'preact';
import { App } from './ui/App.tsx';
import './ui/styles/editor.css';

interface ErrorBoundaryProps {
  children: ComponentChildren;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  componentStack?: string;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info?: { componentStack?: string }) {
    console.error('KustomWeb caught an unhandled error:', error, info?.componentStack);
    if (info?.componentStack) {
      this.setState({ componentStack: info.componentStack });
    }
  }

  render() {
    if (this.state.hasError) {
      const stackLines = this.state.componentStack
        ? this.state.componentStack.trim().split('\n').slice(0, 8).join('\n')
        : '';

      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: '#121214',
          color: '#f0f0f4',
          fontFamily: 'sans-serif',
          padding: '24px',
          textAlign: 'center',
        }}>
          <h2 style={{ color: '#e53935', marginBottom: '12px' }}>An error occurred in KustomWeb</h2>
          <pre style={{
            backgroundColor: '#1c1c20',
            padding: '16px',
            borderRadius: '8px',
            maxWidth: '600px',
            overflowX: 'auto',
            fontSize: '12px',
            color: '#ff6b6b',
            marginBottom: '12px',
            textAlign: 'left',
          }}>
            {this.state.error?.message || 'Unknown error'}
          </pre>
          {stackLines && (
            <pre style={{
              backgroundColor: '#16161a',
              padding: '12px',
              borderRadius: '6px',
              maxWidth: '600px',
              overflowX: 'auto',
              fontSize: '11px',
              color: '#8e8e93',
              marginBottom: '16px',
              textAlign: 'left',
            }}>
              {stackLines}
            </pre>
          )}
          <button
            style={{
              padding: '8px 16px',
              backgroundColor: '#e53935',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
            onClick={() => window.location.reload()}
          >
            Reload Editor
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootEl = document.getElementById('app');
if (rootEl) {
  render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>,
    rootEl,
  );
}
