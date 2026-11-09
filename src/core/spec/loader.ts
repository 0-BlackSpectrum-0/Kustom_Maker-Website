// src/core/spec/loader.ts
import type {
  KustomSpec,
  ModulesSpec,
  EnumsSpec,
  DefaultsSpec,
  FunctionsSpec,
  ArchiveLayoutSpec,
  ProvenanceSpec,
} from './types.ts';

import modulesData from '../../../spec/modules.json' with { type: 'json' };
import enumsData from '../../../spec/enums.json' with { type: 'json' };
import defaultsData from '../../../spec/defaults.json' with { type: 'json' };
import functionsData from '../../../spec/functions.json' with { type: 'json' };
import archiveLayoutData from '../../../spec/archive-layout.json' with { type: 'json' };
import provenanceData from '../../../spec/provenance.json' with { type: 'json' };

export class SpecRegistry {
  private static instance: SpecRegistry;
  public readonly spec: KustomSpec;

  private constructor() {
    this.spec = {
      modules: modulesData as ModulesSpec,
      enums: enumsData as EnumsSpec,
      defaults: defaultsData as DefaultsSpec,
      functions: functionsData as FunctionsSpec,
      archiveLayout: archiveLayoutData as ArchiveLayoutSpec,
      provenance: provenanceData as ProvenanceSpec,
    };
  }

  public static getInstance(): SpecRegistry {
    if (!SpecRegistry.instance) {
      SpecRegistry.instance = new SpecRegistry();
    }
    return SpecRegistry.instance;
  }

  public getModuleSpec(moduleType: string) {
    return this.spec.modules[moduleType];
  }

  public getEnumValues(enumName: string): readonly string[] | undefined {
    return this.spec.enums[enumName];
  }

  public getDefault(propertyKey: string): unknown {
    return this.spec.defaults[propertyKey];
  }

  public getFunctionSpec(fnName: string) {
    return this.spec.functions[fnName.toLowerCase()];
  }
}

export function loadSpec(): KustomSpec {
  return SpecRegistry.getInstance().spec;
}
