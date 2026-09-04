export type BugReportCategory = "bug" | "feature" | "question";

export interface BugReportMetadata {
  appVersion: string;
  os: string;
  route: string;
  proxyRunning: boolean;
  proxyPort?: number;
  installId?: string;
  timestamp: string;
}
