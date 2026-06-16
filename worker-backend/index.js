
const PW_CLIENT_ID = "5eb393ee95fab7468a79d189";
const TOKEN_SOURCE = "https://learnbyakp.online/api-credentials.js";

// Multiple Spoofing Profiles
const PROFILES = [
  { agent: "PW-Android-12.0.2", version: "12.0.2", type: "ANDROID" },
  { agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", version: "2.1.6", type: "WEB" }
];

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': '*',
        };

        if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

        // 1. DYNAMIC TOKEN WITH CACHING
        if (url.pathname === "/token") {
            let token = await env.NOTIF_KV.get("current_bearer");
            if (!token) {
                token = await this.refreshGlobalToken(env);
            }
            return new Response(JSON.stringify({ token }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // 2. ADVANCED PROXY (SPOOFING & RETRY)
        if (url.pathname === "/proxy") {
            const endpoint = url.searchParams.get("endpoint");
            const token = url.searchParams.get("token") || await env.NOTIF_KV.get("current_bearer");
            
            if (!endpoint) return new Response("Error: No Endpoint", { status: 400 });

            const profile = PROFILES[Math.floor(Math.random() * PROFILES.length)];
            const randomId = "c8" + Math.random().toString(36).substring(2, 12);

            try {
                const response = await fetch(`https://api.penpencil.co${endpoint}`, {
                    method: request.method,
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Client-Id': PW_CLIENT_ID,
                        'Client-Type': profile.type,
                        'Version': profile.version,
                        'randomid': randomId,
                        'User-Agent': profile.agent,
                        'Content-Type': 'application/json'
                    },
                    body: request.method === "POST" ? await request.text() : null
                });

                const data = await response.text();
                // Auto-refresh token if 403/401 occurs
                if (response.status === 403 || response.status === 401) {
                    await this.refreshGlobalToken(env);
                    return new Response(JSON.stringify({ success: false, retry: true, code: response.status }), { headers: corsHeaders });
                }

                return new Response(data, { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            } catch (e) {
                return new Response(JSON.stringify({ success: false, error: e.message }), { headers: corsHeaders });
            }
        }

        // 3. REGISTRATION (For Push)
        if (url.pathname === "/register") {
            const batchId = url.searchParams.get("batchId");
            if (batchId) await env.NOTIF_KV.put(`active_${batchId}`, "true");
            return new Response("Registered", { headers: corsHeaders });
        }

        return new Response("Rahul God Mode Active", { headers: corsHeaders });
    },

    async refreshGlobalToken(env) {
        try {
            const res = await fetch(TOKEN_SOURCE);
            const text = await res.text();
            const match = text.match(/six\s*=\s*'Bearer\s+([^']+)'/) || text.match(/four\s*=\s*'Bearer\s+([^']+)'/);
            const token = match ? match[1] : null;
            if (token) await env.NOTIF_KV.put("current_bearer", token, { expirationTtl: 3600 });
            return token;
        } catch (e) { return null; }
    },

    async scheduled(event, env, ctx) {
        // Continuous monitoring logic...
    }
};
