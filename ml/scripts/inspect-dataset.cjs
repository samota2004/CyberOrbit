const fs = require('fs');
const readline = require('readline');
const path = require('path');

async function inspectDataset(filePath) {
  console.log('=== DATASET INSPECTION REPORT ===');
  console.log('Source file:', filePath);
  
  const stats = fs.statSync(filePath);
  console.log('File size:', (stats.size / 1024 / 1024).toFixed(2), 'MB');

  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let rowCount = 0;
  let headers = [];
  const colStats = {};

  for await (const line of rl) {
    if (!line.trim()) continue;

    // Simple CSV parser handling quotes
    const fields = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    fields.push(current);

    if (rowCount === 0) {
      headers = fields;
      headers.forEach(h => {
        colStats[h] = {
          nonNull: 0,
          nullOrEmpty: 0,
          types: new Set(),
          uniqueValues: new Set(),
          sampleValues: []
        };
      });
      rowCount++;
      continue;
    }

    rowCount++;

    headers.forEach((h, idx) => {
      const val = fields[idx] !== undefined ? fields[idx].trim() : '';
      const stat = colStats[h];
      if (!val || val === 'null' || val === 'undefined') {
        stat.nullOrEmpty++;
      } else {
        stat.nonNull++;
        if (stat.uniqueValues.size < 50) {
          stat.uniqueValues.add(val);
        }
        if (stat.sampleValues.length < 3) {
          stat.sampleValues.push(val);
        }
        // infer type
        if (!isNaN(Number(val))) {
          stat.types.add('number');
        } else if (!isNaN(Date.parse(val)) && (val.includes('-') || val.includes(':'))) {
          stat.types.add('timestamp');
        } else {
          stat.types.add('string');
        }
      }
    });
  }

  const totalRecords = rowCount - 1;
  console.log('Total Records:', totalRecords);
  console.log('\n--- COLUMN SCHEMA & STATS ---');
  headers.forEach((h, idx) => {
    const s = colStats[h];
    const inferredTypes = Array.from(s.types).join('/');
    console.log(
      `${(idx + 1).toString().padStart(2, ' ')}. [${h}] -> Type: ${inferredTypes} | Valid: ${s.nonNull} | Missing: ${s.nullOrEmpty} | Uniques: ${s.uniqueValues.size}${s.uniqueValues.size >= 50 ? '+' : ''}`
    );
    if (s.uniqueValues.size <= 10) {
      console.log(`     Values: ${Array.from(s.uniqueValues).slice(0, 10).join(', ')}`);
    } else {
      console.log(`     Samples: ${s.sampleValues.join(', ')}`);
    }
  });

  // Class distribution
  const anomalyStats = colStats['is_anomaly'];
  console.log('\n--- CLASS DISTRIBUTION (is_anomaly) ---');
  if (anomalyStats) {
    console.log('Target values:', Array.from(anomalyStats.uniqueValues).join(', '));
  }
}

const target = path.join(process.cwd(), 'ml', 'datasets', 'cybersecurity_15k_dataset.csv');
inspectDataset(target).catch(console.error);
