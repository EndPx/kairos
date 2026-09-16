'use client';

import {useEffect} from 'react';

const toolSources = [
  '//unpkg.com/react-grab/dist/index.global.js',
  '//unpkg.com/react-scan/dist/auto.global.js',
] as const;

export function DevTools() {
  useEffect(() => {
    const scripts = toolSources.map((source) => {
      const script = document.createElement('script');
      script.src = source;
      script.crossOrigin = 'anonymous';
      script.dataset.kairosDevTool = source;
      document.head.append(script);
      return script;
    });

    return () => {
      scripts.forEach((script) => script.remove());
    };
  }, []);

  return null;
}
