-- Plan wydarzeń „Lalki” jest teraz w elementach (private.lektury_elementy) z numeracją rozdziałów
-- wydania Wolnych Lektur. Stara notatka miała przybliżone rozdziały i nieistniejące kotwice linków.
delete from private.wiedza_pestki where przedmiot = 'polski' and utwor = 'lalka' and sekcja = 'wydarzenia';
