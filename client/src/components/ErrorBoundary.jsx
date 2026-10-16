import { Component } from 'react';
import { Notice } from './ui.jsx';

// A rendering error shows a recovery screen instead of a blank page.
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error) {
    console.error('[sales-lab] screen failed to render', error);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="auth">
        <div className="auth-card stack">
          <Notice kind="critical" title="This screen hit a problem">
            <p>Your saved work is not affected. Reload the page, or go back to the start.</p>
          </Notice>
          <div className="row">
            <button className="btn" onClick={() => window.location.reload()}>
              Reload
            </button>
            <a className="btn btn-secondary" href="/">
              Go to Home
            </a>
          </div>
        </div>
      </div>
    );
  }
}
