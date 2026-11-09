export type FormulaValue = string | number | boolean;

export type TokenType =
  | 'lit'
  | 'ident'
  | 'local'
  | 'op'
  | 'fn'
  | '('
  | ')'
  | ',';

export interface Token {
  type: TokenType;
  value: string;
  raw?: string;
  quoted?: boolean;
  start: number;
  end: number;
}

export type ASTNode =
  | LiteralNode
  | IdentifierNode
  | LocalVarNode
  | UnaryOpNode
  | BinaryOpNode
  | FunctionCallNode;

export interface LiteralNode {
  type: 'Literal';
  value: FormulaValue;
  raw?: string;
}

export interface IdentifierNode {
  type: 'Identifier';
  name: string;
}

export interface LocalVarNode {
  type: 'LocalVar';
  name: string;
}

export interface UnaryOpNode {
  type: 'UnaryOp';
  op: '-' | '+';
  argument: ASTNode;
}

export interface BinaryOpNode {
  type: 'BinaryOp';
  op: string; // '+', '-', '*', '/', '%', '^', '=', '!=', '>', '>=', '<', '<=', '~=', '&', '|'
  left: ASTNode;
  right: ASTNode;
}

export interface FunctionCallNode {
  type: 'FunctionCall';
  name: string;
  args: ASTNode[];
}

export interface SimForecastDay {
  day: number;
  min: number;
  max: number;
  cond: string;
  code: string;
}

export interface SimNotification {
  title: string;
  text: string;
  icon: string;
  app: string;
  pkg: string;
}

export interface SimState {
  now: Date;
  tz?: string;
  locale: string;
  darkmode: number; // 0 or 1
  darkwp: number; // 0 or 1
  rwidth: number;
  rheight: number;
  battery: {
    level: number;
    charging: boolean;
    temp: number;
    volt: number;
  };
  weather: {
    temp: number;
    unit: 'C' | 'F';
    cond: string;
    code: string;
    icon: string;
    humidity: number;
    wind: number;
    windUnit: string;
    windDir: string;
    clouds: number;
    uv: number;
    pressure: number;
    forecast: SimForecastDay[];
  };
  music: {
    state: 'PLAYING' | 'PAUSED' | 'STOPPED';
    title: string;
    artist: string;
    album: string;
    pos: number;
    len: number;
    cover: string;
    package: string;
    vol: number;
  };
  notifications: SimNotification[];
  astronomy: {
    sunrise: Date;
    sunset: Date;
    moonPhase: string;
    moonIllum: number;
    zodiac: string;
  };
  network: {
    wifi: boolean;
    ssid: string;
    sig: number;
    cell: string;
    ip: string;
  };
  resources: {
    mused: number; // MB
    mtot: number;
    sused: number; // GB
    stot: number;
  };
  fitness: {
    steps: number;
    dist: number;
    cal: number;
  };
  unread: {
    sms: number;
    calls: number;
    mail: number;
  };
  monet: {
    sysca1: string;
    sysca2: string;
    sysca3: string;
    syscn1: string;
    syscn2: string;
  };
  screen: {
    on: boolean;
    locked: boolean;
    land: boolean;
  };
  pkgname: string;
}

export type FormulaFunction = (args: FormulaValue[], ctx: FormulaContext) => FormulaValue;

export interface FormulaContext {
  sim: SimState;
  globals?: Record<string, { value?: unknown; formula?: string; toggles?: number }>;
  locals: Map<string, FormulaValue>;
  resolveGlobal?: (name: string, ctx: FormulaContext) => FormulaValue;
  evaluateExpression?: (expr: string, ctx: FormulaContext) => FormulaValue;
  functions?: Record<string, FormulaFunction>;
  warn?: (msg: string) => void;
  /** Stack depth for preventing infinite recursion */
  depth?: number;
}
