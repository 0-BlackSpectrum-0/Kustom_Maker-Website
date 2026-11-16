// tests/integration/v2-edit-roundtrip.test.ts
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { readPresetArchive } from '../../src/core/archive/reader.ts';
import { writePresetArchive } from '../../src/core/archive/writer.ts';
import { validateDoc } from '../../src/core/validate/validator.ts';
import {
  currentDoc,
  setDoc,
  addNode,
  updateNodeProp,
  undo,
  redo,
  createOfficialNode,
  findNodeById,
} from '../../src/ui/state/editor-state.ts';

describe('V2 Gate: Edit Round-Trip Through UI Actions', () => {
  const samplePath = path.resolve('samples/_src/kwgt-widgets/widgets/Clean_Time_Date_Info.kwgt');

  it('performs full edit, undo, redo, export, and re-read cycle losslessly', async () => {
    expect(fs.existsSync(samplePath)).toBe(true);
    const bytes = fs.readFileSync(samplePath);
    const initialDoc = readPresetArchive(bytes, { fileName: 'Clean_Time_Date_Info.kwgt' });

    setDoc(initialDoc);
    const initialCount = initialDoc.root.children?.length ?? 0;

    // Action 1: Add a new Shape module via official template
    const newShape = createOfficialNode('ShapeModule');
    newShape.title = 'TestAddedShape';
    addNode(currentDoc.value!.root, newShape);

    expect(currentDoc.value?.root.children?.length).toBe(initialCount + 1);
    const addedNode = findNodeById(currentDoc.value!.root, newShape.id);
    expect(addedNode).toBeDefined();

    // Action 2: Update property on the newly added shape
    updateNodeProp(newShape.id, 'shape_width', { value: 350 });
    updateNodeProp(newShape.id, 'shape_height', { value: 150 });

    const updatedShape = findNodeById(currentDoc.value!.root, newShape.id);
    expect(updatedShape?.props.shape_width?.value).toBe(350);
    expect(updatedShape?.props.shape_height?.value).toBe(150);

    // Action 3: Mutate property on an existing node
    const firstChild = currentDoc.value!.root.children![0];
    updateNodeProp(firstChild.id, 'position_offset_x', { value: 42 });

    const updatedChild = findNodeById(currentDoc.value!.root, firstChild.id);
    expect(updatedChild?.props.position_offset_x?.value).toBe(42);

    // Action 4: Test Undo
    undo();
    const afterUndoChild = findNodeById(currentDoc.value!.root, firstChild.id);
    expect(afterUndoChild?.props.position_offset_x?.value).not.toBe(42);

    // Action 5: Test Redo
    redo();
    const afterRedoChild = findNodeById(currentDoc.value!.root, firstChild.id);
    expect(afterRedoChild?.props.position_offset_x?.value).toBe(42);

    // Action 6: Export edited doc
    const exportedBytes = writePresetArchive(currentDoc.value!);
    expect(exportedBytes.length).toBeGreaterThan(0);

    // Action 7: Re-read exported bytes
    const reReadDoc = readPresetArchive(exportedBytes, { fileName: 'Clean_Time_Date_Info.kwgt' });

    // Assert edits persisted into exported archive
    expect(reReadDoc.root.children?.length).toBe(initialCount + 1);
    const reReadAdded = reReadDoc.root.children?.find((c) => c.title === 'TestAddedShape');
    expect(reReadAdded).toBeDefined();
    expect(reReadAdded?.title).toBe('TestAddedShape');
    expect(reReadAdded?.props.shape_width?.value).toBe(350);
    expect(reReadAdded?.props.shape_height?.value).toBe(150);

    const reReadUpdated = reReadDoc.root.children![0];
    expect(reReadUpdated?.props.position_offset_x?.value).toBe(42);

    // Action 8: Validate exported doc schema
    const report = validateDoc(reReadDoc);
    const errors = report.issues.filter((i) => i.severity === 'error');
    expect(errors.length).toBe(0);
  });
});
