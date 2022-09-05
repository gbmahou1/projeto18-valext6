import { Router } from 'express';
import * as cardController from '../controllers/cardController';
import { validateSchema } from '../middlewares/validateSchema';
import activateCardSchema from '../schemas/activateCardSchema';
import createCardSchema from '../schemas/createCardSchema';

const cardRouter = Router()
cardRouter.post('/cards', validateSchema(createCardSchema), cardController.create);
cardRouter.post('/cards/:id/activate', validateSchema(activateCardSchema), cardController.activate);

export default cardRouter;