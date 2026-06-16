
const GF_CONFIG = {
    APP_ID: "1770981347",
    PLATFORM: "3",
    VERSION: "1"
};

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const params = url.searchParams;

        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, app_id, platform, user_id, Version',
        };

        if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

        // 1. GET FRESH TOKEN (Dynamic)
        if (url.pathname === "/token") {
            try {
                const res = await fetch('https://learnbyakp.online/api-credentials.js');
                const text = await res.text();
                const matchSix = text.match(/six\s*=\s*'Bearer\s+([^']+)'/);
                const matchFour = text.match(/four\s*=\s*'Bearer\s+([^']+)'/);
                const token = (matchSix ? matchSix[1] : (matchFour ? matchFour[1] : null));
                return new Response(JSON.stringify({ token }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            } catch (e) {
                return new Response(JSON.stringify({ token: null }), { headers: corsHeaders });
            }
        }

        // 2. MOBILE PROXY (The Gloryfuel Way)
        if (url.pathname === "/proxy") {
            const target = params.get("endpoint");
            const token = params.get("token");
            const method = request.method;
            const body = await (method === "POST" ? request.text() : null);

            // Target is typically api.studystark.com or penpencil's hidden endpoints
            // Based on Gloryfuel, it's often a custom wrapper. 
            // We'll target PenPencil's mobile endpoints.
            const pwUrl = `https://api.penpencil.co${target}`;

            try {
                const pwRes = await fetch(pwUrl, {
                    method: method,
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'app_id': GF_CONFIG.APP_ID,
                        'platform': GF_CONFIG.PLATFORM,
                        'Version': GF_CONFIG.VERSION,
                        'Content-Type': 'application/json',
                        'accept': 'application/json, text/plain, */*'
                    },
                    body: body
                });
                const data = await pwRes.text();
                return new Response(data, { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            } catch (e) {
                return new Response(JSON.stringify({ success: false, error: e.message }), { headers: corsHeaders });
            }
        }

        return new Response("Rahul Mobile Proxy Active", { headers: corsHeaders });
    }
};
