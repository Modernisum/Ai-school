import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default class ChartErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Chart Rendering Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="my-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-200">
          <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-semibold mb-1">Chart Rendering Error</h4>
            <p className="text-xs opacity-80 leading-relaxed">
              The AI generated a chart format that could not be rendered. 
              Please rely on the data table above or ask the AI to reformat the data.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
