export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { outfitId } = await req.json();
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: outfit } = await supabase
      .from('outfits')
      .select('*, outfit_pieces(*)')
      .eq('id', outfitId)
      .single();

    if (!outfit) return NextResponse.json({ error: 'Outfit not found' }, { status: 404 });

    const descriptions = outfit.outfit_pieces.map((p: any) => p.description || p.name).join(', ');
    
    const prompt = `Professional fashion photography, full body young model wearing ${descriptions}, clean white studio background, streetwear editorial style, sharp focus, natural lighting`;
    
    const encoded = encodeURIComponent(prompt);
    const imageUrl = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1536&nologo=true&seed=${outfitId.slice(0,8)}`;

    await supabase.from('outfits').update({ generated_image_url: imageUrl }).eq('id', outfitId);

    return NextResponse.json({ imageUrl });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}