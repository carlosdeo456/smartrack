const express = require('express');
const itemsController = require('../../controllers/itemsController');

const router = express.Router();

router.get('/', itemsController.getAllItems);
router.post('/', itemsController.createItem);
router.delete('/:id', itemsController.deleteItem);

module.exports = router;
