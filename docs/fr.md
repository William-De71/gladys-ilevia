# Ilévia Lille

## Présentation

Cette intégration amène **Ilévia**, le réseau de bus, de métro et de tram de la Métropole Européenne de Lille, dans Gladys. Elle donne les **prochains passages des bus en temps réel** aux arrêts de votre choix (trois dans le formulaire, jusqu’à 20 de plus avec un bouton), filtrés par ligne et direction. Elle suit aussi le **trafic** de six lignes au plus, bus, métro ou tram (normal, info trafic, trafic perturbé), avec les messages d’Ilévia. Chaque arrêt et chaque ligne devient un appareil à afficher sur un tableau de bord et à utiliser dans les scènes.

Les données viennent de l’**open data officiel d’Ilévia**, publié par la MEL sur `data.lillemetropole.fr` sous Licence Ouverte 2.0 : ni compte, ni clé. Tous les arrêts suivis sont lus ensemble, en une seule requête, toutes les minutes par défaut (toutes les 10 minutes quand aucun arrêt n’annonce rien, la nuit). Le trafic est lu toutes les 5 minutes. Les lignes et arrêts du réseau sont gardés par l’intégration et relus une fois par jour et une fois par semaine.

Ce que l’open data d’Ilévia ne donne pas, et que l’intégration n’invente donc pas :

- **pas de passages du métro** : les rames automatiques n’y figurent pas. Suivez les lignes de métro pour leur trafic ;
- **le tram seulement quand Ilévia le publie** : le jeu annonce « bus et tramway », mais aucun passage de tram n’y figurait le 27 octobre 2026 ;
- **pas d’horaire théorique, donc pas de retard** : seulement l’heure estimée, sur la demi-heure à venir.

C’est une intégration **cloud** : elle contacte `data.lillemetropole.fr`. Rien d’autre ne quitte votre réseau.

## Prérequis

- Gladys Assistant 5.3.0 ou plus récent.
- Rien d’autre : l’open data d’Ilévia ne demande ni compte ni clé.

## Configuration

| Champ              | Quoi saisir                                                                                                           |
| ------------------ | --------------------------------------------------------------------------------------------------------------------- |
| Arrêt 1, 2, 3      | Le nom de l’arrêt (« Gare Lille Flandres ») pour tous les côtés de la rue, ou un code (« LIG115 ») pour un seul côté. |
| Ligne              | Seulement cette ligne : « L5 », « 50 », « CO1 ». Vide : toutes les lignes de l’arrêt.                                 |
| Direction          | Seulement les destinations contenant ces mots : « Haubourdin », « Comines \| Halluin ». Vide : les deux sens.         |
| Lignes suivies     | Les lignes dont vous suivez le trafic, six au plus : « M1, M2, tram, L1 ».                                            |
| Lecture des arrêts | Toutes les 30 secondes, minutes, 2 minutes ou 5 minutes.                                                              |
| Langue des textes  | Noms des appareils, résumés et sorties des scènes. Les noms d’arrêts et les messages d’Ilévia restent en français.    |

Le bouton **Chercher un arrêt** donne les noms exacts des arrêts contenant quelques mots, avec le code de chaque côté de la rue et les lignes et destinations annoncées dans la demi-heure (« LIG115 → 14 Marquette les Voiles, 50 Chemin de Messines ») : copiez le code du côté où vous montez. **Tester la connexion** lit le réseau, chaque arrêt et chaque ligne tout de suite.

Un même arrêt porte parfois plusieurs noms selon les données (« Pont de Bois » ou « V. d’Ascq Pont de Bois ») : l’intégration les connaît tous et réunit leurs passages.

Plus d’arrêts que les trois du formulaire (domicile, travail…) : **Ajouter un arrêt** reprend les trois mêmes champs — arrêt, ligne, direction — et suit jusqu’à 20 arrêts de plus. **Lister les arrêts** montre tous les arrêts suivis, numérotés ; **Retirer un arrêt** prend ce numéro (ou le nom). Les arrêts ajoutés sont gardés dans la configuration de Gladys et suivent donc ses sauvegardes.

## Utilisation

### Appareils

Dans l’onglet **Découvrir**, créez les appareils voulus :

- **Ilévia \<arrêt\>** : le prochain passage en texte (« L5 → Haubourdin le Parc · 6 min »), et l’attente du prochain passage et du suivant (minutes) ;
- **Ilévia ligne \<ligne\>**, **Ilévia métro 1** ou **Ilévia tramway** : le trafic en texte (« Trafic perturbé : En raison d’un défaut sur une rame… ») et le nombre de messages d’Ilévia en cours.

