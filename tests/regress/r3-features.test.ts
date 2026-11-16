import { describe, it, expect, beforeEach } from 'vitest';
import {
  currentDoc,
  canvasTarget,
  setTargetSize,
  toggleOrientation,
  targetOrientation,
  simState,
  commit,
  createDefaultDoc,
  formulaDialogState,
} from '../../src/ui/state/editor-state.ts';
import { evalFormula } from '../../src/core/formula/index.ts';
import { setProp } from '../../src/core/model/edit.ts';

describe('Phase R3: Restored features, targets, sim controls, and immutable edits', () => {
  beforeEach(() => {
    currentDoc.value = createDefaultDoc();
  });

  it('D-N3: setTargetSize correctly calculates dimensions and preserves orientation', () => {
    setTargetSize(300, 400, 'custom');
    expect(canvasTarget.value.w).toBe(300);
    expect(canvasTarget.value.h).toBe(400);

    toggleOrientation();
    expect(targetOrientation.value).toBe('landscape');
    expect(canvasTarget.value.w).toBe(400);
    expect(canvasTarget.value.h).toBe(300);

    // Switching back
    toggleOrientation();
    expect(targetOrientation.value).toBe('portrait');
    expect(canvasTarget.value.w).toBe(300);
    expect(canvasTarget.value.h).toBe(400);
  });

  it('D-N3: Sim state updates affect formula evaluation in live preview', () => {
    const doc = currentDoc.value!;
    simState.value = {
      ...simState.value,
      battery: { ...simState.value.battery, level: 42 },
      darkmode: 1,
    };

    const batteryResult = evalFormula('$bi(level)$', simState.value, doc.globals);
    expect(batteryResult).toBe(42);

    const darkResult = evalFormula('$si(dark)$', simState.value, doc.globals);
    expect(darkResult).toBe(1);
  });

  it('D01: Metadata updates commit immutably without mutating previous history doc', () => {
    const docBefore = currentDoc.value!;
    const originalTitle = docBefore.info.title;

    const nextDoc = {
      ...docBefore,
      info: {
        ...docBefore.info,
        title: 'New Immutable Title',
      },
    };
    commit(nextDoc, 'Update title');

    expect(currentDoc.value?.info.title).toBe('New Immutable Title');
    expect(docBefore.info.title).toBe(originalTitle); // Not mutated in place!
  });

  it('D13: Formula dialog state can be opened and applied', () => {
    const doc = currentDoc.value!;
    formulaDialogState.value = {
      open: true,
      nodeId: 'clock',
      propKey: 'text_expression',
      formula: '$df(HH:mm)$',
    };

    expect(formulaDialogState.value.open).toBe(true);
    expect(formulaDialogState.value.formula).toBe('$df(HH:mm)$');

    // Apply
    const nextDoc = setProp(doc, 'clock', 'text_expression', {
      formula: formulaDialogState.value.formula,
    });
    commit(nextDoc, 'Apply formula');

    expect(currentDoc.value?.root.children?.[1]?.props.text_expression?.formula).toBe('$df(HH:mm)$');
  });
});
