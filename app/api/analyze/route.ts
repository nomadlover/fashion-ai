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

    // Upload to storage
    const fileName = `${userId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('clothing')
      .upload(fileName, file, { contentType: file.type });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json({ error: `Storage failed: ${uploadError.message}` }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from('clothing').getPublicUrl(fileName);
    const publicUrl = urlData.publicUrl;

    // Convert to base64
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

    // PERMANENT FIX: Check if Groq returned an error
    if (groqData.error) {
      console.error('Groq API Error:', groqData.error);
      return NextResponse.json({ 
        error: `Groq AI Error: ${groqData.error.message || JSON.stringify(groqData.error)}` 
      }, { status: 500 });
    }

    if (!groqData.choices || !Array.isArray(groqData.choices) || groqData.choices.length === 0) {
      console.error('Groq unexpected response:', groqData);
      return NextResponse.json({ 
        error: `Groq returned no choices. Response: ${JSON.stringify(groqData).substring(0, 200)}` 
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
        error: `AI returned bad JSON. Raw response: ${aiText.substring(0, 300)}` 
      }, { status: 500 });
    }

    // Save to database with fallbacks for every field
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
        occasions: Array.isArray(analysis.occasions) ? analysis.occasions : [],
        matching_colors: Array.isArray(analysis.matching_colors) ? analysis.matching_colors : [],
        matching_bottoms: Array.isArray(analysis.matching_bottoms) ? analysis.matching_bottoms : [],
        matching_tops: Array.isArray(analysis.matching_tops) ? analysis.matching_tops : []
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json({ error: `Database failed: ${dbError.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, item });

  } catch (err: any) {
    console.error('Server crash:', err);
    return NextResponse.json({ error: err.message || 'Unknown server error' }, { status: 500 });
  }
}