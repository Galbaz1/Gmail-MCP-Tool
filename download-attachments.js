const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const { authenticate } = require('google-auth-library');

/**
 * Downloads email attachments based on search criteria
 * @param {Object} options Configuration options
 * @param {string} options.query Gmail search query
 * @param {string} options.outputDir Directory to save attachments
 * @param {boolean} options.verbose Whether to log verbose information
 * @param {Array<string>} options.filenamePatterns Patterns to match in attachment filenames (optional)
 * @param {number} options.maxResults Maximum number of emails to process (default: 50)
 * @returns {Promise<Array>} Array of downloaded file paths
 */
async function downloadAttachments(options = {}) {
  const {
    query,
    outputDir = './downloads',
    verbose = false,
    filenamePatterns = [],
    maxResults = 50
  } = options;

  if (!query) {
    throw new Error('Search query is required');
  }

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    if (verbose) console.log(`Created output directory: ${outputDir}`);
  }

  try {
    // Load client secrets from file
    const keyFile = path.resolve('gcp-oauth.keys.json');
    if (!fs.existsSync(keyFile)) {
      throw new Error('OAuth credentials file not found: gcp-oauth.keys.json');
    }

    const auth = new google.auth.GoogleAuth({
      keyFile,
      scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
    });
    
    const client = await auth.getClient();
    const gmail = google.gmail({ version: 'v1', auth: client });
    
    // Search for emails matching the query
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults
    });
    
    if (!response.data.messages || response.data.messages.length === 0) {
      if (verbose) console.log('No emails found matching the search criteria.');
      return [];
    }
    
    if (verbose) console.log(`Found ${response.data.messages.length} emails matching criteria.`);
    
    const downloadedFiles = [];
    
    // Process each email
    for (const message of response.data.messages) {
      try {
        const email = await gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'full'
        });
        
        const headers = email.data.payload.headers;
        const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
        const from = headers.find(h => h.name === 'From')?.value || 'Unknown Sender';
        const date = headers.find(h => h.name === 'Date')?.value || 'Unknown Date';
        
        if (verbose) console.log(`\nProcessing email: "${subject}" from ${from} (${date})`);
        
        // Check if email has parts (attachments)
        let parts = [];
        if (email.data.payload.parts) {
          parts = email.data.payload.parts;
        }
        
        let attachments = [];
        
        // Find all attachments in the email
        const findAttachments = (parts, attachmentsList = []) => {
          for (const part of parts) {
            if (part.filename && part.body && part.body.attachmentId) {
              attachmentsList.push({
                filename: part.filename,
                mimeType: part.mimeType,
                attachmentId: part.body.attachmentId,
                size: part.body.size
              });
            }
            
            if (part.parts) {
              findAttachments(part.parts, attachmentsList);
            }
          }
          return attachmentsList;
        };
        
        attachments = findAttachments(parts);
        
        if (attachments.length === 0) {
          if (verbose) console.log(`  No attachments found in this email.`);
          continue;
        }
        
        if (verbose) console.log(`  Found ${attachments.length} attachment(s) in this email.`);
        
        // Process each attachment
        for (const attachment of attachments) {
          // Check if filename matches any of the patterns if patterns are provided
          if (filenamePatterns.length > 0) {
            const matchesPattern = filenamePatterns.some(pattern => 
              attachment.filename.toLowerCase().includes(pattern.toLowerCase())
            );
            
            if (!matchesPattern) {
              if (verbose) console.log(`  Skipping attachment ${attachment.filename} as it doesn't match any patterns.`);
              continue;
            }
          }
          
          try {
            // Get the attachment data
            const attachmentData = await gmail.users.messages.attachments.get({
              userId: 'me',
              messageId: message.id,
              id: attachment.attachmentId
            });
            
            // Decode the attachment content
            const data = attachmentData.data.data;
            const buffer = Buffer.from(data, 'base64');
            
            // Create a unique filename to prevent overwrites
            const originalFileName = attachment.filename;
            const fileExt = path.extname(originalFileName);
            const fileNameBase = path.basename(originalFileName, fileExt);
            
            // Check if file exists already
            let filePath = path.join(outputDir, originalFileName);
            let counter = 1;
            
            while (fs.existsSync(filePath)) {
              filePath = path.join(outputDir, `${fileNameBase}_${counter}${fileExt}`);
              counter++;
            }
            
            // Write the attachment to a file
            fs.writeFileSync(filePath, buffer);
            
            if (verbose) console.log(`  Downloaded ${attachment.filename} (${attachment.mimeType}, ${Math.round(attachment.size / 1024)} KB) to ${filePath}`);
            
            downloadedFiles.push({
              path: filePath,
              originalFileName: attachment.filename,
              subject,
              from,
              date,
              messageId: message.id,
              attachmentId: attachment.attachmentId,
              mimeType: attachment.mimeType,
              size: attachment.size
            });
          } catch (attachmentError) {
            console.error(`  Error downloading attachment ${attachment.filename}:`, attachmentError.message);
          }
        }
      } catch (emailError) {
        console.error(`Error processing email ${message.id}:`, emailError.message);
      }
    }
    
    if (verbose) console.log(`\nDownloaded ${downloadedFiles.length} attachments successfully.`);
    return downloadedFiles;
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

// Export the function if the script is required as a module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { downloadAttachments };
}

// Execute if the script is run directly
if (require.main === module) {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const options = {
    query: args[0] || '',
    outputDir: args[1] || './downloads',
    verbose: true,
    filenamePatterns: []
  };

  // If there are additional arguments, treat them as filename patterns
  if (args.length > 2) {
    options.filenamePatterns = args.slice(2);
  }

  if (!options.query) {
    console.error('Error: Search query is required.');
    console.log('Usage: node download-attachments.js "search query" [output directory] [filename pattern1] [filename pattern2] ...');
    console.log('Example: node download-attachments.js "from:example@gmail.com has:attachment" "./downloads" "invoice" "pdf"');
    process.exit(1);
  }

  // Run the download
  downloadAttachments(options)
    .then(files => {
      console.log(`\nDownload Summary:`);
      console.log(`Total attachments downloaded: ${files.length}`);
      if (files.length > 0) {
        console.log(`Output directory: ${path.resolve(options.outputDir)}`);
      }
    })
    .catch(err => {
      console.error('Download failed:', err.message);
      process.exit(1);
    });
} 