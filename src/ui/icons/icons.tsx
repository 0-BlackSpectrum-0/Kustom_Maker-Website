import { h, VNode } from 'preact';

interface IconProps {
  size?: number;
  class?: string;
  color?: string;
}

export function MenuIcon({ size = 20, class: cls = '' }: IconProps): VNode {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={cls}>
      <line x1="3" y1="12" x2="21" y2="12"></line>
      <line x1="3" y1="6" x2="21" y2="6"></line>
      <line x1="3" y1="18" x2="21" y2="18"></line>
    </svg>
  );
}

export function SaveIcon({ size = 20, class: cls = '' }: IconProps): VNode {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={cls}>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
      <polyline points="17 21 17 13 7 13 7 21"></polyline>
      <polyline points="7 3 7 8 15 8"></polyline>
    </svg>
  );
}

export function UndoIcon({ size = 20, class: cls = '' }: IconProps): VNode {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={cls}>
      <path d="M3 7v6h6"></path>
      <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path>
    </svg>
  );
}

export function RedoIcon({ size = 20, class: cls = '' }: IconProps): VNode {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={cls}>
      <path d="M21 7v6h-6"></path>
      <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"></path>
    </svg>
  );
}

export function AddIcon({ size = 20, class: cls = '' }: IconProps): VNode {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class={cls}>
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  );
}

export function LockIcon({ size = 18, class: cls = '' }: IconProps): VNode {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={cls}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
    </svg>
  );
}

export function UnlockIcon({ size = 18, class: cls = '' }: IconProps): VNode {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={cls}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
      <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
    </svg>
  );
}

export function EyeIcon({ size = 18, class: cls = '' }: IconProps): VNode {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={cls}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>
  );
}

export function EyeOffIcon({ size = 18, class: cls = '' }: IconProps): VNode {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={cls}>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
      <line x1="1" y1="1" x2="23" y2="23"></line>
    </svg>
  );
}

export function DragHandleIcon({ size = 16, class: cls = '' }: IconProps): VNode {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" class={cls}>
      <circle cx="9" cy="6" r="2"></circle>
      <circle cx="9" cy="12" r="2"></circle>
      <circle cx="9" cy="18" r="2"></circle>
      <circle cx="15" cy="6" r="2"></circle>
      <circle cx="15" cy="12" r="2"></circle>
      <circle cx="15" cy="18" r="2"></circle>
    </svg>
  );
}

export function TrashIcon({ size = 16, class: cls = '' }: IconProps): VNode {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={cls}>
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>
  );
}

export function CopyIcon({ size = 16, class: cls = '' }: IconProps): VNode {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={cls}>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
  );
}

export function LayersIcon({ size = 18, class: cls = '' }: IconProps): VNode {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={cls}>
      <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
      <polyline points="2 17 12 22 22 17"></polyline>
      <polyline points="2 12 12 17 22 12"></polyline>
    </svg>
  );
}

export function PlayIcon({ size = 18, class: cls = '' }: IconProps): VNode {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" class={cls}>
      <polygon points="5 3 19 12 5 21 5 3"></polygon>
    </svg>
  );
}

export function PauseIcon({ size = 18, class: cls = '' }: IconProps): VNode {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" class={cls}>
      <rect x="6" y="4" width="4" height="16"></rect>
      <rect x="14" y="4" width="4" height="16"></rect>
    </svg>
  );
}

export function FitFrameIcon({ size = 18, class: cls = '' }: IconProps): VNode {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={cls}>
      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
    </svg>
  );
}

export function ScreenIcon({ size = 18, class: cls = '' }: IconProps): VNode {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={cls}>
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
      <line x1="8" y1="21" x2="16" y2="21"></line>
      <line x1="12" y1="17" x2="12" y2="21"></line>
    </svg>
  );
}

export function ChevronRightIcon({ size = 16, class: cls = '' }: IconProps): VNode {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={cls}>
      <polyline points="9 18 15 12 9 6"></polyline>
    </svg>
  );
}

export function ChevronDownIcon({ size = 16, class: cls = '' }: IconProps): VNode {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={cls}>
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  );
}

export function CalculatorIcon({ size = 16, class: cls = '' }: IconProps): VNode {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={cls}>
      <rect x="4" y="2" width="16" height="20" rx="2"></rect>
      <line x1="8" y1="6" x2="16" y2="6"></line>
      <line x1="16" y1="14" x2="16" y2="14.01"></line>
      <line x1="12" y1="14" x2="12" y2="14.01"></line>
      <line x1="8" y1="14" x2="8" y2="14.01"></line>
      <line x1="16" y1="18" x2="16" y2="18.01"></line>
      <line x1="12" y1="18" x2="12" y2="18.01"></line>
      <line x1="8" y1="18" x2="8" y2="18.01"></line>
    </svg>
  );
}

