import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fetch from "node-fetch";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// インターフェースを定義して型安全性を確保
interface StartResponse {
  task_id: string;
  state: string;
  model: string;
  images: string[];
  prompt: string;
  duration: number;
  seed: number;
  resolution: string;
  bgm: boolean;
  movement_amplitude: string;
  created_at: string;
}

interface CreationItem {
  id: string;
  url: string;
  cover_url: string;
}

interface StatusResponse {
  state: string;
  err_code?: string;
  credits?: number;
  creations?: CreationItem[];
}

interface UploadResponse {
  id: string;
  put_url: string;
  expires_at: string;
}

interface FinishResponse {
  uri: string;
}

// Load environment variables
dotenv.config();

// Get API key from environment variable
const VIDU_API_KEY = process.env.VIDU_API_KEY;
if (!VIDU_API_KEY) {
  console.error("Error: VIDU_API_KEY environment variable is not set");
  process.exit(1);
}

// Base URL for the Vidu API
const VIDU_API_BASE_URL = "https://api.vidu.com";

// Create an MCP server
const server = new McpServer({
  name: "Vidu Video Generator",
  version: "1.0.0"
});

// Tool for image-to-video conversion
server.tool(
  "image-to-video",
  "Generate a video from an image using Vidu API",
  {
    image_url: z.string().url().describe("URL of the image to convert to video"),
    prompt: z.string().max(1500).optional().describe("Text prompt for video generation (max 1500 chars)"),
    duration: z.number().int().optional().describe("Duration of the output video in seconds (model-specific)"),
    model: z.enum(["viduq1", "vidu1.5", "vidu2.0"]).default("vidu2.0").describe("Model name for generation"),
    resolution: z.enum(["360p", "720p", "1080p"]).optional().describe("Resolution of the output video (model/duration-specific)"),
    movement_amplitude: z.enum(["auto", "small", "medium", "large"]).default("auto").describe("Movement amplitude of objects in the frame"),
    seed: z.number().int().optional().describe("Random seed for reproducibility"),
    bgm: z.boolean().optional().describe("Add background music (4s videos only)"),
    callback_url: z.string().url().optional().describe("Callback URL for async notifications")
  },
  async ({ image_url, prompt, duration, model, resolution, movement_amplitude, seed, bgm, callback_url }) => {
    try {
      // Validate model-specific constraints
      let finalDuration = duration;
      let finalResolution = resolution;
      
      if (model === "viduq1") {
        // viduq1 only supports 5s duration and 1080p resolution
        finalDuration = 5;
        finalResolution = "1080p";
        if (duration && duration !== 5) {
          console.warn(`Model viduq1 only supports 5s duration. Using 5s instead of ${duration}s.`);
        }
        if (resolution && resolution !== "1080p") {
          console.warn(`Model viduq1 only supports 1080p resolution. Using 1080p instead of ${resolution}.`);
        }
      } else {
        // vidu1.5 and vidu2.0
        if (!duration || ![4, 8].includes(duration)) {
          finalDuration = 4; // Default to 4s
        } else {
          finalDuration = duration;
        }
        
        // Resolution constraints based on duration
        if (finalDuration === 4) {
          if (!resolution || !["360p", "720p", "1080p"].includes(resolution)) {
            finalResolution = "360p"; // Default for 4s
          } else {
            finalResolution = resolution;
          }
        } else if (finalDuration === 8) {
          finalResolution = "720p"; // Only option for 8s
          if (resolution && resolution !== "720p") {
            console.warn(`8s videos only support 720p resolution. Using 720p instead of ${resolution}.`);
          }
        }
      }
      
      // BGM validation
      const finalBgm = bgm === true && finalDuration === 4;
      if (bgm === true && finalDuration !== 4) {
        console.warn(`BGM is only supported for 4s videos. BGM will not be added for ${finalDuration}s video.`);
      }
      
      // Step 1: Start the generation task
      const startResponse = await fetch(`${VIDU_API_BASE_URL}/ent/v2/img2video`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Token ${VIDU_API_KEY}`
        },
        body: JSON.stringify({
          model,
          images: [image_url],
          prompt: prompt || "",
          duration: finalDuration,
          seed: seed !== undefined ? seed : Math.floor(Math.random() * 1000000),
          resolution: finalResolution,
          movement_amplitude,
          bgm: finalBgm,
          ...(callback_url && { callback_url })
        })
      });

      if (!startResponse.ok) {
        const errorData = await startResponse.text();
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error starting video generation: ${errorData}`
            }
          ]
        };
      }

      const startData = await startResponse.json() as StartResponse;
      const taskId = startData.task_id;

      // Step 2: Poll for completion
      let state = startData.state;
      let result: StatusResponse | null = null;
      
      // Add a message to indicate that we're processing
      let status = `Task created with ID: ${taskId}\nInitial state: ${state}\n`;
      status += "Waiting for processing to complete...\n";

      // Maximum wait time: 5 minutes
      const maxPolls = 60;
      let pollCount = 0;
      
      while (state !== "success" && state !== "failed" && pollCount < maxPolls) {
        // Wait for 5 seconds before polling again
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const statusResponse = await fetch(`${VIDU_API_BASE_URL}/ent/v2/tasks/${taskId}/creations`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Token ${VIDU_API_KEY}`
          }
        });

        if (!statusResponse.ok) {
          const errorData = await statusResponse.text();
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: `Error checking generation status: ${errorData}`
              }
            ]
          };
        }

        const statusData = await statusResponse.json() as StatusResponse;
        state = statusData.state;
        pollCount++;
        
        status += `Current state: ${state}\n`;
        
        if (state === "success") {
          result = statusData;
          break;
        } else if (state === "failed") {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: `Video generation failed: ${statusData.err_code || "Unknown error"}`
              }
            ]
          };
        }
      }

      if (state !== "success") {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Timed out waiting for video generation to complete. Last state: ${state}`
            }
          ]
        };
      }

      // Format the successful result
      if (result && result.creations && result.creations.length > 0) {
        const videoUrl = result.creations[0].url;
        const coverUrl = result.creations[0].cover_url;
        const credits = result.credits;
        
        return {
          content: [
            {
              type: "text",
              text: `
Video generation complete!

Task ID: ${taskId}
Status: ${state}
Credits used: ${credits || 'N/A'}
Video URL: ${videoUrl}
Cover Image URL: ${coverUrl}

Note: These URLs are valid for one hour.
`
            }
          ]
        };
      } else {
        return {
          content: [
            {
              type: "text",
              text: `
Video generation completed, but no download URLs were returned.

Task ID: ${taskId}
Status: ${state}
`
            }
          ]
        };
      }
    } catch (error: any) {
      console.error("Error in image-to-video tool:", error);
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `An unexpected error occurred: ${error.message}`
          }
        ]
      };
    }
  }
);

