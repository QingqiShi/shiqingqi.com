import "server-only";
import { CONTEXT_MANAGEMENT_CONFIG } from "./context-management-shared";

export const contextManagementProviderOptions = {
  anthropic: { contextManagement: CONTEXT_MANAGEMENT_CONFIG },
};
