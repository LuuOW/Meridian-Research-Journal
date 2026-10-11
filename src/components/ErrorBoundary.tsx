import React, { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  declare state: State;
  declare props: Props;
  declare setState: (state: Partial<State> | ((prevState: State) => Partial<State>)) => void;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: any) {
    console.error("[ErrorBoundary] Caught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-neutral-950 text-white font-sans">
          <div className="max-w-md w-full p-6 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-4 text-center">
            <h2 className="text-base font-bold text-red-400">Meridian Journal Safe Mode</h2>
            <p className="text-xs text-neutral-400">
              {this.state.error?.message || "An unexpected issue was caught and contained."}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-4 py-2 bg-white text-black text-xs font-bold rounded-xl hover:bg-neutral-200 transition-colors cursor-pointer"
            >
              Reload Journal
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
