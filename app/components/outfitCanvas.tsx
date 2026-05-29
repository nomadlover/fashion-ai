'use client';

import { useEffect, useRef } from 'react';

export default function OutfitCanvas({ baseImageUrl, pieces }: { baseImageUrl: string, pieces: any[] }) {
  const canvasRef = useRef<<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    canvas.width = 400;
    canvas.height = 600;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 400, 600);

    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(200, 100, 40, 50, 0, 0, Math.PI * 2);
    ctx.moveTo(200, 150);
    ctx.lineTo(200, 350);
    ctx.lineTo(150, 550);
    ctx.moveTo(200, 350);
    ctx.lineTo(250, 550);
    ctx.moveTo(200, 180);
    ctx.lineTo(130, 280);
    ctx.moveTo(200, 180);
    ctx.lineTo(270, 280);
    ctx.stroke();

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.drawImage(img, 120, 220, 160, 200);
      
      ctx.fillStyle = '#000';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText("Your Item", 120, 210);

      const missingPieces = pieces.filter(p => !p.is_owned);
      missingPieces.forEach((piece, i) => {
        const y = 30 + i * 90;
        ctx.fillStyle = '#f3f4f6';
        ctx.fillRect(20, y, 360, 80);
        ctx.strokeStyle = '#d1d5db';
        ctx.strokeRect(20, y, 360, 80);
        
        ctx.fillStyle = '#000';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText(`${piece.role.toUpperCase()}: ${piece.name}`, 30, y + 25);
        ctx.fillStyle = '#6b7280';
        ctx.font = '12px sans-serif';
        ctx.fillText(piece.search_keywords, 30, y + 50);
        ctx.fillStyle = '#2563eb';
        ctx.fillText("Click shopping links below", 30, y + 68);
      });
    };
    img.src = baseImageUrl;
  }, [baseImageUrl, pieces]);

  return <canvas ref={canvasRef} className="w-full max-w-sm border rounded-lg shadow-sm bg-white" />;
}