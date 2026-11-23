import type { DemoSource, Story } from "./types";

/**
 * CONTENUS DE DÉMONSTRATION
 * -------------------------
 * Ces récits servent uniquement à tester l'interface. Ce sont des
 * explications pédagogiques générales, sans événement d'actualité, sans
 * citation et sans statistique réelle. Les sources sont des emplacements
 * réservés qui décrivent le type de référence attendu : elles doivent être
 * remplacées par des sources vérifiées avant toute publication.
 * Les dates sont fictives.
 */

const placeholder = (expected: string): DemoSource => ({
  label: `Emplacement réservé : ${expected}`,
  note: "Source de démonstration, à remplacer par une référence vérifiée et accessible avant publication.",
});

export const stories: Story[] = [
  {
    slug: "pourquoi-certains-metaux-sont-critiques",
    title: "Pourquoi certains métaux sont dits « critiques »",
    dek: "Batteries, éoliennes, smartphones : nos technologies reposent sur des matériaux dont l'approvisionnement peut être fragile.",
    topic: "materiaux-critiques",
    format: "decryptage",
    minutes: 3,
    publishedAt: "2026-11-18",
    updatedAt: "2026-11-21",
    keyPoints: [
      "Un matériau est jugé « critique » quand il est à la fois important pour l'économie et exposé à un risque d'approvisionnement.",
      "Le risque vient souvent de la concentration : peu de pays extraient ou raffinent la ressource.",
      "Recyclage, diversification et substitution sont les trois leviers les plus discutés.",
    ],
    sections: [
      {
        kind: "fait",
        heading: "Ce qu'il faut savoir",
        paragraphs: [
          "Plusieurs États et organisations établissent des listes de « matières premières critiques ». Les critères varient, mais ils combinent généralement deux dimensions : l'importance du matériau pour l'économie et le risque que son approvisionnement soit perturbé.",
          "On y retrouve souvent des métaux utilisés dans les batteries, les aimants permanents ou l'électronique, comme le lithium, le cobalt ou les terres rares. Ces listes sont révisées régulièrement : un matériau peut y entrer ou en sortir.",
        ],
      },
      {
        kind: "analyse",
        heading: "Pourquoi c'est important",
        paragraphs: [
          "La criticité ne dit pas qu'une ressource est rare dans le sol. Elle dit que la chaîne qui l'amène jusqu'à l'usine est vulnérable. L'extraction peut être concentrée dans quelques pays, et le raffinage, l'étape qui transforme le minerai en matériau utilisable, l'est parfois encore davantage.",
          "Cette concentration crée des dépendances. Une tension commerciale, une restriction à l'export ou un incident industriel peut alors se répercuter sur des secteurs entiers.",
        ],
      },
      {
        kind: "hypothese",
        heading: "Ce qui pourrait suivre",
        paragraphs: [
          "Trois pistes reviennent dans les débats : recycler davantage les produits en fin de vie, diversifier les pays et entreprises fournisseurs, et développer des technologies qui consomment moins de ces matériaux. Aucune n'est immédiate ; chacune demande des années d'investissement.",
        ],
      },
    ],
    perspectives: [
      { label: "Pays importateurs", text: "Ils cherchent à sécuriser leurs approvisionnements et à réduire leurs dépendances." },
      { label: "Pays producteurs", text: "Ils souhaitent souvent capter davantage de valeur localement, par exemple en raffinant sur place." },
      { label: "Défense de l'environnement", text: "Elle rappelle les impacts de l'activité minière et plaide pour la sobriété et le recyclage." },
    ],
    uncertainties: [
      "Les listes de matériaux critiques diffèrent selon les pays et changent dans le temps.",
      "Les progrès technologiques peuvent modifier fortement les besoins futurs.",
    ],
    sources: [
      placeholder("liste officielle de matières premières critiques publiée par une autorité publique"),
      placeholder("rapport d'une agence internationale sur les minerais de la transition énergétique"),
    ],
    isDemo: true,
  },
  {
    slug: "equilibre-reseau-electrique",
    title: "Le réseau électrique, un équilibre à chaque seconde",
    dek: "L'électricité se stocke mal : à tout instant, la production doit égaler la consommation.",
    topic: "energie",
    format: "flash",
    minutes: 1,
    publishedAt: "2026-11-20",
    updatedAt: "2026-11-20",
    keyPoints: [
      "Production et consommation doivent s'équilibrer en permanence.",
      "La fréquence du réseau sert de « thermomètre » de cet équilibre.",
      "Stockage et flexibilité de la demande aident à intégrer les énergies variables.",
    ],
    sections: [
      {
        kind: "fait",
        heading: "Ce qu'il faut savoir",
        paragraphs: [
          "Sur un réseau électrique, l'énergie injectée doit correspondre à l'énergie consommée, seconde après seconde. Quand l'écart grandit, la fréquence du courant s'éloigne de sa valeur de référence, et les gestionnaires de réseau doivent réagir.",
        ],
      },
      {
        kind: "analyse",
        heading: "Pourquoi c'est important",
        paragraphs: [
          "Le solaire et l'éolien produisent selon la météo, pas selon la demande. Plus leur part augmente, plus il faut de solutions pour ajuster l'équilibre : batteries, barrages pompés, interconnexions entre pays ou consommation décalée dans le temps.",
        ],
      },
      {
        kind: "hypothese",
        heading: "Ce qui pourrait suivre",
        paragraphs: [
          "La flexibilité pourrait devenir une ressource à part entière, rémunérée comme l'est aujourd'hui la production. Son ampleur dépendra des coûts du stockage et des règles de marché.",
        ],
      },
    ],
    uncertainties: ["L'évolution du coût des batteries reste difficile à prévoir à long terme."],
    sources: [placeholder("documentation pédagogique d'un gestionnaire de réseau de transport d'électricité")],
    isDemo: true,
  },
  {
    slug: "detroits-commerce-mondial",
    title: "Les détroits, ces passages étroits qui tiennent le commerce mondial",
    dek: "Une part importante des marchandises transportées par mer emprunte quelques couloirs maritimes. Comprendre pourquoi ils comptent autant.",
    topic: "geopolitique",
    format: "grand-angle",
    minutes: 6,
    publishedAt: "2026-11-15",
    updatedAt: "2026-11-19",
    keyPoints: [
      "Quelques détroits et canaux concentrent une grande partie du trafic maritime mondial.",
      "Une perturbation y entraîne détours, retards et hausse des coûts d'assurance et de fret.",
      "Ces passages sont aussi des enjeux de puissance pour les États riverains et les marines.",
    ],
    sections: [
      {
        kind: "fait",
        heading: "Ce qu'il faut savoir",
        paragraphs: [
          "La géographie impose ses goulets d'étranglement. Le détroit d'Ormuz, le détroit de Malacca, le canal de Suez, le détroit de Bab-el-Mandeb ou le canal de Panama relient des mers et des océans et raccourcissent considérablement les trajets.",
          "Les spécialistes parlent de « points de passage obligés » : il existe parfois des alternatives, mais elles sont plus longues, plus coûteuses ou moins capacitaires.",
        ],
      },
      {
        kind: "analyse",
        heading: "Pourquoi c'est important",
        paragraphs: [
          "Lorsqu'un passage est perturbé, que ce soit par un accident, une sécheresse qui limite la navigation ou des tensions sécuritaires, les navires doivent attendre ou contourner. Les délais s'allongent, les primes d'assurance augmentent, et ces coûts finissent en partie dans les prix payés par les consommateurs.",
          "Pour les États riverains, contrôler ou sécuriser un détroit est un levier diplomatique. Pour les grandes puissances, garantir la liberté de navigation est un objectif stratégique de longue date.",
        ],
      },
      {
        kind: "hypothese",
        heading: "Ce qui pourrait suivre",
        paragraphs: [
          "Plusieurs pistes sont discutées pour réduire cette vulnérabilité : nouvelles routes terrestres ou ferroviaires, oléoducs de contournement, stocks stratégiques, ou encore routes arctiques si la fonte des glaces se poursuit. Leur faisabilité et leur coût restent très débattus.",
        ],
      },
    ],
    perspectives: [
      { label: "Armateurs et chargeurs", text: "Ils arbitrent entre sécurité, délais et coûts lorsqu'ils choisissent une route." },
      { label: "États riverains", text: "Ils mettent en avant leur souveraineté et leur rôle dans la sécurité du passage." },
      { label: "Économistes", text: "Ils soulignent que la résilience a un prix : stocks et routes alternatives coûtent cher." },
    ],
    uncertainties: [
      "Les parts de trafic par passage varient selon les années et les sources : elles doivent être sourcées précisément avant publication.",
      "La viabilité commerciale des routes arctiques reste incertaine.",
    ],
    sources: [
      placeholder("rapport d'une organisation internationale sur le transport maritime"),
      placeholder("données d'une autorité de gestion de canal"),
    ],
    isDemo: true,
  },
  {
    slug: "inflation-expliquee-simplement",
    title: "L'inflation expliquée simplement",
    dek: "Quand les prix montent de façon générale et durable, chaque euro achète un peu moins. D'où cela vient-il ?",
    topic: "economie",
    format: "decryptage",
    minutes: 2,
    publishedAt: "2026-11-12",
    updatedAt: "2026-11-12",
    keyPoints: [
      "L'inflation est une hausse générale et durable des prix, pas la hausse d'un seul produit.",
      "Elle peut venir d'une demande forte, de coûts de production en hausse ou des anticipations.",
      "Les banques centrales agissent surtout via leurs taux d'intérêt.",
    ],
    sections: [
      {
        kind: "fait",
        heading: "Ce qu'il faut savoir",
        paragraphs: [
          "Les instituts statistiques mesurent l'inflation à partir d'un « panier » représentatif de biens et de services. On compare son prix d'une période à l'autre pour obtenir un taux.",
          "La plupart des grandes banques centrales visent une inflation basse et stable, souvent autour de 2 % par an à moyen terme.",
        ],
      },
      {
        kind: "analyse",
        heading: "Pourquoi c'est important",
        paragraphs: [
          "On distingue souvent l'inflation « par la demande », quand les acheteurs dépensent plus que l'économie ne peut produire, et l'inflation « par les coûts », quand l'énergie, les matières premières ou les salaires renchérissent la production. Les anticipations jouent aussi : si chacun s'attend à des hausses, il les intègre dans ses prix et ses salaires.",
          "Une inflation élevée pèse davantage sur les ménages dont les revenus ne suivent pas, et complique les décisions d'investissement.",
        ],
      },
      {
        kind: "hypothese",
        heading: "Ce qui pourrait suivre",
        paragraphs: [
          "Relever les taux d'intérêt peut freiner la demande et donc les prix, mais au risque de ralentir l'activité. Trouver le bon dosage est l'un des exercices les plus délicats de la politique économique.",
        ],
      },
    ],
    uncertainties: ["Le délai entre une décision de taux et son effet sur les prix est variable et débattu."],
    sources: [
      placeholder("page méthodologique d'un institut national de statistique"),
      placeholder("publication pédagogique d'une banque centrale"),
    ],
    isDemo: true,
  },
  {
    slug: "taux-interet-marches",
    title: "Pourquoi les taux d'intérêt font bouger les marchés",
    dek: "Le prix de l'argent influence celui de presque tous les actifs financiers.",
    topic: "finance",
    format: "flash",
    minutes: 1,
    publishedAt: "2026-11-21",
    updatedAt: "2026-11-21",
    keyPoints: [
      "Quand les taux montent, les obligations existantes perdent de la valeur.",
      "Des taux plus élevés rendent l'épargne sans risque plus attractive face aux actions.",
      "Les marchés réagissent souvent aux anticipations plus qu'aux décisions elles-mêmes.",
    ],
    sections: [
      {
        kind: "fait",
        heading: "Ce qu'il faut savoir",
        paragraphs: [
          "Le prix d'une obligation évolue en sens inverse des taux : si de nouvelles obligations rapportent davantage, les anciennes, moins rémunératrices, se revendent moins cher.",
        ],
      },
      {
        kind: "analyse",
        heading: "Pourquoi c'est important",
        paragraphs: [
          "Pour évaluer une entreprise, les investisseurs actualisent ses bénéfices futurs. Plus les taux sont élevés, plus ces bénéfices lointains « valent » peu aujourd'hui, ce qui pèse notamment sur les entreprises dont la rentabilité est attendue loin dans le futur.",
        ],
      },
      {
        kind: "hypothese",
        heading: "Ce qui pourrait suivre",
        paragraphs: [
          "C'est pourquoi chaque communication des banques centrales est scrutée : un simple changement de ton peut modifier les anticipations et provoquer des mouvements de marché.",
        ],
      },
    ],
    uncertainties: ["D'autres facteurs, comme les résultats des entreprises, peuvent l'emporter sur l'effet des taux."],
    sources: [placeholder("guide pédagogique d'une autorité de régulation des marchés financiers")],
    isDemo: true,
  },
  {
    slug: "recycler-une-batterie",
    title: "Recycler une batterie : ce que l'on récupère vraiment",
    dek: "Une batterie usagée contient des métaux précieux. Mais les extraire demande des procédés complexes.",
    topic: "recyclage",
    format: "decryptage",
    minutes: 3,
    publishedAt: "2026-11-10",
    updatedAt: "2026-11-17",
    keyPoints: [
      "Une batterie lithium-ion peut contenir lithium, nickel, cobalt, manganèse, cuivre et aluminium.",
      "Deux grandes familles de procédés : par la chaleur (pyrométallurgie) et par la chimie (hydrométallurgie).",
      "La rentabilité dépend du volume collecté et du prix des métaux.",
    ],
    sections: [
      {
        kind: "fait",
        heading: "Ce qu'il faut savoir",
        paragraphs: [
          "Avant d'être recyclée, une batterie est déchargée, démontée puis broyée. On obtient notamment une poudre sombre, souvent appelée « masse noire », qui concentre les métaux les plus recherchés.",
          "La pyrométallurgie fait fondre les matériaux à haute température ; l'hydrométallurgie les dissout dans des solutions chimiques pour les séparer. Les deux sont souvent combinées.",
        ],
      },
      {
        kind: "analyse",
        heading: "Pourquoi c'est important",
        paragraphs: [
          "Le recyclage réduit la dépendance aux mines et les déchets dangereux. Mais il ne peut couvrir qu'une partie des besoins tant que le nombre de batteries en circulation augmente : on ne recycle que ce qui a déjà été produit.",
        ],
      },
      {
        kind: "hypothese",
        heading: "Ce qui pourrait suivre",
        paragraphs: [
          "Avec l'arrivée en fin de vie des premières générations de véhicules électriques, les volumes à traiter devraient augmenter. Concevoir des batteries plus faciles à démonter pourrait améliorer les rendements.",
        ],
      },
    ],
    uncertainties: ["Les taux de récupération varient selon les procédés et les métaux : à sourcer précisément."],
    sources: [
      placeholder("étude d'un organisme public sur la filière de recyclage des batteries"),
      placeholder("texte réglementaire sur les batteries et leurs déchets"),
    ],
    isDemo: true,
  },
  {
    slug: "lire-un-graphique-climatique",
    title: "Lire un graphique climatique sans se tromper",
    dek: "Unité, période, point de départ : trois réflexes pour ne pas se laisser piéger par une courbe.",
    topic: "environnement",
    format: "en-chiffres",
    minutes: 2,
    publishedAt: "2026-11-08",
    updatedAt: "2026-11-14",
    keyPoints: [
      "Vérifiez toujours l'unité : degrés, écart à une moyenne, tonnes, pourcentage ?",
      "Regardez la période : une tendance sur 5 ans ne dit pas la même chose qu'une tendance sur 50 ans.",
      "Repérez la période de référence quand on parle d'« anomalie ».",
    ],
    sections: [
      {
        kind: "fait",
        heading: "Ce qu'il faut savoir",
        paragraphs: [
          "Beaucoup de graphiques climatiques ne montrent pas des températures brutes mais des « anomalies » : l'écart entre une valeur mesurée et une moyenne calculée sur une période de référence.",
          "Le graphique ci-dessous utilise des données fictives, uniquement pour illustrer comment lire ce type de visualisation.",
        ],
      },
      {
        kind: "analyse",
        heading: "Pourquoi c'est important",
        paragraphs: [
          "Un axe vertical qui ne commence pas à zéro peut exagérer ou au contraire masquer une évolution. Une série courte peut être dominée par des variations naturelles d'une année sur l'autre. Ce n'est pas tricher que de zoomer, mais il faut le dire.",
        ],
      },
      {
        kind: "hypothese",
        heading: "Pour aller plus loin",
        paragraphs: [
          "Comparer plusieurs jeux de données indépendants, produits par des organismes différents, est l'un des meilleurs moyens de vérifier qu'une tendance est robuste.",
        ],
      },
    ],
    uncertainties: ["Données entièrement fictives : aucun enseignement réel ne doit en être tiré."],
    sources: [placeholder("jeu de données d'un service climatologique public, avec sa période de référence")],
    chart: {
      title: "Écart à une moyenne de référence (exemple)",
      unit: "°C",
      period: "Années 1 à 10 (fictives)",
      origin: "Données fictives de démonstration",
      points: [
        { label: "A1", value: 0.2 },
        { label: "A2", value: 0.35 },
        { label: "A3", value: 0.25 },
        { label: "A4", value: 0.45 },
        { label: "A5", value: 0.4 },
        { label: "A6", value: 0.6 },
        { label: "A7", value: 0.55 },
        { label: "A8", value: 0.75 },
        { label: "A9", value: 0.7 },
        { label: "A10", value: 0.9 },
      ],
    },
    isDemo: true,
  },
  {
    slug: "semi-conducteurs-chaine-mondiale",
    title: "Semi-conducteurs : une puce, plusieurs continents",
    dek: "Concevoir, fabriquer, assembler : chaque étape d'une puce électronique peut se dérouler dans une région différente du monde.",
    topic: "technologie",
    format: "decryptage",
    minutes: 3,
    publishedAt: "2026-11-05",
    updatedAt: "2026-11-16",
    keyPoints: [
      "La conception, la fabrication des plaquettes et l'assemblage sont souvent réalisés par des acteurs différents.",
      "Les usines les plus avancées coûtent des milliards et sont peu nombreuses.",
      "Plusieurs grandes économies subventionnent désormais leur production locale.",
    ],
    sections: [
      {
        kind: "fait",
        heading: "Ce qu'il faut savoir",
        paragraphs: [
          "Certaines entreprises conçoivent des puces sans les fabriquer ; d'autres, les « fonderies », les produisent pour le compte de clients ; d'autres encore les testent et les assemblent. Les machines de gravure et les produits chimiques proviennent eux-mêmes de fournisseurs très spécialisés.",
        ],
      },
      {
        kind: "analyse",
        heading: "Pourquoi c'est important",
        paragraphs: [
          "Cette spécialisation a rendu les puces moins chères et plus performantes, mais elle crée des points de fragilité : si une étape est bloquée, toute la chaîne ralentit. Les pénuries ont montré que des secteurs comme l'automobile pouvaient être paralysés par l'absence de composants à quelques euros.",
        ],
      },
      {
        kind: "hypothese",
        heading: "Ce qui pourrait suivre",
        paragraphs: [
          "Les politiques de relocalisation pourraient rééquilibrer la carte de la production, mais construire et faire fonctionner une usine de pointe demande des années, des compétences rares et beaucoup d'eau et d'énergie.",
        ],
      },
    ],
    perspectives: [
      { label: "Industriels", text: "Ils mettent en avant l'efficacité d'une chaîne mondiale spécialisée." },
      { label: "Gouvernements", text: "Ils privilégient la sécurité d'approvisionnement et la souveraineté technologique." },
    ],
    uncertainties: ["Les effets réels des plans de subvention ne seront mesurables qu'à moyen terme."],
    sources: [placeholder("rapport d'une association professionnelle ou d'un institut de recherche sur l'industrie des semi-conducteurs")],
    isDemo: true,
  },
  {
    slug: "zlecaf-de-quoi-parle-t-on",
    title: "Zone de libre-échange continentale africaine : de quoi parle-t-on ?",
    dek: "Un projet de marché commun à l'échelle du continent. Ses objectifs, ses mécanismes et ses défis.",
    topic: "afrique",
    format: "grand-angle",
    minutes: 5,
    publishedAt: "2026-11-02",
    updatedAt: "2026-11-13",
    keyPoints: [
      "La ZLECAf vise à réduire les droits de douane et les obstacles au commerce entre pays africains.",
      "Elle s'appuie sur les communautés économiques régionales déjà existantes.",
      "Infrastructures, règles d'origine et formalités restent des défis majeurs.",
    ],
    sections: [
      {
        kind: "fait",
        heading: "Ce qu'il faut savoir",
        paragraphs: [
          "La Zone de libre-échange continentale africaine (ZLECAf) est un accord porté par l'Union africaine. Son but est de créer un vaste marché pour les biens et les services, en supprimant progressivement la plupart des droits de douane entre ses membres.",
          "Sa mise en œuvre est graduelle : les pays négocient des calendriers de réduction tarifaire et des règles communes, notamment sur l'origine des produits.",
        ],
      },
      {
        kind: "analyse",
        heading: "Pourquoi c'est important",
        paragraphs: [
          "Le commerce entre pays africains reste modeste par rapport aux échanges avec le reste du monde. Faciliter ces échanges pourrait encourager la transformation locale des matières premières et la création de chaînes de valeur régionales.",
          "Mais baisser les droits de douane ne suffit pas : routes, ports, chemins de fer, paiements transfrontaliers et procédures aux frontières pèsent souvent davantage sur les coûts.",
        ],
      },
      {
        kind: "hypothese",
        heading: "Ce qui pourrait suivre",
        paragraphs: [
          "Les effets dépendront du rythme de mise en œuvre et des investissements dans les infrastructures. Certains secteurs pourraient y gagner rapidement ; d'autres, plus exposés à la concurrence, demanderont des mesures d'accompagnement.",
        ],
      },
    ],
    perspectives: [
      { label: "Entrepreneurs", text: "Ils espèrent accéder à des marchés voisins plus simplement." },
      { label: "Producteurs locaux", text: "Certains craignent une concurrence accrue et demandent des transitions progressives." },
      { label: "Économistes", text: "Ils insistent sur le rôle décisif des infrastructures et de la facilitation des échanges." },
    ],
    uncertainties: [
      "L'état d'avancement varie selon les pays : il doit être vérifié et daté avant publication.",
      "Les estimations de gains économiques dépendent fortement des hypothèses des modèles.",
    ],
    sources: [
      placeholder("texte de l'accord et documents du secrétariat de la ZLECAf"),
      placeholder("analyse d'une institution économique internationale"),
    ],
    isDemo: true,
  },
  {
    slug: "relocaliser-une-usine",
    title: "Relocaliser une usine, plus compliqué qu'il n'y paraît",
    dek: "Ramener une production près de chez soi ne se résume pas à construire un bâtiment.",
    topic: "industrie",
    format: "flash",
    minutes: 1,
    publishedAt: "2026-11-19",
    updatedAt: "2026-11-19",
    keyPoints: [
      "Une usine dépend d'un écosystème : fournisseurs, compétences, énergie, logistique.",
      "Les coûts de production peuvent être plus élevés, au moins au début.",
      "L'automatisation change en partie l'équation.",
    ],
    sections: [
      {
        kind: "fait",
        heading: "Ce qu'il faut savoir",
        paragraphs: [
          "Relocaliser, c'est rapatrier tout ou partie d'une production auparavant réalisée à l'étranger. On parle aussi de « nearshoring » lorsque la production est rapprochée sans revenir dans le pays d'origine.",
        ],
      },
      {
        kind: "analyse",
        heading: "Pourquoi c'est important",
        paragraphs: [
          "Une usine isolée de ses fournisseurs habituels peut se retrouver dépendante d'importations de pièces, ce qui réduit l'intérêt de la relocalisation. Le vrai défi est souvent de reconstruire tout un tissu industriel et les compétences qui vont avec.",
        ],
      },
      {
        kind: "hypothese",
        heading: "Ce qui pourrait suivre",
        paragraphs: [
          "Les relocalisations pourraient se concentrer sur les productions jugées stratégiques ou fortement automatisables, plutôt que sur l'ensemble de l'industrie.",
        ],
      },
    ],
    uncertainties: ["Le bilan des relocalisations récentes est encore difficile à établir."],
    sources: [placeholder("étude d'un observatoire public de l'industrie")],
    isDemo: true,
  },
  {
    slug: "effet-coup-de-fouet",
    title: "L'effet « coup de fouet » dans les chaînes d'approvisionnement",
    dek: "Une petite variation de la demande peut se transformer en énorme secousse pour les fournisseurs.",
    topic: "entreprises",
    format: "decryptage",
    minutes: 2,
    publishedAt: "2026-11-07",
    updatedAt: "2026-11-07",
    keyPoints: [
      "Chaque maillon d'une chaîne amplifie un peu les variations de commandes qu'il reçoit.",
      "En remontant la chaîne, les fluctuations deviennent de plus en plus fortes.",
      "Partager l'information réduit cet effet.",
    ],
    sections: [
      {
        kind: "fait",
        heading: "Ce qu'il faut savoir",
        paragraphs: [
          "L'effet coup de fouet, ou « effet bullwhip », est un phénomène bien documenté en gestion : les variations de commandes s'amplifient à mesure que l'on remonte du magasin vers le grossiste, puis le fabricant et ses fournisseurs.",
        ],
      },
      {
        kind: "analyse",
        heading: "Pourquoi c'est important",
        paragraphs: [
          "Chacun constitue des stocks de sécurité et anticipe : un distributeur qui voit ses ventes monter commande un peu plus « au cas où ». Multiplié à chaque étape, ce réflexe crée des pénuries suivies de surstocks.",
        ],
      },
      {
        kind: "hypothese",
        heading: "Ce qui pourrait suivre",
        paragraphs: [
          "Le partage des données de ventes en temps réel et la planification collaborative entre partenaires sont les remèdes les plus cités. Leur efficacité dépend de la confiance entre entreprises.",
        ],
      },
    ],
    uncertainties: ["L'ampleur de l'effet varie beaucoup selon les secteurs."],
    sources: [placeholder("manuel universitaire de gestion des opérations")],
    isDemo: true,
  },
  {
    slug: "correlation-causalite",
    title: "Corrélation n'est pas causalité",
    dek: "Deux courbes qui montent ensemble ne prouvent pas que l'une explique l'autre.",
    topic: "sciences-societe",
    format: "flash",
    minutes: 1,
    publishedAt: "2026-11-22",
    updatedAt: "2026-11-22",
    keyPoints: [
      "Une corrélation indique que deux phénomènes varient ensemble.",
      "Un troisième facteur peut expliquer les deux.",
      "Les essais contrôlés servent à établir des liens de cause à effet.",
    ],
    sections: [
      {
        kind: "fait",
        heading: "Ce qu'il faut savoir",
        paragraphs: [
          "Exemple classique : les ventes de glaces et les coups de soleil augmentent en même temps. Les glaces ne causent pas les coups de soleil ; c'est le soleil qui favorise les deux.",
        ],
      },
      {
        kind: "analyse",
        heading: "Pourquoi c'est important",
        paragraphs: [
          "Confondre corrélation et causalité conduit à de fausses conclusions, parfois reprises dans des titres accrocheurs. Les chercheurs utilisent des groupes témoins, le tirage au sort ou des méthodes statistiques pour isoler une cause.",
        ],
      },
      {
        kind: "hypothese",
        heading: "Le bon réflexe",
        paragraphs: [
          "Face à une étude, demandez-vous : existe-t-il une autre explication ? L'échantillon est-il représentatif ? Le résultat a-t-il été reproduit ?",
        ],
      },
    ],
    uncertainties: [],
    sources: [placeholder("ressource pédagogique d'un organisme de recherche ou d'enseignement")],
    isDemo: true,
  },
];

const storyMap = new Map(stories.map((s) => [s.slug, s]));

export function getStory(slug: string): Story | undefined {
  return storyMap.get(slug);
}

/** Fil de découverte : les plus récents d'abord. */
export const feedStories = [...stories].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

export function relatedStories(story: Story, limit = 3): Story[] {
  const sameTopic = stories.filter((s) => s.slug !== story.slug && s.topic === story.topic);
  const others = feedStories.filter((s) => s.slug !== story.slug && s.topic !== story.topic);
  return [...sameTopic, ...others].slice(0, limit);
}
