export interface FileSpecs {
  id?: string;
  name: string;
  sizeBytes: number;
  isLocked: boolean;
  password?: string;
  textContent: string;
  createdAt?: number;
  owner?: string;
}
