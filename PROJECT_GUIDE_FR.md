# Capitales — Guide du projet

[English documentation](PROJECT_GUIDE.md)

Ce document explique le fonctionnement du projet Capitales, son installation, sa compilation, le stockage de ses données et la manière de l’étendre sans casser son architecture.

## 1. Présentation

Capitales est un quiz sur les capitales du monde proposé sous trois formes :

- Jeu dans un navigateur.
- Application native Windows.
- Application native Linux.

Les trois versions partagent la même application React, les mêmes règles, données géographiques, traductions et tables SQLite. Electron fournit la coque des applications Windows et Linux.

Déroulement d’une partie :

1. L’application choisit l’un des 195 États souverains.
2. Elle affiche sa silhouette sans révéler son nom.
3. Un repère jaune indique les coordonnées de sa capitale.
4. Le joueur choisit parmi quatre noms de villes.
5. Une partie comprend dix questions.
6. Un score classé parmi les dix meilleurs déclenche la saisie du nom.
7. Le nom et le score sont enregistrés dans SQLite.

Le bouton-drapeau permet de passer du français à l’anglais à tout moment.

## 2. Technologies

| Domaine | Technologie | Rôle |
| --- | --- | --- |
| Langage | TypeScript | Logique du jeu et application |
| Interface | React | Écrans, contrôles et état |
| Développement et compilation | Vite | Serveur local et paquet web de production |
| Rendu géographique | D3 Geo | Ajustement des contours et projection des coordonnées |
| Source cartographique | `world-atlas` | Frontières dérivées de Natural Earth |
| Géométries | `topojson-client` | Conversion de TopoJSON vers GeoJSON |
| Moteur de données | `sql.js` | SQLite compilé en WebAssembly |
| Applications bureau | Electron | Coque Windows et Linux |
| Paquetage | electron-builder | Exécutables et archives distribuables |
| Tests unitaires | Vitest | Vérification de la génération des questions |

## 3. Organisation des fichiers

```text
Capitales/
├── electron/
│   ├── main.cjs             Processus bureau et persistance du fichier SQLite
│   └── preload.cjs          Pont sécurisé entre React et Electron
├── src/
│   ├── App.tsx              Écrans et état général du jeu
│   ├── CountryMap.tsx       Silhouette du pays et repère de la capitale
│   ├── countries.json       Catalogue complet des pays et capitales
│   ├── data.ts              Accès typé au catalogue
│   ├── database.ts          Initialisation, migration et scores SQLite
│   ├── game.ts              Questions et choix incorrects
│   ├── game.test.ts         Tests unitaires
│   ├── i18n.ts              Textes français/anglais et noms géographiques
│   ├── main.tsx             Point d’entrée React
│   ├── styles.css           Identité visuelle et mise en page adaptative
│   └── vite-env.d.ts        Déclarations TypeScript
├── dist/                    Version web générée
├── release/                 Paquets Windows et Linux générés
├── index.html               Point d’entrée HTML
├── package.json             Dépendances, scripts et configuration du paquetage
├── tsconfig*.json           Configuration TypeScript
└── vite.config.ts           Configuration de Vite et Vitest
```

`dist/`, `release/` et `node_modules/` sont générés. Les modifications fonctionnelles doivent normalement être réalisées dans `src/` ou `electron/`.

## 4. Installation et développement

### Prérequis

- Node.js récent.
- npm.
- Windows 10 ou version ultérieure pour l’exécutable Windows.
- Une distribution Linux moderne pour exécuter le paquet Linux.

Installation des dépendances :

```powershell
npm install
```

### Version navigateur

```powershell
npm run dev
```

Ouvrir l’adresse indiquée par Vite, généralement :

```text
http://localhost:5173
```

Vite recharge automatiquement la page après une modification du code.

### Version Electron

```powershell
npm run dev:windows
```

Cette commande lance Vite puis Electron. Son nom historique mentionne Windows, mais la coque Electron est multiplateforme.

