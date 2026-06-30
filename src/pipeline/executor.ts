import { VendorTool } from '../tools/vendor.tool';
import { SupportTool } from '../tools/support.tool';
import type { Intent } from './router';

export interface ExecutorContext {
  message: string;
  intent: Intent;
  latitude?: number;
  longitude?: number;
}

export interface ExecutionResult {
  toolData: Record<string, any>;
  needsLocation?: boolean;
}

export class ToolExecutor {
  static async execute(context: ExecutorContext): Promise<ExecutionResult> {
    const result: ExecutionResult = { toolData: {} };

    // Parallel Execution Array
    const promises: Promise<void>[] = [];

    if (context.intent === 'vendor_search') {
      if (!context.latitude || !context.longitude) {
        return { toolData: {}, needsLocation: true };
      }

      promises.push(
        VendorTool.searchVendors({
          searchQuery: context.message,
          latitude: context.latitude,
          longitude: context.longitude,
          limit: 5
        }).then(vendors => {
          result.toolData.vendors = vendors;
        })
      );
    }

    if (context.intent === 'support_faq') {
      promises.push(
        SupportTool.searchFAQ(context.message).then(faq => {
          result.toolData.faqInfo = faq;
        })
      );
    }

    // Execute all required tools in parallel
    await Promise.all(promises);

    return result;
  }
}
