"""Transkrypcja nagrań CKE do zadań ze słuchania.

Pobiera mp3 z adresu w arkuszu (pole `nagranie` w data/arkusze/<id>.json) do
data/nagrania/<id>.mp3 i zapisuje transkrypcję ze znacznikami czasu do
data/nagrania/<id>.json. Nagrania i transkrypcje mają prawa autorskie CKE,
więc zostają w data/ (poza repozytorium).

Użycie (z katalogu głównego repo, w środowisku z faster-whisper i CUDA):
    python services/arkusze/nagrania/transkrybuj.py            # wszystkie arkusze
    python services/arkusze/nagrania/transkrybuj.py 2025       # tylko id zawierające „2025”

Gotowe transkrypcje są pomijane; żeby zrobić od nowa, usuń plik .json.
"""

import json
import os
import sys
import time
import urllib.request
from pathlib import Path

GLOWNY = Path(__file__).resolve().parents[3]
ARKUSZE = GLOWNY / "data" / "arkusze"
NAGRANIA = GLOWNY / "data" / "nagrania"
MODEL = os.environ.get("WHISPER_MODEL", "large-v3")


def biblioteki_cuda() -> None:
    """Na Windows biblioteki CUDA z pakietów nvidia-* trzeba dodać do ścieżki DLL."""
    if os.name != "nt":
        return
    import site

    for baza in site.getsitepackages():
        for pakiet in ("cublas", "cudnn", "cuda_nvrtc"):
            katalog = Path(baza) / "nvidia" / pakiet / "bin"
            if katalog.is_dir():
                os.add_dll_directory(str(katalog))
                os.environ["PATH"] = f"{katalog}{os.pathsep}{os.environ['PATH']}"


def pobierz(url: str, cel: Path) -> None:
    if cel.exists() and cel.stat().st_size > 0:
        return
    zapytanie = urllib.request.Request(url, headers={"User-Agent": "sedno-arkusze"})
    with urllib.request.urlopen(zapytanie, timeout=120) as odp:
        cel.write_bytes(odp.read())


def main() -> None:
    filtr = sys.argv[1] if len(sys.argv) > 1 else ""
    NAGRANIA.mkdir(parents=True, exist_ok=True)
    arkusze = []
    for plik in sorted(ARKUSZE.glob("*.json")):
        if plik.name == "index.json" or filtr not in plik.stem:
            continue
        dane = json.loads(plik.read_text(encoding="utf-8"))
        if dane.get("nagranie"):
            arkusze.append((plik.stem, dane["nagranie"]))
    do_zrobienia = [(i, u) for i, u in arkusze if not (NAGRANIA / f"{i}.json").exists()]
    print(f"Arkuszy z nagraniem: {len(arkusze)}, do transkrypcji: {len(do_zrobienia)}", flush=True)
    if not do_zrobienia:
        return

    biblioteki_cuda()
    from faster_whisper import WhisperModel

    model = WhisperModel(MODEL, device="cuda", compute_type="float16")
    for id_, url in do_zrobienia:
        mp3 = NAGRANIA / f"{id_}.mp3"
        start = time.time()
        pobierz(url, mp3)
        # Język rozpoznawany dla każdego fragmentu osobno: polecenia lektora są po polsku, teksty po
        # angielsku. Z jednym językiem na całe nagranie model tłumaczył angielskie teksty na polski.
        segmenty, info = model.transcribe(str(mp3), beam_size=5, vad_filter=True, multilingual=True)
        wynik = [{"od": round(s.start, 2), "do": round(s.end, 2), "tekst": s.text.strip()} for s in segmenty]
        (NAGRANIA / f"{id_}.json").write_text(
            json.dumps({"id": id_, "nagranie": url, "dlugosc": round(info.duration, 1), "segmenty": wynik}, ensure_ascii=False, indent=1),
            encoding="utf-8",
        )
        print(f"{id_}: {len(wynik)} segmentów, {info.duration / 60:.1f} min nagrania, {time.time() - start:.0f} s", flush=True)


if __name__ == "__main__":
    main()
