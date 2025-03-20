# Vidu MCP Server

A Model Context Protocol (MCP) server for interacting with the Vidu video generation API. This server provides tools for generating videos from images using Vidu's powerful AI models.

## Features

- **Image to Video Conversion**: Generate videos from static images with customizable settings
- **Check Generation Status**: Monitor the progress of video generation tasks
- **Image Upload**: Easily upload images to be used with the Vidu API

## Prerequisites

- Node.js (v14 or higher)
- A Vidu API key

## Installation

1. Clone this repository:
```bash
git clone https://github.com/your-username/vidu-mcp-server.git
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

### 2. Check Generation Status

Checks the status of a running video generation task.

Parameters:
- `task_id` (required): Task ID returned by the image-to-video tool

### 3. Upload Image

Uploads an image to use with the Vidu API.

Parameters:
- `image_path` (required): Local path to the image file
- `image_type` (required): Image file type ("png", "webp", "jpeg", "jpg")

## License

[MIT](LICENSE)