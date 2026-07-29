export class CmsError extends Error {
  status: number;

  constructor(message: string, status: number = 500) {
    super(message);
    this.name = 'CmsError';
    this.status = status;
  }
}
