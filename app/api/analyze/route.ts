export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    if (!file) {
      return NextResponse.json({ error: 'No photo uploaded' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const fileName = `${userId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('clothing')
      .upload(fileName, file, { contentType: file.type });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage.from('clothing').getPublicUrl(fileName);
    const publicUrl = urlData.publicUrl;

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.2-11b-vision-preview',
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: dataUrl } },
            { type: 'text', text: `Analyze this clothing item. Return ONLY a JSON object with this exact structure:
{
  "category": "bottom|top|shoes|accessory|dress|outerwear",
  "color": "primary color name",
  "style": "streetwear|classy|casual|y2k|minimal|vintage|sporty",
  "fit": "oversized|slim|regular|cropped|wide-leg|skinny",
  "fabric": "denim|cotton|leather|silk|linen|polyester|wool",
  "aesthetic": "short description of vibe",
  "description": "2 sentences describing the item",
  "occasions": ["casual"],
  "matching_colors": ["white", "black"],
  "matching_bottoms": ["jeans", "shorts"],
  "matching_tops": ["t-shirt", "blazer"]
}`}
          ]
        }],
        temperature: 0.2,
        max_tokens: 1024
      })
    });

    const groqData = await groqRes.json();
    const aiText = groqData.choices[0].message.content;

    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiText);

    const { data: item, error: dbError } = await supabase
      .from('clothing_items')
      .insert({
        user_id: userId,
        image_url: publicUrl,
        category: analysis.category,
        color: analysis.color,
        style: analysis.style,
        fit: analysis.fit,
        fabric: analysis.fabric,
        aesthetic: analysis.aesthetic,
        description: analysis.description,
        occasions: analysis.occasions,
        matching_colors: analysis.matching_colors,
        matching_bottoms: analysis.matching_bottoms,
        matching_tops: analysis.matching_tops
      })
      .select()
      .single();

    if (dbError) throw dbError;

    return NextResponse.json({ success: true, item });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}