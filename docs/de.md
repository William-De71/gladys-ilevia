# Ilévia Lille

## Überblick

Diese Integration bringt **Ilévia**, das Bus-, Metro- und Straßenbahnnetz der Métropole Européenne de Lille, in Gladys. Sie liefert die **nächsten Busabfahrten in Echtzeit** an den Haltestellen deiner Wahl (drei im Formular, bis zu 20 weitere per Schaltfläche), gefiltert nach Linie und Richtung. Sie verfolgt außerdem die **Verkehrslage** von bis zu sechs Linien, Bus, Metro oder Straßenbahn (normal, Verkehrsinformation, gestörter Betrieb), mit den Meldungen von Ilévia. Jede Haltestelle und jede Linie wird zu einem Gerät, das du auf einem Dashboard anzeigen und in Szenen nutzen kannst.

Die Daten stammen aus den **offiziellen Open Data von Ilévia**, die die MEL auf `data.lillemetropole.fr` unter der Licence Ouverte 2.0 veröffentlicht: kein Konto, kein Schlüssel. Alle verfolgten Haltestellen werden zusammen gelesen, in einer einzigen Anfrage, standardmäßig jede Minute (alle 10 Minuten, solange keine Haltestelle etwas ankündigt, nachts). Die Verkehrslage wird alle 5 Minuten gelesen. Die Linien und Haltestellen des Netzes behält die Integration und liest sie einmal am Tag und einmal pro Woche neu.

Was die Open Data von Ilévia nicht liefern und die Integration daher nicht erfindet:

- **keine Abfahrten der Metro**: Die automatischen Züge sind nicht enthalten. Verfolge die Metrolinien für ihre Verkehrslage;
- **die Straßenbahn nur, wenn Ilévia sie veröffentlicht**: Der Datensatz kündigt „Bus und Straßenbahn“ an, enthielt am 27. Oktober 2026 aber keine Straßenbahnabfahrt;
- **keine Fahrplanzeit, also keine Verspätung**: nur die geschätzte Zeit, für die nächste halbe Stunde.

Es ist eine **Cloud**-Integration: Sie kontaktiert `data.lillemetropole.fr`. Sonst verlässt nichts dein Netzwerk.

## Voraussetzungen

- Gladys Assistant 5.3.0 oder neuer.
- Sonst nichts: Die Open Data von Ilévia brauchen weder Konto noch Schlüssel.

## Konfiguration

| Feld                     | Was eingeben                                                                                                                 |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Haltestelle 1, 2, 3      | Der Name der Haltestelle („Gare Lille Flandres“) für alle Straßenseiten oder ein Code („LIG115“) für nur eine Seite.         |
| Linie                    | Nur diese Linie: „L5“, „50“, „CO1“. Leer: alle Linien der Haltestelle.                                                       |
| Richtung                 | Nur die Ziele mit diesen Wörtern: „Haubourdin“, „Comines \| Halluin“. Leer: beide Richtungen.                                |
| Verfolgte Linien         | Die Linien, deren Verkehrslage du verfolgst, höchstens sechs: „M1, M2, tram, L1“.                                            |
| Abfrage der Haltestellen | Alle 30 Sekunden, jede Minute, alle 2 Minuten oder alle 5 Minuten.                                                           |
| Sprache der Texte        | Namen der Geräte, Zusammenfassungen und Ausgaben der Szenen. Haltestellennamen und Meldungen von Ilévia bleiben Französisch. |

Die Schaltfläche **Haltestelle suchen** liefert die genauen Namen der Haltestellen mit ein paar Wörtern, mit dem Code jeder Straßenseite und den in der nächsten halben Stunde angekündigten Linien und Zielen („LIG115 → 14 Marquette les Voiles, 50 Chemin de Messines“): Kopiere den Code der Seite, an der du einsteigst. **Verbindung testen** liest das Netz, jede Haltestelle und jede Linie sofort.

Eine Haltestelle hat in den Daten manchmal mehrere Namen („Pont de Bois“ oder „V. d’Ascq Pont de Bois“): Die Integration kennt sie alle und führt ihre Abfahrten zusammen.

Mehr Haltestellen als die drei des Formulars (Zuhause, Arbeit…): **Haltestelle hinzufügen** nimmt dieselben drei Felder — Haltestelle, Linie, Richtung — und verfolgt bis zu 20 weitere Haltestellen. **Haltestellen auflisten** zeigt alle verfolgten Haltestellen nummeriert; **Haltestelle entfernen** nimmt diese Nummer (oder den Namen). Die hinzugefügten Haltestellen liegen in der Konfiguration von Gladys und folgen damit ihren Sicherungen.

## Verwendung

### Geräte

Lege im Tab **Entdecken** die gewünschten Geräte an:

- **Ilévia \<Haltestelle\>**: die nächste Abfahrt als Text („L5 → Haubourdin le Parc · 6 Min.“) und die Wartezeit der nächsten und der folgenden Abfahrt (Minuten);
- **Ilévia Linie \<Linie\>**, **Ilévia Metro 1** oder **Ilévia Straßenbahn**: die Verkehrslage als Text („Gestörter Betrieb: En raison d’un défaut sur une rame…“) und die Zahl der aktuellen Meldungen von Ilévia.

