import { Request, Response, NextFunction } from "express";

export interface AppError extends Error {
  statusCode?: number;
  details?: any;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  
  console.error(`[Error] ${statusCode} - ${message}`);
  if (err.details) {
    console.error(`[Error Details]`, err.details);
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    details: err.details || null,
  });
};
