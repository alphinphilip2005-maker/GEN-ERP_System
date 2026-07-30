const express = require('express');
const router = express.Router();
const grnController = require('../controllers/grn.controller');

router.get('/', grnController.getAllGrns);
router.get('/:id', grnController.getGrnById);
router.post('/', grnController.createGrn);
router.put('/:id', grnController.updateGrn);
router.patch('/:id/qc', grnController.updateGrnQc);

module.exports = router;