La fenêtre est centrée et limitée à 1120 × 720 pixels logiques. Si la mise à l’échelle du système réduit l’espace utilisable, elle occupe au maximum 90 % de la largeur et 88 % de la hauteur disponibles. Une mise en page compacte propre à Electron évite les barres de défilement, y compris pour les dix meilleurs scores.

## 5. Création des versions distribuables

### Navigateur

```powershell
npm run build
```

Le résultat est écrit dans `dist/`. Il doit être servi par un serveur web : l’ouverture directe de `dist/index.html` avec une adresse `file://` peut empêcher le chargement du module WebAssembly de SQLite.

Prévisualisation du paquet de production :

```powershell
npm run preview
```

### Windows

```powershell
npm run build:windows
```

Fichiers produits dans `release/` :

- `Capitales Setup 0.1.0.exe` : installateur standard.
- `Capitales 0.1.0.exe` : application portable.
- `win-unpacked/Capitales.exe` : version décompressée de développement.

Le nom et la version proviennent de `package.json`. Il faut augmenter `version` avant une nouvelle diffusion publique.

Windows peut verrouiller temporairement des fichiers Electron lors d’une analyse antivirus. Si electron-builder signale une erreur de renommage `EPERM`, fermer Capitales, attendre quelques instants, supprimer uniquement le dossier incomplet `release/win-unpacked.tmp`, puis relancer la commande.

### Linux

Sur une machine Linux :

```bash
npm run build:linux
```

La commande produit une AppImage x64 et une archive `.tar.gz` dans `release/`.

Lancement de l’AppImage :

```bash
chmod +x Capitales-0.1.0-x86_64.AppImage
./Capitales-0.1.0-x86_64.AppImage
```

Depuis Windows, l’archive portable peut être construite avec :

```powershell
npm run build:linux:archive
```

Après une construction croisée Windows, restaurer les droits d’exécution Unix :

```bash
tar -xzf Capitales-0.1.0-x64.tar.gz
cd linux-unpacked
chmod +x capitales chrome-sandbox chrome_crashpad_handler
./capitales
```

La création d’une AppImage exige des outils Linux tels que `mksquashfs`. Le lancement final doit être contrôlé sur Linux réel ou dans une machine virtuelle Linux.

## 6. Fonctionnement de SQLite

### Pourquoi `sql.js`

Un navigateur ne peut pas ouvrir librement un fichier SQLite local. `sql.js` compile SQLite en WebAssembly : l’application exécute du SQL normal en mémoire, puis sérialise la base complète sous forme d’octets.

L’API de données se trouve dans `src/database.ts`. Les autres composants ne savent pas s’ils fonctionnent dans un navigateur ou dans Electron.

### Emplacement sous Windows

```text
%APPDATA%\Capitales\capitales.sqlite
```

Chemin habituel :

```text
C:\Users\<utilisateur>\AppData\Roaming\Capitales\capitales.sqlite
```

Par exemple :

```text
C:\Users\Philippe Noth\AppData\Roaming\Capitales\capitales.sqlite
```

`electron/main.cjs` obtient ce dossier avec `app.getPath('userData')`. Le fichier apparaît au premier démarrage réussi. Même la version portable place ses scores dans le dossier de données de l’utilisateur, et non à côté de l’exécutable.

### Emplacement sous Linux

Emplacement habituel :

```text
~/.config/Capitales/capitales.sqlite
```

Si `XDG_CONFIG_HOME` est défini, le chemin devient normalement `$XDG_CONFIG_HOME/Capitales/capitales.sqlite`. L’AppImage et l’archive portable utilisent toutes deux ce dossier.

### Stockage dans le navigateur

La version web ne crée pas de fichier `.sqlite` visible. La base sérialisée est encodée en Base64 dans le stockage local du navigateur sous la clé :

```text
capitales.sqlite.base64
```

Ce stockage dépend de l’origine exacte. Ces trois adresses ont donc des bases séparées :

```text
http://localhost:5173
http://127.0.0.1:5173
https://example.com
```

Conséquences :

- Chaque navigateur possède ses propres scores.
- Le mode privé supprime normalement la base à la fermeture.
- Effacer les données du site efface les scores.
- Changer le protocole, le nom d’hôte ou le port change de zone de stockage.
- Les scores du navigateur, de Windows et de Linux sont indépendants.

