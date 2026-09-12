export interface FileSpecs {
  name: string;
  sizeBytes: number;
  isLocked: boolean;
  password?: string;
  textContent: string;
  createdAt?: number;
}
