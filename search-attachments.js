#!/usr/bin/env node
const { downloadAttachments } = require('./download-attachments');

/**
 * Main function to handle attachment search and download
 */
async function main() {
  const args = process.argv.slice(2);

  // Show help if requested or no arguments provided
  if (args.includes('--help') || args.includes('-h') || args.length === 0) {
    showHelp();
    return;
  }

  // Process command line arguments
  const options = processArgs(args);

  try {
    console.log(`Searching for attachments with query: "${options.query}"`);
    if (options.filenamePatterns.length > 0) {
      console.log(`Filtering for files matching: ${options.filenamePatterns.join(', ')}`);
    }
    console.log(`Saving to: ${options.outputDir}`);

    // Perform the download
    const files = await downloadAttachments(options);

    // Display results
    console.log(`\nDownloaded ${files.length} attachments successfully.`);
    
    // If specific formats were specified, group by format
    if (options.filenamePatterns.length > 0) {
      const filesByFormat = {};
      
      files.forEach(file => {
        const ext = file.path.split('.').pop().toLowerCase();
        if (!filesByFormat[ext]) {
          filesByFormat[ext] = [];
        }
        filesByFormat[ext].push(file);
      });
      
      console.log('\nFiles by format:');
      Object.keys(filesByFormat).forEach(format => {
        console.log(`  ${format.toUpperCase()}: ${filesByFormat[format].length} files`);
      });
    }
    
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Process command line arguments into options object
 * @param {string[]} args Command line arguments
 * @returns {Object} Options object for downloadAttachments
 */
function processArgs(args) {
  const options = {
    query: '',
    outputDir: './downloads',
    verbose: false,
    filenamePatterns: [],
    maxResults: 50
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--query' || arg === '-q') {
      options.query = args[++i] || '';
    } else if (arg === '--output' || arg === '-o') {
      options.outputDir = args[++i] || './downloads';
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg === '--max' || arg === '-m') {
      options.maxResults = parseInt(args[++i]) || 50;
    } else if (arg === '--filter' || arg === '-f') {
      while (i + 1 < args.length && !args[i + 1].startsWith('-')) {
        options.filenamePatterns.push(args[++i]);
      }
    } else if (!arg.startsWith('-') && !options.query) {
      // Assume first non-flag argument is the query if not already set
      options.query = arg;
    }
  }

  if (!options.query) {
    console.error('Error: Search query is required.');
    showHelp();
    process.exit(1);
  }

  return options;
}

/**
 * Display help information
 */
function showHelp() {
  console.log(`
Gmail Attachment Downloader
---------------------------

This tool allows you to search for and download attachments from Gmail.

Usage:
  node search-attachments.js [options] "search query"

Options:
  -q, --query <query>       Gmail search query
  -o, --output <dir>        Output directory (default: ./downloads)
  -v, --verbose             Enable verbose output
  -m, --max <number>        Maximum number of emails to process (default: 50)
  -f, --filter <patterns>   Filter attachments by filename pattern (can specify multiple)
  -h, --help                Show this help information

Examples:
  node search-attachments.js "from:example@gmail.com has:attachment"
  node search-attachments.js -q "from:bank after:2025/01/01" -o "./bank_statements" -f pdf statement
  node search-attachments.js "has:attachment filename:invoice" -v -m 100

Search Query Syntax:
  from:            Specify sender
  to:              Specify recipient
  subject:         Search in subject line
  has:attachment   Only emails with attachments
  filename:        Search by attachment filename
  after:YYYY/MM/DD Emails after date
  before:YYYY/MM/DD Emails before date
  
Full Gmail search syntax: https://support.google.com/mail/answer/7190
  `);
}

// Execute if run directly
if (require.main === module) {
  main();
}

module.exports = { main }; 