La nuit, sans aucun passage, les attentes gardent leur dernière valeur.

### Trafic

Ilévia publie des messages « Perturbation » (un incident : métro interrompu, bus dévié) et « Information » (travaux, arrêt déplacé). Un message reste valable un jour, sauf fin annoncée plus tôt, et chaque nouvelle d’un incident est un nouveau message. Ilévia ne dit pas quand un incident est terminé. L’état d’une ligne suit donc son message le plus récent : **trafic perturbé** pendant 90 minutes après un message de perturbation, **info trafic** tant qu’un message est valable, **trafic normal** sinon.

### Widgets du tableau de bord

![Le widget Départs Ilévia à Gare Lille Flandres et le widget Trafic Ilévia du métro, du tram et d’une ligne de bus (illustration générée, pas une capture d’écran)](https://raw.githubusercontent.com/William-De71/gladys-ilevia/main/docs/assets/widgets.fr.png)

- **Départs Ilévia** : les prochains passages d’un arrêt, en compact. Une ligne par ligne de bus et destination, avec ses prochains passages à la suite (« 2 · 17 min »). Le réglage **Trajets affichés** fixe le nombre de lignes. Choisissez un arrêt suivi, ou saisissez n’importe quel arrêt (et une ligne) dans les réglages du widget. Avec **Plusieurs arrêts**, un seul widget affiche plusieurs appareils arrêts : les appareils d’un même arrêt sont réunis sous son nom ; pour des arrêts différents, chaque ligne commence par son arrêt.
- **Trafic Ilévia** : l’état de chaque ligne, puis les messages d’Ilévia, les perturbations d’abord, avec leur heure de publication. Touchez une carte pour le texte complet. Les lignes suivies, celles saisies dans les réglages, ou le métro et le tram si vous n’en suivez aucune.

### Scènes

Déclencheurs, une fois par changement (la première lecture sert seulement de référence) :

- **Ilévia : bus bientôt** : un passage à un arrêt suivi part dans 2, 3, 5, 10, 15 ou 20 minutes.
- **Ilévia : ligne perturbée** : Ilévia publie un message de perturbation sur une ligne suivie.
- **Ilévia : fin de perturbation** : la ligne n’a plus d’incident en cours (un message plus récent, ou 90 minutes passées).
- **Ilévia : nouveau message trafic** : Ilévia publie un message sur une ligne suivie, perturbation ou information.

Chacun donne une phrase toute prête, `{{triggerEvent.data.summary}}`, et ses valeurs (ligne, destination, heure, titre, texte, heure de publication…). Les actions **Ilévia : prochains passages** et **Ilévia : trafic d’une ligne** renvoient le même genre de valeurs, à mettre dans un message ou à tester dans une condition.

Exemples :

- Quand la L5 vers Haubourdin part de Gare Lille Flandres dans 5 minutes → allumer la lampe de l’entrée en vert.
- Quand le métro 1 est perturbé → envoyer le résumé sur votre téléphone avant de partir.
- Chaque jour de semaine à 7 h 30 → lire les prochains passages de votre arrêt et les faire annoncer par l’enceinte de la cuisine.

### Transport

Cloud uniquement : les données viennent d’internet. Seuls les arrêts que vous suivez sont demandés au serveur de la MEL, en une requête.

## Dépannage

- **« Inconnu d’Ilévia »** : utilisez **Chercher un arrêt**, puis copiez le nom exact ou un code ; pour une ligne, son nom comme sur les bus (« L5 », « 50 »), « M1 » ou « M2 » pour le métro, « tram » pour le tramway.
- **Aucun passage** : la nuit, le réseau dort ; l’arrêt est relu toutes les 10 minutes. À un quai de tram, Ilévia ne publie pas toujours les passages.
- **« L’open data de la MEL ne répond pas »** : l’intégration réessaie à chaque lecture ; les derniers passages restent sur les widgets.
- **Un incident terminé reste « perturbé »** : Ilévia ne publie pas la fin des incidents ; l’état revient à l’info trafic 90 minutes après le dernier message de perturbation, ou dès un message plus récent.
- **Pour signaler un problème** : appuyez sur **Diagnostic**, puis copiez les lignes commençant par « Ilévia diagnostic » de l’onglet Journaux dans une issue GitHub ou une réponse sur le forum, avec les versions de Gladys et de l’intégration.
