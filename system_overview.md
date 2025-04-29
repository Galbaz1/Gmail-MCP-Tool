# Gmail MCP Server System Overview

## Introduction

The Gmail MCP Server is a Model Context Protocol (MCP) implementation that provides a bridge between AI agents and Gmail functionality. It enables AI agents to perform various operations on Gmail data, such as sending emails, searching for messages, and downloading attachments.

## Architecture

The Gmail MCP Server is built on the following components:

1. **MCP Server Framework**: Using `@modelcontextprotocol/sdk` to create a standardized interface for AI agents.
2. **Google API Integration**: Using the Gmail API to access and manipulate email data.
3. **OAuth2 Authentication**: Managing access to user Gmail accounts securely.
4. **Tools Implementation**: A set of specific functions that AI agents can invoke.

The server uses `StdioServerTransport` for communication, which means it communicates over standard input/output rather than HTTP. This design choice enables direct integration with applications that can spawn child processes.

## Gmail Integration

The integration with Gmail is achieved through:

1. **OAuth2 Authentication Flow**: The server handles the authentication process, including:
   - Generating authorization URLs
   - Managing token exchange
   - Storing credentials securely
   
2. **Gmail API Client**: Using the `googleapis` library to interact with Gmail's API endpoints.

## Available Tools

The server implements the following Gmail tools:

| Tool Name | Description |
|-----------|-------------|
| `send_email` | Sends a new email |
| `draft_email` | Creates a draft email |
| `read_email` | Retrieves content of a specific email |
| `search_emails` | Searches for emails using Gmail syntax |
| `modify_email` | Changes email labels (moves to different folders) |
| `delete_email` | Permanently deletes an email |
| `list_email_labels` | Gets all available Gmail labels |
| `download_attachment` | Downloads a specific attachment from an email |
| `batch_modify_emails` | Modifies labels for multiple emails |
| `batch_delete_emails` | Deletes multiple emails |
| `create_label` | Creates a new Gmail label |
| `update_label` | Updates an existing label |
| `delete_label` | Removes a label |
| `get_or_create_label` | Gets an existing label or creates it |

### Attachment Download Feature

The `download_attachment` tool allows downloading email attachments to a local directory. Key aspects:

- **Input Parameters**:
  - `messageId`: ID of the email containing the attachment
  - `attachmentId`: ID of the attachment to download
  - `saveDirectory`: Where to save the attachment (optional, defaults to a system temp directory)

- **Implementation Details**:
  1. Retrieves message details to find attachment metadata (filename)
  2. Fetches attachment data (base64-encoded)
  3. Decodes data and writes to filesystem
  4. Returns path to saved file

## Implementation Details

### Schema Definitions

Each tool has a defined Zod schema that validates input parameters. For example, the `DownloadAttachmentSchema` includes:

```typescript
const DownloadAttachmentSchema = z.object({
    messageId: z.string().describe("ID of the email message containing the attachment"),
    attachmentId: z.string().describe("ID of the attachment to download"),
    saveDirectory: z.string().optional().describe("Absolute path to the directory where the attachment should be saved. Defaults to /tmp/attachments/")
});
```

### Handler Functions

Each tool has a corresponding handler function that processes the request. For example, `handleDownloadAttachment` includes:

1. Getting message details to find attachment filename
2. Fetching attachment data
3. Decoding base64 data
4. Saving to filesystem
5. Returning result with the file path

## Usage Examples

### Searching for Emails with Attachments

```javascript
const result = await mcp.invokeToolCall("search_emails", {
  query: "has:attachment",
  maxResults: 5
});
```

### Reading Email Content

```javascript
const result = await mcp.invokeToolCall("read_email", {
  messageId: "196812afc9866113"
});
```

### Downloading an Attachment

```javascript
const result = await mcp.invokeToolCall("download_attachment", {
  messageId: "196812afc9866113",
  attachmentId: "ANGjdJ_UFYRklg_dDH57UoFafkhJnk5baqTnrXKTixjATwGQFNkRCmTXts_s0KgJyM0w8uFMahksBWtE34dtVfMRvqxPtF5akbL-IoLs4gpOElr9dvP9S9DrfT0gQR7n1h651nvw7oO1q13AXFIHu94dgxsSXXEQcrPh4kgvqGYXIzXGkJQGmLIlgjjq9G_w6W3dkTj4TM1Zo6BE8PEwqUrH5Vy2ZJ-YYxTkeCewJg3Io97GzcswBltRpA5IHHmhwUYDlj4ProhKbZyB2Y5fB-ckQf1onMlBpEUzi5Hfn_QHdtWGizaU99AGiyefXTo",
  saveDirectory: "./downloads"
});
```

### Direct API Testing

For testing without the MCP server, utility scripts are available:

- `search-attachments.js`: Finds emails with attachments
- `test-download.js`: Downloads attachments directly using Gmail API
- `test-direct-api.js`: Tests the attachment download functionality

## Testing

The system has been tested with:

1. Email message retrieval
2. Attachment searching and identification
3. PDF document downloads
4. Image file downloads

Tests confirm the core functionality works as intended.

## Recommendations for Improvement

Based on testing results, the following improvements are recommended:

1. **Filename Conflict Resolution**: Add handling for multiple attachments with identical filenames
2. **Batch Download Tool**: Create a dedicated tool for downloading all attachments from a message
3. **Enhanced Error Handling**: Provide more detailed error information for troubleshooting
4. **Progress Reporting**: For large attachments, implement a progress indicator
5. **Attachment Preview**: Add capability to generate previews for common file types
6. **Security Enhancements**: Implement file type verification and scanning

## Conclusion

The Gmail MCP Server provides a robust interface for AI agents to interact with Gmail, with the attachment download capability enhancing its utility for document retrieval and processing tasks. The architecture follows MCP standards and provides a reliable foundation for further feature development. 