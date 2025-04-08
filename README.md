# Vidu MCP Server
[![smithery badge](https://smithery.ai/badge/@el-el-san/vidu-mcp-server)](https://smithery.ai/server/@el-el-san/vidu-mcp-server)

A Model Context Protocol (MCP) server for interacting with the Vidu video generation API. This server provides tools for generating videos from images using Vidu's powerful AI models.

## Features

- **Image to Video Conversion**: Generate videos from static images with customizable settings
- **Check Generation Status**: Monitor the progress of video generation tasks
- **Image Upload**: Easily upload images to be used with the Vidu API

## Prerequisites

- Node.js (v14 or higher)
- A Vidu API key (available from [Vidu website](https://vidu.com))
- TypeScript (for development)

## Installation

### Installing via Smithery

To install Vidu Video Generation Server for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@el-el-san/vidu-mcp-server):

```bash
npx -y @smithery/cli install @el-el-san/vidu-mcp-server --client claude
```

### Manual Installation
1. Clone this repository:
```bash
git clone https://github.com/el-el-san/vidu-mcp-server.git
cd vidu-mcp-server
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on the `.env.template` and add your Vidu API key:
```
VIDU_API_KEY=your_api_key_here
```

## Usage

1. Build the TypeScript code:
```bash
npm run build
```

2. Start the server:
```bash
npm start
```

The MCP server will start and be ready to accept connections from MCP clients.

## Tools

### 1. Image to Video

Converts a static image to a video with customizable parameters.

Parameters:
- `image_url` (required): URL of the image to convert to video
- `prompt` (optional): Text prompt for video generation (max 1500 chars)
- `duration` (optional): Duration of the output video in seconds (4 or 8, default 4)
- `model` (optional): Model name for generation ("vidu1.0", "vidu1.5", "vidu2.0", default "vidu2.0")
- `resolution` (optional): Resolution of the output video ("360p", "720p", "1080p", default "720p")
- `movement_amplitude` (optional): Movement amplitude of objects in the frame ("auto", "small", "medium", "large", default "auto")
- `seed` (optional): Random seed for reproducibility

Example request:
```json
{
  "image_url": "https://example.com/image.jpg",
  "prompt": "A serene lake with mountains in the background",
  "duration": 8,
  "model": "vidu2.0",
  "resolution": "720p",
  "movement_amplitude": "medium",
  "seed": 12345
}
```

### 2. Check Generation Status

Checks the status of a running video generation task.

Parameters:
- `task_id` (required): Task ID returned by the image-to-video tool

Example request:
```json
{
  "task_id": "12345abcde"
}
```

### 3. Upload Image

Uploads an image to use with the Vidu API.

Parameters:
- `image_path` (required): Local path to the image file
- `image_type` (required): Image file type ("png", "webp", "jpeg", "jpg")

Example request:
```json
{
  "image_path": "/path/to/your/image.jpg",
  "image_type": "jpg"
}
```

## How It Works

The server uses the Model Context Protocol (MCP) to provide a standardized interface for AI tools. When you start the server, it listens for commands through standard input/output channels and responds with results in a structured format.

The server handles all the complexity of interacting with the Vidu API, including:
- Authentication with API keys
- File uploads and format validation
- Asynchronous task management and polling
- Error handling and reporting

## Troubleshooting

- **API Key Issues**: Make sure your Vidu API key is correctly set in the `.env` file
- **File Upload Errors**: Check that your image files are valid and under 10MB in size
- **Connection Problems**: Ensure you have internet access and can reach the Vidu API servers

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.


