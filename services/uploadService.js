const dbService = require('./dbService');

async function uploadData(data) {
  const client = await dbService.connect();
  try {
    await client.query('BEGIN');

    const processed = {}; // Object to keep track of emails, contact numbers, and bib numbers already processed

    // Define a function to convert Excel column names to the desired format
    function convertColumnName(columnName) {
      return columnName.trim().toLowerCase().replace(/\s+/g, '_');
    }

    let numRowsUpdated = 0;
    let numRowsInserted = 0;

    for (const row of data) {
      const email = row['Email'];
      const contactNumber = row['Contact Number'];
      const bibNo = row[' Bib no'];

      // Convert Excel column names to the desired format
      const convertedRow = {};
      for (const columnName of Object.keys(row)) {
        const convertedColumnName = convertColumnName(columnName);
        convertedRow[convertedColumnName] = row[columnName];
      }

      // Check if a record with the same email, contact number, and bib number already exists in the table
      const result = await dbService.query(`SELECT * FROM datatable WHERE email = $1 OR contact_number = $2 OR bib_no = $3`, [email, contactNumber, bibNo]);

      if (result.rows.length > 0) {
        // If the record already exists, check if the values are different
        const existingRow = result.rows[0];
        if (existingRow.email === email && existingRow.contact_number === contactNumber && existingRow.bib_no === bibNo) {
          // If the row has the same email, contact number, and bib number, do nothing
          continue;
        } else {
          // If the row has a different email, contact number, bib number, update the record in the table
          const updateQuery = `UPDATE datatable SET ${Object.keys(convertedRow).map((col, index) => `"${col}" = $${index + 1}`).join(', ')} WHERE email = $${Object.keys(convertedRow).length + 1} AND contact_number = $${Object.keys(convertedRow).length + 2} AND bib_no = $${Object.keys(convertedRow).length + 3}`;
          const { rowCount } = await client.query(updateQuery, [...Object.values(convertedRow), email, contactNumber, bibNo]);
          if (rowCount > 0) {
            numRowsUpdated++;
          }
        }
      } else {
        // If the record does not exist, insert a new record into the table
        const values = [...Object.values(convertedRow)];

        const insertQuery = `INSERT INTO datatable (${Object.keys(convertedRow).map(col => `"${col}"`).join(', ')}) VALUES (${Object.keys(convertedRow).map((col, index) => `$${index + 1}`).join(', ')})`;
        const { rowCount } = await client.query(insertQuery, values);
        if (rowCount > 0) {
          numRowsInserted++;
        }
      }
    }

    await client.query('COMMIT');   
    let message = `File uploaded successfully. `;
    if (numRowsInserted > 0) {
        message += ` - ${numRowsInserted} rows inserted`;
      }
      // if (numRowsUpdated > 0) {
      //   message += ` - ${numRowsUpdated} rows updated`;
      // }
    return message;
    //${numRowsInserted} rows inserted, ${numRowsUpdated} rows updated.
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  uploadData
};