### Schéma de la base

```sql
CREATE TABLE scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL DEFAULT 'Anonymous',
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  played_at TEXT NOT NULL
);
```

| Champ | Signification |
| --- | --- |
| `id` | Identifiant interne unique |
| `name` | Nom du joueur, limité à 24 caractères par l’interface |
| `score` | Nombre de bonnes réponses |
| `total` | Nombre total de questions, actuellement 10 |
| `played_at` | Date ISO 8601 utilisée pour départager les égalités |

Les anciennes bases sont migrées automatiquement. L’application interroge `PRAGMA table_info(scores)` et ajoute la colonne `name` si elle manque.

### Règles du top 10

Un score est admissible lorsque :

- Moins de dix scores sont enregistrés, ou
- Il est supérieur ou égal au score occupant la dixième place.

Le classement est trié par score décroissant, puis par date croissante en cas d’égalité. Les lignes au-delà de la dixième place sont supprimées. Un nom vide devient `Anonymous` ou `Anonyme` selon la langue active.

### Examiner la base

Fermer Capitales avant d’ouvrir la base avec SQLite CLI ou DB Browser for SQLite.

Sous Windows :

```powershell
sqlite3 "$env:APPDATA\Capitales\capitales.sqlite"
```

Puis :

```sql
.headers on
.mode column
SELECT * FROM scores ORDER BY score DESC, played_at ASC;
```

Ne pas modifier le fichier pendant l’exécution : la copie en mémoire pourrait ensuite l’écraser.

### Réinitialiser les scores

Windows :

1. Fermer Capitales.
2. Sauvegarder le fichier si nécessaire.
3. Supprimer `%APPDATA%\Capitales\capitales.sqlite`.
4. Relancer le jeu.

Linux : supprimer `~/.config/Capitales/capitales.sqlite` après avoir fermé le jeu.

Navigateur : supprimer la clé `capitales.sqlite.base64` dans l’onglet Application ou Stockage des outils de développement, puis recharger la page.

La suppression est définitive en l’absence d’une sauvegarde.

## 7. Logique du jeu

La génération des questions se trouve dans `src/game.ts`.

- Le pays courant est exclu du tirage suivant.
- Chaque question contient quatre choix uniques.
- La bonne capitale est toujours présente.
- Les capitales de la même région sont préférées comme mauvaises réponses.
- Les autres régions complètent la liste.
- Les quatre réponses sont mélangées.

L’état React principal se trouve dans `src/App.tsx` :

```text
accueil → jeu → saisie du nom (si classé) → meilleurs scores
               └──────────────────────────→ meilleurs scores (sinon)
```

Le score augmente dès la sélection d’une bonne réponse. Après un choix, les boutons sont verrouillés jusqu’à la question suivante.

## 8. Cartes et coordonnées

`src/countries.json` contient les 195 États souverains et `src/data.ts` fournit leur type :

```ts
type Country = {
  id: number
  name: string
  nameFr: string
  capital: string
  longitude: number
  latitude: number
  region: string
}
```

`id` correspond à l’identifiant numérique du pays dans `world-atlas/countries-10m.json`. Cette résolution détaillée inclut les micro-États.

Dans `src/CountryMap.tsx` :

1. `topojson-client` extrait le pays en GeoJSON.
2. D3 ajuste la projection de Mercator à la zone SVG.
3. La même projection convertit les coordonnées de la capitale en pixels SVG.
4. Le contour et le repère animé sont dessinés ensemble.

D3 attend la longitude avant la latitude :

```ts
projection([country.longitude, country.latitude])
```

Inverser ces valeurs place le repère au mauvais endroit.

## 9. Français et anglais

La localisation légère se trouve dans `src/i18n.ts` :

- Textes complets de l’interface dans les deux langues.
- Noms français des pays.
- Traduction française des capitales lorsqu’elle diffère.

Les réponses sont comparées avec leur valeur anglaise interne; seule leur présentation est traduite. Changer de langue pendant une question ne modifie donc pas la validité de la réponse.

