import type { Request, Response, NextFunction } from 'express';
import { AxiosError } from 'axios';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  console.error(err);

  if (err instanceof AxiosError) {
    const status = err.response?.status ?? 500;
    const data = err.response?.data;
    const message =
      (Array.isArray(data?.errors) ? data.errors[0] : null) ??
      data?.message ??
      err.message;
    res.status(status).json({ status: false, code: status, message, data: null });
    return;
  }

  if (err instanceof Error) {
    res.status(500).json({ status: false, code: 500, message: err.message, data: null });
    return;
  }

  res.status(500).json({ status: false, code: 500, message: 'Internal server error', data: null });
}
