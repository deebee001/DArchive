export interface InnerFileSpec {
  name: string;
  sizeBytes: number;
  type?: 'file' | 'folder';
}

export interface FileSpecs {
  id?: string;
  name: string;
  sizeBytes: number;
  isLocked: boolean;
  password?: string;
  includeReadme?: boolean;
  textContent: string;
  innerZipName?: string;
  innerFiles?: InnerFileSpec[];
  createdAt?: number;
  owner?: string;
}
