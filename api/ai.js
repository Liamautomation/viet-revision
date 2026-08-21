/* Proxy DeepSeek pour les modes IA (traduction + écriture libre).
   Clé côté serveur (env DEEPSEEK_API_KEY) + code d'accès (env AI_ACCESS_CODE)
   pour que l'endpoint public ne soit pas utilisable par un tiers. */

const DS_URL = 'https://api.deepseek.com/chat/completions';

const SYS = {
    generate: `Tu es un professeur de vietnamien pour un débutant francophone (niveau A1-A2) vivant à Da Nang.
Tu écris un court texte EN ANGLAIS que l'élève devra traduire en vietnamien (du Sud).
Contraintes :
- Le texte doit être traduisible presque entièrement avec le vocabulaire fourni (liste de mots vietnamiens connus). Maximum 2-3 mots hors liste, simples.
- Sujets du quotidien (marché, café, présentation, famille, heure, transport...). Varie à chaque fois.
- Longueur selon "length" : court = 2 phrases, moyen = 3-4 phrases, long = 5-6 phrases.
- Anglais très simple (l'élève est français, l'anglais n'est qu'un support).
Réponds UNIQUEMENT en JSON : {"title":"titre court en français","english":"le texte anglais","hints":["3 à 6 mots vietnamiens utiles avec leur sens, format 'mot = sens'"]}`,

    'correct-translation': `Tu es un professeur de vietnamien (dialecte du Sud) pour un débutant francophone.
L'élève a traduit un texte anglais en vietnamien. Corrige sa traduction.
Règles :
- Toutes tes explications sont EN FRANÇAIS.
- Accepte les variantes correctes (pronoms différents mais cohérents, ordre naturel). Ne signale pas une "erreur" si c'est juste une autre façon correcte de dire.
- Ignore les majuscules et la ponctuation.
- Pour chaque vraie erreur : cite le passage fautif, donne la forme correcte, le type (vocabulaire | grammaire | ton/diacritique | ordre des mots | oubli), et POURQUOI en 1-2 phrases pédagogiques.
- score sur 10 (10 = parfait, sévérité honnête mais encourageante).
Réponds UNIQUEMENT en JSON : {"score":7,"corrected":"la traduction vietnamienne correcte complète","errors":[{"quote":"passage fautif ou «manquant»","fix":"forme correcte","type":"grammaire","why":"explication en français"}],"comment":"1 phrase de bilan en français"}`,

    'correct-free': `Tu es un professeur de vietnamien (dialecte du Sud) pour un débutant francophone qui vit à Da Nang.
L'élève a écrit librement en vietnamien. Corrige son texte.
Règles :
- Toutes tes explications sont EN FRANÇAIS.
- D'abord comprends ce qu'il a voulu dire, puis corrige vers la façon la plus NATURELLE de le dire à l'oral au Sud.
- Ignore les majuscules et la ponctuation.
- Pour chaque vraie erreur : cite le passage fautif, la forme correcte, le type (vocabulaire | grammaire | ton/diacritique | ordre des mots | naturel), et POURQUOI en 1-2 phrases pédagogiques.
- Si un passage est correct mais peu naturel, type = "naturel" et explique comment un Vietnamien le dirait.
- score sur 10, honnête mais encourageant.
- "followup" : 1 question simple en vietnamien pour relancer l'écriture (avec sa traduction française entre parenthèses).
Réponds UNIQUEMENT en JSON : {"score":6,"corrected":"le texte vietnamien corrigé complet","errors":[{"quote":"...","fix":"...","type":"...","why":"..."}],"comment":"1 phrase de bilan en français","followup":"Câu hỏi ? (traduction)"}`
};

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
    const { code, task, payload } = req.body || {};
    if (!process.env.AI_ACCESS_CODE || code !== process.env.AI_ACCESS_CODE)
        return res.status(401).json({ error: 'bad code' });
    if (!SYS[task] || !payload) return res.status(400).json({ error: 'bad task' });

    let user;
    if (task === 'generate') {
        user = `length: ${payload.length || 'court'}\nMots vietnamiens connus par l'élève :\n${(payload.words || []).join(', ')}\nGraine de variété : ${Math.floor(Math.random() * 1e6)}`;
    } else if (task === 'correct-translation') {
        if (!payload.attempt || !payload.english) return res.status(400).json({ error: 'empty' });
        user = `Texte anglais d'origine :\n${payload.english}\n\nTraduction de l'élève :\n${payload.attempt}`;
    } else {
        if (!payload.text) return res.status(400).json({ error: 'empty' });
        user = (payload.topic ? `Sujet proposé : ${payload.topic}\n\n` : '') + `Texte de l'élève :\n${payload.text}`;
    }

    try {
        const r = await fetch(DS_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [{ role: 'system', content: SYS[task] }, { role: 'user', content: user }],
                response_format: { type: 'json_object' },
                temperature: task === 'generate' ? 1.2 : 0.4,
                max_tokens: 2000
            })
        });
        if (!r.ok) {
            const t = await r.text();
            return res.status(502).json({ error: 'deepseek ' + r.status, detail: t.slice(0, 200) });
        }
        const data = await r.json();
        const out = JSON.parse(data.choices[0].message.content);
        return res.status(200).json(out);
    } catch (e) {
        return res.status(500).json({ error: String(e).slice(0, 200) });
    }
};
