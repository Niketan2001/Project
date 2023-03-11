const express = require('express');
const pg = require('pg');
const xlsx = require('xlsx');
const multer = require('multer');

const app = express();
const port = 3000;

// PostgreSQL database configuration
const dbConfig = {
  user: 'postgres',
  host: 'localhost',
  database: 'mydatabase',
  password: '1234',
  port: 5432,
};

// Configure multer middleware to handle file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Connect to PostgreSQL database
const pool = new pg.Pool(dbConfig);

// Define an endpoint to handle file uploads
app.post('/upload', upload.single('file'), (req, res) => {
    // Read uploaded file
    const sheetName = req.body.sheetName || 'Sheet1'; // Use 'Sheet1' if sheetName is not provided
    const workbook = xlsx.read(req.file.buffer);
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);
  
    // Extract column names from the data
    const columns = Object.keys(data[0]);
  
    // Create table in PostgreSQL database
    pool.connect((err, client, done) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Internal server error');
      }
  
      // Generate CREATE TABLE query dynamically
      const tableName = `table_${Date.now()}`;
const createQuery = `CREATE TABLE ${tableName} (${columns.map(col => `"${col}" VARCHAR`).join(', ')})`;

  
      client.query(createQuery, (err, result) => {
        if (err) {
          console.error(err);
          done();
          return res.status(500).send('Internal server error');
        }
  
        console.log(result);
  
        // Insert data into table
        const insertQuery = `INSERT INTO ${tableName} (${columns.map(col => `"${col}"`).join(', ')}) VALUES (${columns.map((col, index) => `$${index + 1}`).join(', ')})`;

  
        data.forEach(row => {
          const values = columns.map(col => row[col]);
  
          client.query(insertQuery, values, (err, result) => {
            if (err) {
              console.error(err);
              done();
              return res.status(500).send('Internal server error');
            }
  
            console.log(result);
          });
        });
  
        done();
        return res.send('File uploaded successfully');
      });
    });
  });
  

// Define an endpoint to retrieve data from the database
app.get('/data', (req, res) => {
  pool.connect((err, client, done) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Internal server error');
    }

    client.query('SELECT * FROM exceldata', (err, result) => {
      done();

      if (err) {
        console.error(err);
        return res.status(500).send('Internal server error');
      }

      return res.json(result.rows);
    });
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
