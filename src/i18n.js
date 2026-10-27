// -----------------------------------------------------------------------------
// Texts of the integration, in English, French, German and Spanish (English
// fallback).
//
// The manifest carries its own labels; these are the texts the code writes at
// runtime: device and feature names, line states, widget contents, scene
// summaries, messages of the Configuration screen. Vocabulary of the Gladys
// interface (appareil / Gerät / dispositivo, scène / Szene / escena) and of
// Ilévia (arrêt, ligne, passage, info trafic). The names of stops and lines,
// the destinations and the traffic messages stay as Ilévia writes them, in
// French: the network has no other language.
// -----------------------------------------------------------------------------

import { minutesLeft } from './departures.js';
import { formatTime } from './time.js';

const LANGUAGES = ['en', 'fr', 'de', 'es'];

const TEXTS = {
  // devices
  stopDeviceName: {
    en: 'Ilévia {stop}',
    fr: 'Ilévia {stop}',
    de: 'Ilévia {stop}',
    es: 'Ilévia {stop}',
  },
  busDeviceName: {
    en: 'Ilévia line {line}',
    fr: 'Ilévia ligne {line}',
    de: 'Ilévia Linie {line}',
    es: 'Ilévia línea {line}',
  },
  metroDeviceName: {
    en: 'Ilévia metro {line}',
    fr: 'Ilévia métro {line}',
    de: 'Ilévia Metro {line}',
    es: 'Ilévia metro {line}',
  },
  tramDeviceName: {
    en: 'Ilévia tramway',
    fr: 'Ilévia tramway',
    de: 'Ilévia Straßenbahn',
    es: 'Ilévia tranvía',
  },
  featureNext: {
    en: 'Next passage',
    fr: 'Prochain passage',
    de: 'Nächste Abfahrt',
    es: 'Próximo paso',
  },
  featureWait: {
    en: 'Wait',
    fr: 'Attente',
    de: 'Wartezeit',
    es: 'Espera',
  },
  featureFollowing: {
    en: 'Wait for the following one',
    fr: 'Attente du suivant',
    de: 'Wartezeit der folgenden',
    es: 'Espera del siguiente',
  },
  featureStatus: {
    en: 'Traffic',
    fr: 'Trafic',
    de: 'Verkehrslage',
    es: 'Tráfico',
  },
  featureMessages: {
    en: 'Traffic messages under way',
    fr: 'Infos trafic en cours',
    de: 'Aktuelle Verkehrsmeldungen',
    es: 'Avisos de tráfico en curso',
  },

  // passages
  noPassage: {
    en: 'No passage announced',
    fr: 'Aucun passage annoncé',
    de: 'Keine Abfahrt angekündigt',
    es: 'Ningún paso anunciado',
  },
  noPassageTram: {
    en: 'No real-time passage published for the tram',
    fr: 'Aucun passage en temps réel publié pour le tram',
    de: 'Keine Echtzeit-Abfahrt für die Straßenbahn veröffentlicht',
    es: 'Ningún paso en tiempo real publicado para el tranvía',
  },
  noPassageTramShort: {
    en: 'No real time (tram)',
    fr: 'Pas de temps réel (tram)',
    de: 'Keine Echtzeit (Tram)',
    es: 'Sin tiempo real (tranvía)',
  },
  minutesValue: {
    en: '{n} min',
    fr: '{n} min',
    de: '{n} Min.',
    es: '{n} min',
  },
  approaching: {
    en: 'Approaching',
    fr: 'À l’approche',
    de: 'Fährt ein',
    es: 'Llegando',
  },
  inMinutes: {
    en: 'in {n} min',
    fr: 'dans {n} min',
    de: 'in {n} Min.',
    es: 'dentro de {n} min',
  },
  atTime: {
    en: 'at {time}',
    fr: 'à {time}',
    de: 'um {time}',
    es: 'a las {time}',
  },

  // lines
  busLineLabel: {
    en: 'Line {line}',
    fr: 'Ligne {line}',
    de: 'Linie {line}',
    es: 'Línea {line}',
  },
  metroLineLabel: {
    en: 'Metro {line}',
    fr: 'Métro {line}',
    de: 'Metro {line}',
    es: 'Metro {line}',
  },
  tramLineLabel: {
    en: 'Tramway',
    fr: 'Tramway',
    de: 'Straßenbahn',
    es: 'Tranvía',
  },

  // line states
  state_unknown: {
    en: 'No information',
    fr: 'Pas d’information',
    de: 'Keine Information',
    es: 'Sin información',
  },
  state_normal: {
    en: 'Normal traffic',
    fr: 'Trafic normal',
    de: 'Normaler Betrieb',
    es: 'Tráfico normal',
  },
  state_info: {
    en: 'Traffic information',
    fr: 'Info trafic',
    de: 'Verkehrsinformation',
    es: 'Aviso de tráfico',
  },
  state_disrupted: {
    en: 'Disrupted traffic',
    fr: 'Trafic perturbé',
    de: 'Gestörter Betrieb',
    es: 'Tráfico alterado',
  },
  stateWithTitle: {
    en: '{state}: {title}',
    fr: '{state} : {title}',
    de: '{state}: {title}',
    es: '{state}: {title}',
  },

  // scene summaries
  summarySoon: {
    en: '{line} towards {destination} leaves {stop} in {minutes} min ({time}).',
    fr: '{line} vers {destination} passe à {stop} dans {minutes} min ({time}).',
    de: '{line} Richtung {destination} fährt an {stop} in {minutes} Min. ab ({time}).',
    es: '{line} hacia {destination} pasa por {stop} dentro de {minutes} min ({time}).',
  },
  summaryDisrupted: {
    en: 'Ilévia, {line}: disrupted traffic.',
    fr: 'Ilévia, {line} : trafic perturbé.',
    de: 'Ilévia, {line}: gestörter Betrieb.',
    es: 'Ilévia, {line}: tráfico alterado.',
  },
  summaryDisruptedTitle: {
    en: 'Ilévia, {line}: disrupted traffic ({title})',
    fr: 'Ilévia, {line} : trafic perturbé ({title})',
    de: 'Ilévia, {line}: gestörter Betrieb ({title})',
    es: 'Ilévia, {line}: tráfico alterado ({title})',
  },
  summaryRestored: {
    en: 'Ilévia, {line}: no incident under way any more ({state}).',
    fr: 'Ilévia, {line} : plus d’incident en cours ({state}).',
    de: 'Ilévia, {line}: keine aktuelle Störung mehr ({state}).',
    es: 'Ilévia, {line}: ya no hay incidencia en curso ({state}).',
  },
  summaryMessage: {
    en: 'Ilévia, {line}, information: {title}',
    fr: 'Ilévia, {line}, info trafic : {title}',
    de: 'Ilévia, {line}, Information: {title}',
    es: 'Ilévia, {line}, aviso: {title}',
  },
  summaryMessageIncident: {
    en: 'Ilévia, {line}, incident: {title}',
    fr: 'Ilévia, {line}, perturbation : {title}',
    de: 'Ilévia, {line}, Störung: {title}',
    es: 'Ilévia, {line}, incidencia: {title}',
  },
  summaryLineState: {
    en: 'Ilévia, {line}: {state} ({title})',
    fr: 'Ilévia, {line} : {state} ({title})',
    de: 'Ilévia, {line}: {state} ({title})',
    es: 'Ilévia, {line}: {state} ({title})',
  },
  summaryLineStateOnly: {
    en: 'Ilévia, {line}: {state}.',
    fr: 'Ilévia, {line} : {state}.',
    de: 'Ilévia, {line}: {state}.',
    es: 'Ilévia, {line}: {state}.',
  },
  outputNext: {
    en: 'Next passage at {stop}: {line} towards {destination} {when}.',
    fr: 'Prochain passage à {stop} : {line} vers {destination} {when}.',
    de: 'Nächste Abfahrt an {stop}: {line} Richtung {destination} {when}.',
    es: 'Próximo paso en {stop}: {line} hacia {destination} {when}.',
  },
  outputFollowing: {
    en: 'The following one {when}.',
    fr: 'Le suivant {when}.',
    de: 'Die folgende {when}.',
    es: 'El siguiente {when}.',
  },
  outputNone: {
    en: 'No passage announced at {stop} in the next half hour.',
    fr: 'Aucun passage annoncé à {stop} dans la demi-heure.',
    de: 'Keine Abfahrt an {stop} in der nächsten halben Stunde angekündigt.',
    es: 'Ningún paso anunciado en {stop} en la próxima media hora.',
  },

  // widgets
  readAt: {
    en: 'read at {time}',
    fr: 'lu à {time}',
    de: 'gelesen um {time}',
    es: 'leído a las {time}',
  },
  updatedAt: {
    en: 'Ilévia · updated at {time}',
    fr: 'Ilévia · mis à jour à {time}',
    de: 'Ilévia · aktualisiert um {time}',
    es: 'Ilévia · actualizado a las {time}',
  },
  publishedAt: {
    en: 'published {time}',
    fr: 'publié {time}',
    de: 'veröffentlicht {time}',
    es: 'publicado {time}',
  },
  minutesShort: {
    en: 'min',
    fr: 'min',
    de: 'Min.',
    es: 'min',
  },
  moreInfo: {
    en: 'Open the document',
    fr: 'Ouvrir le document',
    de: 'Dokument öffnen',
    es: 'Abrir el documento',
  },
  trafficTitle: {
    en: 'Ilévia traffic',
    fr: 'Trafic Ilévia',
    de: 'Ilévia-Verkehrslage',
    es: 'Tráfico Ilévia',
  },
  noMessage: {
    en: 'No traffic message for these lines.',
    fr: 'Aucune info trafic pour ces lignes.',
    de: 'Keine Verkehrsmeldung für diese Linien.',
    es: 'Ningún aviso de tráfico para estas líneas.',
  },
  widgetNoStop: {
    en: 'No stop is followed: add one on the Configuration screen of the integration, or type one in the widget settings.',
    fr: 'Aucun arrêt n’est suivi : ajoutez-en un dans l’écran Configuration de l’intégration, ou saisissez-en un dans les réglages du widget.',
    de: 'Keine Haltestelle wird verfolgt: Füge eine im Konfigurationsbildschirm der Integration hinzu oder gib eine in den Widget-Einstellungen ein.',
    es: 'No se sigue ninguna parada: añade una en la pantalla Configuración de la integración, o escribe una en los ajustes del widget.',
  },

  // configuration and status
  statusUnreachable: {
    en: 'The open data of the MEL do not answer ({detail}). Next try in {minutes} min.',
    fr: 'L’open data de la MEL ne répond pas ({detail}). Nouvel essai dans {minutes} min.',
    de: 'Die Open Data der MEL antworten nicht ({detail}). Neuer Versuch in {minutes} Min.',
    es: 'Los datos abiertos de la MEL no responden ({detail}). Nuevo intento dentro de {minutes} min.',
  },
  statusConnected: {
    en: 'Connected to Ilévia: {stops} stop(s), {lines} line(s), stops read every {interval} s.',
    fr: 'Connecté à Ilévia : {stops} arrêt(s), {lines} ligne(s), arrêts lus toutes les {interval} s.',
    de: 'Mit Ilévia verbunden: {stops} Haltestelle(n), {lines} Linie(n), Haltestellen alle {interval} s gelesen.',
    es: 'Conectado a Ilévia: {stops} parada(s), {lines} línea(s), paradas leídas cada {interval} s.',
  },
  statusNotFound: {
    en: 'Unknown to Ilévia: {names}.',
    fr: 'Inconnu d’Ilévia : {names}.',
    de: 'Bei Ilévia unbekannt: {names}.',
    es: 'Desconocido para Ilévia: {names}.',
  },
  statusNothing: {
    en: 'Connected to Ilévia. Add a stop or a line on the Configuration screen.',
    fr: 'Connecté à Ilévia. Ajoutez un arrêt ou une ligne dans l’écran Configuration.',
    de: 'Mit Ilévia verbunden. Füge im Konfigurationsbildschirm eine Haltestelle oder Linie hinzu.',
    es: 'Conectado a Ilévia. Añade una parada o una línea en la pantalla Configuración.',
  },
  testNetworkOk: {
    en: 'Ilévia open data reached: {lines} lines, {stops} stops',
    fr: 'Open data Ilévia joint : {lines} lignes, {stops} arrêts',
    de: 'Ilévia Open Data erreicht: {lines} Linien, {stops} Haltestellen',
    es: 'Datos abiertos de Ilévia alcanzados: {lines} líneas, {stops} paradas',
  },
  testStop: {
    en: '{stop}: {count} passage(s), next {next}',
    fr: '{stop} : {count} passage(s), prochain {next}',
    de: '{stop}: {count} Abfahrt(en), nächste {next}',
    es: '{stop}: {count} paso(s), próximo {next}',
  },
  testStopError: {
    en: '{stop}: {error}',
    fr: '{stop} : {error}',
    de: '{stop}: {error}',
    es: '{stop}: {error}',
  },
  testLine: {
    en: '{line}: {state}',
    fr: '{line} : {state}',
    de: '{line}: {state}',
    es: '{line}: {state}',
  },
  testTrafficError: {
    en: 'Traffic: {error}',
    fr: 'Trafic : {error}',
    de: 'Verkehrslage: {error}',
    es: 'Tráfico: {error}',
  },
  unknownEntry: {
    en: 'unknown: {name}',
    fr: 'inconnu : {name}',
    de: 'unbekannt: {name}',
    es: 'desconocido: {name}',
  },
  errorUnreachable: {
    en: 'the open data of the MEL do not answer',
    fr: 'l’open data de la MEL ne répond pas',
    de: 'die Open Data der MEL antworten nicht',
    es: 'los datos abiertos de la MEL no responden',
  },
  errorBusy: {
    en: 'the open data server of the MEL is busy, try again in a moment',
    fr: 'le serveur open data de la MEL est occupé, réessayez dans un instant',
    de: 'der Open-Data-Server der MEL ist ausgelastet, versuche es gleich noch einmal',
    es: 'el servidor de datos abiertos de la MEL está ocupado, inténtalo de nuevo en un momento',
  },
  searchTooShort: {
    en: 'Type at least two letters of the stop name.',
    fr: 'Saisissez au moins deux lettres du nom de l’arrêt.',
    de: 'Gib mindestens zwei Buchstaben des Haltestellennamens ein.',
    es: 'Escribe al menos dos letras del nombre de la parada.',
  },
  searchNone: {
    en: 'No Ilévia stop matches "{query}".',
    fr: 'Aucun arrêt Ilévia ne correspond à « {query} ».',
    de: 'Keine Ilévia-Haltestelle passt zu „{query}“.',
    es: 'Ninguna parada de Ilévia coincide con «{query}».',
  },
  searchFound: {
    en: 'Type the name for every side of the street, or a code for one side only (its lines, and the destinations announced now, after the arrow):\n{list}',
    fr: 'Saisissez le nom pour tous les côtés de la rue, ou un code pour un seul côté (ses lignes, et les destinations annoncées maintenant, après la flèche) :\n{list}',
    de: 'Gib den Namen für alle Straßenseiten ein oder einen Code für nur eine Seite (ihre Linien und die gerade angekündigten Ziele nach dem Pfeil):\n{list}',
    es: 'Escribe el nombre para todos los lados de la calle, o un código para un solo lado (sus líneas, y los destinos anunciados ahora, tras la flecha):\n{list}',
  },
  searchBus: {
    en: 'bus',
    fr: 'bus',
    de: 'Bus',
    es: 'bus',
  },
  searchTram: {
    en: 'tram',
    fr: 'tram',
    de: 'Tram',
    es: 'tranvía',
  },

  // stops added with the configuration buttons
  stopAdded: {
    en: 'Stop added: {name}. {count} stop(s) followed. Its device is offered in the Discover tab.',
    fr: 'Arrêt ajouté : {name}. {count} arrêt(s) suivi(s). Son appareil est proposé dans l’onglet Découvrir.',
    de: 'Haltestelle hinzugefügt: {name}. {count} Haltestelle(n) verfolgt. Ihr Gerät wird im Tab Entdecken angeboten.',
    es: 'Parada añadida: {name}. {count} parada(s) seguida(s). Su dispositivo se ofrece en la pestaña Descubrir.',
  },
  stopAlreadyFollowed: {
    en: '{name} is already followed.',
    fr: '{name} est déjà suivi.',
    de: '{name} wird bereits verfolgt.',
    es: '{name} ya se sigue.',
  },
  stopsFull: {
    en: 'Already {max} stops added: remove one first.',
    fr: 'Déjà {max} arrêts ajoutés : retirez-en un d’abord.',
    de: 'Bereits {max} Haltestellen hinzugefügt: entferne zuerst eine.',
    es: 'Ya hay {max} paradas añadidas: quita una primero.',
  },
  stopRemoved: {
    en: 'Stop removed: {name}. Delete its device in Gladys if you no longer want it.',
    fr: 'Arrêt retiré : {name}. Supprimez son appareil dans Gladys si vous n’en voulez plus.',
    de: 'Haltestelle entfernt: {name}. Lösche ihr Gerät in Gladys, wenn du es nicht mehr brauchst.',
    es: 'Parada quitada: {name}. Borra su dispositivo en Gladys si ya no lo quieres.',
  },
  stopRemoveUnknown: {
    en: 'No added stop matches "{query}": type its number given by "List the stops".',
    fr: 'Aucun arrêt ajouté ne correspond à « {query} » : saisissez son numéro donné par « Lister les arrêts ».',
    de: 'Keine hinzugefügte Haltestelle passt zu „{query}“: gib ihre Nummer aus „Haltestellen auflisten“ ein.',
    es: 'Ninguna parada añadida coincide con «{query}»: escribe su número dado por «Listar las paradas».',
  },
  stopRemoveAmbiguous: {
    en: 'Several added stops match "{query}": type the number given by "List the stops".',
    fr: 'Plusieurs arrêts ajoutés correspondent à « {query} » : saisissez le numéro donné par « Lister les arrêts ».',
    de: 'Mehrere hinzugefügte Haltestellen passen zu „{query}“: gib die Nummer aus „Haltestellen auflisten“ ein.',
    es: 'Varias paradas añadidas coinciden con «{query}»: escribe el número dado por «Listar las paradas».',
  },
  stopInForm: {
    en: '{name} is stop {slot} of the form: empty its field, then save the configuration.',
    fr: '{name} est l’arrêt {slot} du formulaire : videz son champ, puis enregistrez la configuration.',
    de: '{name} ist Haltestelle {slot} des Formulars: leere ihr Feld und speichere dann die Konfiguration.',
    es: '{name} es la parada {slot} del formulario: vacía su campo y guarda la configuración.',
  },
  stopsNone: {
    en: 'No stop followed yet: fill in a stop of the form or press "Add a stop".',
    fr: 'Aucun arrêt suivi pour l’instant : remplissez un arrêt du formulaire ou appuyez sur « Ajouter un arrêt ».',
    de: 'Noch keine Haltestelle verfolgt: fülle eine Haltestelle im Formular aus oder drücke „Haltestelle hinzufügen“.',
    es: 'Aún no se sigue ninguna parada: rellena una parada del formulario o pulsa «Añadir una parada».',
  },
  stopsList: {
    en: '{count} stop(s) followed:\n{list}',
    fr: '{count} arrêt(s) suivi(s) :\n{list}',
    de: '{count} Haltestelle(n) verfolgt:\n{list}',
    es: '{count} parada(s) seguida(s):\n{list}',
  },
  stopFromForm: {
    en: 'form, stop {slot}',
    fr: 'formulaire, arrêt {slot}',
    de: 'Formular, Haltestelle {slot}',
    es: 'formulario, parada {slot}',
  },
  stopUnknownMark: {
    en: 'unknown to Ilévia',
    fr: 'inconnu d’Ilévia',
    de: 'Ilévia unbekannt',
    es: 'desconocido para Ilévia',
  },
  diagnosticDone: {
    en: 'Diagnostic written to the Logs tab ({count} line(s) starting with "Ilévia diagnostic").',
    fr: 'Diagnostic écrit dans l’onglet Journaux ({count} ligne(s) commençant par « Ilévia diagnostic »).',
    de: 'Diagnose in den Tab Protokolle geschrieben ({count} Zeile(n), beginnend mit „Ilévia diagnostic“).',
    es: 'Diagnóstico escrito en la pestaña Registros ({count} línea(s) que empiezan por «Ilévia diagnostic»).',
  },
};

