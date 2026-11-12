import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RotateCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

const CHUNK_RELOAD_KEY = "vyhbz_chunk_reload_ts";

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary caught an unhandled error]", error, errorInfo);

    // Auto-recover from stale dynamic import chunks across deployments
    const isChunkError =
      /loading chunk|dynamically imported module|failed to fetch/i.test(
        error.message || "",
      );

    if (isChunkError && typeof window !== "undefined") {
      const lastReload = sessionStorage.getItem(CHUNK_RELOAD_KEY);
      const now = Date.now();
      if (!lastReload || now - parseInt(lastReload, 10) > 15000) {
        sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now));
        window.location.reload();
      }
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[#F5F5FA] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xl max-w-md w-full p-6 text-center space-y-4">
            <div className="w-14 h-14 bg-rose-50 text-[#7B1E3D] rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-bold text-gray-900">
                Something went wrong
              </h2>
              <p className="text-sm text-gray-600">
                An unexpected error occurred while loading this page. Please reload to continue.
              </p>
            </div>

            {this.state.error && (
              <div className="text-left bg-gray-50 rounded-lg p-3 border border-gray-100 max-h-28 overflow-y-auto">
                <p className="text-xs font-mono text-gray-700 break-words">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#7B1E3D] text-white font-semibold text-sm hover:bg-[#922549] transition cursor-pointer shadow-sm"
              >
                <RotateCw className="w-4 h-4" />
                Reload Page
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-50 transition cursor-pointer"
              >
                <Home className="w-4 h-4" />
                Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
