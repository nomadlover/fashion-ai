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

    // Call Groq AI
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
  "category": "bottom",
  "color": "blue",
  "style": "casual",
  "fit": "regular",
  "fabric": "denim",
  "aesthetic": "minimal clean look",
  "description": "Classic blue denim jeans with straight leg cut.",
  "occasions": ["casual"],
  "matching_colors": ["white","black"],
  "matching_bottoms": ["jeans"],
  "matching_tops": ["t-shirt","shirt"]
}`}
          ]
        }],
        temperature: 0.2,
        max_tokens: 1024
      })
    });

    const groqData = await groqRes.json();

    // 🔥 CRITICAL FIX: Check if Groq returned an error
    if (!groqData.choices || groqData.choices.length === 0) {
      console.error('Groq Error:', groqData);
      return NextResponse.json({ 
        error: `Groq AI Error: ${groqData.error?.message || JSON.stringify(groqData)}` 
      }, { status: 500 });
    }

    const aiText = groqData.choices[0].message.content;

    // Extract JSON
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    let analysis;
    try {
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiText);
    } catch (e) {
      return NextResponse.json({ 
        error: `AI returned bad JSON: ${aiText.substring(0, 200)}` 
      }, { status: 500 });
    }

    // Save to database
    const { data: item, error: dbError } = await supabase
      .from('clothing_items')
      .insert({
        user_id: userId,
        image_url: publicUrl,
        category: analysis.category || 'unknown',
        color: analysis.color || 'unknown',
        style: analysis.style || 'casual',
        fit: analysis.fit || 'regular',
        fabric: analysis.fabric || 'cotton',
        aesthetic: analysis.aesthetic || '',
        description: analysis.description || '',
        occasions: analysis.occasions || [],
        matching_colors: analysis.matching_colors || [],
        matching_bottoms: analysis.matching_bottoms || [],
        matching_tops: analysis.matching_tops || []
      })
      .select()
      .single();

    if (dbError) throw dbError;

    return NextResponse.json({ success: true, item });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || 'Unknown server error' }, { status: 500 });
  }
}