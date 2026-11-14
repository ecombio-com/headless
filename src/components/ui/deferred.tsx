'use client';
// Renders a value that may still be loading (a promise passed from a Server Component).
// React 19 pattern: Suspense + use(), with an error fallback so one failed section never breaks the page.
import {Component, Suspense, use, type ReactNode} from 'react';

class Boundary extends Component<{fallback: ReactNode; children: ReactNode}, {failed: boolean}> {
  state = {failed: false};
  static getDerivedStateFromError() {
    return {failed: true};
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function Resolve<T>({value, children}: {value: T | Promise<T>; children: (v: T) => ReactNode}) {
  const resolved = value instanceof Promise ? use(value) : value;
  return <>{children(resolved)}</>;
}

export function Deferred<T>({
  value,
  fallback = null,
  errorFallback = null,
  children,
}: {
  value: T | Promise<T>;
  fallback?: ReactNode;
  errorFallback?: ReactNode;
  children: (value: T) => ReactNode;
}) {
  return (
    <Boundary fallback={errorFallback}>
      <Suspense fallback={fallback}>
        <Resolve value={value}>{children}</Resolve>
      </Suspense>
    </Boundary>
  );
}
