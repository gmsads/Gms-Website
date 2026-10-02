import { Container } from "@cloudflare/containers";

export class Backend extends Container {
  defaultPort = 5000;
  sleepAfter = "24h"; // keep warm: avoids cold starts

  constructor(ctx, env) {
    super(ctx, env);
    this.envVars = {
      MONGODB_URI: env.MONGODB_URI,
      TWILIO_ACCOUNT_SID: env.TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN: env.TWILIO_AUTH_TOKEN,
      ADMIN_PHONE: env.ADMIN_PHONE,
      CLOUDINARY_CLOUD_NAME: env.CLOUDINARY_CLOUD_NAME,
      CLOUDINARY_API_KEY: env.CLOUDINARY_API_KEY,
      CLOUDINARY_API_SECRET: env.CLOUDINARY_API_SECRET,
      PRODUCTION_DOMAIN: env.PRODUCTION_DOMAIN,
      INTERNAL_SECRET: env.INTERNAL_SECRET,
      WORKER_URL: env.WORKER_URL,
    };
  }
}

// Atlas cluster is in Mumbai: pin the container to Asia-Pacific (hint applies when the object is first created)
const backend = (env) => env.BACKEND.get(env.BACKEND.idFromName("main-apac-2"), { locationHint: "apac" });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Internal: container stores uploads in R2 through this endpoint
    if (url.pathname.startsWith("/_r2/")) {
      if (request.method !== "PUT" || request.headers.get("x-internal-secret") !== env.INTERNAL_SECRET) {
        return new Response("Forbidden", { status: 403 });
      }
      const key = decodeURIComponent(url.pathname.slice("/_r2/".length));
      await env.UPLOADS.put(key, request.body, {
        httpMetadata: { contentType: request.headers.get("content-type") || undefined },
      });
      return new Response("ok");
    }

    // Public: serve uploaded files from R2
    if (url.pathname.startsWith("/uploads/") && (request.method === "GET" || request.method === "HEAD")) {
      const obj = await env.UPLOADS.get(decodeURIComponent(url.pathname.slice(1)));
      if (!obj) return new Response("Not found", { status: 404 });
      const headers = new Headers({ "access-control-allow-origin": "*", "cache-control": "public, max-age=86400" });
      obj.writeHttpMetadata(headers);
      return new Response(obj.body, { headers });
    }

    return backend(env).fetch(request);
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      backend(env).fetch(
        new Request("http://container/internal/run-reminders", {
          method: "POST",
          headers: { "x-internal-secret": env.INTERNAL_SECRET },
        }),
      ),
    );
  },
};
