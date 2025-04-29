## Implementing Attachment Download Functionality in Gmail MCP Server

Based on the analysis of the Gmail MCP Server codebase (`src/index.ts`), the server currently retrieves attachment metadata (filename, type, size) as part of the `read_email` tool but lacks a dedicated function to download the actual attachment content.

To add this functionality, a new MCP tool, `download_attachment`, can be implemented. This involves defining a new schema, creating a handler function that utilizes the Gmail API, and registering the new tool with the MCP server.

### 1. Define Input Schema

A new Zod schema is needed to validate the input for the `download_attachment` tool. It should require the `messageId` and the `attachmentId`.

```typescript
// Define schema for downloading attachments
const DownloadAttachmentSchema = z.object({
  messageId: z.string().describe("ID of the email message containing the attachment"),
  attachmentId: z.string().describe("ID of the attachment to download"),
  // Optional: Specify a directory to save the attachment
  saveDirectory: z.string().optional().describe("Absolute path to the directory where the attachment should be saved. Defaults to /home/ubuntu/downloads/")
});
```

### 2. Implement Tool Handler

A new asynchronous function, `handleDownloadAttachment`, will handle the logic for downloading the attachment using the Gmail API.

```typescript
import fs from 'fs';
import path from 'path';

// ... other imports

async function handleDownloadAttachment(validatedArgs: any) {
  const { messageId, attachmentId, saveDirectory } = validatedArgs;
  const downloadDir = saveDirectory || '/home/ubuntu/downloads/'; // Default download directory

  try {
    // Ensure the download directory exists
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }

    // First, get attachment metadata (like filename) using the messages.get API
    // This is necessary because the attachments.get API only returns the data
    const msgResponse = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'metadata', // We only need metadata here to find the filename
    });

    let filename = `attachment_${attachmentId}.dat`; // Default filename
    let foundAttachment = false;

    const findFilename = (parts: any[]) => {
      if (!parts) return;
      for (const part of parts) {
        if (part.body?.attachmentId === attachmentId) {
          filename = part.filename || filename;
          foundAttachment = true;
          return;
        }
        if (part.parts) {
          findFilename(part.parts);
          if (foundAttachment) return; // Stop searching if found
        }
      }
    };

    if (msgResponse.data.payload?.parts) {
      findFilename(msgResponse.data.payload.parts);
    }
    // Handle cases where the attachment might be in the top-level payload (less common)
    if (!foundAttachment && msgResponse.data.payload?.body?.attachmentId === attachmentId) {
        filename = msgResponse.data.payload.filename || filename;
        foundAttachment = true;
    }

    if (!foundAttachment) {
        throw new Error(`Attachment with ID ${attachmentId} not found in message ${messageId}`);
    }

    // Now get the attachment data using the attachments.get API
    const attachmentResponse = await gmail.users.messages.attachments.get({
      userId: 'me',
      messageId: messageId,
      id: attachmentId,
    });

    if (!attachmentResponse.data.data) {
      throw new Error('No attachment data received from API.');
    }

    // Decode the base64url data
    const fileData = Buffer.from(attachmentResponse.data.data.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

    // Construct the full save path
    const savePath = path.join(downloadDir, filename);

    // Save the file
    fs.writeFileSync(savePath, fileData);

    console.log(`Attachment downloaded successfully to: ${savePath}`);
    return { result: `Attachment downloaded successfully to: ${savePath}`, savedFilePath: savePath };

  } catch (error: any) {
    console.error('Error downloading attachment:', error);
    // Provide a more informative error message if possible
    const errorMessage = error.response?.data?.error?.message || error.message || 'Unknown error occurred';
    return { error: `Failed to download attachment: ${errorMessage}` };
  }
}

```

*Note:* This implementation first retrieves the message metadata to find the correct filename associated with the `attachmentId`. Then, it calls the `attachments.get` endpoint to retrieve the actual data, decodes it, and saves it to the specified or default directory.

### 3. Register the New Tool

Add the `download_attachment` tool definition to the `tools` array within the `server.setRequestHandler(ListToolsRequestSchema, ...)` block.

```typescript
// Inside the main function, within server.setRequestHandler(ListToolsRequestSchema, ...)

        // ... existing tools like 'send_email', 'read_email', etc.
        {
          name: "download_attachment",
          description: "Downloads a specific attachment from an email message",
          inputSchema: zodToJsonSchema(DownloadAttachmentSchema),
        },
        // ... other tools
```

### 4. Add Handler Logic

In the `server.setRequestHandler(CallToolRequestSchema, ...)` block, add a case to handle the new `download_attachment` tool name.

```typescript
// Inside the main function, within server.setRequestHandler(CallToolRequestSchema, ...)

      // ... existing handlers
      else if (name === 'download_attachment') {
        const validatedArgs = DownloadAttachmentSchema.parse(args);
        return await handleDownloadAttachment(validatedArgs);
      }
      // ... other handlers or default case
```

### 5. Usage Example

1.  Call `read_email` with the `messageId` to get the email details, including the list of attachments with their `attachmentId` and `filename`.
2.  Identify the `attachmentId` of the desired attachment from the `read_email` response.
3.  Call the new `download_attachment` tool with the `messageId` and the specific `attachmentId`. Optionally provide a `saveDirectory`.
4.  The tool will save the file locally and return the path to the saved file.

By following these steps, the Gmail MCP server can be extended to support downloading email attachments.
