import * as React from 'react';

/**
 * Hook that asynchronously fires a callback before mount.
 *
 * @param callback - Function to call before mount.
 */
export const useMount = (callback: () => void) => {
  const mountRef = React.useRef(callback);
  mountRef.current = callback;
  React.useEffect(() => {
    mountRef.current?.();
  }, []);
};