La préférence est enregistrée dans le stockage local sous :

```text
capitales.language
```

Electron dispose également d’un stockage local et mémorise la langue. Toute nouvelle clé d’interface doit être ajoutée à `copy.en` et `copy.fr`.

## 10. Ajouter ou corriger un pays

1. Modifier l’entrée dans `src/countries.json`.
2. Employer l’identifiant numérique de `world-atlas`.
3. Vérifier l’ordre longitude/latitude.
4. Utiliser une région existante afin de conserver de bons choix incorrects.
5. Renseigner le nom français dans `nameFr`.
6. Ajouter la capitale à `frenchCapitals` si sa forme française diffère.
7. Contrôler visuellement le contour et le repère.

Le nombre de pays affiché à l’accueil est calculé automatiquement.

## 11. Tests et vérifications

Tests unitaires :

```powershell
npm test
```

Contrôle TypeScript et compilation web :

```powershell
npm run build
```

Avant une diffusion, contrôler :

- Accueil dans les deux langues.
- Changement de langue pendant une question.
- Réponses correctes et incorrectes.
- Partie complète de dix questions.
- Saisie du nom et classement.
- Persistance après redémarrage.
- Mise en page navigateur aux formats bureau et mobile.
- Fenêtres Electron sans barres de défilement.
- Création du fichier SQLite sous Windows et Linux.

Les tests automatisés vérifient également la présence de 195 identifiants cartographiques uniques.

## 12. Sécurité et confidentialité

- Aucun score ni nom n’est envoyé à un serveur.
- Les données restent sur la machine ou dans le profil du navigateur.
- Le processus React n’accède pas directement à Node.js.
- `electron/preload.cjs` n’expose que le chargement et l’enregistrement des octets SQLite.
- Les noms sont limités à 24 caractères.
- React échappe les noms affichés et ne les interprète pas comme du HTML.

Les exécutables Windows ne sont pas signés avec un certificat commercial. SmartScreen peut donc afficher un avertissement sur une autre machine.

## 13. Limites et améliorations possibles

Limites actuelles :

- Les scores ne sont pas synchronisés entre navigateur, Windows et Linux.
- Le navigateur utilise Local Storage plutôt qu’IndexedDB ou OPFS.
- Les applications utilisent encore l’icône Electron par défaut.
- Les polices Google utilisent des polices de remplacement hors connexion.
- Il n’existe pas encore de son, filtre par continent, difficulté ou chronomètre.

Améliorations raisonnables :

1. Vérifier périodiquement les changements de capitales et de noms officiels.
2. Ajouter les filtres par continent et difficulté.
3. Intégrer localement les polices et une icône personnalisée.
4. Migrer le stockage web vers IndexedDB ou OPFS.
5. Ajouter l’export/import de la base des scores.
6. Ajouter des tests de bout en bout.
7. Ajouter chronomètre, séries de bonnes réponses et options d’accessibilité.

## 14. Commandes utiles

| Commande | Action |
| --- | --- |
| `npm install` | Installer les dépendances |
| `npm run dev` | Lancer le navigateur en développement |
| `npm run dev:windows` | Lancer Electron en développement |
| `npm test` | Exécuter les tests unitaires |
| `npm run build` | Vérifier TypeScript et compiler le web |
| `npm run preview` | Prévisualiser la production web |
| `npm run build:windows` | Produire installateur et exécutable Windows |
| `npm run build:linux` | Produire AppImage et archive sous Linux |
| `npm run build:linux:archive` | Construire l’archive Linux depuis Windows |

## 15. Principales configurations

- Version : `package.json` → `version`.
- Nom du produit : `package.json` → `build.productName`.
- Taille d’une partie : `ROUND_LENGTH` dans `src/App.tsx`.
- Catalogue : `src/countries.json` et son type dans `src/data.ts`.
- Traductions : `src/i18n.ts`.
- Schéma et classement : `src/database.ts`.
- Design et adaptation : `src/styles.css`.
- Dimensions de la fenêtre et nom du fichier SQLite : `electron/main.cjs`.

