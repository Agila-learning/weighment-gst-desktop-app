import { Router } from 'express';
import { 
  getPermitCards,
  getPermitCardById,
  createPermitCard,
  updatePermitCard,
  getPermitTemplate,
  updatePermitTemplate,
  generatePermitPdfEndpoint
} from '../controllers/permitCardController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Apply auth middleware to all permit card routes
router.use(authenticate);

// Template Settings
router.get('/template', getPermitTemplate);
router.put('/template', updatePermitTemplate);

// Permit Cards CRUD
router.get('/', getPermitCards);
router.post('/', createPermitCard);
router.post('/generate-pdf', generatePermitPdfEndpoint);
router.get('/:id', getPermitCardById);
router.put('/:id', updatePermitCard);

export default router;
