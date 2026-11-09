// src/core/spec/types.ts

export type PropType =
  | 'number'
  | 'percent'
  | 'angle'
  | 'text'
  | 'formula'
  | 'color'
  | 'enum'
  | 'font'
  | 'bitmap'
  | 'iconset'
  | 'icon';

export interface PropertySpec {
  key: string;
  type: PropType;
  default: unknown;
  enum?: string;
  desc: string;
}

export interface ModuleSpec {
  sections: Record<string, PropertySpec[]>;
}

export type ModulesSpec = Record<string, ModuleSpec>;

export type EnumsSpec = Record<string, readonly string[]>;

export type DefaultsSpec = Record<string, unknown>;

export interface FunctionSpec {
  tier: 'T1' | 'T2' | 'T3';
  desc: string;
  args: string[];
  returnType: string;
  provenance: string;
}

export type FunctionsSpec = Record<string, FunctionSpec>;

export interface ArchiveLayoutSpec {
  archiveType: string;
  compressionMethod: string;
  allowDirectoryEntries: boolean;
  entryOrder: string[];
  komponentEntryOrder: string[];
  thumbnail: {
    format: string;
    namingExtension: string;
    klwpDimensions: {
      portrait: [number, number];
      landscape: [number, number];
    };
    kwgtDimensions: {
      longEdge: number;
      aspectRule: string;
    };
    kompDimensions: {
      maxDimension: number;
    };
  };
  presetInfoFields: {
    generationOld: string[];
    generationNew: string[];
    defaultVersion: number;
    defaultRelease: number;
  };
  resourcePathPatterns: {
    providerPrefix: string;
    folders: string[];
    bitmapNaming: string;
    iconPackPair: [string, string];
    aliasPattern: string;
  };
}

export type ProvenanceSpec = Record<string, Record<string, string>>;

export interface KustomSpec {
  modules: ModulesSpec;
  enums: EnumsSpec;
  defaults: DefaultsSpec;
  functions: FunctionsSpec;
  archiveLayout: ArchiveLayoutSpec;
  provenance: ProvenanceSpec;
}
