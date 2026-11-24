-- Migracja 0032 zastąpiła opis wydarzeń z 0028 listą, z której wypadł testament.
update private.wiedza_pestki
set tekst = replace(tekst,
  E'5. [Akt IV] Cześnik doprowadza do małżeństwa Wacława z Klarą.\n6. [Akt IV, scena ostatnia] Cześnik i Rejent godzą się.',
  E'5. [Akt IV, scena IV–V] Po wizycie u Rejenta Papkin sądzi, że Rejent go otruł winem, dlatego spisuje testament.\n6. [Akt IV] Cześnik doprowadza do małżeństwa Wacława z Klarą.\n7. [Akt IV, scena ostatnia] Cześnik i Rejent godzą się.'),
  hasla = concat_ws(' ', hasla, 'Papkin testament otruty trucizna wino Rejent')
where przedmiot = 'polski' and utwor = 'zemsta' and sekcja = 'wydarzenia'
  and strpos(tekst, E'5. [Akt IV] Cześnik doprowadza do małżeństwa Wacława z Klarą.\n6. [Akt IV, scena ostatnia] Cześnik i Rejent godzą się.') > 0;
