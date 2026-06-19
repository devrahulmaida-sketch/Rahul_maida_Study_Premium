
const PW_CLIENT_ID = "5eb393ee95fab7468a79d189";
const TOKEN_SOURCE = "https://learnbyakp.online/api-credentials.js";

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': '*',
        };

        if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

        // 1. DYNAMIC PW TOKEN
        if (url.pathname === "/token") {
            try {
                const res = await fetch(TOKEN_SOURCE);
                const text = await res.text();
                const match = text.match(/six\s*=\s*'Bearer\s+([^']+)'/) || text.match(/four\s*=\s*'Bearer\s+([^']+)'/);
                const token = match ? match[1] : null;
                return new Response(JSON.stringify({ token }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            } catch (e) { return new Response(JSON.stringify({ token: null }), { headers: corsHeaders }); }
        }

        // 2. PW PROXY
        if (url.pathname === "/proxy") {
            const target = url.searchParams.get("endpoint");
            const token = url.searchParams.get("token");
            if (!target) return new Response("No endpoint", { status: 400 });

            const pwRes = await fetch(`https://api.penpencil.co${target}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Client-Id': PW_CLIENT_ID,
                    'Client-Type': 'WEB',
                    'Version': '2.1.6'
                }
            });
            const data = await pwRes.text();
            return new Response(data, { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // 3. NEXT TOPPERS PROXY (Final Robust Headers)
        if (url.pathname === "/nexttoppers") {
            const target = url.searchParams.get("endpoint");
            if (!target) return new Response("No endpoint", { status: 400 });

            try {
                const ntRes = await fetch(`https://nt.rarestudy.in${target}`, {
                    method: request.method,
                    headers: {
                        'Accept': 'application/json, text/plain, */*',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                        'Referer': 'https://rarestudy.in/',
                        'Origin': 'https://rarestudy.in'
                    }
                });
                const data = await ntRes.text();
                return new Response(data, { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            } catch (e) {
                return new Response(JSON.stringify({ success: false, error: e.message }), { headers: corsHeaders });
            }
        }

        return new Response("Rahul Multi-Proxy Active", { headers: corsHeaders });
    }
};
