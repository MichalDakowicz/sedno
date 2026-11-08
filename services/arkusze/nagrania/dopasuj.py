"""Dopasowanie pytań ze słuchania do fragmentów nagrania.

Dla każdego zadania ze słuchania model językowy dostaje pytania z poprawną odpowiedzią
i ponumerowaną transkrypcję (z transkrybuj.py) i wskazuje fragmenty, w których przy
pierwszym odtworzeniu pada odpowiedź. Wynik:
  data/nagrania/<id>-fragmenty.json   { "1.1": { "od": 12.3, "do": 25.0, "tekst": "…" }, … }
który importuj.js dokleja do pytań, a ten skrypt od razu dopisuje też do
data/arkusze/<id>.json (bez ponownego importu). Potem `npm run wgraj`.

Klucz OpenAI: OPENAI_API_KEY w środowisku albo w pliku .env w katalogu głównym repo.
Model: DOPASUJ_MODEL (domyślnie gpt-6-luna), myślenie: DOPASUJ_WYSILEK (domyślnie xhigh, „bardzo wysokie”).

Użycie: python services/arkusze/nagrania/dopasuj.py [fragment id]
"""

import json
import re
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

GLOWNY = Path(__file__).resolve().parents[3]
ARKUSZE = GLOWNY / "data" / "arkusze"
NAGRANIA = GLOWNY / "data" / "nagrania"
MODEL = os.environ.get("DOPASUJ_MODEL", "gpt-6-luna")
WYSILEK = os.environ.get("DOPASUJ_WYSILEK", "xhigh")
ZAPAS = 0.4  # sekundy przed i po fragmencie, żeby nie uciąć pierwszego i ostatniego słowa
MIN_DLUGOSC = 4.0  # sekundy; krótszy fragment nie daje kontekstu
WYGLADA_NA_POLSKI = re.compile(r"[ąćęłńśźż]|\b(się|jest|nie|czy|może|który|jak)\b", re.IGNORECASE)

_model = None


def po_angielsku(mp3: Path, od: float, do: float) -> str:
    """Przepisuje kawałek nagrania Whisperem z wymuszonym angielskim (model ładowany raz, przy potrzebie)."""
    global _model
    if _model is None:
        sys.path.insert(0, str(Path(__file__).resolve().parent))
        from transkrybuj import MODEL as WHISPER, biblioteki_cuda

        biblioteki_cuda()
        from faster_whisper import WhisperModel

        _model = WhisperModel(WHISPER, device="cuda", compute_type="float16")
    segmenty, _ = _model.transcribe(str(mp3), language="en", beam_size=5, clip_timestamps=[od, do])
    return " ".join(s.text.strip() for s in segmenty).strip()

POLECENIE = """Dostajesz transkrypcję nagrania z matury z języka angielskiego (ponumerowane fragmenty \
z czasem w sekundach) i pytania jednego zadania ze słuchania z poprawnymi odpowiedziami. \
Każdy tekst jest w nagraniu odtwarzany dwukrotnie; interesuje nas PIERWSZE odtworzenie. \
Dla każdego pytania wskaż najkrótszy ciągły zakres fragmentów, w którym pada informacja \
rozstrzygająca o poprawnej odpowiedzi (zwykle 1–4 fragmenty). Polecenia lektora po polsku \
nie są odpowiedzią. Odpowiedz wyłącznie JSON-em: {"<numer pytania>": {"od": <nr fragmentu>, \
"do": <nr fragmentu>}, ...}. Jeśli nie da się wskazać, pomiń pytanie."""


def klucz_openai() -> str:
    if os.environ.get("OPENAI_API_KEY"):
        return os.environ["OPENAI_API_KEY"]
    env = GLOWNY / ".env"
    if env.exists():
        for linia in env.read_text(encoding="utf-8").splitlines():
            if linia.startswith("OPENAI_API_KEY="):
                return linia.split("=", 1)[1].strip().strip('"')
    sys.exit("Brak OPENAI_API_KEY (w środowisku albo w .env w katalogu głównym repo).")


