import React from 'react';

interface Props {
    children: React.ReactNode;
    name?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('🔴 ErrorBoundary caught error in:', this.props.name || 'Unknown');
        console.error('🔴 Error:', error);
        console.error('🔴 Error message:', error.message);
        console.error('🔴 Component stack:', errorInfo.componentStack);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-4 bg-red-100 border border-red-400 rounded-lg m-4">
                    <h2 className="text-red-700 font-bold text-lg">
                        Error in: {this.props.name || 'Component'}
                    </h2>
                    <pre className="text-red-600 text-sm mt-2 whitespace-pre-wrap">
                        {this.state.error?.toString()}
                    </pre>
                    <details className="mt-4">
                        <summary className="cursor-pointer text-red-700">Component Stack</summary>
                        <pre className="text-red-600 text-xs mt-2 whitespace-pre-wrap">
                            {this.state.errorInfo?.componentStack}
                        </pre>
                    </details>
                    <button
                        onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                        Try Again
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
