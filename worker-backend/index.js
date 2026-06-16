
const PW_CLIENT_ID = "5eb393ee95fab7468a79d189";

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const params = url.searchParams;

        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        };

        if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

        // 1. GET FRESH TOKEN (Dynamic)
        if (url.pathname === "/token") {
            try {
                const res = await fetch('https://learnbyakp.online/api-credentials.js');
                const text = await res.text();
                // We'll try to find 'six' first, then 'four'
                const matchSix = text.match(/six\s*=\s*'Bearer\s+([^']+)'/);
                const matchFour = text.match(/four\s*=\s*'Bearer\s+([^']+)'/);
                const token = (matchSix ? matchSix[1] : (matchFour ? matchFour[1] : null));
                return new Response(JSON.stringify({ token }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            } catch (e) {
                return new Response(JSON.stringify({ token: null, error: e.message }), { headers: corsHeaders });
            }
        }

        // 2. PROXY PW API (Subjects, Topics, Contents)
        if (url.pathname === "/proxy") {
            const target = params.get("endpoint");
            const token = params.get("token");
            if (!target || !token) return new Response("Missing params", { status: 400 });

            try {
                const pwRes = await fetch(`https://api.penpencil.co${target}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Client-Id': PW_CLIENT_ID,
                        'Client-Type': 'WEB'
                    }
                });
                const data = await pwRes.text();
                return new Response(data, { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            } catch (e) {
                return new Response(JSON.stringify({ success: false, error: e.message }), { headers: corsHeaders });
            }
        }

        return new Response("Rahul Independent Bot Active", { headers: corsHeaders });
    }
};
