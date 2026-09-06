export class MetricsCollector {
  private totalRequests = 0;
  private statusCodes: Record<string, number> = {};
  private startTime = Date.now();

  record(statusCode: number): void {
    this.totalRequests++;
    const key = `${statusCode}`;
    this.statusCodes[key] = (this.statusCodes[key] || 0) + 1;
  }

  getSnapshot() {
    return {
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      totalRequests: this.totalRequests,
      statusCodes: { ...this.statusCodes },
      memory: {
        rssMb: Number((process.memoryUsage().rss / 1024 / 1024).toFixed(2)),
        heapUsedMb: Number((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)),
      },
    };
  }

  toPrometheusFormat(): string {
    const lines = [
      "# HELP app_requests_total Total number of HTTP requests processed",
      "# TYPE app_requests_total counter",
      `app_requests_total ${this.totalRequests}`,
      "# HELP app_process_uptime_seconds Total process uptime in seconds",
      "# TYPE app_process_uptime_seconds gauge",
      `app_process_uptime_seconds ${Math.floor((Date.now() - this.startTime) / 1000)}`,
      "# HELP app_memory_rss_bytes Resident Set Size in bytes",
      "# TYPE app_memory_rss_bytes gauge",
      `app_memory_rss_bytes ${process.memoryUsage().rss}`,
    ];

    for (const [code, count] of Object.entries(this.statusCodes)) {
      lines.push(`app_http_requests_by_status{status="${code}"} ${count}`);
    }

    return lines.join("\n") + "\n";
  }

  reset(): void {
    this.totalRequests = 0;
    this.statusCodes = {};
  }
}

export const metrics = new MetricsCollector();
