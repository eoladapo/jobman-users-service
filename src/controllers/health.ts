import { StatusCodes } from 'http-status-codes';
import { Request, Response } from 'express';

export const health = (_req: Request, res: Response): void => {
  res.status(StatusCodes.OK).send('User service is healthy and OK.');
};
