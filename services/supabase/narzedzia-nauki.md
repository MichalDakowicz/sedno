# Mapa wiedzy i terminy matur

Obie funkcje korzystają z klienta Supabase zalogowanego użytkownika.

## Mapa wiedzy

`knowledge_nodes` przechowuje tytuł, treść i opcjonalne odwołania do źródła oraz umiejętności. `knowledge_edges` przechowuje nieskierowane połączenia w jednym przedmiocie. RLS ogranicza wszystkie operacje do właściciela. Usunięcie węzła usuwa także jego połączenia. Usunięcie konta usuwa cały graf.

```ts
const { data: node } = await supabase.from("knowledge_nodes")
  .insert({ subject: "angielski", title: "Parafraza", body: "Inne słowa, to samo znaczenie." })
  .select("id, subject, title, body")
  .single();

const { data: nodes } = await supabase.from("knowledge_nodes")
  .select().eq("subject", "angielski").order("updated_at", { ascending: false });
const { data: edges } = await supabase.from("knowledge_edges")
  .select().eq("subject", "angielski");
```

- Notatkę zmienia się po `id`. `subject` i identyfikatory nadaje się przy tworzeniu. Węzeł może wskazać `skill_id` z katalogu nauki angielskiego. Limit konta to 250 notatek i 1000 połączeń.
- Przy źródle `manual` pole `source_ref` ma wartość `null`. Dla `sheet` jest to identyfikator arkusza z opcjonalnym numerem zadania po `#`. Dla `session` to UUID sesji, a dla `chat` identyfikator rozmowy. Przy otwieraniu odwołania aplikacja pobiera źródło przez jego API.
- Ręczne połączenie dodaje się przez `insert({ subject, first_id, second_id, label })`. Baza porządkuje parę identyfikatorów. Odpowiedź `23505` oznacza, że połączenie już istnieje.
- Sugestie Pestki zapisuje uwierzytelniona funkcja serwerowa. Funkcja czyta węzły wybranego konta i przedmiotu, a zapis z `service_role` ustawia `origin = 'pestka'` i `status = 'proposed'`. Przy ponowieniu można pominąć duplikaty przez `onConflict: "user_id,subject,first_id,second_id", ignoreDuplicates: true` bez zmiany istniejących krawędzi.
- Graf bierze krawędzie o statusie `accepted`. Pozostałe wyświetla do decyzji ucznia. Uczeń akceptuje propozycję przez `update({ status: "accepted" })` i odrzuca przez `delete()`. Filtr obu operacji wskazuje `subject`, `first_id` i `second_id` zwrócone przez bazę. Po odrzuceniu Pestka może ponownie zaproponować tę samą parę.

## Terminy matur

`exam_schedule` zawiera potwierdzone daty sesji głównej pisemnej z języka polskiego, matematyki, języka angielskiego i informatyki. Jednoznaczny klucz to `exam_year`, `subject` i `level`. `starts_at` to znacznik czasu. Przy formatowaniu dla ucznia stosuj strefę `Europe/Warsaw`.

```ts
const { data: exams } = await supabase.from("exam_schedule")
  .select("subject, level, starts_at, source_url")
  .eq("exam_year", 2027)
  .order("starts_at");
```

Źródło terminów na 2027 r. to strony 4–5 komunikatu dyrektora CKE z 20 sierpnia 2026 r. [Harmonogram CKE](https://bip.cke.gov.pl/attachments/download/10422)
