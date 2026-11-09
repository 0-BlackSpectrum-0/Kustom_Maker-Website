// src/core/validate/validator.ts
import type { Doc, Node, Prop } from '../model/types.ts';
import type { ValidationIssue, ValidationReport, ValidateOptions } from './types.ts';
import { SpecRegistry } from '../spec/loader.ts';
import { resolveKfile } from '../archive/resolver.ts';

const COLOR_REGEX = /^#([0-9a-fA-F]{8})$/;

export function validateDoc(doc: Doc, options: ValidateOptions = {}): ValidationReport {
  const issues: ValidationIssue[] = [];
  const spec = SpecRegistry.getInstance().spec;

  // 1. Validate preset_info
  const infoPath = '/preset_info';
  if (!doc.info.title) {
    issues.push({
      code: 'INFO_TITLE_MISSING',
      severity: 'warning',
      message: 'Preset title is missing',
      path: `${infoPath}/title`,
      fixerId: 'F-info-missing',
      fixable: true,
    });
  }

  if (doc.info.version === undefined) {
    issues.push({
      code: 'INFO_VERSION_MISSING',
      severity: 'error',
      message: 'Preset version is missing',
      path: `${infoPath}/version`,
      fixerId: 'F-info-missing',
      fixable: true,
    });
  }

  if (doc.info.release === undefined) {
    issues.push({
      code: 'INFO_RELEASE_MISSING',
      severity: 'warning',
      message: 'Preset release build number is missing',
      path: `${infoPath}/release`,
      fixerId: 'F-release',
      fixable: true,
    });
  }

  if (doc.info.width === undefined || doc.info.height === undefined) {
    issues.push({
      code: 'INFO_DIMS_MISSING',
      severity: 'error',
      message: 'Preset dimensions (width/height) are missing',
      path: infoPath,
      fixerId: 'F-info-dims',
      fixable: true,
    });
  }

  // 2. Validate globals
  for (const [gName, gDef] of Object.entries(doc.globals)) {
    const gPath = `/globals/${gName}`;
    const validGlobalTypes = spec.enums['globalType'] || ['COLOR', 'NUMBER', 'SWITCH', 'LIST', 'FONT', 'TEXT', 'BITMAP'];
    if (gDef.type && !validGlobalTypes.includes(gDef.type)) {
      issues.push({
        code: 'GLOBAL_TYPE_INVALID',
        severity: 'warning',
        message: `Global ${gName} has unknown type ${gDef.type}`,
        path: `${gPath}/type`,
      });
    }
  }

  // 3. Validate modules
  function validateNode(node: Node, pathStr: string) {
    const modSpec = spec.modules[node.type];
    if (!modSpec) {
      issues.push({
        code: 'MODULE_TYPE_UNKNOWN',
        severity: 'info',
        message: `Module type ${node.type} is not in standard spec`,
        path: pathStr,
      });
    }

    // Property specs map for this module type
    const propSpecMap = new Map<string, { type: string; enum?: string; default: unknown }>();
    if (modSpec) {
      for (const section of Object.values(modSpec.sections)) {
        for (const p of section) {
          propSpecMap.set(p.key, p);
        }
      }
    }

    for (const [propKey, prop] of Object.entries(node.props)) {
      const propPath = `${pathStr}/props/${propKey}`;
      const pDef = propSpecMap.get(propKey);

      // Check toggle consistency
      if (prop.toggle === 10) {
        if (!prop.formula) {
          issues.push({
            code: 'TOGGLE_ORPHAN_FORMULA',
            severity: 'warning',
            message: `Property ${propKey} has toggle 10 (formula) but formula is missing`,
            path: propPath,
            fixerId: 'F-toggle-orphan',
            fixable: true,
          });
        }
      } else if (prop.toggle === 100) {
        if (!prop.global) {
          issues.push({
            code: 'TOGGLE_ORPHAN_GLOBAL',
            severity: 'warning',
            message: `Property ${propKey} has toggle 100 (global) but global reference is missing`,
            path: propPath,
            fixerId: 'F-toggle-orphan',
            fixable: true,
          });
        }
      }

      // Check literal value validity
      if (prop.value !== undefined && pDef) {
        if (pDef.type === 'color' && typeof prop.value === 'string') {
          if (!COLOR_REGEX.test(prop.value)) {
            issues.push({
              code: 'COLOR_FORMAT_INVALID',
              severity: 'warning',
              message: `Color property ${propKey} = "${prop.value}" does not match #AARRGGBB format`,
              path: propPath,
              fixerId: 'F-color-format',
              fixable: true,
            });
          }
        } else if (pDef.type === 'enum' && pDef.enum && typeof prop.value === 'string') {
          const validValues = spec.enums[pDef.enum];
          if (validValues && !validValues.includes(prop.value)) {
            issues.push({
              code: 'ENUM_INVALID',
              severity: 'warning',
              message: `Enum property ${propKey} = "${prop.value}" is not valid in enum ${pDef.enum}`,
              path: propPath,
              fixerId: 'F-enum-invalid',
              fixable: true,
            });
          }
        } else if (
          (pDef.type === 'number' || pDef.type === 'percent' || pDef.type === 'angle') &&
          typeof prop.value === 'number'
        ) {
          if (!Number.isFinite(prop.value)) {
            issues.push({
              code: 'NUMBER_INVALID',
              severity: 'error',
              message: `Number property ${propKey} is not finite`,
              path: propPath,
            });
          }
        }
      }

      // Check kfile resource resolution
      if (typeof prop.value === 'string' && prop.value.startsWith('kfile://')) {
        const resolved = resolveKfile(prop.value, doc.assets);
        if (resolved.status === 'missing') {
          issues.push({
            code: 'RESOURCE_MISSING',
            severity: 'warning',
            message: `Referenced resource missing in archive: ${prop.value}`,
            path: propPath,
            fixerId: 'F-asset-missing',
            fixable: true,
          });
        }
      }
    }

    if (node.children) {
      for (let i = 0; i < node.children.length; i++) {
        validateNode(node.children[i], `${pathStr}/children/${i}`);
      }
    }
  }

  validateNode(doc.root, '/preset_root');

  let errors = 0;
  let warnings = 0;

  for (const issue of issues) {
    if (issue.severity === 'error') errors++;
    if (issue.severity === 'warning') warnings++;
  }

  return {
    valid: errors === 0,
    errors,
    warnings,
    issues,
  };
}
