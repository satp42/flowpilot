
interface XESAttribute {
  key: string;
  value: string | number | Date | boolean;
}

export interface XESEvent {
  attributes: XESAttribute[];
}

export interface XESTrace {
  attributes: XESAttribute[]; 
  events: XESEvent[];
}

export interface XESLog {
  attributes: XESAttribute[]; 
  extensions?: { name: string; prefix: string; uri: string }[];
  classifiers?: { name: string; keys: string }[];
  globalEventAttributes?: XESAttribute[];
  globalTraceAttributes?: XESAttribute[];
  traces: XESTrace[];
}

export enum XESConceptExtension {
  NAME = "concept:name",
}

export enum XESTimeExtension {
  TIMESTAMP = "time:timestamp",
}

export enum XESLifecycleExtension {
  TRANSITION = "lifecycle:transition",
}
