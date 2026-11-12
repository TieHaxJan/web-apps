# Mobile-Bearbeitung für ONLYOFFICE Docs (Community Edition)

Dieser Fork von [ONLYOFFICE/web-apps](https://github.com/ONLYOFFICE/web-apps) schaltet das
**Bearbeiten im mobilen Web-Editor** (Word, Tabelle, Präsentation) für die Community Edition
wieder ein. Ohne Patch öffnet die Community Edition auf Handy und Tablet alles nur lesend
("To access mobile web editors, a commercial license is required").

Alles, was dieser Fork ändert, steht in zwei Dingen:

- `apps/{documenteditor,spreadsheeteditor,presentationeditor}/mobile/src/lib/patch.jsx`
  (je Editor eine Datei) und
- diesem Ordner `mobile-edit/` (Build-, Test- und Update-Skripte, Dockerfile).

## Wie der Patch funktioniert

Upstream liefert diese `patch.jsx`-Dateien als **Stubs**: `isSupportEditFeature()` gibt `false`
zurück, und alle Hooks (Toolbar, Kontextmenü, Schriften, Absatz- und Tabellenstile,
Fokus-Objekte, Zellauswahl) sind leer. Die echte Version liegt in einem nicht veröffentlichten
Repo (`web-apps-mobile`), das der Build nur ersetzt, wenn es vorhanden ist
(`vendor/framework7-react/build/webpack.config.js`).

Der Patch baut diese Schicht nach. Grundlage ist der Code, der bis April 2021 öffentlich in
diesem Repo stand, angepasst an die heutigen Stores und SDK-Callbacks. Teile ohne öffentliche
Vorlage sind in den Dateien markiert (Tabelle: `getTableObject`, Umschalten Zelle/Objekt,
Sperr-Logik der Buttons).

## Bauen und testen

Voraussetzungen: Node.js, Docker.

```bash
mobile-edit/build.sh            # baut die drei mobilen Editoren mit der Version aus VERSION
mobile-edit/test-container.sh   # Test-Server auf http://localhost, Basis-Image + Patch
mobile-edit/image.sh            # baut das Image und exportiert es als .tar.gz
```

Test im Browser (Fenster auf Handygröße, **Browserfenster sichtbar lassen**, sonst zeichnet die
Seite nicht und der Editor hängt scheinbar auf "Loading"):

- `http://localhost/example/editor?fileExt=docx&user=uid-1&type=mobile&sample=true`
- gleiches mit `xlsx` und `pptx`

Prüfen: Stift antippen (Bearbeiten), Format-Panel, Hinzufügen-Menü, Undo und Redo,
Kontextmenü (Ausschneiden, Kopieren, Einfügen als Symbole).

`build.sh` setzt `PRODUCT_VERSION`/`BUILD_NUMBER` aus `VERSION`. Das ist nötig: ohne sie baut der
Webpack-Build die Version `6.2.0.123d`, das `d` schaltet den Entwicklungsmodus ein, und der
Editor lädt nie.

## Auf den Server bringen

`image.sh` erzeugt `mobile-edit/image/onlyoffice-documentserver-mobile-edit-<version>-<rev>.tar.gz`.
Auf dem Server:

```bash
docker load < onlyoffice-documentserver-mobile-edit-<version>-<rev>.tar.gz
```

Im Stack beim ONLYOFFICE-Dienst das Image eintragen und aktualisieren:

```yaml
image: onlyoffice-documentserver-mobile-edit:<version>-<rev>
pull_policy: never
```

Das Image ist ein direkter Ersatz für `onlyoffice/documentserver` in derselben Version. Server,
Desktop-Editor, Konfiguration und Volumes bleiben unverändert. Die Datei nicht öffentlich
hochladen (Branding und AGPL, siehe unten).

## Auf eine neue ONLYOFFICE-Version aktualisieren

Der Patch passt zu genau einer Version (Tag `UPSTREAM_TAG` in `VERSION`). Server und mobile
Editoren müssen dieselbe Version haben. Pro Version gibt es einen Branch
`mobile-edit-<tag>`.

1. Neue Server-Version und passenden Upstream-Tag bestimmen. Der Tag steht im Container:

   ```bash
   docker run --rm --entrypoint sh onlyoffice/documentserver:<neue-version> \
     -c 'dpkg -s onlyoffice-documentserver | grep Version'
   ```

   `Version: 10.0.1-20` entspricht dem Tag `v10.0.1.20`.

2. Einmalig den Upstream-Remote prüfen: `git remote -v` muss `upstream` =
   `https://github.com/ONLYOFFICE/web-apps.git` zeigen.

3. Update ausführen:

   ```bash
   mobile-edit/update.sh v10.0.1.20 onlyoffice/documentserver:10.0.1.1
   ```

   Das Skript legt den Branch `mobile-edit-v10.0.1.20` vom neuen Tag an, übernimmt die
   Commits des alten Branches, schreibt `VERSION` neu und ruft `check-hooks.sh` auf. Bei einem
   Konflikt hält es an (meist nur, wenn Upstream eine `patch.jsx` selbst geändert hat).

4. `check-hooks.sh` vergleicht, was die mobilen Apps aufrufen, mit dem, was `patch.jsx`
   implementiert (Hooks und Store-Schnittstelle `this.intf`). Meldet es **MISSING**, hat
   Upstream eine neue Stelle eingebaut, die der Patch noch bedienen muss. Ohne Hook läuft der
   Editor weiter, aber diese Funktion fehlt still.

5. Bauen, testen, Image bauen, pushen:

   ```bash
   mobile-edit/build.sh
   mobile-edit/test-container.sh     # Word, Tabelle, Präsentation auf Handygröße prüfen
   mobile-edit/image.sh
   git push origin mobile-edit-v10.0.1.20
   ```

Änderungen am Patch ohne neue ONLYOFFICE-Version: `REVISION` in `VERSION` hochzählen (`r3`, ...),
damit das Image einen neuen Tag bekommt.

## Bekannte Grenzen

- Die Toolbar der Präsentation ist bei 375 px Breite zu breit (Einstellungs-Symbol am Rand
  abgeschnitten).
- Getestet im Browser mit Handy-Emulation, nicht auf echten iOS-/Android-Geräten. Kontextmenü
  der Tabelle, Zusammenarbeit mit mehreren Nutzern und Kommentare sind nicht geprüft.
- Der Funktionsumfang entspricht dem mobilen Editor, nicht dem Desktop-Editor (keine
  Animationen, Pivot-Tabellen, bedingte Formatierung, Lesezeichen und anderes).

## Lizenz

ONLYOFFICE steht unter AGPL v3 mit den zusätzlichen Bedingungen aus der `LICENSE`-Datei
(Branding und Hinweise). Der Patch stellt Code wieder her, den Ascensio System SIA selbst unter
AGPL veröffentlicht hatte, und fällt unter dieselbe Lizenz. Dieses Projekt ist weder mit
ONLYOFFICE noch mit Ascensio System SIA verbunden. Für den Eigenbetrieb auf dem eigenen Server
ist das unkritisch. Wer ein geändertes Image **weitergibt**, muss Quelltext, Lizenz und die
Branding-Bedingungen beachten.
