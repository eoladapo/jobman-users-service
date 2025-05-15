import { StatusCodes } from 'http-status-codes';
import { BadRequestError, ISellerDocument } from '@eoladapo/jobman-shared';
import { sellerSchema } from '@users/schemes/seller';
import { createSeller, getSellerByEmail } from '@users/services/seller.service';
import { Request, Response } from 'express';

const seller = async (req: Request, res: Response) => {
  const { error } = await Promise.resolve(sellerSchema.validate(req.body));
  if (error?.details) {
    throw new BadRequestError(error.details[0].message, 'Seller create() method error');
  }

  const checkIfSellerExist: ISellerDocument | null = await getSellerByEmail(req.body.email);

  if (checkIfSellerExist) {
    throw new BadRequestError('Seller already exist. Go to your account page to update', 'Seller create() method error');
  }

  const seller: ISellerDocument = {
    profilePublicId: req.body.profilePublicId,
    fullName: req.body.fullName,
    username: req.body.username,
    email: req.body.email,
    profilePicture: req.body.profilePicture,
    description: req.body.description,
    oneliner: req.body.oneliner,
    country: req.body.country,
    skills: req.body.skills,
    languages: req.body.languages,
    responseTime: req.body.responseTime,
    experience: req.body.experience,
    education: req.body.education,
    socialLinks: req.body.socialLinks,
    certificates: req.body.certificates
  };

  const createdSeller: ISellerDocument = await createSeller(seller);
  res.status(StatusCodes.CREATED).json({ message: 'Seller created successfully', seller: createdSeller });
};

export { seller };
