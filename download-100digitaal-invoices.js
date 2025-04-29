const { downloadAttachments } = require('./download-attachments');

/**
 * Download all 100Digitaal invoices from 2025
 */
async function download100DigitaalInvoices() {
  console.log('Starting download of 100Digitaal invoices from 2025...');

  const options = {
    query: 'from:100digitaal.nl has:attachment after:2025/01/01 before:2025/12/31',
    outputDir: './downloads/100digitaal_invoices_2025',
    verbose: true,
    filenamePatterns: ['invoice', 'factuur'],
    maxResults: 100
  };

  try {
    const downloadedFiles = await downloadAttachments(options);
    
    console.log('\n=== Download Summary ===');
    console.log(`Successfully downloaded ${downloadedFiles.length} invoices from 100Digitaal`);
    
    // Group invoices by month
    const invoicesByMonth = {};
    
    downloadedFiles.forEach(file => {
      const dateObj = new Date(file.date);
      const month = dateObj.toLocaleString('default', { month: 'long' });
      
      if (!invoicesByMonth[month]) {
        invoicesByMonth[month] = [];
      }
      
      invoicesByMonth[month].push(file);
    });
    
    // Display invoices grouped by month
    console.log('\nInvoices by Month:');
    Object.keys(invoicesByMonth).forEach(month => {
      console.log(`\n${month} (${invoicesByMonth[month].length} invoices):`);
      invoicesByMonth[month].forEach(invoice => {
        console.log(`  - ${invoice.originalFileName}: €${getInvoiceAmount(invoice.subject)}`);
      });
    });
    
  } catch (error) {
    console.error('Failed to download invoices:', error.message);
  }
}

/**
 * Extract invoice amount from email subject or content
 * Note: This is a simple implementation and might need adjustments
 * @param {string} subject Email subject or content
 * @returns {string} Extracted amount or "Unknown"
 */
function getInvoiceAmount(subject) {
  // This is a placeholder - in real implementation, you'd parse the email content
  // to extract the actual amount from the email body
  return "Unknown";
}

// Run the function if script is executed directly
if (require.main === module) {
  download100DigitaalInvoices()
    .then(() => console.log('Done!'))
    .catch(err => console.error('Error:', err.message));
}

module.exports = { download100DigitaalInvoices }; 