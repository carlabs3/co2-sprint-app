// Estructura del cuestionario. Los textos visibles (areaLabel, text, info,
// label, sublabel) se guardan como CLAVES i18n; el texto real vive en
// i18n/locales/*.json. Los IDs, valores, tipos y la logica NO cambian.
export const AREA_QUESTIONS = [
  {
    "areaId": "transport",
    "areaLabel": "areas.transport",
    "areaColor": "#4a90d9",
    "questions": [
      {
        "id": "carKm",
        "text": "questions.carKm.text",
        "info": "questions.carKm.info",
        "type": "single",
        "options": [
          {
            "value": "km_a",
            "label": "questions.carKm.options.km_a"
          },
          {
            "value": "km_b",
            "label": "questions.carKm.options.km_b"
          },
          {
            "value": "km_c",
            "label": "questions.carKm.options.km_c"
          },
          {
            "value": "km_d",
            "label": "questions.carKm.options.km_d"
          },
          {
            "value": "km_e",
            "label": "questions.carKm.options.km_e"
          }
        ]
      },
      {
        "id": "carType",
        "text": "questions.carType.text",
        "type": "single",
        "showIf": (answers) => answers.carKm !== 'km_e',
        "options": [
          {
            "value": "gasoline",
            "label": "questions.carType.options.gasoline"
          },
          {
            "value": "electric",
            "label": "questions.carType.options.electric"
          }
        ]
      },
      {
        "id": "flights",
        "text": "questions.flights.text",
        "info": "questions.flights.info",
        "type": "flights",
        "options": [
          {
            "value": "flightShort",
            "emoji": "✈️",
            "label": "questions.flights.options.flightShort"
          },
          {
            "value": "flightMedium",
            "emoji": "🌍",
            "label": "questions.flights.options.flightMedium"
          },
          {
            "value": "flightLong",
            "emoji": "🌐",
            "label": "questions.flights.options.flightLong"
          }
        ]
      },
      {
        "id": "train",
        "text": "questions.train.text",
        "info": "questions.train.info",
        "type": "single",
        "options": [
          {
            "value": "3a",
            "label": "questions.train.options.3a"
          },
          {
            "value": "3b",
            "label": "questions.train.options.3b"
          },
          {
            "value": "3c",
            "label": "questions.train.options.3c"
          },
          {
            "value": "3d",
            "label": "questions.train.options.3d"
          }
        ]
      },
      {
        "id": "moto",
        "text": "questions.moto.text",
        "type": "single",
        "options": [
          {
            "value": "4a",
            "label": "questions.moto.options.4a"
          },
          {
            "value": "4b",
            "label": "questions.moto.options.4b"
          },
          {
            "value": "4c",
            "label": "questions.moto.options.4c"
          },
          {
            "value": "4d",
            "label": "questions.moto.options.4d"
          }
        ]
      },
      {
        "id": "urbanMobility",
        "text": "questions.urbanMobility.text",
        "info": "questions.urbanMobility.info",
        "type": "single",
        "options": [
          {
            "value": "5a",
            "label": "questions.urbanMobility.options.5a"
          },
          {
            "value": "5b",
            "label": "questions.urbanMobility.options.5b"
          },
          {
            "value": "5c",
            "label": "questions.urbanMobility.options.5c"
          },
          {
            "value": "5d",
            "label": "questions.urbanMobility.options.5d"
          },
          {
            "value": "5e",
            "label": "questions.urbanMobility.options.5e"
          },
          {
            "value": "5f",
            "label": "questions.urbanMobility.options.5f"
          }
        ]
      },
      {
        "id": "telework",
        "text": "questions.telework.text",
        "info": "questions.telework.info",
        "type": "single",
        "isSensibilization": true,
        "options": [
          {
            "value": "always",
            "label": "questions.telework.options.always"
          },
          {
            "value": "mostly",
            "label": "questions.telework.options.mostly"
          },
          {
            "value": "partial",
            "label": "questions.telework.options.partial"
          },
          {
            "value": "never",
            "label": "questions.telework.options.never"
          }
        ]
      }
    ]
  },
  {
    "areaId": "energy",
    "areaLabel": "areas.energy",
    "areaColor": "#e8a020",
    "questions": [
      {
        "id": "homeType",
        "text": "questions.homeType.text",
        "info": "questions.homeType.info",
        "type": "single",
        "options": [
          {
            "value": "25a",
            "label": "questions.homeType.options.25a"
          },
          {
            "value": "25b",
            "label": "questions.homeType.options.25b"
          },
          {
            "value": "25c",
            "label": "questions.homeType.options.25c"
          }
        ]
      },
      {
        "id": "heating",
        "text": "questions.heating.text",
        "info": "questions.heating.info",
        "type": "single",
        "options": [
          {
            "value": "26a",
            "label": "questions.heating.options.26a"
          },
          {
            "value": "26b",
            "label": "questions.heating.options.26b"
          },
          {
            "value": "26c",
            "label": "questions.heating.options.26c"
          },
          {
            "value": "26d",
            "label": "questions.heating.options.26d"
          },
          {
            "value": "26e",
            "label": "questions.heating.options.26e"
          },
          {
            "value": "26f",
            "label": "questions.heating.options.26f"
          },
          {
            "value": "26g",
            "label": "questions.heating.options.26g"
          }
        ]
      },
      {
        "id": "renewable",
        "text": "questions.renewable.text",
        "info": "questions.renewable.info",
        "type": "single",
        "options": [
          {
            "value": "a",
            "label": "questions.renewable.options.a"
          },
          {
            "value": "b",
            "label": "questions.renewable.options.b"
          },
          {
            "value": "c",
            "label": "questions.renewable.options.c"
          }
        ]
      },
      {
        "id": "hasAC",
        "text": "questions.hasAC.text",
        "info": "questions.hasAC.info",
        "type": "single",
        "options": [
          {
            "value": "yes",
            "label": "questions.hasAC.options.yes"
          },
          {
            "value": "no",
            "label": "questions.hasAC.options.no"
          }
        ]
      },
      {
        "id": "pool",
        "text": "questions.pool.text",
        "type": "single",
        "options": [
          {
            "value": "privatePool",
            "label": "questions.pool.options.privatePool"
          },
          {
            "value": "communityPool",
            "label": "questions.pool.options.communityPool"
          },
          {
            "value": "noPool",
            "label": "questions.pool.options.noPool"
          }
        ]
      },
      {
        "id": "homeHabits",
        "text": "questions.homeHabits.text",
        "info": "questions.homeHabits.info",
        "type": "multi",
        "noneValue": "none",
        "options": [
          {
            "value": "closeWindows",
            "label": "questions.homeHabits.options.closeWindows"
          },
          {
            "value": "thermostat19",
            "label": "questions.homeHabits.options.thermostat19"
          },
          {
            "value": "ledBulbs",
            "label": "questions.homeHabits.options.ledBulbs"
          },
          {
            "value": "ecoPrograms",
            "label": "questions.homeHabits.options.ecoPrograms"
          },
          {
            "value": "none",
            "label": "questions.homeHabits.options.none"
          }
        ]
      },
      {
        "id": "vacationNights",
        "text": "questions.vacationNights.text",
        "info": "questions.vacationNights.info",
        "type": "nights",
        "options": [
          {
            "value": "hotelNights",
            "label": "questions.vacationNights.options.hotelNights",
            "emoji": "🏨"
          },
          {
            "value": "hostelNights",
            "label": "questions.vacationNights.options.hostelNights",
            "emoji": "🛏️"
          },
          {
            "value": "campingNights",
            "label": "questions.vacationNights.options.campingNights",
            "emoji": "⛺"
          },
          {
            "value": "airbnbNights",
            "label": "questions.vacationNights.options.airbnbNights",
            "emoji": "🏠"
          },
          {
            "value": "secondHome",
            "label": "questions.vacationNights.options.secondHome",
            "emoji": "🏡"
          },
          {
            "value": "friendsNights",
            "label": "questions.vacationNights.options.friendsNights",
            "emoji": "👨‍👩‍👧"
          }
        ]
      }
    ]
  },
  {
    "areaId": "food",
    "areaLabel": "areas.food",
    "areaColor": "#5aab5a",
    "questions": [
      {
        "id": "breakfastDays",
        "text": "questions.breakfastDays.text",
        "info": "questions.breakfastDays.info",
        "type": "weekDistribution",
        "maxDays": 7,
        "allowDouble": true,
        "options": [
          {
            "value": "6a",
            "label": "questions.breakfastDays.options.6a"
          },
          {
            "value": "6b",
            "label": "questions.breakfastDays.options.6b"
          },
          {
            "value": "6c",
            "label": "questions.breakfastDays.options.6c"
          },
          {
            "value": "6d",
            "label": "questions.breakfastDays.options.6d"
          },
          {
            "value": "6e",
            "label": "questions.breakfastDays.options.6e"
          },
          {
            "value": "6f",
            "label": "questions.breakfastDays.options.6f"
          }
        ]
      },
      {
        "id": "hotDrinksCount",
        "text": "questions.hotDrinksCount.text",
        "info": "questions.hotDrinksCount.info",
        "type": "dailyCount",
        "options": [
          {
            "value": "7a",
            "label": "questions.hotDrinksCount.options.7a",
            "isNone": true
          },
          {
            "value": "7b",
            "label": "questions.hotDrinksCount.options.7b"
          },
          {
            "value": "7c",
            "label": "questions.hotDrinksCount.options.7c"
          },
          {
            "value": "7d_cow",
            "label": "questions.hotDrinksCount.options.7d_cow"
          },
          {
            "value": "7d_veg",
            "label": "questions.hotDrinksCount.options.7d_veg"
          },
          {
            "value": "7d_chai",
            "label": "questions.hotDrinksCount.options.7d_chai"
          },
          {
            "value": "7e",
            "label": "questions.hotDrinksCount.options.7e"
          }
        ]
      },
      {
        "id": "alcohol",
        "text": "questions.alcohol.text",
        "info": "questions.alcohol.info",
        "type": "drinks",
        "options": [
          {
            "value": "soda",
            "label": "questions.alcohol.options.soda",
            "sublabel": "questions.alcohol.sub.soda",
            "emoji": "🥤"
          },
          {
            "value": "wine",
            "label": "questions.alcohol.options.wine",
            "sublabel": "questions.alcohol.sub.wine",
            "emoji": "🍷"
          },
          {
            "value": "beer",
            "label": "questions.alcohol.options.beer",
            "sublabel": "questions.alcohol.sub.beer",
            "emoji": "🍺"
          },
          {
            "value": "spirits",
            "label": "questions.alcohol.options.spirits",
            "sublabel": "questions.alcohol.sub.spirits",
            "emoji": "🥃"
          }
        ]
      },
      {
        "id": "lunchDays",
        "text": "questions.lunchDays.text",
        "info": "questions.lunchDays.info",
        "type": "weekDistribution",
        "maxDays": 7,
        "allowDouble": false,
        "options": [
          {
            "value": "9a",
            "label": "questions.lunchDays.options.9a"
          },
          {
            "value": "9b",
            "label": "questions.lunchDays.options.9b"
          },
          {
            "value": "9c",
            "label": "questions.lunchDays.options.9c"
          },
          {
            "value": "9d",
            "label": "questions.lunchDays.options.9d"
          },
          {
            "value": "9e",
            "label": "questions.lunchDays.options.9e"
          },
          {
            "value": "none",
            "label": "questions.lunchDays.options.none"
          }
        ]
      },
      {
        "id": "dinnerDays",
        "text": "questions.dinnerDays.text",
        "info": "questions.dinnerDays.info",
        "type": "weekDistribution",
        "maxDays": 7,
        "allowDouble": false,
        "options": [
          {
            "value": "10a",
            "label": "questions.dinnerDays.options.10a"
          },
          {
            "value": "10b",
            "label": "questions.dinnerDays.options.10b"
          },
          {
            "value": "10c",
            "label": "questions.dinnerDays.options.10c"
          },
          {
            "value": "10d",
            "label": "questions.dinnerDays.options.10d"
          },
          {
            "value": "10e",
            "label": "questions.dinnerDays.options.10e"
          },
          {
            "value": "none",
            "label": "questions.dinnerDays.options.none"
          }
        ]
      },
      {
        "id": "bottledWater",
        "text": "questions.bottledWater.text",
        "info": "questions.bottledWater.info",
        "type": "single",
        "options": [
          {
            "value": "13a",
            "label": "questions.bottledWater.options.13a"
          },
          {
            "value": "13b",
            "label": "questions.bottledWater.options.13b"
          },
          {
            "value": "13c",
            "label": "questions.bottledWater.options.13c"
          }
        ]
      },
      {
        "id": "foodHabits",
        "text": "questions.foodHabits.text",
        "info": "questions.foodHabits.info",
        "type": "multi",
        "noneValue": "none",
        "options": [
          {
            "value": "localFood",
            "label": "questions.foodHabits.options.localFood"
          },
          {
            "value": "composting",
            "label": "questions.foodHabits.options.composting"
          },
          {
            "value": "noFoodWaste",
            "label": "questions.foodHabits.options.noFoodWaste"
          },
          {
            "value": "none",
            "label": "questions.foodHabits.options.none"
          }
        ]
      },
      {
        "id": "deliveryPerWeek",
        "text": "questions.deliveryPerWeek.text",
        "info": "questions.deliveryPerWeek.info",
        "type": "stepper",
        "min": 0,
        "max": 20
      }
    ]
  },
  {
    "areaId": "consumption",
    "areaLabel": "areas.consumption",
    "areaColor": "#b07a30",
    "questions": [
      {
        "id": "clothes",
        "text": "questions.clothes.text",
        "info": "questions.clothes.info",
        "type": "single",
        "options": [
          {
            "value": "15a",
            "label": "questions.clothes.options.15a"
          },
          {
            "value": "15b",
            "label": "questions.clothes.options.15b"
          },
          {
            "value": "15c",
            "label": "questions.clothes.options.15c"
          },
          {
            "value": "15d",
            "label": "questions.clothes.options.15d"
          },
          {
            "value": "15e",
            "label": "questions.clothes.options.15e"
          },
          {
            "value": "15f",
            "label": "questions.clothes.options.15f"
          },
          {
            "value": "15g",
            "label": "questions.clothes.options.15g"
          }
        ]
      },
      {
        "id": "electronics",
        "text": "questions.electronics.text",
        "info": "questions.electronics.info",
        "type": "multi",
        "noneValue": "16i",
        "options": [
          {
            "value": "16a",
            "label": "questions.electronics.options.16a"
          },
          {
            "value": "16b",
            "label": "questions.electronics.options.16b"
          },
          {
            "value": "16c",
            "label": "questions.electronics.options.16c"
          },
          {
            "value": "16d",
            "label": "questions.electronics.options.16d"
          },
          {
            "value": "16e",
            "label": "questions.electronics.options.16e"
          },
          {
            "value": "16f",
            "label": "questions.electronics.options.16f"
          },
          {
            "value": "16g",
            "label": "questions.electronics.options.16g"
          },
          {
            "value": "16h",
            "label": "questions.electronics.options.16h"
          },
          {
            "value": "16i",
            "label": "questions.electronics.options.16i"
          }
        ]
      },
      {
        "id": "appliances",
        "text": "questions.appliances.text",
        "info": "questions.appliances.info",
        "type": "multi",
        "noneValue": "19i",
        "options": [
          {
            "value": "19a",
            "label": "questions.appliances.options.19a"
          },
          {
            "value": "19b",
            "label": "questions.appliances.options.19b"
          },
          {
            "value": "19c",
            "label": "questions.appliances.options.19c"
          },
          {
            "value": "19d",
            "label": "questions.appliances.options.19d"
          },
          {
            "value": "19e",
            "label": "questions.appliances.options.19e"
          },
          {
            "value": "19f",
            "label": "questions.appliances.options.19f"
          },
          {
            "value": "19g",
            "label": "questions.appliances.options.19g"
          },
          {
            "value": "19h",
            "label": "questions.appliances.options.19h"
          },
          {
            "value": "19i",
            "label": "questions.appliances.options.19i"
          }
        ]
      },
      {
        "id": "pets",
        "text": "questions.pets.text",
        "info": "questions.pets.info",
        "type": "multi",
        "noneValue": "none",
        "options": [
          {
            "value": "bigDog",
            "label": "questions.pets.options.bigDog"
          },
          {
            "value": "medDog",
            "label": "questions.pets.options.medDog"
          },
          {
            "value": "smallDog",
            "label": "questions.pets.options.smallDog"
          },
          {
            "value": "cat",
            "label": "questions.pets.options.cat"
          },
          {
            "value": "none",
            "label": "questions.pets.options.none"
          }
        ]
      },
      {
        "id": "hygiene",
        "text": "questions.hygiene.text",
        "info": "questions.hygiene.info",
        "type": "single",
        "options": [
          {
            "value": "22a",
            "label": "questions.hygiene.options.22a"
          },
          {
            "value": "22b",
            "label": "questions.hygiene.options.22b"
          },
          {
            "value": "22c",
            "label": "questions.hygiene.options.22c"
          }
        ]
      },
      {
        "id": "smoking",
        "text": "questions.smoking.text",
        "type": "single",
        "options": [
          {
            "value": "23a",
            "label": "questions.smoking.options.23a"
          },
          {
            "value": "23b",
            "label": "questions.smoking.options.23b"
          },
          {
            "value": "23c",
            "label": "questions.smoking.options.23c"
          },
          {
            "value": "23d",
            "label": "questions.smoking.options.23d"
          },
          {
            "value": "23e",
            "label": "questions.smoking.options.23e"
          }
        ]
      },
      {
        "id": "sports",
        "text": "questions.sports.text",
        "info": "questions.sports.info",
        "type": "multi",
        "noneValue": "none",
        "options": [
          {
            "value": "outdoor",
            "label": "questions.sports.options.outdoor"
          },
          {
            "value": "cycling",
            "label": "questions.sports.options.cycling"
          },
          {
            "value": "racket",
            "label": "questions.sports.options.racket"
          },
          {
            "value": "pool",
            "label": "questions.sports.options.pool"
          },
          {
            "value": "gym",
            "label": "questions.sports.options.gym"
          },
          {
            "value": "fitness",
            "label": "questions.sports.options.fitness"
          },
          {
            "value": "martial",
            "label": "questions.sports.options.martial"
          },
          {
            "value": "athletics",
            "label": "questions.sports.options.athletics"
          },
          {
            "value": "equestrian",
            "label": "questions.sports.options.equestrian"
          },
          {
            "value": "golf",
            "label": "questions.sports.options.golf"
          },
          {
            "value": "nautical",
            "label": "questions.sports.options.nautical"
          },
          {
            "value": "ski",
            "label": "questions.sports.options.ski"
          },
          {
            "value": "motor",
            "label": "questions.sports.options.motor"
          },
          {
            "value": "climbing",
            "label": "questions.sports.options.climbing"
          },
          {
            "value": "none",
            "label": "questions.sports.options.none"
          }
        ]
      }
    ]
  },
  {
    "areaId": "waste",
    "areaLabel": "areas.waste",
    "areaColor": "#7a7aaa",
    "questions": [
      {
        "id": "videoCalls",
        "text": "questions.videoCalls.text",
        "type": "single",
        "options": [
          {
            "value": "vc_none",
            "label": "questions.videoCalls.options.vc_none"
          },
          {
            "value": "vc_sometimes",
            "label": "questions.videoCalls.options.vc_sometimes"
          },
          {
            "value": "vc_often",
            "label": "questions.videoCalls.options.vc_often"
          },
          {
            "value": "vc_lots",
            "label": "questions.videoCalls.options.vc_lots"
          }
        ]
      },
      {
        "id": "streaming",
        "text": "questions.streaming.text",
        "type": "single",
        "options": [
          {
            "value": "st_none",
            "label": "questions.streaming.options.st_none"
          },
          {
            "value": "st_little",
            "label": "questions.streaming.options.st_little"
          },
          {
            "value": "st_often",
            "label": "questions.streaming.options.st_often"
          },
          {
            "value": "st_lots",
            "label": "questions.streaming.options.st_lots"
          }
        ]
      },
      {
        "id": "socialMedia",
        "text": "questions.socialMedia.text",
        "type": "single",
        "options": [
          {
            "value": "sm_none",
            "label": "questions.socialMedia.options.sm_none"
          },
          {
            "value": "sm_little",
            "label": "questions.socialMedia.options.sm_little"
          },
          {
            "value": "sm_often",
            "label": "questions.socialMedia.options.sm_often"
          },
          {
            "value": "sm_lots",
            "label": "questions.socialMedia.options.sm_lots"
          }
        ]
      },
      {
        "id": "aiUsage",
        "text": "questions.aiUsage.text",
        "info": "questions.aiUsage.info",
        "type": "single",
        "options": [
          {
            "value": "none",
            "label": "questions.aiUsage.options.none"
          },
          {
            "value": "low",
            "label": "questions.aiUsage.options.low"
          },
          {
            "value": "medium",
            "label": "questions.aiUsage.options.medium"
          },
          {
            "value": "high",
            "label": "questions.aiUsage.options.high"
          }
        ]
      }
    ]
  }
]
