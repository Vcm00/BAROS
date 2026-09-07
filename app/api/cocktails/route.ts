import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim();
  if (!query) return NextResponse.json({ drinks: [] });
  const key = process.env.COCKTAILDB_API_KEY || '1';
  const response = await fetch(`https://www.thecocktaildb.com/api/json/v1/${key}/search.php?s=${encodeURIComponent(query)}`, { next: { revalidate: 3600 } });
  if (!response.ok) return NextResponse.json({ error: 'No se pudo consultar TheCocktailDB' }, { status: 502 });
  const data = await response.json();
  return NextResponse.json(data);
}