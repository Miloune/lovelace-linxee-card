# content-card-linky
[![HACS Supported](https://img.shields.io/badge/HACS-Supported-green.svg)](https://github.com/custom-components/hacs)

**Cette carte est compatible avec : [Lixee](https://lixee.fr/produits/37-zigate-usb-ttl-3770014375148.html)**

## Bienvenue !

Cette carte est initialement inspirée de [@royto](https://github.com/royto/linky-card)


<br>
 <p align="center">
<img src="https://raw.githubusercontent.com/Miloune/lovelace-lixee-card/main/example.png" height="300"/>
 <br>
 </p>

## Installer la carte
<details>
  <summary><b>Via HACS (mise à jour en un clic) : </b></summary><br>
 
* Ouvrez HACS, cliquez sur `Frontend`, puis selectionnez le menu 3 points en haut à droite.
 
 *si vous n'avez pas HACS, pour l'installer cela se passe ici : [HACS : Ajoutez des modules et des cartes personnalisées](https://forum.hacf.fr/t/hacs-ajoutez-des-modules-et-des-cartes-personnalisees/359)
 
* Ajoutez le dépot personnalisé : `https://github.com/Miloune/lovelace-lixee-card`

* Choisir la catégorie `Lovelace`

* Cliquez sur le bouton `Installer` de la carte
 
* Cliquez sur le bouton `Installer` de la popup
 
* La carte est maintenant rouge, signifiant qu'un redémarrage du serveur Home Assistant est nécessaire

* Accédez à la vue `Contrôle du serveur` (`Configuration` -> `Contrôle du serveur`), puis cliquez sur le bouton `Redémarrer` dans la zone `Gestion du serveur`
</details>

<details>
  <summary><b>Manuellement (à faire à chaque mise à jour)</b></summary>
* Telecharger les fichiers [lixee-card.js](https://github.com/Miloune/lovelace-lixee-card/blob/main/dist/lixee-card.js) et [lixee-card-editor.js](https://github.com/Miloune/lovelace-lixee-card/blob/main/dist/lixee-card-editor.js)
  
* Les mettre dans un sous repertoire `lovelace-lixee-card` votre repertoire `www` et l'ajouter dans l'interface ressource
  
* Configurez la ressource dans votre fichier de configuration.
  
```
resources:
  - url: /hacsfiles/lovelace-lixee-card/lixee-card.js
    type: module
```
</details>

### Redémarrer votre serveur Home Assistant

## Ajouter la carte
<details>
  <summary><b>Via l'interface graphique</b></summary>
  * Ajoutez une carte via l'interface graphique, et configurez les options comme vous le désirez.  

</details>
<details>
  <summary><b>En YAML</b></summary>
  * Dans votre éditeur lovelace, ajouter ceci :

````
type: 'custom:content-card-lixee'
entity: sensor.linky_base
````
</details>



## Options disponibles

  ````
type: custom:content-card-linky                 Type de la carte
titleName: Consommation d'aujourd'hui           Titre
entity: sensor.linky_base                       Sensor lié à votre Lixee (Linky BASE)
showIcon: false                                 Affiche l'icon Linky
showHistory: true                               Affiche l'historique sur plusieurs jours
showInTableUnit: false                          Affiche l'unité dans l'historique                         
showTitle: true                                 Affiche le titre de la carte
showPrice: true                                 Affiche le prix de la consommation d'aujourd'hui
showDayName: short                              Affichage des jours de la semaine : "short", "narrow", "long"
````

**************

N'hésitez pas à aller faire un tour sur ce forum ou vous trouverez pleins d'informations

https://forum.hacf.fr/t/hacs-ajoutez-des-modules-et-des-cartes-personnalisees/359 

*************
