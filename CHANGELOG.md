# Changelog

All notable changes to this integration are documented in this file. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions
follow [Semantic Versioning](https://semver.org/). This file is generated at
each release from the Conventional Commits: do not edit it by hand.

## [0.1.0] - unreleased

### Added

- One device per followed stop of the Ilévia network of Lille (three in the form and up to 20 more with the "Add a stop" button, typed by name or by code, filtered by line and direction): the next passage as text and the wait of the next two passages, in real time, every side of the street of a name together.
- One device per followed line, bus, metro or tram (up to six): its traffic state (normal, traffic information, disrupted) and the number of traffic messages under way.
- Scene triggers: bus leaving soon (2 to 20 minutes before a passage), line disrupted (an incident message of Ilévia), no incident any more, and a new traffic message about a followed line.
- Scene actions: read the next passages of a stop, and read the traffic of a line, each with a ready-made sentence.
- Dashboard widgets: the next passages of one or several stops, like the screens of the stops (any stop can be typed in the widget); the traffic of lines with the full messages of Ilévia, the metro and the tram by default.
- Configuration actions: test the connection, find a stop by name (with the code, the lines and the destinations of each side of the street), add, list and remove stops, and a diagnostic written to the Logs tab.
- Cloud transport: the official open data of Ilévia published by the Métropole Européenne de Lille, no account and no key; every followed stop in one request every 30 seconds to 5 minutes, traffic every 5 minutes; lines and stops of the network kept in /data.
- English, French, German and Spanish everywhere: settings, devices, widgets, scenes and documentation.
