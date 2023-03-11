const express = require('express');
const pg = require('pg');
const xlsx = require('xlsx');

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

// Excel file path and sheet name
const filePath = 'data.xlsx';
const sheetName = 'Sheet1';

// Connect to PostgreSQL database
const pool = new pg.Pool(dbConfig);

// Read Excel file
const workbook = xlsx.readFile(filePath);
const sheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(sheet);

// Extract column names from the data
const columns = Object.keys(data[0]);

// Create table in PostgreSQL database
pool.connect((err, client, done) => {
  if (err) {
    console.error(err);
    return;
  }

  // Generate CREATE TABLE query dynamically
  const createQuery = `CREATE TABLE exceldata (${columns.map(col => `"${col}" VARCHAR`).join(', ')})`;

  client.query(createQuery, (err, res) => {
    if (err) {
      console.error(err);
      return;
    }

    console.log(res);

    // Insert data into table
    const insertQuery = `INSERT INTO exceldata (${columns.map(col => `"${col}"`).join(', ')}) VALUES (${columns.map((col, index) => `$${index + 1}`).join(', ')})`;

    data.forEach(row => {
      const values = columns.map(col => row[col]);

      client.query(insertQuery, values, (err, res) => {
        if (err) {
          console.error(err);
          return;
        }

        console.log(res);
      });
    });
  });

  done();
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
