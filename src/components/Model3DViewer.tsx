'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * 3D Model Viewer component using Google's <model-viewer> web component.
 * Loads from CDN (no npm dependency needed).
 *
 * Supported formats: USDZ, GLB, glTF
 * Features: rotate, zoom, pan, AR (iOS QuickLook + Android SceneViewer)
 */

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src: string;
          alt?: string;
          poster?: string;
          'camera-controls'?: boolean | string;
          'auto-rotate'?: boolean | string;
          'ar'?: boolean | string;
          'ar-modes'?: string;
          'shadow-intensity'?: string;
          'exposure'?: string;
          'environment-image'?: string;
          'interaction-prompt'?: string;
          'interaction-prompt-style'?: string;
          'min-camera-orbit'?: string;
          'max-camera-orbit'?: string;
          'camera-orbit'?: string;
          'field-of-view'?: string;
          style?: React.CSSProperties;
          ref?: React.Ref<HTMLElement>;
        },
        HTMLElement
      >;
    }
  }
}

interface Model3DViewerProps {
  src: string;
  poster?: string;
  alt?: string;
  autoRotate?: boolean;
  ar?: boolean;
  height?: string | number;
  width?: string | number;
  className?: string;
  onLoad?: () => void;
  onError?: (error: string) => void;
}

const MODEL_VIEWER_VERSION = '3.5.0';
const MODEL_VIEWER_CDN = `https://ajax.googleapis.com/ajax/libs/model-viewer/${MODEL_VIEWER_VERSION}/model-viewer.min.js`;

let scriptLoaded = false;
let scriptLoading: Promise<void> | null = null;

function loadModelViewerScript(): Promise<void> {
  if (scriptLoaded) return Promise.resolve();
  if (scriptLoading) return scriptLoading;

  scriptLoading = new Promise<void>((resolve, reject) => {
    // Check if already loaded
    if (customElements.get('model-viewer')) {
      scriptLoaded = true;
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.type = 'module';
    script.src = MODEL_VIEWER_CDN;
    script.onload = () => {
      scriptLoaded = true;
      resolve();
    };
    script.onerror = () => {
      scriptLoading = null;
      reject(new Error('Failed to load model-viewer from CDN'));
    };
    document.head.appendChild(script);
  });

  return scriptLoading;
}

export function Model3DViewer({
  src,
  poster,
  alt = '3D Model',
  autoRotate = true,
  ar = true,
  height = 400,
  width = '100%',
  className,
  onLoad,
  onError,
}: Model3DViewerProps) {
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const viewerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    loadModelViewerScript()
      .then(() => setIsReady(true))
      .catch((err) => setLoadError(err.message));
  }, []);

  // Listen for model-viewer events
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !isReady) return;

    const handleLoad = () => {
      setIsModelLoading(false);
      onLoad?.();
    };

    const handleError = (e: Event) => {
      setIsModelLoading(false);
      const detail = (e as CustomEvent)?.detail || 'Failed to load 3D model';
      const msg = typeof detail === 'string' ? detail : 'Unknown error';
      setLoadError(msg);
      onError?.(msg);
    };

    viewer.addEventListener('load', handleLoad);
    viewer.addEventListener('error', handleError);

    return () => {
      viewer.removeEventListener('load', handleLoad);
      viewer.removeEventListener('error', handleError);
    };
  }, [isReady, onLoad, onError]);

  if (loadError) {
    return (
      <div
        style={{
          height,
          width,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f5f5f5',
          borderRadius: 12,
          flexDirection: 'column',
          gap: 8,
        }}
        className={className}
      >
        <span style={{ fontSize: 32 }}>⚠️</span>
        <span style={{ color: '#666', fontSize: 14 }}>{loadError}</span>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div
        style={{
          height,
          width,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f5f5f5',
          borderRadius: 12,
        }}
        className={className}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 32,
              height: 32,
              border: '3px solid #ddd',
              borderTopColor: '#b8860b',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 8px',
            }}
          />
          <span style={{ color: '#999', fontSize: 13 }}>Loading 3D Viewer...</span>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div
      style={{
        height,
        width,
        position: 'relative',
        background: '#1a1a1a',
        borderRadius: 12,
        overflow: 'hidden',
      }}
      className={className}
    >
      {isModelLoading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#1a1a1a',
            zIndex: 1,
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: 36,
                height: 36,
                border: '3px solid #444',
                borderTopColor: '#b8860b',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto 8px',
              }}
            />
            <span style={{ color: '#ccc', fontSize: 13 }}>Loading 3D Model...</span>
          </div>
        </div>
      )}

      <model-viewer
        ref={viewerRef}
        src={src}
        alt={alt}
        poster={poster}
        camera-controls
        auto-rotate={autoRotate}
        ar={ar}
        ar-modes="webxr scene-viewer quick-look"
        shadow-intensity="1"
        exposure="1"
        environment-image="neutral"
        interaction-prompt="auto"
        interaction-prompt-style="wiggle"
        style={{
          width: '100%',
          height: '100%',
          display: isModelLoading ? 'none' : 'block',
        }}
      />
    </div>
  );
}

/**
 * Compact 3D thumbnail card for listings — shows a small 3D badge.
 */
export function ThreeDBadge({ className }: { className?: string }) {
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        fontSize: 10,
        fontWeight: 700,
        color: '#fff',
        background: 'rgba(196, 162, 85, 0.85)',
        padding: '2px 7px',
        borderRadius: 999,
        lineHeight: 1.2,
      }}
    >
      <svg
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        style={{ display: 'block' }}
      >
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
      3D
    </span>
  );
}
