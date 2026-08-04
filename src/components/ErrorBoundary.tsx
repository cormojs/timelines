import { Component, type ErrorInfo, type ReactNode } from "react";

type ErrorBoundaryProps = {
  children: ReactNode;
  name: string;
};

type ErrorBoundaryState = {
  error: Error | null;
};

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary: ${this.props.name}]`, error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="error-boundary-fallback">
          <span className="error-boundary-fallback__title">
            {this.props.name} crashed
          </span>
          <span className="error-boundary-fallback__message">
            {this.state.error.message}
          </span>
          <button
            className="settings-footer-button settings-create-button"
            style={{ marginTop: "8px" }}
            onClick={() => this.setState({ error: null })}
          >
            Reload panel
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
