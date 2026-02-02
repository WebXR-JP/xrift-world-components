import { Component, ReactNode } from "react";

interface VideoErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
  onError?: (error: Error) => void;
}

interface VideoErrorBoundaryState {
  hasError: boolean;
}

/** エラー境界：子コンポーネントでエラーが発生した場合にfallbackを表示 */
export class VideoErrorBoundary extends Component<
  VideoErrorBoundaryProps,
  VideoErrorBoundaryState
> {
  constructor(props: VideoErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): VideoErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("Video load error:", error);
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
