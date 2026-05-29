export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const BRAND_URLS: Record<string, string> = {
  'ASOS': 'https://www.asos.com/search/?q=',
  'SHEIN': 'https://www.shein.com/search?query=',
  'Zara': 'https://www.zara.com/us/en/search?searchTerm=',
  'H&M': 'https://www2.hm.com/en_us/search-results.html?query=',
  'Urban Outfitters': 'https://www.urbanoutfitters.com/search?q=',
  'Uniqlo': 'https://www.uniqlo.com/us/en/search/?q='
};

function generateShoppingLinks(keywords: string) {
  const encoded = encodeURIComponent(keywords);
  return Object.entries(BRAND_URLS).map(([name, base]) => ({
    name,
    url: `${base}${encoded}`
  }));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { baseItemId, mode, preferences } = body;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: baseItem } = await supabase
      .from('clothing_items')
      .select('*')
      .eq('id', baseItemId)
      .single();

    if (!baseItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const prompt = `You are a Gen Z fashion stylist. The user owns this item: ${baseItem.description}
Category: ${baseItem.category}, Color: ${baseItem.color}, Style: ${baseItem.style}, Fit: ${baseItem.fit}

User preferences: ${JSON.stringify(preferences || {})}

Generate 3 complete outfits that include this item. Return ONLY a JSON object with this exact structure:
{
  "outfits": [
    {
      "name": "Creative Outfit Name",
      "occasion": "casual|party|work|date|street",
      "pieces": [
        {"role": "top", "name": "White Crop Top", "description": "Cotton crop top", "search_keywords": "white crop top", "estimated_price_usd": 25}
      ]
    }
  ]
}`;

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2048
      })
    });

    const groqData = await groqRes.json();
    const content = groqData.choices[0].message.content;
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);

    const savedOutfits = [];

    for (const outfit of result.outfits) {
      const { data: outfitRecord } = await supabase
        .from('outfits')
        .insert({
          user_id: baseItem.user_id,
          name: outfit.name,
          mode,
          base_item_id: baseItemId,
          occasion: outfit.occasion,
          budget_max: preferences?.budget ? parseInt(preferences.budget) : null,
          style_filter: preferences?.style || null,
          color_filter: preferences?.color || null
        })
        .select()
        .single();

      for (const piece of outfit.pieces) {
        await supabase.from('outfit_pieces').insert({
          outfit_id: outfitRecord.id,
          role: piece.role,
          name: piece.name,
          description: piece.description,
          search_keywords: piece.search_keywords,
          shopping_links: mode === 'shopping' ? generateShoppingLinks(piece.search_keywords) : null,
          is_owned: false
        });
      }

      await supabase.from('outfit_pieces').insert({
        outfit_id: outfitRecord.id,
        role: baseItem.category,
        name: baseItem.description,
        is_owned: true,
        owned_item_id: baseItemId
      });

      savedOutfits.push(outfitRecord);
    }

    return NextResponse.json({ success: true, outfits: savedOutfits });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}