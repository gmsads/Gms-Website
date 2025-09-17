const express = require('express');
const router = express.Router();

// Inline controller logic
router.get('/', (req, res) => {
  const upiNumbers = [
    '9985330008@Chary',
    '9985330004@Swathi',
    '9553146376@Laxmipathi',
  ];
  res.json(upiNumbers);
});

module.exports = router;
