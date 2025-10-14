#!/usr/bin/env node

/**
 * Test script for streaming API route
 * Usage: node test-stream-api.mjs
 */

const API_URL = "http://localhost:3000/api/ai-search/stream";

async function testStreamingAPI() {
  console.log("🧪 Testing streaming API route...\n");

  const testPayload = {
    messages: [
      {
        role: "user",
        content: "Show me some recent action movies",
      },
    ],
    locale: "en",
  };

  console.log("📤 Sending request:");
  console.log(JSON.stringify(testPayload, null, 2));
  console.log();

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Referer: "http://localhost:3000",
      },
      body: JSON.stringify(testPayload),
    });

    console.log(`📊 Response status: ${response.status}`);
    console.log(`📊 Response headers:`);
    for (const [key, value] of response.headers.entries()) {
      console.log(`   ${key}: ${value}`);
    }
    console.log();

    if (!response.ok) {
      const error = await response.text();
      console.error("❌ Error response:", error);
      return;
    }

    // Read SSE stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let eventCount = 0;

    console.log("📥 Receiving events:\n");

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        console.log("\n✅ Stream complete");
        break;
      }

      // Decode chunk and add to buffer
      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE events (terminated by \n\n)
      const events = buffer.split("\n\n");
      buffer = events.pop() || ""; // Keep incomplete event in buffer

      for (const eventData of events) {
        if (!eventData.trim()) continue;

        // Parse SSE format: "data: {JSON}"
        if (eventData.startsWith("data: ")) {
          const jsonStr = eventData.slice(6); // Remove "data: " prefix
          try {
            const event = JSON.parse(jsonStr);
            eventCount++;

            // Format event for display
            console.log(`[Event ${eventCount}] ${event.type}`);
            switch (event.type) {
              case "thinking":
                console.log(`  Summary: ${event.summary}`);
                break;
              case "tool_call":
                console.log(`  Tool: ${event.name} (${event.status})`);
                break;
              case "text_delta":
                console.log(`  Delta: "${event.delta}"`);
                break;
              case "results":
                console.log(`  Results count: ${event.items.length}`);
                console.log(
                  `  Titles: ${event.items.map((item) => item.title).join(", ")}`,
                );
                break;
              case "error":
                console.log(`  ❌ Error: ${event.message}`);
                if (event.code) console.log(`  Code: ${event.code}`);
                break;
              case "done":
                console.log("  ✅ Done");
                break;
            }
            console.log();
          } catch (e) {
            console.error("Failed to parse event:", eventData);
            console.error("Parse error:", e.message);
          }
        }
      }
    }

    console.log(`\n📊 Total events received: ${eventCount}`);
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error(error.stack);
  }
}

// Run test
testStreamingAPI().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
