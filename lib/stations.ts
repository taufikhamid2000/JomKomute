// Generated from two official GTFS static feeds on data.gov.my
// (https://developer.data.gov.my/realtime-api/gtfs-static) via
// scripts/generate-stations.mjs — don't hand-edit, re-run the script
// instead if the source data changes:
//   - Prasarana (category=rapid-rail-kl): LRT, MRT, KL Monorail, BRT Sunway
//   - KTMB: the two Klang Valley Komuter lines only (route_type "0") —
//     Intercity/ETS long-distance routes in the same feed are excluded
//
// arrivalOffsetMinutes[i] is minutes from stations[0]'s departure to
// stations[i]'s arrival, per one representative weekday trip — real
// scheduled timetable data, used for expected-arrival estimates
// (lib/schedule.ts), not live tracking.
//
// STATION_COORDS is a separate name -> [lat, lng] lookup (from the same
// feeds' stops.txt) so existing readers of LINES[].stations (plain
// strings) keep working unchanged; look a station name up here to plot
// it on a map. Not every station is guaranteed a coordinate (a stop
// missing stop_lat/stop_lon in a feed is simply absent from this map).

export const LINES = [
  {
    "id": "ampang",
    "name": "LRT Ampang Line",
    "color": "#e57200",
    "stations": [
      "Ampang",
      "Cahaya",
      "Cempaka",
      "Pandan Indah",
      "Pandan Jaya",
      "Maluri",
      "Miharja",
      "Chan Sow Lin",
      "Pudu",
      "Hang Tuah",
      "Plaza Rakyat",
      "Masjid Jamek",
      "Bandaraya - UOB",
      "Sultan Ismail",
      "PWTC",
      "Titiwangsa",
      "Sentul",
      "Sentul Timur"
    ],
    "arrivalOffsetMinutes": [
      0,
      2,
      3,
      5,
      6,
      8,
      10,
      12,
      14,
      15,
      16,
      18,
      20,
      22,
      23,
      25,
      26,
      28
    ]
  },
  {
    "id": "kelana-jaya",
    "name": "LRT Kelana Jaya Line",
    "color": "#D50032",
    "stations": [
      "Putra Heights",
      "Subang Alam",
      "Alam Megah",
      "USJ 21",
      "Wawasan",
      "Taipan",
      "USJ 7",
      "SS 18",
      "SS 15",
      "Subang Jaya",
      "Glenmarie",
      "Ara Damansara",
      "Lembah Subang",
      "Kelana Jaya",
      "Taman Bahagia",
      "Taman Paramount",
      "Asia Jaya",
      "Taman Jaya",
      "Universiti",
      "Kerinchi",
      "Abdullah Hukum",
      "Bangsar - Bank Rakyat",
      "KL Sentral",
      "Pasar Seni",
      "Masjid Jamek",
      "Dang Wangi",
      "Kampung Baru - CBP Coopbank Pertama",
      "KLCC",
      "Ampang Park",
      "Damai",
      "Dato' Keramat",
      "Jelatek",
      "Setiawangsa",
      "Sri Rampai",
      "Wangsa Maju",
      "Taman Melati",
      "Gombak"
    ],
    "arrivalOffsetMinutes": [
      0,
      3,
      6,
      10,
      12,
      15,
      17,
      22,
      24,
      27,
      31,
      34,
      36,
      38,
      41,
      43,
      46,
      48,
      51,
      54,
      56,
      58,
      61,
      65,
      68,
      70,
      72,
      75,
      77,
      80,
      82,
      84,
      86,
      90,
      92,
      95,
      98
    ]
  },
  {
    "id": "sri-petaling",
    "name": "LRT Sri Petaling Line",
    "color": "#76232f",
    "stations": [
      "Putra Heights",
      "Puchong Prima",
      "Puchong Perdana",
      "Bandar Puteri",
      "Taman Perindustrian Puchong",
      "Pusat Bandar Puchong",
      "IOI Puchong Jaya",
      "Kinrara",
      "Alam Sutera",
      "Muhibbah",
      "Awan Besar",
      "Sri Petaling",
      "Bukit Jalil",
      "Sungai Besi",
      "Bandar Tasik Selatan",
      "Bandar Tun Razak",
      "Salak Selatan",
      "Cheras",
      "Chan Sow Lin",
      "Pudu",
      "Hang Tuah",
      "Plaza Rakyat",
      "Masjid Jamek",
      "Bandaraya - UOB",
      "Sultan Ismail",
      "PWTC",
      "Titiwangsa",
      "Sentul",
      "Sentul Timur"
    ],
    "arrivalOffsetMinutes": [
      0,
      4,
      7,
      9,
      11,
      13,
      14,
      18,
      21,
      24,
      26,
      28,
      29,
      32,
      34,
      37,
      39,
      41,
      44,
      45,
      47,
      48,
      50,
      52,
      54,
      55,
      57,
      58,
      60
    ]
  },
  {
    "id": "kajang",
    "name": "MRT Kajang Line",
    "color": "#047940",
    "stations": [
      "Kwasa Damansara",
      "Kwasa Sentral",
      "Kota Damansara",
      "Surian",
      "Mutiara Damansara",
      "Bandar Utama",
      "Taman Tun Dr Ismail",
      "Phileo Damansara",
      "Pusat Bandar Damansara",
      "Semantan",
      "Muzium Negara",
      "Pasar Seni",
      "Merdeka",
      "Bukit Bintang",
      "Tun Razak Exchange",
      "Cochrane",
      "Maluri",
      "Taman Pertama",
      "Taman Midah",
      "Taman Mutiara",
      "Taman Connaught",
      "Taman Suntex",
      "Sri Raya",
      "Bandar Tun Hussein Onn",
      "Batu 11 Cheras",
      "Bukit Dukung",
      "Sungai Jernih",
      "Stadium Kajang",
      "Kajang"
    ],
    "arrivalOffsetMinutes": [
      0,
      2,
      6,
      8,
      11,
      14,
      17,
      20,
      24,
      28,
      32,
      36,
      39,
      42,
      46,
      48,
      51,
      54,
      57,
      60,
      64,
      67,
      70,
      73,
      76,
      79,
      83,
      86,
      88
    ]
  },
  {
    "id": "putrajaya",
    "name": "MRT Putrajaya Line",
    "color": "#FFCD00",
    "stations": [
      "Kwasa Damansara",
      "Kampung Selamat",
      "Sungai Buloh",
      "Damansara Damai",
      "Sri Damansara Barat",
      "Sri Damansara Sentral",
      "Sri Damansara Timur",
      "Metro Prima",
      "Kepong Baru",
      "Jinjang",
      "Sri Delima",
      "Kampung Batu",
      "Kentomen",
      "Jalan Ipoh",
      "Sentul Barat",
      "Titiwangsa",
      "Hospital Kuala Lumpur",
      "Raja Uda",
      "Ampang Park",
      "Persiaran KLCC",
      "Conlay",
      "Tun Razak Exchange",
      "Chan Sow Lin",
      "Kuchai",
      "Taman Naga Emas",
      "Sungai Besi",
      "Serdang Raya Utara",
      "Serdang Raya Selatan",
      "Serdang Jaya",
      "UPM",
      "Taman Equine",
      "Putra Permai",
      "16 Sierra",
      "Cyberjaya Utara",
      "Cyberjaya City Centre",
      "Putrajaya Sentral"
    ],
    "arrivalOffsetMinutes": [
      0,
      3,
      5,
      7,
      9,
      11,
      13,
      14,
      16,
      17,
      18,
      20,
      22,
      23,
      25,
      26,
      28,
      29,
      31,
      32,
      33,
      35,
      37,
      43,
      44,
      47,
      49,
      51,
      52,
      54,
      58,
      60,
      62,
      65,
      67,
      68
    ]
  },
  {
    "id": "monorail",
    "name": "KL Monorail Line",
    "color": "#84bd00",
    "stations": [
      "KL Sentral",
      "Tun Sambanthan",
      "Maharajalela",
      "Hang Tuah",
      "Imbi",
      "Bukit Bintang",
      "Raja Chulan",
      "Bukit Nanas",
      "Medan Tuanku",
      "Chow Kit",
      "Titiwangsa"
    ],
    "arrivalOffsetMinutes": [
      0,
      3,
      7,
      9,
      11,
      14,
      16,
      18,
      20,
      23,
      26
    ]
  },
  {
    "id": "brt-sunway",
    "name": "BRT Sunway Line",
    "color": "#115740",
    "stations": [
      "Sunway-Setia Jaya",
      "Mentari",
      "Sunway Lagoon",
      "Sunmed",
      "SunU-Monash",
      "South Quay-USJ 1",
      "USJ7"
    ],
    "arrivalOffsetMinutes": [
      0,
      3,
      6,
      8,
      11,
      13,
      16
    ]
  },
  {
    "id": "shah-alam",
    "name": "LRT Shah Alam Line",
    "color": "#00A9E0",
    "stations": [
      "Bandar Utama",
      "Kayu Ara",
      "Bandar Utama 11",
      "Damansara Idaman",
      "Subang",
      "Glenmarie 2",
      "Kerjaya",
      "Stadium Shah Alam",
      "Dato' Menteri - SA Sentral",
      "UITM Shah Alam",
      "Seksyen 7",
      "Bandar Baru Klang",
      "Pasar Klang",
      "Jalan Meru",
      "Jambatan Kota",
      "Taman Selatan",
      "Seri Andalas",
      "Klang Jaya",
      "Bandar Bukit Tinggi",
      "Johan Setia"
    ],
    "arrivalOffsetMinutes": [
      0,
      2,
      5,
      8,
      11,
      14,
      20,
      23,
      29,
      34,
      37,
      41,
      45,
      47,
      49,
      54,
      56,
      58,
      61,
      66
    ]
  },
  {
    "id": "komuter-seremban",
    "name": "KTM Seremban Line",
    "color": "#3C5A9F",
    "stations": [
      "Pulau Sebang/tampin",
      "Rembau",
      "Sungai Gadut",
      "Senawang",
      "Seremban",
      "Tiroi",
      "Labu",
      "Nilai",
      "Batang Benar",
      "Bangi",
      "UKM",
      "Kajang 2",
      "Kajang",
      "Serdang",
      "Bdr Tasek Selatan",
      "Salak Selatan",
      "Seputeh",
      "Perhentian Midvalley",
      "KL Sentral",
      "Kuala Lumpur",
      "Bank Negara",
      "Putra",
      "Sentul",
      "Batu Kentomenn",
      "Kampung Batu",
      "Taman Wahyu",
      "Batu Caves"
    ],
    "arrivalOffsetMinutes": [
      0,
      16,
      29,
      35,
      40,
      49,
      55,
      65,
      71,
      84,
      90,
      93,
      96,
      108,
      115,
      122,
      127,
      129,
      135,
      145,
      149,
      152,
      158,
      162,
      164,
      167,
      171
    ]
  },
  {
    "id": "komuter-port-klang",
    "name": "KTM Port Klang Line",
    "color": "#DC2420",
    "stations": [
      "Pel Klang Sel",
      "Jln Kastam",
      "Kg Raja Uda",
      "Telok Gadong",
      "Telok Pulai",
      "Klang",
      "Bukit Badak",
      "Padang Jawa",
      "Shah Alam",
      "Batu Tiga",
      "Subang Jaya",
      "Setia Jaya",
      "Seri Setia",
      "Kg Dato Harun",
      "Jalan Templer",
      "Petaling",
      "Pantai Dalam",
      "Angkasapuri",
      "Abdullah Hukum",
      "KL Sentral",
      "Kuala Lumpur",
      "Bank Negara",
      "Putra",
      "Segambut",
      "Kepong",
      "Kepong Sentral",
      "Sungai Buloh",
      "Kuang",
      "Rawang",
      "Serendah",
      "Batang Kali",
      "Rasa",
      "Kuala Kubu Bharu",
      "Tanjong Malim"
    ],
    "arrivalOffsetMinutes": [
      0,
      5,
      7,
      10,
      13,
      16,
      21,
      26,
      31,
      39,
      44,
      49,
      52,
      54,
      59,
      61,
      69,
      73,
      75,
      82,
      93,
      97,
      100,
      105,
      110,
      113,
      120,
      128,
      136,
      145,
      153,
      156,
      161,
      175
    ]
  }
] as const;

