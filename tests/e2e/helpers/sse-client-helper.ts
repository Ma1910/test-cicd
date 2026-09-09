import http from "node:http";

export interface SseEvent {
  event: string;
  data: any;
  raw: string;
  timestamp: number;
}

/**
 * Consumes Server-Sent Events from a given HTTP URL using native node:http
 */
export function consumeSseStream(
  urlStr: string,
  options: {
    timeoutMs?: number;
    stopOnEvent?: string; // e.g. "pipeline:finish"
    onEvent?: (event: SseEvent) => void;
  } = {}
): Promise<{ events: SseEvent[]; statusCode: number; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const events: SseEvent[] = [];
    const timeoutMs = options.timeoutMs || 15000;
    const url = new URL(urlStr);

    const req = http.get(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        headers: {
          Accept: "text/event-stream",
          "Cache-Control": "no-cache",
        },
      },
      (res) => {
        let buffer = "";

        const timer = setTimeout(() => {
          req.destroy();
          resolve({ events, statusCode: res.statusCode || 200, headers: res.headers });
        }, timeoutMs);

        res.setEncoding("utf8");

        res.on("data", (chunk: string) => {
          buffer += chunk;
          const parts = buffer.split("\n\n");
          // The last part may be incomplete
          buffer = parts.pop() || "";

          for (const message of parts) {
            if (!message.trim() || message.startsWith(":")) {
              // Heartbeat comment or empty line
              continue;
            }

            let eventType = "message";
            let dataStr = "";

            const lines = message.split("\n");
            for (const line of lines) {
              if (line.startsWith("event:")) {
                eventType = line.slice(6).trim();
              } else if (line.startsWith("data:")) {
                dataStr += (dataStr ? "\n" : "") + line.slice(5).trim();
              }
            }

            let parsedData = dataStr;
            try {
              parsedData = JSON.parse(dataStr);
            } catch {
              // Keep as string if not JSON
            }

            const sseEvent: SseEvent = {
              event: eventType,
              data: parsedData,
              raw: message,
              timestamp: Date.now(),
            };

            events.push(sseEvent);
            if (options.onEvent) {
              options.onEvent(sseEvent);
            }

            if (options.stopOnEvent && eventType === options.stopOnEvent) {
              clearTimeout(timer);
              req.destroy();
              resolve({ events, statusCode: res.statusCode || 200, headers: res.headers });
              return;
            }
          }
        });

        res.on("end", () => {
          clearTimeout(timer);
          resolve({ events, statusCode: res.statusCode || 200, headers: res.headers });
        });

        res.on("error", (err) => {
          clearTimeout(timer);
          // If already destroyed intentionally, resolve
          if (req.destroyed) {
            resolve({ events, statusCode: res.statusCode || 200, headers: res.headers });
          } else {
            reject(err);
          }
        });
      }
    );

    req.on("error", (err) => {
      reject(err);
    });
  });
}
