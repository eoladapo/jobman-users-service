import { seller as createSeller } from '@users/controllers/seller/create';
import { id, username, randomSellers } from '@users/controllers/seller/get';
import { seller as seedSeller } from '@users/controllers/seller/seed';
import { seller as updateSeller } from '@users/controllers/seller/update';
import express, { Router } from 'express';

const router: Router = express.Router();

const sellerRoutes = (): Router => {
  router.get('/id/:sellerId', id);
  router.get('/username/:username', username);
  router.get('/random/:size', randomSellers);
  router.post('/create', createSeller);
  router.put('/seed/:count', seedSeller);
  router.put('/:sellerId', updateSeller);

  return router;
};

export { sellerRoutes };