export type LineId = (typeof LINES)[number]["id"];

export const STATION_COORDS: Record<string, [number, number]> = {
  "Ampang": [
    3.150318,
    101.760049
  ],
  "Cahaya": [
    3.140575,
    101.756677
  ],
  "Cempaka": [
    3.138324,
    101.752979
  ],
  "Pandan Indah": [
    3.134581,
    101.746509
  ],
  "Pandan Jaya": [
    3.130141,
    101.739122
  ],
  "Maluri": [
    3.12329,
    101.727283
  ],
  "Miharja": [
    3.120973,
    101.717922
  ],
  "Chan Sow Lin": [
    3.128105,
    101.715637
  ],
  "Pudu": [
    3.134879,
    101.711957
  ],
  "Hang Tuah": [
    3.140012,
    101.705984
  ],
  "Plaza Rakyat": [
    3.144049,
    101.702105
  ],
  "Masjid Jamek": [
    3.14927,
    101.696377
  ],
  "Bandaraya - UOB": [
    3.155567,
    101.694485
  ],
  "Sultan Ismail": [
    3.161245,
    101.694109
  ],
  "PWTC": [
    3.166333,
    101.693586
  ],
  "Titiwangsa": [
    3.173497,
    101.695367
  ],
  "Sentul": [
    3.178484,
    101.695542
  ],
  "Sentul Timur": [
    3.185897,
    101.695217
  ],
  "Putra Heights": [
    2.996227,
    101.575462
  ],
  "Subang Alam": [
    3.009421,
    101.572281
  ],
  "Alam Megah": [
    3.023151,
    101.572029
  ],
  "USJ 21": [
    3.029881,
    101.581711
  ],
  "Wawasan": [
    3.035062,
    101.588348
  ],
  "Taipan": [
    3.04815,
    101.590233
  ],
  "USJ 7": [
    3.054956,
    101.592194
  ],
  "SS 18": [
    3.067182,
    101.585945
  ],
  "SS 15": [
    3.075972,
    101.585983
  ],
  "Subang Jaya": [
    3.08466,
    101.588127
  ],
  "Glenmarie": [
    3.094732,
    101.590622
  ],
  "Ara Damansara": [
    3.108643,
    101.586372
  ],
  "Lembah Subang": [
    3.112094,
    101.591034
  ],
  "Kelana Jaya": [
    3.112497,
    101.6043
  ],
  "Taman Bahagia": [
    3.11079,
    101.612856
  ],
  "Taman Paramount": [
    3.104716,
    101.623192
  ],
  "Asia Jaya": [
    3.104343,
    101.637695
  ],
  "Taman Jaya": [
    3.104086,
    101.645248
  ],
  "Universiti": [
    3.114616,
    101.661639
  ],
  "Kerinchi": [
    3.115506,
    101.668572
  ],
  "Abdullah Hukum": [
    3.118735,
    101.672897
  ],
  "Bangsar - Bank Rakyat": [
    3.127588,
    101.679062
  ],
  "KL Sentral": [
    3.13442,
    101.68625
  ],
  "Pasar Seni": [
    3.142439,
    101.69531
  ],
  "Dang Wangi": [
    3.156942,
    101.701975
  ],
  "Kampung Baru - CBP Coopbank Pertama": [
    3.161386,
    101.706608
  ],
  "KLCC": [
    3.158935,
    101.713287
  ],
  "Ampang Park": [
    3.159894,
    101.719017
  ],
  "Damai": [
    3.164406,
    101.724489
  ],
  "Dato' Keramat": [
    3.16509,
    101.73184
  ],
  "Jelatek": [
    3.167204,
    101.735344
  ],
  "Setiawangsa": [
    3.17576,
    101.73584
  ],
  "Sri Rampai": [
    3.199176,
    101.73747
  ],
  "Wangsa Maju": [
    3.205751,
    101.731796
  ],
  "Taman Melati": [
    3.219558,
    101.72197
  ],
  "Gombak": [
    3.231793,
    101.724427
  ],
  "Puchong Prima": [
    2.999808,
    101.596692
  ],
  "Puchong Perdana": [
    3.007913,
    101.605021
  ],
  "Bandar Puteri": [
    3.017111,
    101.612855
  ],
  "Taman Perindustrian Puchong": [
    3.022814,
    101.613514
  ],
  "Pusat Bandar Puchong": [
    3.033194,
    101.616057
  ],
  "IOI Puchong Jaya": [
    3.048101,
    101.62095
  ],
  "Kinrara": [
    3.050506,
    101.644294
  ],
  "Alam Sutera": [
    3.0547,
    101.656468
  ],
  "Muhibbah": [
    3.062229,
    101.662552
  ],
  "Awan Besar": [
    3.062131,
    101.670555
  ],
  "Sri Petaling": [
    3.061445,
    101.687074
  ],
  "Bukit Jalil": [
    3.058196,
    101.692125
  ],
  "Sungai Besi": [
    3.063842,
    101.708062
  ],
  "Bandar Tasik Selatan": [
    3.076058,
    101.711107
  ],
  "Bandar Tun Razak": [
    3.089576,
    101.712466
  ],
  "Salak Selatan": [
    3.102201,
    101.706179
  ],
  "Cheras": [
    3.112609,
    101.714178
  ],
  "Kwasa Damansara": [
    3.176146,
    101.572052
  ],
  "Kwasa Sentral": [
    3.170112,
    101.564651
  ],
  "Kota Damansara": [
    3.150134,
    101.57869
  ],
  "Surian": [
    3.14948,
    101.593925
  ],
  "Mutiara Damansara": [
    3.155301,
    101.609077
  ],
  "Bandar Utama": [
    3.14671,
    101.618599
  ],
  "Taman Tun Dr Ismail": [
    3.13613,
    101.630539
  ],
  "Phileo Damansara": [
    3.129864,
    101.642471
  ],
  "Pusat Bandar Damansara": [
    3.143444,
    101.662857
  ],
  "Semantan": [
    3.150977,
    101.665497
  ],
  "Muzium Negara": [
    3.137317,
    101.687336
  ],
  "Merdeka": [
    3.141969,
    101.70205
  ],
  "Bukit Bintang": [
    3.146503,
    101.710947
  ],
  "Tun Razak Exchange": [
    3.142403,
    101.720156
  ],
  "Cochrane": [
    3.132829,
    101.722962
  ],
  "Taman Pertama": [
    3.112547,
    101.729371
  ],
  "Taman Midah": [
    3.104505,
    101.732186
  ],
  "Taman Mutiara": [
    3.090989,
    101.740453
  ],
  "Taman Connaught": [
    3.079172,
    101.74522
  ],
  "Taman Suntex": [
    3.071578,
    101.763552
  ],
  "Sri Raya": [
    3.062273,
    101.772899
  ],
  "Bandar Tun Hussein Onn": [
    3.048223,
    101.775109
  ],
  "Batu 11 Cheras": [
    3.041339,
    101.773383
  ],
  "Bukit Dukung": [
    3.026413,
    101.771072
  ],
  "Sungai Jernih": [
    3.000948,
    101.783857
  ],
  "Stadium Kajang": [
    2.994514,
    101.786338
  ],
  "Kajang": [
    2.982778,
    101.790278
  ],
  "Kampung Selamat": [
    3.197266,
    101.578499
  ],
  "Sungai Buloh": [
    3.206429,
    101.581779
  ],
  "Damansara Damai": [
    3.199892,
    101.592623
  ],
  "Sri Damansara Barat": [
    3.198197,
    101.608302
  ],
  "Sri Damansara Sentral": [
    3.198815,
    101.621396
  ],
  "Sri Damansara Timur": [
    3.207832,
    101.628716
  ],
  "Metro Prima": [
    3.214438,
    101.639402
  ],
  "Kepong Baru": [
    3.211663,
    101.648193
  ],
  "Jinjang": [
    3.209544,
    101.655829
  ],
  "Sri Delima": [
    3.207108,
    101.665749
  ],
  "Kampung Batu": [
    3.205521,
    101.675473
  ],
  "Kentomen": [
    3.19563,
    101.6797
  ],
  "Jalan Ipoh": [
    3.189319,
    101.681145
  ],
  "Sentul Barat": [
    3.179369,
    101.684742
  ],
  "Hospital Kuala Lumpur": [
    3.17405,
    101.70239
  ],
  "Raja Uda": [
    3.16794,
    101.71017
  ],
  "Persiaran KLCC": [
    3.15712,
    101.71834
  ],
  "Conlay": [
    3.15145,
    101.71801
  ],
  "Kuchai": [
    3.089546,
    101.694124
  ],
  "Taman Naga Emas": [
    3.077688,
    101.699867
  ],
  "Serdang Raya Utara": [
    3.041674,
    101.704928
  ],
  "Serdang Raya Selatan": [
    3.028463,
    101.707514
  ],
  "Serdang Jaya": [
    3.0216,
    101.709
  ],
  "UPM": [
    3.008489,
    101.705396
  ],
  "Taman Equine": [
    2.98942,
    101.67244
  ],
  "Putra Permai": [
    2.98339,
    101.66099
  ],
  "16 Sierra": [
    2.964974,
    101.654812
  ],
  "Cyberjaya Utara": [
    2.95,
    101.6573
  ],
  "Cyberjaya City Centre": [
    2.9384,
    101.6659
  ],
  "Putrajaya Sentral": [
    2.9313,
    101.6715
  ],
  "Tun Sambanthan": [
    3.13132,
    101.69085
  ],
  "Maharajalela": [
    3.138743,
    101.699268
  ],
  "Imbi": [
    3.14283,
    101.70945
  ],
  "Raja Chulan": [
    3.150878,
    101.710432
  ],
  "Bukit Nanas": [
    3.156214,
    101.704809
  ],
  "Medan Tuanku": [
    3.15935,
    101.69888
  ],
  "Chow Kit": [
    3.167358,
    101.698379
  ],
  "Sunway-Setia Jaya": [
    3.0828,
    101.6123
  ],
  "Mentari": [
    3.0761,
    101.6101
  ],
  "Sunway Lagoon": [
    3.0706,
    101.6107
  ],
  "Sunmed": [
    3.0656,
    101.6087
  ],
  "SunU-Monash": [
    3.0654,
    101.6016
  ],
  "South Quay-USJ 1": [
    3.0617,
    101.5969
  ],
  "USJ7": [
    3.0553,
    101.5919
  ],
  "Kayu Ara": [
    3.134722,
    101.616667
  ],
  "Bandar Utama 11": [
    3.133333,
    101.604444
  ],
  "Damansara Idaman": [
    3.122778,
    101.594167
  ],
  "Subang": [
    3.106111,
    101.591111
  ],
  "Glenmarie 2": [
    3.095278,
    101.588611
  ],
  "Kerjaya": [
    3.082222,
    101.561944
  ],
  "Stadium Shah Alam": [
    3.079722,
    101.548889
  ],
  "Dato' Menteri - SA Sentral": [
    3.069722,
    101.521111
  ],
  "UITM Shah Alam": [
    3.0625,
    101.501111
  ],
  "Seksyen 7": [
    3.067222,
    101.486667
  ],
  "Bandar Baru Klang": [
    3.0625,
    101.465556
  ],
  "Pasar Klang": [
    3.067778,
    101.450833
  ],
  "Jalan Meru": [
    3.058889,
    101.451944
  ],
  "Jambatan Kota": [
    3.047222,
    101.4475
  ],
  "Taman Selatan": [
    3.026667,
    101.442222
  ],
  "Seri Andalas": [
    3.015833,
    101.440556
  ],
  "Klang Jaya": [
    3.005278,
    101.441667
  ],
  "Bandar Bukit Tinggi": [
    2.993056,
    101.445833
  ],
  "Johan Setia": [
    2.976111,
    101.459167
  ],
  "Pulau Sebang/tampin": [
    2.46396,
    102.226308
  ],
  "Rembau": [
    2.593055,
    102.094653
  ],
  "Sungai Gadut": [
    2.660898,
    101.996158
  ],
  "Senawang": [
    2.690138,
    101.972336
  ],
  "Seremban": [
    2.719169,
    101.940792
  ],
  "Tiroi": [
    2.741459,
    101.871914
  ],
  "Labu": [
    2.754501,
    101.826656
  ],
  "Nilai": [
    2.802356,
    101.799303
  ],
  "Batang Benar": [
    2.829904,
    101.826655
  ],
  "Bangi": [
    2.904467,
    101.785943
  ],
  "UKM": [
    2.939775,
    101.787623
  ],
  "Kajang 2": [
    2.96264,
    101.79207
  ],
  "Serdang": [
    3.023404,
    101.716056
  ],
  "Bdr Tasek Selatan": [
    3.076229,
    101.711119
  ],
  "Seputeh": [
    3.113612,
    101.681474
  ],
  "Perhentian Midvalley": [
    3.119211,
    101.678865
  ],
  "Kuala Lumpur": [
    3.139444,
    101.693333
  ],
  "Bank Negara": [
    3.155105,
    101.693118
  ],
  "Putra": [
    3.165399,
    101.691101
  ],
  "Batu Kentomenn": [
    3.198485,
    101.681138
  ],
  "Taman Wahyu": [
    3.21451,
    101.672178
  ],
  "Batu Caves": [
    3.237796,
    101.681215
  ],
  "Pel Klang Sel": [
    2.999323,
    101.39179
  ],
  "Jln Kastam": [
    3.013128,
    101.402599
  ],
  "Kg Raja Uda": [
    3.020253,
    101.41023
  ],
  "Telok Gadong": [
    3.033932,
    101.424947
  ],
  "Telok Pulai": [
    3.04089,
    101.432153
  ],
  "Klang": [
    3.043078,
    101.449543
  ],
  "Bukit Badak": [
    3.036147,
    101.470176
  ],
  "Padang Jawa": [
    3.052532,
    101.492742
  ],
  "Shah Alam": [
    3.056388,
    101.525302
  ],
  "Batu Tiga": [
    3.076091,
    101.559811
  ],
  "Setia Jaya": [
    3.083373,
    101.61143
  ],
  "Seri Setia": [
    3.083373,
    101.61143
  ],
  "Kg Dato Harun": [
    3.084828,
    101.632339
  ],
  "Jalan Templer": [
    3.084013,
    101.656402
  ],
  "Petaling": [
    3.086485,
    101.664338
  ],
  "Pantai Dalam": [
    3.095607,
    101.669927
  ],
  "Angkasapuri": [
    3.113212,
    101.673367
  ],
  "Segambut": [
    3.186514,
    101.664032
  ],
  "Kepong": [
    3.202996,
    101.637381
  ],
  "Kepong Sentral": [
    3.208653,
    101.62849
  ],
  "Kuang": [
    3.258267,
    101.554794
  ],
  "Rawang": [
    3.318955,
    101.575012
  ],
  "Serendah": [
    3.376172,
    101.614532
  ],
  "Batang Kali": [
    3.46838,
    101.637759
  ],
  "Rasa": [
    3.500586,
    101.634113
  ],
  "Kuala Kubu Bharu": [
    3.553215,
    101.639591
  ],
  "Tanjong Malim": [
    3.685142,
    101.518165
  ]
};