export function GlobalIcon({ size = 16, class: cls = '' }: IconProps): VNode {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={cls}>
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="2" y1="12" x2="22" y2="12"></line>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
    </svg>
  );
}

export function CloseIcon({ size = 18, class: cls = '' }: IconProps): VNode {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={cls}>
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}

// Module Type Icons (Matching Official App)
export function TextModuleIcon({ size = 20, class: cls = '' }: IconProps): VNode {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" class={cls}>
      <text x="2" y="18" font-family="sans-serif" font-size="16" font-weight="bold">A</text>
      <text x="13" y="18" font-family="sans-serif" font-size="12">A</text>
    </svg>
  );
}

export function ShapeModuleIcon({ size = 20, class: cls = '' }: IconProps): VNode {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" class={cls}>
      <rect x="3" y="3" width="9" height="9" rx="1"></rect>
      <circle cx="18" cy="7.5" r="4.5"></circle>
      <polygon points="7.5 15 3 22 12 22"></polygon>
      <text x="15" y="21" font-size="10" font-weight="bold">+</text>
    </svg>
  );
}

export function ImageModuleIcon({ size = 20, class: cls = '' }: IconProps): VNode {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={cls}>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
      <circle cx="8.5" cy="8.5" r="1.5"></circle>
      <polyline points="21 15 16 10 5 21"></polyline>
    </svg>
  );
}

export function FontIconModuleIcon({ size = 20, class: cls = '' }: IconProps): VNode {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" class={cls}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
    </svg>
  );
}

export function ProgressModuleIcon({ size = 20, class: cls = '' }: IconProps): VNode {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class={cls}>
      <circle cx="12" cy="12" r="9" stroke-dasharray="35 25"></circle>
      <circle cx="12" cy="12" r="3" fill="currentColor"></circle>
    </svg>
  );
}

export function CurvedTextModuleIcon({ size = 20, class: cls = '' }: IconProps): VNode {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" class={cls}>
      <text x="8" y="19" font-family="serif" font-size="20" font-style="italic" font-weight="bold">I</text>
    </svg>
  );
}

export function SeriesModuleIcon({ size = 20, class: cls = '' }: IconProps): VNode {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={cls}>
      <line x1="10" y1="6" x2="21" y2="6"></line>
      <line x1="10" y1="12" x2="21" y2="12"></line>
      <line x1="10" y1="18" x2="21" y2="18"></line>
      <text x="3" y="7" font-size="6" fill="currentColor" stroke="none">1</text>
      <text x="3" y="13" font-size="6" fill="currentColor" stroke="none">2</text>
      <text x="3" y="19" font-size="6" fill="currentColor" stroke="none">3</text>
    </svg>
  );
}

export function OverlapLayerModuleIcon({ size = 20, class: cls = '' }: IconProps): VNode {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={cls}>
      <rect x="7" y="7" width="14" height="14" rx="2"></rect>
      <path d="M3 17V5a2 2 0 0 1 2-2h12"></path>
    </svg>
  );
}

export function StackLayerModuleIcon({ size = 20, class: cls = '' }: IconProps): VNode {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={cls}>
      <rect x="4" y="4" width="16" height="4" rx="1"></rect>
      <rect x="4" y="10" width="16" height="4" rx="1"></rect>
      <rect x="4" y="16" width="16" height="4" rx="1"></rect>
    </svg>
  );
}

export function KomponentModuleIcon({ size = 20, class: cls = '' }: IconProps): VNode {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={cls}>
      <rect x="3" y="3" width="18" height="18" rx="2"></rect>
      <line x1="3" y1="9" x2="21" y2="9"></line>
      <line x1="9" y1="21" x2="9" y2="9"></line>
    </svg>
  );
}

export function AnimatedImageModuleIcon({ size = 20, class: cls = '' }: IconProps): VNode {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={cls}>
      <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
      <line x1="7" y1="2" x2="7" y2="22"></line>
      <line x1="17" y1="2" x2="17" y2="22"></line>
      <line x1="2" y1="12" x2="22" y2="12"></line>
      <line x1="2" y1="7" x2="7" y2="7"></line>
      <line x1="2" y1="17" x2="7" y2="17"></line>
      <line x1="17" y1="17" x2="22" y2="17"></line>
      <line x1="17" y1="7" x2="22" y2="7"></line>
    </svg>
  );
}