/**
 * @description Whether a value is a supported language.
 * @param {unknown} value - The value.
 * @returns {boolean} True for en, fr, de, es.
 */
function isLanguage(value) {
  return LANGUAGES.includes(value);
}

/**
 * @description A text in a language, its placeholders filled.
 * @param {string} key - A TEXTS key.
 * @param {string} language - The language (English when unknown).
 * @param {object} [values] - The placeholder values.
 * @returns {string} The text.
 * @example
 * t('inMinutes', 'fr', { n: 3 }); // -> 'dans 3 min'
 */
function t(key, language, values = {}) {
  const entry = TEXTS[key];
  if (!entry) {
    return key;
  }
  const template = entry[isLanguage(language) ? language : 'en'] ?? entry.en;
  return template.replace(/\{(\w+)\}/g, (whole, name) =>
    values[name] === undefined || values[name] === null ? '' : String(values[name]),
  );
}

/**
 * @description A text in the four languages.
 * @param {string} key - A TEXTS key.
 * @param {object|Function} [values] - The values, or `(language) => values`.
 * @returns {object} `{ en, fr, de, es }`.
 */
function all(key, values = {}) {
  return Object.fromEntries(
    LANGUAGES.map((language) => [
      language,
      t(key, language, typeof values === 'function' ? values(language) : values),
    ]),
  );
}

