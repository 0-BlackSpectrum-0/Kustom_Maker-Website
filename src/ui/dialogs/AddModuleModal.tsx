import { h, VNode } from 'preact';
import {
  KomponentModuleIcon,
  TextModuleIcon,
  ShapeModuleIcon,
  ImageModuleIcon,
  FontIconModuleIcon,
  ProgressModuleIcon,
  CurvedTextModuleIcon,
  SeriesModuleIcon,
  OverlapLayerModuleIcon,
  StackLayerModuleIcon,
  AnimatedImageModuleIcon,
  CloseIcon,
} from '../icons/icons.tsx';
import {
  addModuleModalOpen,
  addOfficialModule,
} from '../state/editor-state.ts';

interface ModuleOption {
  type: string;
  title: string;
  desc: string;
  icon: (props: { size?: number; class?: string }) => VNode;
}

const MODULE_OPTIONS: ModuleOption[] = [
  {
    type: 'KomponentModule',
    title: 'Komponent',
    desc: 'Add a prebuilt reusable component (Signal indicators, battery icons...) or create your own',
    icon: KomponentModuleIcon,
  },
  {
    type: 'TextModule',
    title: 'Text',
    desc: 'This item allows you to enter any text, you can either choose from a list of examples or create your own string using a lot of available functions',
    icon: TextModuleIcon,
  },
  {
    type: 'ShapeModule',
    title: 'Shape',
    desc: 'Create a rectangle, a circle etc and fill them with colors, gradients and more',
    icon: ShapeModuleIcon,
  },
  {
    type: 'BitmapModule',
    title: 'Image',
    desc: 'A simple object holding a static picture',
    icon: ImageModuleIcon,
  },
  {
    type: 'FontIconModule',
    title: 'Icon',
    desc: 'Scalable, vector based, icons from different packs',
    icon: FontIconModuleIcon,
  },
  {
    type: 'ProgressModule',
    title: 'Progress',
    desc: 'Create progress bars with different styles, shapes and colors',
    icon: ProgressModuleIcon,
  },
  {
    type: 'CurvedTextModule',
    title: 'Morphing Text',
    desc: 'Single line text with many different transformations like curving and flipping',
    icon: CurvedTextModuleIcon,
  },
  {
    type: 'SeriesModule',
    title: 'Series',
    desc: 'Customizable series for dates, time, battery and more with multiple style configurations',
    icon: SeriesModuleIcon,
  },
  {
    type: 'OverlapLayerModule',
    title: 'Overlap Group',
    desc: 'A container for other objects that supports transformations and allows item grouping and supports gravity.',
    icon: OverlapLayerModuleIcon,
  },
  {
    type: 'StackLayerModule',
    title: 'Stack Group',
    desc: 'A container for other objects that allows items to be stacked horizontally and vertically.',
    icon: StackLayerModuleIcon,
  },
  {
    type: 'AnimatedImageModule',
    title: 'Animated Image',
    desc: 'A simple object holding a animated picture (eg GIFs)',
    icon: AnimatedImageModuleIcon,
  },
];

export function AddModuleModal() {
  if (!addModuleModalOpen.value) return null;

  const handleSelect = (type: string) => {
    addOfficialModule(type);
    addModuleModalOpen.value = false;
  };

  return (
    <div class="modal-backdrop" onClick={() => (addModuleModalOpen.value = false)}>
      <div class="add-module-modal" onClick={(e) => e.stopPropagation()}>
        <div class="add-module-header">
          <div class="add-module-title">New Item</div>
          <button
            class="icon-btn"
            title="Close"
            onClick={() => (addModuleModalOpen.value = false)}
          >
            <CloseIcon size={20} />
          </button>
        </div>
        <div class="add-module-grid">
          {MODULE_OPTIONS.map((opt) => {
            const IconComp = opt.icon;
            return (
              <div
                key={opt.type}
                class="module-card"
                onClick={() => handleSelect(opt.type)}
              >
                <div class="module-card-icon">
                  <IconComp size={28} />
                </div>
                <div class="module-card-content">
                  <div class="module-card-title">{opt.title}</div>
                  <div class="module-card-desc">{opt.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
