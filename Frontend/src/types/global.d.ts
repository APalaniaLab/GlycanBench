// Global type declarations for missing modules

declare module 'react-cytoscapejs' {
  import { Component } from 'react';
  
  interface CytoscapeComponentProps {
    elements: CytoscapeElement[];
    style?: React.CSSProperties;
    stylesheet?: CytoscapeStylesheet[];
    layout?: CytoscapeLayout;
    cy?: (cy: cytoscape.Core) => void;
    textureOnViewport?: boolean;
    pixelRatio?: string | number;
  }
  
  interface CytoscapeElement {
    data: Record<string, unknown>;
    position?: { x: number; y: number };
    group?: 'nodes' | 'edges';
  }
  
  interface CytoscapeStylesheet {
    selector: string;
    style: Record<string, unknown>;
  }
  
  interface CytoscapeLayout {
    name: string;
    [key: string]: unknown;
  }
  
  export default class CytoscapeComponent extends Component<CytoscapeComponentProps> {
    static normalizeElements(elements: CytoscapeElement[]): CytoscapeElement[];
  }
}

declare module 'prismjs' {
  interface PrismStatic {
    highlight: (text: string, grammar: Grammar, language: string) => string;
    highlightAll: () => void;
    languages: Record<string, Grammar>;
  }
  
  interface Grammar {
    [key: string]: unknown;
  }
  
  const Prism: PrismStatic;
  export default Prism;
}

declare module '3dmol' {
  export interface Component {
    addRepresentation(type: string, options?: Record<string, unknown>): void;
    autoView(): void;
  }
  
  export interface GLViewer {
    addModel(data: string, format: string): Component;
    setStyle(style: Record<string, unknown>, selection?: Record<string, unknown>): void;
    render(): void;
    zoomTo(): void;
    addSurface(type: unknown, options?: Record<string, unknown>): void;
    clear(): void;
    pngURI(): string;
  }
  
  export interface SurfaceTypeStatic {
    VDW: unknown;
  }
  
  export const SurfaceType: SurfaceTypeStatic;
  
  export function createViewer(element: HTMLElement, options?: Record<string, unknown>): GLViewer;
  
  export const GLViewer: {
    new (element: HTMLElement, options?: Record<string, unknown>): GLViewer;
  };
}

declare module 'ngl' {
  export interface Stage {
    loadFile(url: string, options?: Record<string, unknown>): Promise<Component>;
    handleResize(): void;
    dispose(): void;
  }
  
  export interface Component {
    addRepresentation(type: string, options?: Record<string, unknown>): void;
    autoView(): void;
  }
  
  export function autoLoad(url: string): Promise<Component>;
  
  export const Stage: {
    new (element: HTMLElement, options?: Record<string, unknown>): Stage;
  };
}

declare module 'chart.js/auto';

declare module 'react-zoom-pan-pinch' {
  export interface TransformWrapperProps {
    children: React.ReactNode | ((utils: TransformUtils) => React.ReactNode);
    initialScale?: number;
    minScale?: number;
    maxScale?: number;
    centerOnInit?: boolean;
    limitToBounds?: boolean;
  }
  
  export interface TransformUtils {
    zoomIn: (step?: number) => void;
    zoomOut: (step?: number) => void;
    resetTransform: () => void;
  }
  
  export interface TransformComponentProps {
    children: React.ReactNode;
    wrapperStyle?: React.CSSProperties;
    contentStyle?: React.CSSProperties;
  }
  
  export const TransformWrapper: React.ForwardRefExoticComponent<TransformWrapperProps & React.RefAttributes<HTMLDivElement>>;
  export const TransformComponent: React.FC<TransformComponentProps>;
}

// Extend global JSX namespace
declare global {
  namespace JSX {
    interface Element extends React.ReactElement<unknown, string | React.JSXElementConstructor<unknown>> {
      // Additional properties can be added here if needed
    }
  }
}