const projectCategories = {
  "handel": "Handel og næring",
  "kontor": "Kontor",
  "industri": "Industri og verksted",
  "lager": "Lager",
  "vask": "Vaskehaller",
  "landbruk": "Landbruk",
  "bolig": "Bolig"
};

const ferroProjects = [
  {
    "slug": "folkestadvegen-3",
    "category": "handel",
    "sted": "Bø i Telemark",
    "title": "Coop Extra, Folkestadvegen 3",
    "lead": "Butikk, kontorer og parkeringskjeller for Forberg Eiendomsselskap AS.",
    "hero": "assets/photos/2024/09/image11.webp",
    "gallery": [
      "assets/photos/2024/09/image12.webp",
      "assets/photos/2024/09/image10.webp",
      "assets/photos/2024/09/image8.webp"
    ],
    "specs": [
      "2000 m² hulldekker for et stabilt og varig bygg",
      "1000 m² parkeringskjeller for god tilgjengelighet",
      "1000 m² butikkareal med praktisk utforming",
      "800 m² kontorlokaler i 2. etasje"
    ],
    "client": "Forberg Eiendomsselskap AS",
    "quote": {
      "text": "Vi er også svært godt fornøyd med det arbeidet som denne entreprenøren utførte for oss og i tillegg var prisene meget konkurransedyktige.",
      "name": "Einar Forberg",
      "org": "Forberg Eiendomsselskap AS"
    }
  },
  {
    "slug": "tokke-teknologipark",
    "category": "kontor",
    "sted": "Dalen",
    "title": "Tokke Teknologipark",
    "lead": "Tilbygg på 540 m² for Dalen Mekaniske AS.",
    "hero": "assets/photos/2024/09/IMG_8290.webp",
    "gallery": [
      "assets/photos/2024/09/image13.webp"
    ],
    "specs": [
      "270 m² grunnflate fordelt på to etasjer",
      "Stålkonstruksjon med sandwichelementer",
      "Hulldekker i etasjeskillet"
    ],
    "client": "Dalen Mekaniske AS",
    "byggetid": "Oktober 2022 – april 2023",
    "quote": {
      "text": "Tett oppfølging, tålmodige og på ballen. De er gode rådgivere og passer på at vi får det vi trenger.",
      "name": "Hermann Betten",
      "org": "Dalen Mekaniske AS"
    },
    "facts": {
      "Entreprise": "Totalentreprise",
      "Areal": "540 m²"
    }
  },
  {
    "slug": "skiensvegen-740",
    "category": "kontor",
    "sted": "Nome",
    "title": "NTT AS, Skiensvegen 740",
    "lead": "Skiensvegen 740 i Nome. Levert som totalentreprise.",
    "hero": "assets/photos/reportasje/ntt-flyfoto.webp",
    "gallery": [
      "assets/photos/2024/09/IMG_8596.webp",
      "assets/photos/2024/09/DJI_0024.webp",
      "assets/photos/2024/09/DJI_0018.webp",
      "assets/photos/2024/09/DJI_0030.webp"
    ],
    "specs": [
      "Stålkonstruksjon med sandwichelementer",
      "Hulldekker i etasjeskillet",
      "Skreddersydd for NTT AS sine behov"
    ],
    "client": "Nome Eiendom AS",
    "byggetid": "Juni – november 2023",
    "quote": {
      "text": "Den tette oppfølgingen, de gode løsningene vi fikk servert og hvor engasjerte Vegard og Ingar var, gjorde at vi raskt kunne flytte inn i et nytt og fremtidsrettet lokale.",
      "name": "Reidar Brauti",
      "org": "NTT AS"
    },
    "headline": "Nytt kontor, verksted og lager for NTT AS",
    "body": [
      "Da NTT AS skulle bygge nytt kontor, verksted og lager i Nome, valgte de oss som totalentreprenør.",
      "Bygget har 505 m² grunnflate og 756 m² fordelt på to etasjer."
    ],
    "facts": {
      "Bruker": "NTT AS",
      "Entreprise": "Totalentreprise",
      "Bruk": "Kontor, verksted og lager",
      "Areal": "756 m² (505 m² grunnflate)"
    }
  },
  {
    "slug": "coop-extra-lunde",
    "category": "handel",
    "sted": "Lunde",
    "title": "Coop Extra Lunde",
    "lead": "Ny dagligvarebutikk i stål og sandwich.",
    "hero": "assets/flight/lunde.webp"
  },
  {
    "slug": "orevellavegen-6",
    "category": "industri",
    "sted": "Sauland",
    "title": "Ørevella Industrier AS",
    "lead": "Gjenoppbygging etter brann. Mesta er leietaker i bygget.",
    "hero": "assets/photos/2025/02/Orevella-2-e1738919120806.webp"
  },
  {
    "slug": "storvegen-97",
    "category": "lager",
    "sted": "Dalen",
    "title": "Mekan, Storvegen 97",
    "lead": "Nytt lager og ny fasade på eksisterende bygg for G7 Eiendom.",
    "hero": "assets/photos/2025/02/Mekan-1024x768.webp",
    "client": "G7 Eiendom"
  },
  {
    "slug": "torsholvegen-5",
    "category": "handel",
    "sted": "Brenna i Bø",
    "title": "Eika Maskinsalg, Torshølvegen 5",
    "lead": "Næringsbygg for Eika Eigedom AS.",
    "hero": "assets/photos/2024/09/image9.webp",
    "client": "Eika Eigedom AS"
  },
  {
    "slug": "saetrevegen-265",
    "category": "industri",
    "sted": "Gvarv",
    "title": "Bård Langkaas Transport AS",
    "lead": "Næringsbygg med fire porter i Sætrevegen 265.",
    "hero": "assets/photos/2024/09/DJI_0031-1024x768.webp"
  },
  {
    "slug": "rugtvedt-lagerbygg",
    "category": "lager",
    "sted": "Bamble",
    "title": "Rugtvedt Lagerbygg",
    "lead": "16 selveierseksjoner med kort vei til E18."
  },
  {
    "slug": "hydrovegen-55",
    "category": "vask",
    "sted": "Herøya",
    "title": "Vaskehall for Alltidrenbil",
    "lead": "Vaskehall i Hydrovegen 55.",
    "hero": "assets/photos/2024/09/image5.webp"
  },
  {
    "slug": "glitra-moss",
    "category": "vask",
    "sted": "Moss",
    "title": "Vaskehall for Glitra",
    "lead": "Komplett vaskehall med profilering."
  },
  {
    "slug": "glitra-geithus",
    "category": "vask",
    "sted": "Geithus",
    "title": "Vaskehall for Glitra",
    "lead": "Elementbygg kledd med trepanel."
  },
  {
    "slug": "lave-melum",
    "category": "landbruk",
    "sted": "Melum",
    "title": "Låve på 800 m²",
    "lead": "Korntørke og verksted med traverskran."
  },
  {
    "slug": "ferrobygget",
    "category": "kontor",
    "sted": "Ulefoss",
    "title": "Ferrobygget, Ringsevja 3",
    "lead": "Totalrenovert kontorbygg. Vårt eget kontorfellesskap.",
    "hero": "assets/photos/reportasje/ferrobygget.webp"
  },
  {
    "slug": "ringsevja-9",
    "category": "bolig",
    "title": "Ringsevja 9",
    "sted": "Ulefoss",
    "lead": "Nye leiligheter i Ringsevja 9 på Ulefoss.",
    "hero": "assets/photos/2024/09/image1.webp"
  }
];