Nachts, ohne Abfahrt, behalten die Wartezeiten ihren letzten Wert.

### Verkehrslage

Ilévia veröffentlicht Meldungen „Perturbation“ (eine Störung: Metro unterbrochen, Bus umgeleitet) und „Information“ (Bauarbeiten, verlegte Haltestelle). Eine Meldung gilt einen Tag, außer sie nennt ein früheres Ende, und jede Neuigkeit zu einer Störung ist eine neue Meldung. Ilévia sagt nicht, wann eine Störung vorbei ist. Der Zustand einer Linie folgt daher ihrer neuesten Meldung: **gestörter Betrieb** 90 Minuten lang nach einer Störungsmeldung, **Verkehrsinformation**, solange eine Meldung gilt, sonst **normaler Betrieb**.

### Dashboard-Widgets

![Das Widget Ilévia-Abfahrten an Gare Lille Flandres und das Widget Ilévia-Verkehrslage für Metro, Straßenbahn und eine Buslinie (generierte Illustration, kein Screenshot)](https://raw.githubusercontent.com/William-De71/gladys-ilevia/main/docs/assets/widgets.de.png)

- **Ilévia-Abfahrten**: die nächsten Abfahrten einer Haltestelle, kompakt. Eine Zeile pro Buslinie und Ziel, mit ihren nächsten Abfahrten hintereinander („2 · 17 Min.“). Die Einstellung **Angezeigte Fahrten** legt die Zahl der Zeilen fest. Wähle eine verfolgte Haltestelle oder gib in den Widget-Einstellungen eine beliebige Haltestelle (und eine Linie) ein. Mit **Mehrere Haltestellen** zeigt ein Widget mehrere Haltestellengeräte: Die Geräte einer Haltestelle werden unter ihrem Namen zusammengefasst; bei verschiedenen Haltestellen beginnt jede Zeile mit ihrer Haltestelle.
- **Ilévia-Verkehrslage**: der Zustand jeder Linie, dann die Meldungen von Ilévia, Störungen zuerst, mit ihrer Veröffentlichungszeit. Tippe auf eine Karte für den vollständigen Text. Die verfolgten Linien, die in den Einstellungen eingegebenen oder Metro und Straßenbahn, wenn du keine verfolgst.

### Szenen

Auslöser, einmal pro Änderung (die erste Abfrage dient nur als Referenz):

- **Ilévia: Bus fährt bald**: Eine Abfahrt an einer verfolgten Haltestelle fährt in 2, 3, 5, 10, 15 oder 20 Minuten.
- **Ilévia: Linie gestört**: Ilévia veröffentlicht eine Störungsmeldung zu einer verfolgten Linie.
- **Ilévia: keine Störung mehr**: Die Linie hat keine aktuelle Störung mehr (eine neuere Meldung oder 90 Minuten vergangen).
- **Ilévia: neue Verkehrsmeldung**: Ilévia veröffentlicht eine Meldung zu einer verfolgten Linie, Störung oder Information.

Jeder liefert einen fertigen Satz, `{{triggerEvent.data.summary}}`, und seine Werte (Linie, Ziel, Uhrzeit, Titel, Text, Veröffentlichungszeit…). Die Aktionen **Ilévia: nächste Abfahrten** und **Ilévia: Verkehrslage einer Linie** liefern dieselbe Art von Werten, für eine Nachricht oder eine Bedingung.

Beispiele:

- Wenn die L5 Richtung Haubourdin in 5 Minuten an Gare Lille Flandres abfährt → die Flurlampe grün einschalten.
- Wenn die Metro 1 gestört ist → die Zusammenfassung vor dem Losgehen aufs Handy schicken.
- Werktags um 7:30 Uhr → die nächsten Abfahrten deiner Haltestelle lesen und vom Küchenlautsprecher ansagen lassen.

### Transport

Nur Cloud: Die Daten kommen aus dem Internet. Nur die Haltestellen, die du verfolgst, werden beim Server der MEL abgefragt, in einer Anfrage.

## Fehlerbehebung

- **„Bei Ilévia unbekannt“**: Nutze **Haltestelle suchen** und kopiere den genauen Namen oder einen Code; für eine Linie ihren Namen wie auf den Bussen („L5“, „50“), „M1“ oder „M2“ für die Metro, „tram“ für die Straßenbahn.
- **Keine Abfahrt**: Nachts schläft das Netz; die Haltestelle wird alle 10 Minuten neu gelesen. An einem Straßenbahnsteig veröffentlicht Ilévia die Abfahrten nicht immer.
- **„Die Open Data der MEL antworten nicht“**: Die Integration versucht es bei jeder Abfrage erneut; die letzten Abfahrten bleiben in den Widgets.
- **Eine beendete Störung bleibt „gestört“**: Ilévia veröffentlicht das Ende von Störungen nicht; der Zustand wechselt 90 Minuten nach der letzten Störungsmeldung zur Verkehrsinformation zurück, oder sobald eine neuere Meldung kommt.
- **Ein Problem melden**: Drücke **Diagnose** und kopiere die Zeilen, die im Tab Protokolle mit „Ilévia diagnostic“ beginnen, in ein GitHub-Issue oder eine Antwort im Forum, mit den Versionen von Gladys und der Integration.
