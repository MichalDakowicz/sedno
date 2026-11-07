/* Nawigacja dokumentów. Lista rozdziałów i stron jest w CHAPTERS poniżej: nowa strona = nowy wpis tutaj. */
(function () {
  var CHAPTERS = [
 {
  "id": "koncepcja",
  "title": "Koncepcja",
  "group": "Pomysł",
  "desc": "Problem, teza, pętla główna, pięć filarów i funkcje.",
  "pages": [
   {
    "id": "koncepcja-teza",
    "title": "Problem i teza"
   },
   {
    "id": "koncepcja-petla",
    "title": "Pętla główna"
   },
   {
    "id": "koncepcja-filary",
    "title": "Pięć filarów wyróżnienia"
   },
   {
    "id": "koncepcja-sciezka",
    "title": "Ścieżka ucznia"
   },
   {
    "id": "koncepcja-funkcje",
    "title": "Funkcje"
   },
   {
    "id": "koncepcja-ai-rola",
    "title": "Gdzie AI robi różnicę"
   }
  ]
 },
 {
  "id": "nauka",
  "title": "Interaktywna nauka",
  "group": "Jak uczymy",
  "desc": "Siedem formatów nauki i trzy główne: serce aplikacji.",
  "pages": [
   {
    "id": "nauka-teza",
    "title": "Trening zamiast sprawdzianu"
   },
   {
    "id": "nauka-fundament",
    "title": "Zakotwiczenie w materiałach CKE"
   },
   {
    "id": "formaty-przeglad",
    "title": "Trzy główne formaty"
   },
   {
    "id": "nauka-napraw-blad",
    "title": "Napraw błąd"
   },
   {
    "id": "nauka-uczen-uczy",
    "title": "Uczeń uczy AI"
   },
   {
    "id": "nauka-krok-po-kroku",
    "title": "Budowanie krok po kroku"
   },
   {
    "id": "nauka-tutor",
    "title": "Tutor sokratejski"
   },
   {
    "id": "nauka-rundy",
    "title": "Szybkie rundy i powtórki"
   },
   {
    "id": "nauka-wizualizacje",
    "title": "Wizualizacje per przedmiot"
   },
   {
    "id": "nauka-mapa-wiedzy",
    "title": "Mapa wiedzy"
   },
   {
    "id": "nauka-pytania",
    "title": "Do ustalenia"
   }
  ]
 },
 {
  "id": "mapa",
  "title": "Mapa umiejętności",
  "group": "Jak uczymy",
  "desc": "Dwa poziomy umiejętności i dowody opanowania.",
  "pages": [
   {
    "id": "mapa-poziomy",
    "title": "Dlaczego dwa poziomy"
   },
   {
    "id": "mapa-dowody",
    "title": "Dowody opanowania"
   },
   {
    "id": "mapa-model",
    "title": "Dwie warstwy modelu"
   },
   {
    "id": "mapa-panel",
    "title": "Jak to wygląda dla ucznia"
   },
   {
    "id": "mapa-skad",
    "title": "Skąd bierze się mapa"
   },
   {
    "id": "mapa-ryzyka",
    "title": "Ryzyka"
   }
  ]
 },
 {
  "id": "tryby",
  "title": "Tryby i pomoc",
  "group": "Jak uczymy",
  "desc": "Nauka i egzamin, drabina podpowiedzi, warianty zadań.",
  "pages": [
   {
    "id": "tryby-dwa",
    "title": "Dwa tryby: nauka i egzamin"
   },
   {
    "id": "tryby-drabina",
    "title": "Drabina podpowiedzi"
   },
   {
    "id": "tryby-sprawdzanie",
    "title": "Sprawdzanie i feedback"
   },
   {
    "id": "tryby-czas",
    "title": "Czas: jakość przed prędkością"
   },
   {
    "id": "tryby-warianty",
    "title": "Ćwiczenia: nigdy te same pytania"
   }
  ]
 },
 {
  "id": "ocena",
  "title": "Ocena AI",
  "group": "Jak uczymy",
  "desc": "Rubryka CKE jako dane, sześć typów błędu, AI klasyfikuje, kod liczy.",
  "pages": [
   {
    "id": "ocena-ustalone",
    "title": "Ustalone"
   },
   {
    "id": "ocena-zasada",
    "title": "Zasada: AI klasyfikuje, kod liczy"
   },
   {
    "id": "ocena-rubryka",
    "title": "Rubryka jako dane"
   },
   {
    "id": "ocena-angielski",
    "title": "Analiza rubryki: angielski dwujęzyczny"
   },
   {
    "id": "ocena-kaskady",
    "title": "Reguły kaskadowe"
   },
   {
    "id": "ocena-podzial",
    "title": "Co robi kod, a co AI"
   },
   {
    "id": "ocena-niepewnosc",
    "title": "Punkty i opis"
   },
   {
    "id": "ocena-kalibracja",
    "title": "Kalibracja i uczciwość"
   },
   {
    "id": "ocena-feedback",
    "title": "Poziom szczegółowości feedbacku"
   },
   {
    "id": "ocena-typy",
    "title": "Sześć typów błędu"
   },
   {
    "id": "ocena-informatyka",
    "title": "Informatyka: sprawdzanie kodu"
   },
   {
    "id": "ocena-pytania",
    "title": "Do ustalenia"
   }
  ]
 },
 {
  "id": "blad",
  "title": "Napraw błąd",
  "group": "Trzy główne formaty",
  "desc": "Uczeń znajduje i poprawia błędy w cudzej pracy: przepływ, dane, ocena, rozbiór.",
  "pages": [
   {
    "id": "formaty-blad-przeplyw",
    "title": "Napraw błąd: przepływ"
   },
   {
    "id": "formaty-blad-mechanika",
    "title": "Napraw błąd: mechanika i AI"
   },
   {
    "id": "formaty-blad-poziomy",
    "title": "Napraw błąd: poziomy i dowody"
   },
   {
    "id": "blad-przyklad",
    "title": "Pełny przykład pracy"
   },
   {
    "id": "blad-model",
    "title": "Model danych pracy"
   },
   {
    "id": "blad-generator",
    "title": "Generowanie i weryfikacja prac"
   },
   {
    "id": "blad-zaznaczanie",
    "title": "Zaznaczanie i nazywanie"
   },
   {
    "id": "blad-poprawka",
    "title": "Poprawki i ich ocena"
   },
   {
    "id": "blad-dopasowanie",
    "title": "Dopasowanie i wynik"
   },
   {
    "id": "blad-rozbior",
    "title": "Ekran rozbioru"
   },
   {
    "id": "blad-dobor",
    "title": "Dobór prac i poziomów"
   },
   {
    "id": "blad-dowody",
    "title": "Dowody dla mapy umiejętności"
   },
   {
    "id": "blad-przedmioty",
    "title": "Odmiany per przedmiot"
   },
   {
    "id": "blad-jakosc",
    "title": "Jakość i testy"
   },
   {
    "id": "blad-pytania",
    "title": "Do ustalenia"
   }
  ]
 },
 {
  "id": "uczen",
  "title": "Uczeń uczy AI",
  "group": "Trzy główne formaty",
  "desc": "Uczeń tłumaczy zasadę AI, które się myli: scenariusz, dwa agenty, ocena, bezpieczeństwo.",
  "pages": [
   {
    "id": "formaty-uczen-przeplyw",
    "title": "Uczeń uczy AI: przepływ"
   },
   {
    "id": "formaty-uczen-mechanika",
    "title": "Uczeń uczy AI: mechanika i AI"
   },
   {
    "id": "formaty-uczen-ocena",
    "title": "Uczeń uczy AI: ocena i dowody"
   },
   {
    "id": "uczen-przyklad",
    "title": "Pełny przykład rozmowy"
   },
   {
    "id": "uczen-scenariusz",
    "title": "Scenariusz rundy"
   },
   {
    "id": "uczen-architektura",
    "title": "Sędzia i Kolega"
   },
   {
    "id": "uczen-dialog",
    "title": "Przebieg rozmowy"
   },
   {
    "id": "uczen-ocena",
    "title": "Ocena wyjaśnienia"
   },
   {
    "id": "uczen-bezpieczenstwo",
    "title": "Zasady bezpieczeństwa i uczciwości"
   },
   {
    "id": "uczen-persona",
    "title": "Persony kolegi"
   },
   {
    "id": "uczen-rozbior",
    "title": "Ekran rozbioru"
   },
   {
    "id": "uczen-dobor",
    "title": "Dobór pojęć i rund"
   },
   {
    "id": "uczen-dowody",
    "title": "Dowody dla mapy umiejętności"
   },
   {
    "id": "uczen-przedmioty",
    "title": "Odmiany per przedmiot"
   },
   {
    "id": "uczen-jakosc",
    "title": "Jakość i testy"
   },
   {
    "id": "uczen-pytania",
    "title": "Do ustalenia"
   }
  ]
 },
 {
  "id": "krok",
  "title": "Krok po kroku",
  "group": "Trzy główne formaty",
  "desc": "Uczeń buduje własną pracę z malejącą pomocą: etapy, lista z rubryki, ocena.",
  "pages": [
   {
    "id": "formaty-krok-przeplyw",
    "title": "Budowanie krok po kroku: przepływ"
   },
   {
    "id": "formaty-krok-mechanika",
    "title": "Budowanie krok po kroku: mechanika i AI"
   },
   {
    "id": "formaty-krok-wygaszanie",
    "title": "Budowanie krok po kroku: wygaszanie pomocy"
   },
   {
    "id": "krok-przyklad",
    "title": "Pełny przykład sesji"
   },
   {
    "id": "krok-lista",
    "title": "Skąd lista kontrolna"
   },
   {
    "id": "krok-etapy",
    "title": "Etapy i przejścia"
   },
   {
    "id": "krok-pomoc",
    "title": "Podpowiedzi w tym formacie"
   },
   {
    "id": "krok-ocena",
    "title": "Ocena elementów na żywo"
   },
   {
    "id": "krok-wygaszanie-projekt",
    "title": "Wygaszanie pomocy"
   },
   {
    "id": "krok-ekran",
    "title": "Ekran przeglądu i oddania"
   },
   {
    "id": "krok-oddanie",
    "title": "Oddanie i ocena końcowa"
   },
   {
    "id": "krok-dowody",
    "title": "Dowody dla mapy umiejętności"
   },
   {
    "id": "krok-tematy",
    "title": "Tematy i formy"
   },
   {
    "id": "krok-przedmioty",
    "title": "Odmiany per przedmiot"
   },
   {
    "id": "krok-jakosc",
    "title": "Jakość i testy"
   },
   {
    "id": "krok-pytania",
    "title": "Do ustalenia"
   }
  ]
 },
 {
  "id": "pulpit",
  "title": "Pulpit i nawigacja",
  "group": "Aplikacja",
  "desc": "Centrum aplikacji: ekran główny, sekcje, wejścia do nauki, telefon.",
  "pages": [
   {
    "id": "dashboard-rola",
    "title": "Pulpit jako centrum"
   },
   {
    "id": "dash-ekran",
    "title": "Ekran główny"
   },
   {
    "id": "dashboard-nawigacja",
    "title": "Nawigacja i sekcje"
   },
   {
    "id": "dashboard-wejscia",
    "title": "Wejścia do nauki"
   },
   {
    "id": "dash-start",
    "title": "Pierwsze uruchomienie"
   },
   {
    "id": "dash-szukaj",
    "title": "Wyszukiwanie i szybkie akcje"
   },
   {
    "id": "dashboard-ustawienia",
    "title": "Ustawienia"
   },
   {
    "id": "dash-telefon",
    "title": "Pulpit na telefonie"
   },
   {
    "id": "dash-dostepnosc",
    "title": "Dostępność i język"
   }
  ]
 },
 {
  "id": "widgety",
  "title": "Widgety pulpitu",
  "group": "Aplikacja",
  "desc": "Dziś warto, mapa, powtórki, arkusze, układ, stany i konto demo.",
  "pages": [
   {
    "id": "dashboard-widgety",
    "title": "Widgety i dostosowanie"
   },
   {
    "id": "dash-dzis",
    "title": "Widget „Dziś warto”"
   },
   {
    "id": "dash-mapa",
    "title": "Widget mapy umiejętności"
   },
   {
    "id": "dash-powtorki",
    "title": "Powtórki i „Kontynuuj”"
   },
   {
    "id": "dash-arkusze",
    "title": "Widget arkuszy i egzaminu"
   },
   {
    "id": "dash-matura",
    "title": "Widget „Do matury”"
   },
   {
    "id": "dash-temat",
    "title": "Wybierz temat i mapa wiedzy"
   },
   {
    "id": "dash-uklad",
    "title": "Dostosowanie układu"
   },
   {
    "id": "dash-stany",
    "title": "Stany ekranu"
   },
   {
    "id": "dash-dane",
    "title": "Dane pulpitu"
   },
   {
    "id": "dash-demo",
    "title": "Konto demo i ścieżka pokazowa"
   },
   {
    "id": "dash-pytania",
    "title": "Do ustalenia"
   }
  ]
 },
 {
  "id": "struktura",
  "title": "Struktura produktu",
  "group": "Podstawy",
  "desc": "Pięć warstw, zależności, model danych i jakość AI.",
  "pages": [
   {
    "id": "struktura-warstwy",
    "title": "Pięć warstw"
   },
   {
    "id": "struktura-tresc",
    "title": "Warstwa A: treść i dane"
   },
   {
    "id": "struktura-uczenie",
    "title": "Warstwa B: silnik uczenia"
   },
   {
    "id": "struktura-silnik-ai",
    "title": "Warstwa C: silnik AI"
   },
   {
    "id": "struktura-aplikacja",
    "title": "Warstwa D: aplikacja ucznia"
   },
   {
    "id": "struktura-moduly",
    "title": "Warstwa E: moduły przedmiotowe"
   },
   {
    "id": "struktura-dodatki",
    "title": "Dodatki ponad rdzeń"
   },
   {
    "id": "struktura-zaleznosci",
    "title": "Zależności i kolejność budowy"
   },
   {
    "id": "struktura-model",
    "title": "Model danych"
   },
   {
    "id": "struktura-dane-ucznia",
    "title": "Dane ucznia i personalizacja"
   },
   {
    "id": "struktura-jakosc",
    "title": "Jak mierzymy jakość AI"
   },
   {
    "id": "struktura-pytania",
    "title": "Pytania do struktury"
   }
  ]
 },
 {
  "id": "cke",
  "title": "Dane z CKE",
  "group": "Podstawy",
  "desc": "Skąd bierzemy arkusze i klucze, potok, prawa autorskie.",
  "pages": [
   {
    "id": "cke-pliki",
    "title": "Co publikuje CKE"
   },
   {
    "id": "cke-potok",
    "title": "Potok przetwarzania"
   },
   {
    "id": "cke-matematyka",
    "title": "Matematyka: wzory i brudnopis"
   },
   {
    "id": "cke-mapowanie",
    "title": "Mapowanie w kluczu"
   },
   {
    "id": "cke-bledy",
    "title": "Typowe błędy ze sprawozdań CKE"
   },
   {
    "id": "cke-prawa",
    "title": "Prawa autorskie"
   },
   {
    "id": "cke-ryzyka",
    "title": "Ryzyka techniczne"
   }
  ]
 },
 {
  "id": "przedmioty",
  "title": "Przedmioty",
  "group": "Podstawy",
  "desc": "Od czego zaczynamy i jak dochodzą kolejne.",
  "pages": [
   {
    "id": "przedmioty-start",
    "title": "Dwa kandydaci na start"
   },
   {
    "id": "przedmioty-reszta",
    "title": "Pozostałe przedmioty i zależności"
   }
  ]
 },
 {
  "id": "konkurs",
  "title": "Konkurs",
  "group": "Projekt",
  "desc": "Zasady, wymagane pliki, oś czasu.",
  "pages": [
   {
    "id": "konkurs-os",
    "title": "Zadanie i oś czasu"
   },
   {
    "id": "konkurs-zgloszenie",
    "title": "Wymagane zgłoszenie"
   },
   {
    "id": "konkurs-uczestnicy",
    "title": "Uczestnicy i nagrody"
   },
   {
    "id": "konkurs-wnioski",
    "title": "Wnioski dla projektu i kontakt"
   }
  ]
 },
 {
  "id": "ustalenia",
  "title": "Do ustalenia",
  "group": "Projekt",
  "desc": "Otwarte pytania i inne pomysły.",
  "pages": [
   {
    "id": "ustalenia-prawo",
    "title": "Zasady i prawo"
   },
   {
    "id": "ustalenia-dane-ai",
    "title": "Dane, mapa i AI"
   },
   {
    "id": "ustalenia-tryby",
    "title": "Tryby, pomoc i ćwiczenia"
   },
   {
    "id": "ustalenia-zakres",
    "title": "Zakres"
   },
   {
    "id": "ustalenia-pomysly",
    "title": "Inne pomysły"
   }
  ]
 }
];
  var GROUPS = ['Pomysł', 'Jak uczymy', 'Trzy główne formaty', 'Aplikacja', 'Podstawy', 'Projekt'];

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  var PAGES = [];
  CHAPTERS.forEach(function (c, ci) {
    c.num = pad(ci + 1);
    c.pages.forEach(function (p, pi) {
      p.file = p.id + '.html';
      p.num = c.num + '.' + (pi + 1);
      p.ch = c;
      PAGES.push(p);
    });
  });

  var seg = location.pathname.split('/').pop().replace(/\.html$/, '') || 'index';
  var cur = -1;
  PAGES.forEach(function (p, i) { if (p.id === seg) cur = i; });
  var page = cur >= 0 ? PAGES[cur] : null;
  var curCh = page ? page.ch : null;

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function slug(s) {
    var map = { 'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n', 'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z' };
    return s.toLowerCase().replace(/[ąćęłńóśźż]/g, function (c) { return map[c]; })
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  var main = document.querySelector('main');
  if (!main) return;

  [].forEach.call(main.querySelectorAll('h2'), function (h) { if (!h.id) h.id = slug(h.textContent); });
  if (location.hash) {
    var t = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (t) setTimeout(function () { t.scrollIntoView(); }, 0);
  }

  var side = el('aside', 'side');
  side.id = 'side';
  var brand = el('a', 'brand', 'Sedno<small>zarys projektu</small>');
  brand.href = 'index.html';
  side.appendChild(brand);

  var nav = el('nav');
  var home = el('a', 'item' + (cur < 0 ? ' on' : ''), '<span class="n">00</span><span>Okładka</span>');
  home.href = 'index.html';
  nav.appendChild(home);

  GROUPS.forEach(function (g) {
    nav.appendChild(el('div', 'grp', g));
    CHAPTERS.forEach(function (c) {
      if (c.group !== g) return;
      var on = c === curCh;
      var a = el('a', 'item' + (on ? ' on' : ''), '<span class="n">' + c.num + '</span><span>' + c.title + '</span>');
      a.href = c.pages[0].file;
      nav.appendChild(a);
      if (on) {
        var list = el('div', 'toc');
        c.pages.forEach(function (p) {
          var l = el('a', p === page ? 'on' : null, '<span class="pn">' + p.num.split('.')[1] + '</span>' + p.title);
          l.href = p.file;
          list.appendChild(l);
        });
        nav.appendChild(list);
      }
    });
  });
  side.appendChild(nav);
  side.appendChild(el('div', 'side-foot', 'Konkurs „Sztuczna inteligencja wśród nas”<br>Zgłoszenie do 29 XI 2026'));

  var bar = el('div', 'mbar');
  var btn = el('button', null, '<span></span><span></span><span></span>');
  btn.setAttribute('aria-label', 'Menu');
  bar.appendChild(btn);
  bar.appendChild(el('b', null, 'Sedno'));
  bar.appendChild(el('span', 'mt', page ? page.title : 'Okładka'));
  var shade = el('div', 'shade');

  document.body.prepend(shade);
  document.body.prepend(side);
  document.body.prepend(bar);

  function toggle(open) { document.body.classList.toggle('menu-open', open); }
  btn.addEventListener('click', function () { toggle(!document.body.classList.contains('menu-open')); });
  shade.addEventListener('click', function () { toggle(false); });
  side.addEventListener('click', function (e) { if (e.target.closest('a')) toggle(false); });

  var h1 = main.querySelector('h1');
  if (h1 && page) {
    var crumb = el('div', 'eyebrow', page.num + ' &nbsp;/&nbsp; <a href="' + curCh.pages[0].file + '">' + curCh.title + '</a>');
    h1.parentNode.insertBefore(crumb, h1);
  }

  if (page) {
    var prev = PAGES[cur - 1], next = PAGES[cur + 1];
    var pager = el('div', 'pager');
    if (prev) {
      var pa = el('a', 'prev', '<small>← ' + prev.num + '</small>' + prev.title);
      pa.href = prev.file;
      pager.appendChild(pa);
    } else {
      var pc = el('a', 'prev', '<small>← 00</small>Okładka');
      pc.href = 'index.html';
      pager.appendChild(pc);
    }
    if (next) {
      var na = el('a', 'next', '<small>' + next.num + ' →</small>' + next.title);
      na.href = next.file;
      pager.appendChild(na);
    }
    main.parentNode.insertBefore(pager, main.nextSibling);
  }
})();
