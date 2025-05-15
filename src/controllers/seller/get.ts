import { StatusCodes } from 'http-status-codes';
import { ISellerDocument } from '@eoladapo/jobman-shared';
import { getRandomSellers, getSellerById, getSellerByUsername } from '@users/services/seller.service';
import { Request, Response } from 'express';

const id = async (req: Request, res: Response): Promise<void> => {
  const seller: ISellerDocument | null = await getSellerById(req.params.sellerId);
  res.status(StatusCodes.OK).json({ message: 'Seller profile', seller });
};

const username = async (req: Request, res: Response): Promise<void> => {
  const seller: ISellerDocument | null = await getSellerByUsername(req.params.username);
  res.status(StatusCodes.OK).json({ message: 'Seller profile', seller });
};

const randomSellers = async (req: Request, res: Response): Promise<void> => {
  const sellers: ISellerDocument[] = await getRandomSellers(parseInt(req.params.size, 10));
  res.status(StatusCodes.OK).json({ message: 'Seller profile', sellers });
};

export { id, username, randomSellers };
