'use client';

import { Component, type ReactNode } from 'react';

interface BlockErrorBoundaryProps {
  children: ReactNode;
  blockType?: string;
}

interface BlockErrorBoundaryState {
  hasError: boolean;
}

/**
 * Isolates render failures to a single block so one broken block
 * does not crash the entire page.
 */
export class BlockErrorBoundary extends Component<BlockErrorBoundaryProps, BlockErrorBoundaryState> {
  constructor(props: BlockErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error(`[BlockRenderer] Error rendering block "${this.props.blockType}":`, error);
  }

  render() {
    if (this.state.hasError) {
      if (process.env.NODE_ENV !== 'production') {
        return (
          <div className="border-2 border-dashed border-red-500 bg-red-50 p-4 text-sm text-red-700">
            Error al renderizar el bloque: <code>{this.props.blockType}</code>
          </div>
        );
      }
      return null;
    }

    return this.props.children;
  }
}
