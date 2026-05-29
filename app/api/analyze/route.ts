export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    // 1. Grab the photo and user ID from the form
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    if (!file) {
      return NextResponse.json({ error: 'No photo uploaded' }, { status: 400 });
    }

    // 2. Connect to Supabase (using the secret master key)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 3. Save the photo to Supabase Storage bucket "clothing"
    const fileName = `${userId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('clothing')
      .upload(fileName, file, { contentType: file.type });

    if (uploadError) throw uploadError;

    // 4. Get the public link so we can show the photo later
    const { data: urlData } = supabase.storage.from('clothing').getPublicUrl(fileName);
    const publicUrl = urlData.publicUrl;

    // 5. Convert the photo to base64 text so AI can read it
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;

    // 6. Send the photo to Groq AI Vision
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

    // 7. Pull the JSON out of the AI's response
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiText);

    // 8. Save the AI analysis + photo link to the database
    const { data: item, error: dbError } = await supabase
      .from('clothing_items')
      .insert({
        user_id: userId,
        image_url: publicUrl,
        ...analysis
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