/**
 * @description The label of a line state.
 * @param {string} state - A state name (traffic.js).
 * @param {string} language - The language.
 * @returns {string} The label.
 */
const lineStateText = (state, language) =>
  t(TEXTS[`state_${state}`] ? `state_${state}` : 'state_unknown', language);

/**
 * @description How a line reads in a sentence or a list: "Ligne L1",
 * "Métro 1", "Tramway".
 * @param {{ name: string, mode: string }} line - The line.
 * @param {string} language - The language.
 * @returns {string} The label.
 */
function lineLabel(line, language) {
  if (line.mode === 'metro') {
    return t('metroLineLabel', language, { line: String(line.name).replace(/^M/i, '') });
  }
  if (line.mode === 'tram') {
    return t('tramLineLabel', language);
  }
  return t('busLineLabel', language, { line: line.name });
}

/**
 * @description The name of the device of a line: "Ilévia ligne L1",
 * "Ilévia métro 1", "Ilévia tramway".
 * @param {{ name: string, mode: string }} line - The line.
 * @param {string} language - The language.
 * @returns {string} The name.
 */
function lineDeviceName(line, language) {
  if (line.mode === 'metro') {
    return t('metroDeviceName', language, { line: String(line.name).replace(/^M/i, '') });
  }
  if (line.mode === 'tram') {
    return t('tramDeviceName', language);
  }
  return t('busDeviceName', language, { line: line.name });
}

