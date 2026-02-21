import type { Response } from 'express';

/**
 * SSE (Server-Sent Events) writer for streaming pipeline progress.
 *
 * Usage:
 *   const sse = new SSEWriter(res);
 *   sse.send('progress', { stage: 'classify', status: 'running' });
 *   sse.send('result', analysisResult);
 *   sse.close();
 */
export class SSEWriter {
  private res: Response;
  private closed = false;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  constructor(res: Response) {
    this.res = res;

    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx/proxy buffering
    });

    // Flush headers immediately (critical for Railway)
    res.flushHeaders();

    // Start heartbeat every 30s (Railway has 60s idle timeout)
    this.heartbeatInterval = setInterval(() => {
      if (!this.closed) {
        this.sendRaw(':heartbeat\n\n');
      }
    }, 30_000);

    // Clean up on client disconnect
    res.on('close', () => {
      this.cleanup();
    });
  }

  /**
   * Send a typed SSE event.
   */
  send(event: string, data: unknown): void {
    if (this.closed) return;

    const payload = JSON.stringify(data);
    this.sendRaw(`event: ${event}\ndata: ${payload}\n\n`);
  }

  /**
   * Send an error event and close the stream.
   */
  sendError(message: string): void {
    this.send('error', { message });
    this.close();
  }

  /**
   * Close the SSE stream.
   */
  close(): void {
    if (this.closed) return;
    this.cleanup();
    this.res.end();
  }

  private sendRaw(data: string): void {
    try {
      this.res.write(data);
    } catch {
      // Client may have disconnected
      this.cleanup();
    }
  }

  private cleanup(): void {
    this.closed = true;
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}