// Tool for checking generation status
server.tool(
  "check-generation-status",
  "Check the status of a video generation task",
  {
    task_id: z.string().describe("Task ID returned by the image-to-video tool")
  },
  async ({ task_id }) => {
    try {
      const statusResponse = await fetch(`${VIDU_API_BASE_URL}/ent/v2/tasks/${task_id}/creations`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Token ${VIDU_API_KEY}`
        }
      });

      if (!statusResponse.ok) {
        const errorData = await statusResponse.text();
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error checking generation status: ${errorData}`
            }
          ]
        };
      }

      const statusData = await statusResponse.json() as StatusResponse;
      
      if (statusData.state === "success") {
        if (statusData.creations && statusData.creations.length > 0) {
          const videoUrl = statusData.creations[0].url;
          const coverUrl = statusData.creations[0].cover_url;
          const credits = statusData.credits;
          
          return {
            content: [
              {
                type: "text",
                text: `
Generation task complete!

Task ID: ${task_id}
Status: ${statusData.state}
Credits used: ${credits || 'N/A'}
Video URL: ${videoUrl}
Cover Image URL: ${coverUrl}

Note: These URLs are valid for one hour.
`
              }
            ]
          };
        } else {
          return {
            content: [
              {
                type: "text",
                text: `
Generation task complete but no download URLs available.

Task ID: ${task_id}
Status: ${statusData.state}
`
              }
            ]
          };
        }
      } else if (statusData.state === "failed") {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Generation task failed with error code: ${statusData.err_code || "Unknown error"}`
            }
          ]
        };
      } else {
        return {
          content: [
            {
              type: "text",
              text: `
Generation task is still in progress.

Task ID: ${task_id}
Current Status: ${statusData.state}

You can check again later using the same task ID.
`
            }
          ]
        };
      }
    } catch (error: any) {
      console.error("Error in check-generation-status tool:", error);
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `An unexpected error occurred: ${error.message}`
          }
        ]
      };
    }
  }
);

// Tool for uploading images
server.tool(
  "upload-image",
  "Upload an image to use with the Vidu API",
  {
    image_path: z.string().describe("Local path to the image file"),
    image_type: z.enum(["png", "webp", "jpeg", "jpg"]).describe("Image file type")
  },
  async ({ image_path, image_type }) => {
    try {
      // Validate image path and existence
      if (!fs.existsSync(image_path)) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `The specified image file does not exist: ${image_path}`
            }
          ]
        };
      }
      
      // Validate file size (must be less than 10MB for upload)
      const stats = fs.statSync(image_path);
      const fileSizeInBytes = stats.size;
      const fileSizeInMB = fileSizeInBytes / (1024 * 1024);
      
      if (fileSizeInMB > 10) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `File size exceeds the 10MB limit for image upload. Current size: ${fileSizeInMB.toFixed(2)}MB`
            }
          ]
        };
      }
      
      // Step 1: Create upload link
      const createUploadResponse = await fetch(`${VIDU_API_BASE_URL}/tools/v2/files/uploads`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Token ${VIDU_API_KEY}`
        },
        body: JSON.stringify({
          scene: "vidu"
        })
      });

      if (!createUploadResponse.ok) {
        const errorData = await createUploadResponse.text();
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error creating upload link: ${errorData}`
            }
          ]
        };
      }

      const uploadData = await createUploadResponse.json() as UploadResponse;
      const resourceId = uploadData.id;
      const putUrl = uploadData.put_url;
      
      // Step 2: Upload the image
      const imageBuffer = fs.readFileSync(image_path);
      
      const uploadResponse = await fetch(putUrl, {
        method: "PUT",
        headers: {
          "Content-Type": `image/${image_type}`
        },
        body: imageBuffer
      });

      if (!uploadResponse.ok) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error uploading image: ${uploadResponse.statusText}`
            }
          ]
        };
      }
      
      // Get the ETag from the response headers
      const etag = uploadResponse.headers.get("etag")?.replace(/"/g, "");
      
      if (!etag) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: "Failed to get ETag from upload response"
            }
          ]
        };
      }
      
      // Step 3: Complete the upload
      const finishUploadResponse = await fetch(`${VIDU_API_BASE_URL}/tools/v2/files/uploads/${resourceId}/finish`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Token ${VIDU_API_KEY}`
        },
        body: JSON.stringify({
          etag
        })
      });

      if (!finishUploadResponse.ok) {
        const errorData = await finishUploadResponse.text();
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error finishing upload: ${errorData}`
            }
          ]
        };
      }

      const finishData = await finishUploadResponse.json() as FinishResponse;
      const uri = finishData.uri;
      
      return {
        content: [
          {
            type: "text",
            text: `
Image uploaded successfully!

Resource ID: ${resourceId}
URI: ${uri}

You can use this URI as the image_url parameter for the image-to-video tool.
`
          }
        ]
      };
    } catch (error: any) {
      console.error("Error in upload-image tool:", error);
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `An unexpected error occurred: ${error.message}`
          }
        ]
      };
    }
  }
);

// Main function to start the server
async function main() {
  try {
    // Connect to the server using stdio transport
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Vidu MCP Server started successfully");
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
}

// Run the server
main();