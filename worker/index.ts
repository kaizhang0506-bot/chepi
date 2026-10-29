import handler from "vinext/server/fetch-handler";
import {accountApi} from './account';
import {generationApi} from './generation';
import {analysisApi} from './analysis';
import {localSegmentation} from './local-segmentation';
import { runWithConnectorBinding } from "../lib/connector-context";
import type { ConnectorBinding } from "../lib/connector-contract.mjs";

const worker = {
  fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext<{ CONNECTORS?: ConnectorBinding }>) {
    const pathname = new URL(request.url).pathname;
    if(pathname==='/api/local-segment')return localSegmentation(request);
    if(pathname.startsWith('/api/account/'))return accountApi(request,env);
    if(pathname.startsWith('/api/generate')||pathname.startsWith('/api/generated/')||pathname==='/api/inpaint'||pathname==='/api/upload-layer')return generationApi(request);
    if(pathname.startsWith('/api/analyze')||pathname.startsWith('/api/separate')||pathname.startsWith('/api/tag-case'))return analysisApi(request);
    let binding = ctx.props?.CONNECTORS;
    // Local preview emulates the same request-scoped capability. This branch and
    // the auxiliary service binding are absent from production builds.
    if (import.meta.env.DEV && !binding && env.CONNECTORS) {
      const preview = env.CONNECTORS;
      const expiresAt = Date.now() + 60_000;
      binding = {
        async getContext() {
          if (Date.now() >= expiresAt) return { status: "request_context_expired" };
          return preview.getContext?.() ?? { status: "binding_unavailable" };
        },
        async invoke(connectorId, actionName, args) {
          if (Date.now() >= expiresAt) {
            return { status: "request_context_expired", message: "This request has expired. Please try again." };
          }
          return preview.invoke(connectorId, actionName, args);
        },
      };
    }
    return runWithConnectorBinding(binding, () => handler.fetch(request, env, ctx));
  },
};

export default worker;