/**
 * @description When a passage comes, in a sentence: "in 3 min", "at 10:32".
 * @param {object} passage - The passage.
 * @param {object} options - `{ language, now, timeZone }`.
 * @returns {string} The words.
 */
function passageWhen(passage, { language, now, timeZone }) {
  const minutes = minutesLeft(passage, now);
  if (minutes >= 60) {
    return t('atTime', language, { time: formatTime(passage.at, timeZone) });
  }
  return minutes === 0
    ? t('approaching', language).toLowerCase()
    : t('inMinutes', language, { n: minutes });
}

/**
 * @description The short time of a passage, as on the screens of the stops:
 * "3 min", "10:32", "Approaching".
 * @param {object} passage - The passage.
 * @param {object} options - `{ language, now, timeZone }`.
 * @returns {string} The time.
 */
function passageShort(passage, { language, now, timeZone }) {
  const minutes = minutesLeft(passage, now);
  if (minutes >= 60) {
    return formatTime(passage.at, timeZone);
  }
  return minutes === 0 ? t('approaching', language) : t('minutesValue', language, { n: minutes });
}

/**
 * @description One line for a passage: "L1 → CHR Oscar Lambret · 3 min".
 * @param {object|null} passage - The passage, null when none.
 * @param {object} options - `{ language, now, timeZone }`.
 * @returns {string} The text.
 */
function passageText(passage, options) {
  if (!passage) {
    return t('noPassage', options.language);
  }
  const head = passage.destination ? `${passage.line} → ${passage.destination}` : passage.line;
  return `${head} · ${passageShort(passage, options)}`;
}

export {
  LANGUAGES,
  TEXTS,
  isLanguage,
  t,
  all,
  lineStateText,
  lineLabel,
  lineDeviceName,
  passageWhen,
  passageShort,
  passageText,
};
