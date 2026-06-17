
const PW_CLIENT_ID = "5eb393ee95fab7468a79d189";
const TOKEN_SOURCE = "https://learnbyakp.online/api-credentials.js";

// Advanced Spoofing Profiles
const PROFILES = [
  { agent: "PW-Android/2.1.6 (Linux; U; Android 12; Pixel 6)", version: "2.1.6", type: "ANDROID", platform: "2" },
  { agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36", version: "2.1.6", type: "WEB", platform: "3" }
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

        // 1. TOKEN MANAGEMENT (Self-Healing)
        if (url.pathname === "/token") {
            let token = await env.NOTIF_KV.get("current_bearer");
            if (!token || url.searchParams.has("refresh")) {
                token = await this.refreshGlobalToken(env);
            }
            return new Response(JSON.stringify({ token }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // 2. ADVANCED PW PROXY
        if (url.pathname === "/proxy") {
            const endpoint = url.searchParams.get("endpoint");
            let token = url.searchParams.get("token") || await env.NOTIF_KV.get("current_bearer");
            
            if (!endpoint) return new Response("Error: No Endpoint", { status: 400 });

            // Randomize profile to bypass IP/Signature patterns
            const profile = PROFILES[Math.floor(Math.random() * PROFILES.length)];
            const randomId = "c8" + Math.random().toString(36).substring(2, 12);

            try {
                let pwRes = await fetch(`https://api.penpencil.co${endpoint}`, {
                    method: request.method,
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Client-Id': PW_CLIENT_ID,
                        'Client-Type': profile.type,
                        'Version': profile.version,
                        'Platform': profile.platform,
                        'User-Agent': profile.agent,
                        'RandomId': randomId,
                        'Content-Type': 'application/json'
                    },
                    body: request.method === "POST" ? await request.text() : null
                });

                // If 401/403, try refreshing token once
                if (pwRes.status === 401 || pwRes.status === 403) {
                    token = await this.refreshGlobalToken(env);
                    pwRes = await fetch(`https://api.penpencil.co${endpoint}`, {
                        method: request.method,
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Client-Id': PW_CLIENT_ID,
                            'Client-Type': profile.type,
                            'Version': profile.version,
                            'Platform': profile.platform,
                            'User-Agent': profile.agent,
                            'RandomId': randomId,
                            'Content-Type': 'application/json'
                        },
                        body: request.method === "POST" ? await request.text() : null
                    });
                }

                const data = await pwRes.text();
                return new Response(data, { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            } catch (e) {
                return new Response(JSON.stringify({ success: false, error: e.message }), { headers: corsHeaders });
            }
        }

        return new Response("Rahul Premium God-Mode Proxy Active", { headers: corsHeaders });
    },

    async refreshGlobalToken(env) {
        try {
            const res = await fetch(TOKEN_SOURCE);
            const text = await res.text();
            // Match 'six' or 'four' variable values
            const match = text.match(/six\s*=\s*'Bearer\s+([^']+)'/) || text.match(/four\s*=\s*'Bearer\s+([^']+)'/);
            if (match && match[1]) {
                const token = match[1];
                await env.NOTIF_KV.put("current_bearer", token, { expirationTtl: 86400 });
                return token;
            }
        } catch (e) { console.error("Token refresh failed"); }
        return "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJleHAiOjE3ODE3MDM2NTYuMzE1LCJkYXRhIjp7Il9pZCI6IjY5YjRmN2RhMGQyOTk0ZjE3MTliMjBlMCIsInVzZXJuYW1lIjoiODcyNjgzMjk0MiIsImZpcnN0TmFtZSI6Ik5pa2hpbCIsImxhc3ROYW1lIjoiIiwib3JnYW5pemF0aW9uIjp7Il9pZCI6IjVlYjM5M2VlOTVmYWI3NDY4YTc5ZDE4OSIsIndlYnNpdGUiOiJwaHlzaWNzd2FsbGFoLmNvbSIsIm5hbWUiOiJQaHlzaWNzd2FsbGFoIn0sInJvbGVzIjpbIjViMjdiZDk2NTg0MmY5NTBhNzc4YzZlZiJdLCJjb3VudHJ5R3JvdXAiOiJJTiIsIm9uZVJvbGVzIjpbXSwidHlwZSI6IlVTRVIifSwianRpIjoiOFBwa2RRejdRN3VWa0wyNXNtSmJFd182OWI0ZjdkYTBkMjk5NGYxNzE5YjIwZTAiLCJpYXQiOjE3ODEwOTg4NTZ9.5vM0jZUjaeVWr_EwW2bmgdlPXBgcOXVlDAIQ95Y6ezw"; // Last known working fallback
    }
};
