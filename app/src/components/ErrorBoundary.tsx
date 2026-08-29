"use client";

import { Component, ReactNode, ErrorInfo } from "react";
import { AlertTriangle, RefreshCw, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
  };

  toggleDetails = () => {
    this.setState((prevState) => ({ showDetails: !prevState.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      const { fallbackTitle } = this.props;
      const { error, errorInfo, showDetails } = this.state;

      return (
        <div
          role="alert"
          className="my-4 w-full rounded-2xl border border-red-500/20 bg-[#141414] p-6 shadow-xl backdrop-blur-md transition-all duration-200"
        >
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 border border-red-500/30 text-red-500 shadow-inner">
              <AlertTriangle className="h-7 w-7" />
            </div>

            <h3 className="mb-2 text-lg font-semibold text-white">
              {fallbackTitle ?? "Something went wrong"}
            </h3>

            <p className="mb-6 max-w-md text-sm text-[#A3A3A3]">
              An unexpected error occurred while loading this section. You can try again or expand details below for troubleshooting.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleRetry}
                className="flex items-center gap-2 rounded-full bg-[#D2045B] px-5 py-2 text-xs font-semibold text-white shadow-[0_4px_14px_rgba(210,4,91,0.4)] transition-all hover:bg-[#B8043F] hover:shadow-[0_6px_20px_rgba(210,4,91,0.6)] focus:outline-none"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Try Again
              </button>

              <button
                type="button"
                onClick={this.toggleDetails}
                className="flex items-center gap-1.5 rounded-full border border-[#2A2A2A] bg-[#1A1A1A] px-4 py-2 text-xs font-medium text-[#A3A3A3] transition-colors hover:border-[#885FA8] hover:text-white"
              >
                <AlertCircle className="h-3.5 w-3.5" />
                {showDetails ? "Hide Details" : "Show Details"}
                {showDetails ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>
            </div>

            {showDetails && (
              <div className="mt-5 w-full text-left">
                <div className="rounded-xl border border-red-500/20 bg-black/60 p-4 font-mono text-xs text-red-400">
                  <p className="font-semibold text-red-300">
                    {error ? error.toString() : "Unknown Error"}
                  </p>
                  {error?.stack && (
                    <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed text-red-300/80">
                      {error.stack}
                    </pre>
                  )}
                  {errorInfo?.componentStack && (
                    <div className="mt-3 border-t border-red-500/20 pt-2">
                      <p className="font-semibold text-red-400/90">Component Stack:</p>
                      <pre className="mt-1 max-h-36 overflow-auto whitespace-pre-wrap text-[10px] text-red-300/70">
                        {errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export { ErrorBoundary };
