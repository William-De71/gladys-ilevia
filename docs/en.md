# Ilévia Lille

## Overview

This integration brings **Ilévia**, the bus, metro and tram network of the Métropole Européenne de Lille, into Gladys. It gives the **next bus passages in real time** at the stops of your choice (three in the form, up to 20 more with a button), filtered by line and direction. It also follows the **traffic** of up to six lines, bus, metro or tram (normal, traffic information, disrupted traffic), with the messages of Ilévia. Each stop and each line becomes a device to show on a dashboard and to use in scenes.

The data come from the **official open data of Ilévia**, published by the MEL on `data.lillemetropole.fr` under the Licence Ouverte 2.0: no account, no key. Every followed stop is read together, in a single request, every minute by default (every 10 minutes while no stop announces anything, at night). The traffic is read every 5 minutes. The lines and stops of the network are kept by the integration and read again once a day and once a week.

What the open data of Ilévia do not give, so the integration does not make it up:

- **no metro passages**: the automatic trains are not in them. Follow the metro lines for their traffic;
- **the tram only when Ilévia publishes it**: the dataset announces "bus and tramway", but no tram passage was in it on 27 October 2026;
- **no timetable time, hence no delay**: only the estimated time, over the next half hour.

It is a **cloud** integration: it contacts `data.lillemetropole.fr`. Nothing else leaves your network.

## Prerequisites

- Gladys Assistant 5.3.0 or later.
- Nothing else: the open data of Ilévia need no account and no key.

## Configuration

| Field                 | What to type                                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Stop 1, 2, 3          | The name of the stop ("Gare Lille Flandres") for every side of the street, or a code ("LIG115") for one side only. |
| Line                  | Only this line: "L5", "50", "CO1". Empty: every line of the stop.                                                  |
| Direction             | Only the destinations holding these words: "Haubourdin", "Comines \| Halluin". Empty: both directions.             |
| Followed lines        | The lines whose traffic you follow, six at most: "M1, M2, tram, L1".                                               |
| Reading of the stops  | Every 30 seconds, minute, 2 minutes or 5 minutes.                                                                  |
| Language of the texts | Names of the devices, summaries and outputs of the scenes. Stop names and the messages of Ilévia stay in French.   |

The **Find a stop** button gives the exact names of the stops holding a few words, with the code of each side of the street and the lines and destinations announced in the next half hour ("LIG115 → 14 Marquette les Voiles, 50 Chemin de Messines"): copy the code of the side where you board. **Test the connection** reads the network, each stop and each line right away.

One stop sometimes has several names in the data ("Pont de Bois" or "V. d'Ascq Pont de Bois"): the integration knows them all and gathers their passages.

More stops than the three of the form (home, work…): **Add a stop** takes the same three fields — stop, line, direction — and follows up to 20 more stops. **List the stops** shows every followed stop, numbered; **Remove a stop** takes that number (or the name). The added stops are kept in the configuration of Gladys, so they follow its backups.

## Usage

### Devices

In the **Discover** tab, create the devices you want:

- **Ilévia \<stop\>**: the next passage as text ("L5 → Haubourdin le Parc · 6 min"), and the wait of the next passage and of the following one (minutes);
- **Ilévia line \<line\>**, **Ilévia metro 1** or **Ilévia tramway**: the traffic as text ("Disrupted traffic: En raison d'un défaut sur une rame…") and the number of messages of Ilévia under way.

At night, without any passage, the waits keep their last value.

### Traffic

Ilévia publishes "Perturbation" messages (an incident: metro cut, bus diverted) and "Information" messages (works, a stop moved). A message holds for a day, unless it announces an earlier end, and each news of an incident is a new message. Ilévia does not say when an incident is over. The state of a line therefore follows its latest message: **disrupted traffic** for 90 minutes after an incident message, **traffic information** while a message holds, **normal traffic** otherwise.

### Dashboard widgets

![The Ilévia departures widget at Gare Lille Flandres and the Ilévia traffic widget of the metro, the tram and a bus line (generated illustration, not a screenshot)](https://raw.githubusercontent.com/William-De71/gladys-ilevia/main/docs/assets/widgets.en.png)

- **Ilévia departures**: the next passages of a stop, compact. One row per bus line and destination, with its next passages in a row ("2 · 17 min"). The **Routes shown** setting sets the number of rows. Choose a followed stop, or type any stop (and a line) in the widget settings. With **Several stops**, one widget shows several stop devices: the devices of one stop are gathered under its name; for different stops, each row starts with its stop.
- **Ilévia traffic**: the state of each line, then the messages of Ilévia, incidents first, with their publication time. Tap a card for the full text. The followed lines, the ones typed in the settings, or the metro and the tram when you follow none.

### Scenes

Triggers, once per change (the first reading is only a baseline):

- **Ilévia: bus leaving soon**: a passage at a followed stop leaves in 2, 3, 5, 10, 15 or 20 minutes.
- **Ilévia: line disrupted**: Ilévia publishes an incident message about a followed line.
- **Ilévia: no incident any more**: the line has no incident under way any more (a newer message, or 90 minutes passed).
- **Ilévia: new traffic message**: Ilévia publishes a message about a followed line, incident or information.

Each gives a ready-made sentence, `{{triggerEvent.data.summary}}`, and its values (line, destination, time, title, text, publication time…). The actions **Ilévia: next passages** and **Ilévia: traffic of a line** return the same kind of values, to put in a message or to test in a condition.

Examples:

- When the L5 towards Haubourdin leaves Gare Lille Flandres in 5 minutes → turn the hall lamp green.
- When metro 1 is disrupted → send the summary to your phone before you leave.
- Every weekday at 7:30 → read the next passages of your stop and have the kitchen speaker announce them.

### Transport

Cloud only: the data come from the internet. Only the stops you follow are asked of the server of the MEL, in one request.

## Troubleshooting

- **"Unknown to Ilévia"**: use **Find a stop**, then copy the exact name or a code; for a line, its name as on the buses ("L5", "50"), "M1" or "M2" for the metro, "tram" for the tramway.
- **No passage**: at night the network sleeps; the stop is read again every 10 minutes. At a tram platform, Ilévia does not always publish the passages.
- **"The open data of the MEL do not answer"**: the integration tries again at each reading; the last passages stay on the widgets.
- **An incident over stays "disrupted"**: Ilévia does not publish the end of incidents; the state goes back to traffic information 90 minutes after the last incident message, or as soon as a newer message comes.
- **To report a problem**: press **Diagnostic**, then copy the lines starting with "Ilévia diagnostic" from the Logs tab into a GitHub issue or a reply on the forum, with the versions of Gladys and of the integration.
