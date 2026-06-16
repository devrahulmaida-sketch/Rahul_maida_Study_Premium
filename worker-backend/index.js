
const PW_CLIENT_ID = "5eb393ee95fab7468a79d189";

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const params = url.searchParams;

        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, app_id, platform, user_id, Version, client-id, client-type, randomid',
        };

        if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

        // 1. GET FRESH TOKEN (Dynamic from AKP)
        if (url.pathname === "/token") {
            try {
                const res = await fetch('https://learnbyakp.online/api-credentials.js');
                const text = await res.text();
                const matchSix = text.match(/six\s*=\s*'Bearer\s+([^']+)'/);
                const matchFour = text.match(/four\s*=\s*'Bearer\s+([^']+)'/);
                const token = (matchSix ? matchSix[1] : (matchFour ? matchFour[1] : null));
                return new Response(JSON.stringify({ token }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            } catch (e) {
                return new Response(JSON.stringify({ token: "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJleHAiOjE3ODE3MDM2NTYuMzE1LCJkYXRhIjp7Il9pZCI6IjY5YjRmN2RhMGQyOTk0ZjE3MTliMjBlMCIsInVzZXJuYW1lIjoiODcyNjgzMjk0MiIsImZpcnN0TmFtZSI6Ik5pa2hpbCIsImxhc3ROYW1lIjoiIiwib3JnYW5pemF0aW9uIjp7Il9pZCI6IjVlYjM5M2VlOTVmYWI3NDY4YTc5ZDE4OSIsIndlYnNpdGUiOiJwaHlzaWNzd2FsbGFoLmNvbSIsIm5hbWUiOiJQaHlzaWNzd2FsbGFoIn0sInJvbGVzIjpbIjViMjdiZDk2NTg0MmY5NTBhNzc4YzZlZiJdLCJjb3VudHJ5R3JvdXAiOiJJTiIsIm9uZVJvbGVzIjpbXSwidHlwZSI6IlVTRVIifSwianRpIjoiOFBwa2RRejdRN3VWa0wyNXNtSmJFd182OWI0ZjdkYTBkMjk5NGYxNzE5YjIwZTAiLCJpYXQiOjE3ODEwOTg4NTZ9.5vM0jZUjaeVWr_EwW2bmgdlPXBgcOXVlDAIQ95Y6ezw" }), { headers: corsHeaders });
            }
        }

        // 2. PROXY PW API WITH FULL MOBILE HEADERS
        if (url.pathname === "/proxy") {
            const target = params.get("endpoint");
            const token = params.get("token");
            if (!target || !token) return new Response("Missing params", { status: 400 });

            // Generate a random ID to look like a mobile device
            const randomId = "c8" + Math.random().toString(36).substring(2, 15);

            try {
                const pwRes = await fetch(`https://api.penpencil.co${target}`, {
                    method: request.method,
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Client-Id': PW_CLIENT_ID,
                        'Client-Type': 'WEB',
                        'Version': '2.1.6',
                        'randomid': randomId,
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                        'Content-Type': 'application/json',
                        'Accept': 'application/json, text/plain, */*'
                    }
                });
                const data = await pwRes.text();
                return new Response(data, { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            } catch (e) {
                return new Response(JSON.stringify({ success: false, error: e.message }), { headers: corsHeaders });
            }
        }

        return new Response("Rahul Advanced Proxy Active", { headers: corsHeaders });
    }
};
