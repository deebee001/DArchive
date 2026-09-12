export interface InnerFileSpec {
  name: string;
  sizeBytes: number;
}

export interface FileSpecs {
  id?: string;
  name: string;
  sizeBytes: number;
  isLocked: boolean;
  password?: string;
  textContent: string;
  innerZipName?: string;
  innerFiles?: InnerFileSpec[];
  createdAt?: number;
  owner?: string;
}
