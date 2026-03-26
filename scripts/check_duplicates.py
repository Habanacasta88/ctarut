#!/usr/bin/env python3
"""
Detección de duplicados semánticos para labradores.org.
Usar SIEMPRE antes de añadir nuevos posts.

Uso:
  python3 scripts/check_duplicates.py "los perros pueden comer espinacas"
  python3 scripts/check_duplicates.py "metronidazol para perros"
  python3 scripts/check_duplicates.py "cruce labrador con jack russell"
"""
import json, re, sys
from difflib import SequenceMatcher

POSTS_FILE = 'src/data/posts.json'

# Palabras que NO son el tema clave — ignorarlas al comparar
STRUCTURAL = {
    'los','las','el','la','un','una','de','del','con','para','que','es','se',
    'puede','pueden','comer','perros','perro','dar','a','en','al','y','o','u',
    'por','sin','como','si','son','esta','este','hay','sus','su','mi','lo',
    'le','les','nos','tu','te','me','mas','muy','cruce','mezcla','mix','guia',
    'completa','todo','sobre','este','raza','caracteristicas','temperamento',
    'salud','cuidados','cuales','cual','cuando','donde','como','que','dosis',
    'seguro','peligroso','toxico','beneficios','efectos','secundarios',
    'tratamiento','uso','usos','informacion','conocer','saber','hacer',
}

def normalize(s):
    s = s.lower()
    for a, b in [('á','a'),('é','e'),('í','i'),('ó','o'),('ú','u'),('ñ','n'),('ü','u')]:
        s = s.replace(a, b)
    return re.sub(r'[^a-z0-9\s]', ' ', s)

def extract_keywords(text):
    """Extrae solo las palabras temáticas (sin stopwords estructurales)."""
    words = normalize(text).split()
    return [w for w in words if w not in STRUCTURAL and len(w) > 2]

def buscar(query):
    with open(POSTS_FILE) as f:
        posts = json.load(f)

    query_kws = set(extract_keywords(query))
    if not query_kws:
        print(f'No se pudieron extraer keywords de: "{query}"')
        return []

    resultados = []
    for p in posts:
        slug_kws  = set(extract_keywords(p['slug']))
        title_kws = set(extract_keywords(p['title']))
        post_kws  = slug_kws | title_kws

        # Score: % de keywords de la query que aparecen en el post
        hit = len(query_kws & post_kws)
        score = hit / len(query_kws)

        # Bonus si todas las keywords coinciden
        if score > 0.99:
            score = 1.0

        if score >= 0.6:
            resultados.append((score, hit, len(query_kws), p['slug'], p['title'], p.get('category_name','')))

    return sorted(resultados, reverse=True)[:6]

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('Uso: python3 scripts/check_duplicates.py "tema a buscar"')
        sys.exit(1)

    query = ' '.join(sys.argv[1:])
    query_kws = extract_keywords(query)
    print(f'\n🔍 Query: "{query}"')
    print(f'   Keywords extraídas: {query_kws}\n')

    resultados = buscar(query)

    if resultados:
        print('Posts más similares:')
        for score, hit, total, slug, title, cat in resultados:
            bar = '█' * int(score * 10) + '░' * (10 - int(score * 10))
            print(f'  [{bar}] {score:.0%} ({hit}/{total} kw)  [{cat}]')
            print(f'    {title}')
            print(f'    /{slug}/')
        print()
        top = resultados[0][0]
        if top >= 1.0:
            print('🚫 DUPLICADO EXACTO — no crear este post')
        elif top >= 0.8:
            print('⚠️  MUY SIMILAR — revisar si cubre lo mismo antes de crear')
        else:
            print('✅ Sin duplicados claros — seguro crear el post')
    else:
        print('✅ Sin coincidencias — seguro crear el post')
