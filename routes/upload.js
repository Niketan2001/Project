const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');

const uploadService = require('../services/uploadService');
const excelCheck = require('../services/excelCheck');

const router = express.Router();
const upload = multer();

// Define an endpoint to handle file uploads
router.post('/', upload.single('file'), async (req, res, next) => {
  try {
    const sheetName = req.body.sheetName || 'Sheet1'; // Use 'Sheet1' if sheetName is not provided
    const workbook = xlsx.read(req.file.buffer);
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);
    await excelCheck.checkRepeatedData(data);

    const message = await uploadService.uploadData(data);

    // let message = 'File uploaded successfully';
    // if (insertedCount > 0) {
    //   message += ` - ${insertedCount} rows inserted`;
    // }
    // if (updatedCount > 0) {
    //   message += ` - ${updatedCount} rows updated`;
    // }

    res.send(message);
  } catch (err) {
    res.status(400).send(err.message);
  }
});


module.exports = router;