def zapytaj(klucz: str, tresc: str) -> dict:
    cialo = {
        "model": MODEL,
        "reasoning_effort": WYSILEK,
        "response_format": {"type": "json_object"},
        "messages": [{"role": "system", "content": POLECENIE}, {"role": "user", "content": tresc}],
    }
    zapytanie = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=json.dumps(cialo).encode(),
        headers={"Authorization": f"Bearer {klucz}", "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(zapytanie, timeout=300) as odp:
            dane = json.load(odp)
    except urllib.error.HTTPError as e:
        sys.exit(f"OpenAI {e.code}: {e.read().decode(errors='replace')[:500]}")
    return json.loads(dane["choices"][0]["message"]["content"])


def opis_pytania(p: dict, opcje_zadania: list) -> str:
    opcje = p.get("opcje") or opcje_zadania
    tekst = f"{p['nr']}. {p.get('tresc', '')}".strip()
    if opcje:
        tekst += "\n" + "\n".join(f"   {o['litera']}. {o['tresc']}" for o in opcje)
    if p.get("poprawna"):
        tekst += f"\n   Poprawna: {p['poprawna']}"
    elif p.get("oczekiwane"):
        tekst += f"\n   Poprawna: {' / '.join(p['oczekiwane'][:3])}"
    return tekst


def main() -> None:
    filtr = sys.argv[1] if len(sys.argv) > 1 else ""
    klucz = klucz_openai()
    for trans in sorted(NAGRANIA.glob("*.json")):
        if trans.stem.endswith("-fragmenty") or filtr not in trans.stem:
            continue
        id_ = trans.stem
        cel = NAGRANIA / f"{id_}-fragmenty.json"
        if cel.exists():
            continue
        arkusz_plik = ARKUSZE / f"{id_}.json"
        if not arkusz_plik.exists():
            continue
        arkusz = json.loads(arkusz_plik.read_text(encoding="utf-8"))
        segmenty = json.loads(trans.read_text(encoding="utf-8"))["segmenty"]
        lista = "\n".join(f"[{i}] {s['od']:.1f}–{s['do']:.1f} {s['tekst']}" for i, s in enumerate(segmenty))
        fragmenty = {}
        for z in arkusz["zadania"]:
            if not z.get("sluchanie"):
                continue
            opcje_zadania = next((b["opcje"] for b in z["bloki"] if b["typ"] == "opcje"), [])
            pytania = "\n".join(opis_pytania(p, opcje_zadania) for p in z["pytania"])
            polecenie = " ".join(z.get("polecenie", []))
            odp = zapytaj(klucz, f"Zadanie {z['nr']}. {polecenie}\n\nPYTANIA:\n{pytania}\n\nTRANSKRYPCJA:\n{lista}")
            for nr, zakres in odp.items():
                try:
                    a, b = int(zakres["od"]), int(zakres["do"])
                except (KeyError, TypeError, ValueError):
                    continue
                if not (0 <= a <= b < len(segmenty)) or b - a > 12:
                    continue  # zakres spoza nagrania albo podejrzanie długi
                # Samo „is three weeks.” nic nie mówi: krótki fragment dostaje zdanie wcześniej.
                if a > 0 and segmenty[b]["do"] - segmenty[a]["od"] < MIN_DLUGOSC:
                    a -= 1
                od, do = round(max(0, segmenty[a]["od"] - ZAPAS), 1), round(segmenty[b]["do"] + ZAPAS, 1)
                tekst = " ".join(s["tekst"] for s in segmenty[a : b + 1])
                # Whisper z rozpoznawaniem języka per fragment czasem bierze angielski fragment za polski
                # i go tłumaczy; taki kawałek przepisujemy jeszcze raz z wymuszonym angielskim.
                if WYGLADA_NA_POLSKI.search(tekst):
                    tekst = po_angielsku(NAGRANIA / f"{id_}.mp3", od, do) or tekst
                fragmenty[nr] = {"od": od, "do": do, "tekst": tekst}
        cel.write_text(json.dumps(fragmenty, ensure_ascii=False, indent=1), encoding="utf-8")
        for z in arkusz["zadania"]:
            for p in z["pytania"]:
                if p["nr"] in fragmenty:
                    p["fragment"] = fragmenty[p["nr"]]
        arkusz_plik.write_text(json.dumps(arkusz, ensure_ascii=False, indent=1), encoding="utf-8")
        wszystkie = sum(len(z["pytania"]) for z in arkusz["zadania"] if z.get("sluchanie"))
        print(f"{id_}: dopasowano {len(fragmenty)} z {wszystkie} pytań", flush=True)


if __name__ == "__main__":
    main()
