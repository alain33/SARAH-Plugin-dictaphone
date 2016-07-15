Dictaphone
==========

This plugin is an add-on for the framework [S.A.R.A.H.](http://encausse.net/s-a-r-a-h), an Home Automation project built 
on top of:
* C# (Kinect) client for Voice, Gesture, Face, QRCode recognition. 
* NodeJS (ExpressJS) server for Internet of Things communication

## Introduction
Dictaphone est:
- Un gestionnaire d'événements de calendrier autonome:
	- Rendez-vous, tâches.
	- Anniversaires, fêtes.
	- Jours fériés, dates de changement de saisons.
	- Calendrier de championnats, etc...
	- Et tous les événements que vous pouvez imaginer, par exemple vous rappeler un programme TV, pourquoi pas ?.
	- Fourni avec tous les jours fériés et dates de changement de saisons pour 2016, 2017 et 2018
- Un dictaphone.
	- Enregistreur vocale de mémos.
- Rubriques de classements d'événements et de mémos totalement configurables sans développement.
- Recherche des événements et mémos pour:
	- Le jour même, le lendemain, le sur-lendemain, un nombre de jours spécifiques.
	- Entre aujourd'hui et un nombre de jours.
	- Pour la semaine courante.
	- Pour la semaine suivante.
	- Pour le mois courant.
	- Totalement configurable sans développement.
- Permet d'être averti des événements manqués pour la journée courante.
- Permet d'envoyer les événements par SMS (free) ou Pushover.
	- Pour n'importe quelle plage de recherche.
	- Possibilité d'ajouter facilement par développement un autre type d'envois.
- Associé au plugin `scenariz` ou à tout autre plugin par appel de trigger, il vous permet de programmer la recherche d'événements:
	- Par exemple, créez ou ajoutez à votre réveil tous les événements dont vous voulez être averti pour le jour même, pour la semaine, etc...
	- Ou encore, envoyez les événements sur votre smartphone.

## Table des matières
- [Compatibilité](#compatibilité)	
- [Installation](#installation)	
	- [Custom.ini](#customini)
	- [Sarah](#sarah.js)
	- [Sox](#sox)
- [Propriétés](#propriétés)	
	- [Sox](#sox-1)
	- [Memo](#memo)
	- [Event](#event)
- [Sauvegarder un événement](#sauvegarder-un-événement)
- [Recherche d'événements](#recherche-dévénements)
- [Sauvegarder un mémo](#sauvegarder-un-mémo)
- [Problèmes et solutions](#problèmes-et-solutions)
- [Versions](#versions)
	
## Compatibilité
- dictaphone est compatible Sarah V3 et Sarah V4.

## Installation
- Téléchargez et dézippez le fichier `SARAH-dictaphone-master.zip` dans le répertoire plugins de Sarah.
	- Supprimez le dernier répertoire du chemin proposé pour ne pas avoir de doublon de répertoire.
- Renommez le répertoire créé en `dictaphone`.


### custom.ini
Il est très important de modifier la valeur du reset automatique du mode lazy de Sarah, par défaut de 30 secondes, pour que les dialogues se fassent correctement.
- Localisation du fichier custom.ini:
	- Pour la V3: `SARAH/custom.ini`
		- Cherchez et modifiez la valeur de **ctxTimeout**, mettez par exemple 300000 (5 minutes)
	- Pour la V4: `SARAH/client/custom.ini`
		- Ajoutez une nouvelle section à la fin du fichier:
			- [speech.grammar]
			- ; All context will reset after 300000ms
			- timeout=300000

### sarah.js
Le plugin utilise la fonction askme de Sarah pour la gestion vocale des scénarios. Cette fonction a été corrigée et améliorée pour dictaphone.
- Localisation du fichier sarah.js d'origine de Sarah:
	- Pour la V3: `SARAH/script/manager`
	- Pour la V4: `SARAH/server/app/server`
- Copiez le fichier `sarah.js` d'origine en `sarah.ori`
- Copiez/collez le fichier `SARAH/dictaphone/install/'version'/sarah.js` dans son répertoire de localisation.
 
**Important:**
- Si vous utilisez la fonction askme dans d'autres plugins, vous devrez modifier tous les appels à la fonction `end()` de la fonction `askme()` de vos plugins par `end(true)`.

**Notez** qu'il n'est pas nécessaire de faire cette action dans mes plugins qui ont déjà tous cette modification.

**Existant:**
```javascript
 SARAH.askme("message", {
	'rule1' : 'tag1',
	'rule2' : 'tag2'
	}, 1000, function (answer, end) {
		switch (answer) {
		case 'tag1':
				// action...
				end();
				break;
		case 'tag2':
				// action...
				end();
		}
	});
```
**A modifier par:**
```javascript
 SARAH.askme("message", {
	'rule1' : 'tag1',
	'rule2' : 'tag2'
	}, 1000, function (answer, end) {
		switch (answer) {
		case 'tag1':
				// action...
				end(true);  // <--- ICI !!
				break;
		case 'tag2':
				// action...
				end(true);  // <--- ICI !!
		}
	});
```

Enfin, redémarrez Sarah.


### Sox
Installez l'application [sox](http://sourceforge.net/projects/sox/files/sox/14.4.2),
disponible aussi dans le répertoire #dictaphone#/install.

Le répertoire d'installation choisi est à mettre dans la propriété "path" du fichier de propriétés du plugin.

Exemple pour un répertoire d'installation C:\\Apps\\sox-14-4-2 : 
```text
	"sox" : {
		.....
		"path" : "C:\\Apps\\sox-14-4-2",
		.....
```

**Important:** Voir la section Propriétés pour configurer ensuite les propriétés de l'application.


## Propriétés

### Sox
#### sox#language (v:String)
Langage du texte à envoyer à Google speech2Text (par défaut fr-FR).
```text
	"sox" : {
		"language" : "fr-FR",
		.....
```

#### sox#path  (v:String)
répertoire d'installation de l'application Sox.

Exemple pour un répertoire d'installation C:\\Apps\\sox-14-4-2 : 
```text
	"sox" : {
		.....
		"path" : "C:\\Apps\\sox-14-4-2",
		.....
```

#### sox#params  (v:String)
Paramètre d'utilisation de l'application Sox pour **l'enregistrement de mémo uniquement**.

Référez-vous à la documentation de Sox pour le détail.
##### A savoir:
Les paramètres de silence peuvent changer avec le micro utilisé.

Définition par défaut:
```text
	sox -q -r 16000 -b 16 -t waveaudio 0 -t wav <FileName> silence 1 0 3% 1 0:05 3%
```
- silence 1 0 3% 1 0:05 3% où:
	- 1 0 3% correspond à 0 seconde de silence pour signifier un début d'enregistrement et 3% de bruit sonore.
	- 1 0:05 3% correspond à 5 secondes de silence (0:05) pour intérrompre l'enregistrement avec 3% de bruit sonore.
	
**Important**
- L'écoute ne s'intérrompt pas tant qu'il y a un bruit audio suffisament audible à enregistrer.
- Réduisez le volume sonore dans la pièce avant d'enclencher l'écoute sans pour autant le couper complétement
sinon l'écoute continuera même si vous arrêtez de parler.
- Modifiez à votre convenance les 5 secondes de silence pour intérrompre l'enregistrement néanmoins il convient de comprendre que plus le délais est augmenté, plus vous pourrez avoir de silence dans la prise de mémo entre chaques phrases mais plus long sera le temps d'attente pour déclencher la sauvegarde du mémo.

#### sox#google_api (v:String)
Récupérez votre clé Google API et copiez-la dans la propriété "google_api" du fichier de propriétés du plugin.

Si vous ne disposez pas de clé Google API, suivez la documentation [S.A.R.A.H.](http://jpencausse.github.io/SARAH-Documentation/?page=getting_started_v3#r-cup-rer-une-google-api-key)
pour la créer.

Exemple de propriété "google_api" du fichier dictaphone.prop:
```javascript
 "google_api" : "AIzaSyBIDGFTEZaaaghtYanbI-FRBLOPiozihjTJIE",
```
Une mauvaise clé pour l'API Google retournera dans la fenêtre console Sarah le message 'Error 403 (Forbidden)!!1'

#### sox#timeRecord (v:Integer)
Délais maximal d'enregistrement du message vocale pour **l'enregistrement de mémo uniquement**.

Défini à 60 secondes par défaut. Passé ce délais, l'action est intérrompu et le mémo n'est pas sauvegardé.

#### sox#threashold (v:Float)
Confidence pour la précision de traduction du message vocale en texte par Google speech2Text.

Défini à 0.8 par défaut.

### Memo
#### Memo#setRappel (v:Boolean)
Active l'enregistrement d'un jour et d'une heure pour les mémos.
- **true**: Donne la posibilité de définir un jour et une heure à l'enregistrement pour des mémos.
- **false**: Aucun jour et heure pour les mémos.

#### Memo#setCategory (v:Boolean)
Active l'enregistrement d'une catégorie pour les mémos.
- **true**: Donne la posibilité de définir une catégorie à l'enregistrement pour des mémos.
- **false**: Aucune catégorie spécifique pour le mémo, par défaut classé dans la catégorie définie dans la propriété 'defaultCategory'.

#### Memo#defaultCategory (v:String)
Catégorie par défaut si la propriété 'setCategory' est **false**.

### Event
#### Event#defaultCategory (v:String)
Catégorie par défaut pour l'enregistrment d'événements.

### Notification
#### Notification#sendType (v:String)
Type de notification pour un envois SMS ou pushover.

Par défaut, 2 types sont possibles:
- pushover
	- Interface très sympa et en couleur.
- SMS free
	- Format SMS, l'intérêt est que des liens sont automatiquement créés sur les dates et heures pour créer un rappel dans l'application "Calendrier" du smartphone.

Le type défini dans cette propriété est le nom du fichier js associé dans le répertoire #dictaphone#/lib/notify qui envoie la notification. Par exemple, 'pushover' est le nom du fichier js 'pushover.js' dans le répertoire.

2 paramêtres  d'identification associés sont définis par défaut:
- "pushoverUser" et "pushoverToken" pour pushover.
- "SMSuser" et "SMStoken" pour free SMS.

Choisissez votre type d'envoi puis ajoutez les paramètres dans les propriétés associées.

Pour créer un autre type d'envoi:
- Copiez 1 des 2 fichiers js du répertoire #dictaphone#/lib/notify avec le nom que vous voulez et modifiez-le pour votre type d'envoi (attention aux noms de fonctions).
- Utilisez les paramètres d'identification par défaut où ajoutez les votres dans le #dictaphone#/dictaphone.prop.
- Changez la valeur de la propriété 'sendType' par le nom de votre fichier js.
- Aucune autre modification n'est requise, le fichier js est automatiquement chargé par la valeur de la propriété 'sendType'. 
	
## Sauvegarder un événement
Il existe déjà un certain nombre de catégories d'événements dans le fichier dictaphone.xml.

La création d'un événement se fait par une règle composée:
- **sauvegarde**
- **rappelle-moi**
	- **un** 
	- **une**
		- **évenements**
			- Catégorie par défaut définie dans la propriété [defaultcategory](#eventdefaultcategory-vstring)
		- **rendez-vous**
		- **anniversaire**
		- **fête**
		- **jour férié**

**Important:**
Retrouvez les catégories d'événements dans le fichier dictaphone.xml et ajoutez les votres à la suite. 
Par exemple, si je veux ajoutez une catégorie 'course de formule 1', j'ajoute un règle dans la section 'événement' de l'xml comme suit:
```xml	
	<item>jour férié<tag>out.action.rubric="jour férié"</tag></item>
	<!-- REGLE AJOUTEE ICI !!! -->
	<item>Course de formule un<tag>out.action.rubric="Course de formule un"</tag></item>
```	

Après le déclenchement de la règle (par ex, un rendez-vous), Sarah vous dit:
- **Je t'écoute pour un rendez-vous...**
	- Attendez 2 ou 3 secondes pour l'initialisation de l'action puis dites votre rendez-vous.
	- Par ex: **La réparation de la voiture**
		- **A noter** que vous pouvez dire **Annule Sarah** pour intérrompre la commande.
			- Sarah vous retourne ce qu'elle a comprit:
			- **La réparation de la voiture ? d'accord et pour quand tu veux ca ?**
				- Déclenche le mode [lazydays.xml](#lazydays.xml)
				- Dites **en articulant et distinctement** le jour et/ou le mois et/ou l'année et/ou l'heure et les minutes
					- Sarah vous retourne ce qu'elle a comprit.
						- Dites alors:
						- **qu'est ce que je peux dire ?**
							- Sarah énumère tous les choix que vous avez pour ce dialogue et le reprend.
						- **Oui c'est bon** OU **oui parfait**
							- Sauvegarde l'événement dans la base et termine la commande.
						- **Non recommence**
							- Vous pouvez recommencer à dicter un jour et heure de rappel si celui-çi n'est pas bon. 
						- **Annule**
							- Interrompt la commande.

## Recherche d'événements
- Une date d'événement commence à minuit et se termine à 23:59.
- Les événements définis pour un jour et sans heure peuvent être recherchés toute la journée.
- Les événements définis avec une heure précise sont **par défaut** ignorés si l'heure est passée pour la journée courante.

La recherche d'évenements est une règle composée d'une ligne de chaque section/sous section çi-dessous:
- **recherche**
- **dis-moi**
- **j'ai**
- **il y a**
	- **un**
	- **une**
	- **des**
	- **les**
	- **mes**
		- **évenements**
		- **rendez-vous**
		- **anniversaire**
		- **fête**
		- **jour férié**
			- **pour**
			- **d'**
			- **de**
			- **des**
			- **dans**
				- **les**
					- **aujourd'hui**
					- **demain**
					- **après demain**
					- **dans 3 jours**
					- **dans 4 jours**
					- **3 prochain jours**
					- **5 prochain jours**
					- **cette semaine**
					- **la semaine prochaine**
					- **ce mois-ci**

**Par exemple:**
```text
	- j'ai des rendez-vous
	- j'ai des rendez-vous pour aujourd'hui
	- j'ai des évenements après demain
	- dis-moi les anniversaire pour les 5 prochain jours
	- recherche les jour férié de ce mois-ci
```
					
**Important:** 
- Les règles dites sans recherche dans le temps sont pour aujourd'hui par défaut.
- Vous pouvez très facilement ajouter des périodes de recherche dans les sections **"dans X jours"** et **"X prochain jours"** du fichier dictaphone.xml.
			
Après le déclenchement de la règle, Sarah vous dit:
- **Je regarde...**		
	- Si il y a des événements (par ex: des rendez-vous si vous avez dit: **j'ai des rendez-vous pour aujourd'hui**)		
		- Sarah dit: **J'ai trouvé X rendez-vous**
			- **Aujourd'hui il y a la réparation de la voiture**
			- **A 21h30 il y a le film à la télé**
	- Si il n'y a aucun événements		
		- Sarah dit: **Il n'y a aucun rendez-vous aujourd'hui**

### Une bonne astuce
- Pour avoir des phrases correctes, enregistrez vos événements en pensant que Sarah vous les dira toujours en commençant par:
	- **il y a...**
- Par exemple:
	- Pour une date d'anniversaire, je dirais **l'anniversaire de Pierre** à l'enregistrement, ce qui donnera par Sarah **Aujourd'hui il y a l'anniversaire de Pierre**
	- Pour un rendez-vous, je dirais **La réparation de la voiture**

### Les tags de recherche
#### Pour ajouter les événements passés
Par défaut, les événements passés sont ignorés, pour que Sarah vous les dise, il faut ajouter sur la règle qui vous intéresse le tag suivant:
- data.lostEvents="true"

Ce qui donne dans la règle (içi la règle "recherche"):
```xml	
<item>recherche<tag>data.lostEvents="true";out.action.command="findEvent";out.action.lazy="LazyStart";out.action.sendType="SpeechOnly";out.action._attributes.tts="Je regarde..."</tag></item>
```	

#### Les valeurs du tag **sendType**
Ce tag dans chaque règle associée à la recherche d'événements dans le fichier dictaphone.xml défini la façon dont Sarah vous liste les événements.
- **out.action.sendType="SpeechOnly"**
	- Sarah énonce les événements uniquement.
- **out.action.sendType="Speech-Push"**
	- Sarah énonce les événements et envoie une notification (SMS ou pushOver).
- **out.action.sendType="PushOnly"**
	- Sarah envoie une notification (SMS ou pushOver) uniquement.
			
#### Les valeurs spéciales du tag **sendType**			
Ces valeurs sont utilisées pour un appel avec un 'SARAH.call' depuis un autre plugin ou le plugin `scenariz` dans un scénario.
- **out.action.sendType="Trigger"**			
	- Sarah énonce les événements uniquement par un **tts callback**.
- **out.action.sendType="Trigger-Push"**		
	- Sarah énonce les événements par un **tts callback** et envoie une notification (SMS ou pushOver).

#### Le tag de genre
Défini le genre masculin ou féminin de la rubrique pour le message: **Aucun rendez-vous pour...** OU **Aucune fête pour...** 		
- out.action.genre="F"
	- Défini le genre féminin.
- out.action.genre="M"
	- Défini le genre masculin.
	- Par défaut si le tag n'est pas mis.

Ce tag est a placer sur la règle de la rubrique dans le fichier dictaphone.xml. Par exemple, la règle de rubrique "Fête" est du genre féminin, ce qui donne:
```xml	
<item>fête<tag>out.action.rubric="fête";out.action.genre="F"</tag></item>
```	
	
	
## Sauvegarder un mémo
La création d'un mémo se fait par une règle composée:
- **enregistre**
- **prend**
	- **un** 
		- **mémo**
		- **enregistrement**
		
Après le déclenchement de la règle, Sarah vous dit:
- **Je t'écoute pour un mémo...**
	- Attendez 2 ou 3 secondes pour l'initialisation de l'action puis dites votre mémo.
	- Vous disposez du délais maximum de la propriété [timeRecord](#soxtimerecord-vinteger) pour enregistrer le mémo et il est automatiquement terminé après le silence du [paramètre](#soxparams--vstring) de sox.
		- Si le paramètre [setCategory](#memosetcategory-vboolean) est à **true**:
			- Sarah vous demande: **Tu veux définir une catégorie ?**
				- Dites alors:
				- **qu'est ce que je peux dire ?**
					- Sarah énumère tous les choix que vous avez pour ce dialogue et le reprend.
				- **Oui s'il te plait**
					- Déclenche le mode [lazyrubric.xml](#lazyrubric.xml)
					- Sarah vous dit : **Je t'écoute...**
						- Dites la catégorie pour le mémo (par ex "Catégorie Maison").
							- Sarah vous retourne ce qu'elle a comprit: **Catégorie Maison ?**.
								- Dites alors:
								- **qu'est ce que je peux dire ?**
									- Sarah énumère tous les choix que vous avez pour ce dialogue et le reprend.
								- **Oui c'est bon**
									- Prend en compte la catégorie et passe à [l'étape suivante](#etape-suivante).
								- **Non recommence**
									- Permet de définir une autre catégorie.
								- **Annule**
									- Interrompt la commande.
				- **Recommence**
					- Annule et redémarre l'enregistrement du mémo.
				- **Non merci** OU **Pas la peine**
					- Passe à [l'étape suivante](#etape-suivante), la catégorie est par défaut la propriété [defaultCategory](#memodefaultcategory-vstring)
				- **Annule**
					- Interrompt la commande.
		- Si le paramètre [setCategory](#memosetcategory-vboolean) est à **false**:
			- Passe à [l'étape suivante](#etape-suivante), la catégorie est par défaut la propriété [defaultCategory](#memodefaultcategory-vstring)


			
		
		
		
### Etape suivante				
Etape suivante de création de mémo après l'enregistrement du mémo et (optionnelle) la définition d'une catégorie.
	
L'étape suivante est la possibilité de créer une date de rappel pour le mémo.
- Si le paramètre [setRappel](#memosetsetrappel-vboolean) est à **true**:
	- Sarah vous demande: **Tu veux définir un rappel ?**
		- Dites alors:
			- **qu'est ce que je peux dire ?**
				- Sarah énumère tous les choix que vous avez pour ce dialogue et le reprend.
			- **Oui s'il te plait**
				- Déclenche le mode [lazydays.xml](#lazydays.xml)
				- Dites **en articulant et distinctement** le jour et/ou le mois et/ou l'année et/ou l'heure et les minutes
					- Sarah vous retourne ce qu'elle a comprit.
						- Dites alors:
						- **qu'est ce que je peux dire ?**
							- Sarah énumère tous les choix que vous avez pour ce dialogue et le reprend.
						- **Oui c'est bon** OU **oui parfait**
							- Sauvegarde le mémo dans la base et termine la commande.
						- **Non recommence**
							- Vous pouvez recommencer à dicter un jour et heure de rappel si celui-çi n'est pas bon. 
						- **Annule**
							- Interrompt la commande.
			- **Non c'est bon** OU **non merci**
				- Sauvegarde le mémo dans la base et termine la commande.
			- **Annule**
				- Interrompt la commande.
- Si le paramètre [setRappel](#memosetsetrappel-vboolean) est à **false**:
	- Sauvegarde le mémo dans la base et termine la commande.


	
						
## Problèmes et solutions
- Le niveau de confidence:
	- Si les erreurs de compréhensions sont trop importantes, que le dialogue est intérrompu ou qu'un choix est compris par Sarah alors que vous n'avez rien dit, pensez à augmenter le niveau de confidence.
	- Pensez aussi à réduire le son des périphériques pendant un dialogue.
	- Pensez aussi à améliorer votre diction. Sarah n'est pas un être humain !
- Kinect:
	- Avec une Kinect, il peut arriver que certains dialogues des askme ne soient pas prononcés par Sarah. A mon avis, c'est dû aux librairies de la Kinect qui ne sont pas forcément bien développées, sûrement lié à la libération de la mémoire. Avec un micro normal, je n'ai jamais rencontré le problème et ça fonctionne correctement.

Globalement, 9 fois sur 10, le dialogue fonctionne correctement mais si un problème survient, dans tous les cas ne desespérez pas, reprenez simplement le dialogue ou la commande normalement et persevérez. Ca arrive et cela suffit généralement à régler le problème.

   
   
## Versions
Version 1.0 (01-05-2016)
- Release.
