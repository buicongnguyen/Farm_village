// Original Willowmere layouts, adapted for Hollowbrook. Build-time data only; see docs/ASSETS.md.
export const CIVIC_PLANS = {
  "hospital": {
    "rooms": [
      {
        "id": "exam1",
        "name": "Exam room 1",
        "rect": {
          "x0": -9.8,
          "x1": -3.4,
          "z0": -8.4,
          "z1": -2
        },
        "pattern": "tiles"
      },
      {
        "id": "exam2",
        "name": "Exam room 2",
        "rect": {
          "x0": -3.4,
          "x1": 3,
          "z0": -8.4,
          "z1": -2
        },
        "pattern": "tiles"
      },
      {
        "id": "pharm",
        "name": "Pharmacy",
        "rect": {
          "x0": 3,
          "x1": 9.8,
          "z0": -8.4,
          "z1": -2
        },
        "pattern": "tiles"
      },
      {
        "id": "wait",
        "name": "Waiting room",
        "rect": {
          "x0": -9.8,
          "x1": 4,
          "z0": -2,
          "z1": 8.4
        },
        "pattern": "planks"
      },
      {
        "id": "recep",
        "name": "Reception",
        "rect": {
          "x0": 4,
          "x1": 9.8,
          "z0": -2,
          "z1": 8.4
        },
        "pattern": "tiles"
      }
    ],
    "walls": [
      {
        "axis": "x",
        "at": -8.4,
        "from": -9.91,
        "to": 9.91,
        "height": "full",
        "gaps": []
      },
      {
        "axis": "x",
        "at": 8.4,
        "from": -9.91,
        "to": 9.91,
        "height": "low",
        "gaps": [
          [
            -1.05,
            1.05
          ]
        ]
      },
      {
        "axis": "z",
        "at": -9.8,
        "from": -8.4,
        "to": 8.4,
        "height": "full",
        "gaps": []
      },
      {
        "axis": "z",
        "at": 9.8,
        "from": -8.4,
        "to": 8.4,
        "height": "full",
        "gaps": []
      },
      {
        "axis": "x",
        "at": -2,
        "from": -9.8,
        "to": 9.8,
        "height": "low",
        "gaps": [
          [
            -7.4,
            -5.6
          ],
          [
            -1,
            0.8
          ],
          [
            5.6,
            7.4
          ]
        ]
      },
      {
        "axis": "z",
        "at": -3.4,
        "from": -8.4,
        "to": -2,
        "height": "full",
        "gaps": []
      },
      {
        "axis": "z",
        "at": 3,
        "from": -8.4,
        "to": -2,
        "height": "full",
        "gaps": []
      },
      {
        "axis": "z",
        "at": 4,
        "from": -2,
        "to": 8.4,
        "height": "low",
        "gaps": [
          [
            2,
            5
          ]
        ]
      }
    ],
    "palette": {
      "walls": {
        "exam1": "#d8f4ff",
        "exam2": "#c9f0e4",
        "pharm": "#e0f7e9",
        "wait": "#fff6d8",
        "recep": "#ffe4ef"
      },
      "floors": {
        "exam1": [
          "#ffffff",
          "#bfe3ff"
        ],
        "exam2": [
          "#ffffff",
          "#b8efd8"
        ],
        "pharm": [
          "#ffffff",
          "#c9eec9"
        ],
        "wait": [
          "#e0b27a",
          "#d2a06a"
        ],
        "recep": [
          "#ffffff",
          "#ffc4d8"
        ]
      },
      "trim": "#2fa6a0"
    },
    "pieces": [
      {
        "kit": "window",
        "x": -6.6,
        "z": -8.26,
        "rot": 0,
        "s": 1,
        "y": 2,
        "hang": true,
        "glow": true,
        "block": false
      },
      {
        "kit": "window",
        "x": 0.2,
        "z": -8.26,
        "rot": 0,
        "s": 1,
        "y": 2,
        "hang": true,
        "glow": true,
        "block": false
      },
      {
        "kit": "window",
        "x": 6.2,
        "z": -8.26,
        "rot": 0,
        "s": 1,
        "y": 2,
        "hang": true,
        "glow": true,
        "block": false
      },
      {
        "kit": "window",
        "x": 9.66,
        "z": 5,
        "rot": -1.5707963267948966,
        "s": 1,
        "y": 2,
        "hang": true,
        "glow": true,
        "block": false
      },
      {
        "kit": "window",
        "x": -9.66,
        "z": 5,
        "rot": 1.5707963267948966,
        "s": 1,
        "y": 2,
        "hang": true,
        "glow": true,
        "block": false
      },
      {
        "kit": "fp_hospitalbed",
        "x": -8,
        "z": -7,
        "rot": 0,
        "s": 1,
        "y": 0,
        "role": "bed1"
      },
      {
        "kit": "fp_curtain",
        "x": -6.5,
        "z": -6.5,
        "rot": 1.5707963267948966,
        "s": 0.9,
        "y": 0,
        "role": "bed1"
      },
      {
        "kit": "fp_ivstand",
        "x": -7.1,
        "z": -7.9,
        "rot": 0,
        "s": 1,
        "y": 0
      },
      {
        "kit": "sink",
        "x": -9.4,
        "z": -4,
        "rot": 1.5707963267948966,
        "s": 1,
        "y": 0
      },
      {
        "kit": "plant_small",
        "x": -4,
        "z": -3,
        "rot": 0,
        "s": 1,
        "y": 0
      },
      {
        "kit": "fp_hospitalbed",
        "x": 1.8,
        "z": -7,
        "rot": 0,
        "s": 1,
        "y": 0,
        "role": "bed2"
      },
      {
        "kit": "fp_curtain",
        "x": 0.2,
        "z": -6.5,
        "rot": 1.5707963267948966,
        "s": 0.9,
        "y": 0,
        "role": "bed2"
      },
      {
        "kit": "desk",
        "x": -2.2,
        "z": -7.5,
        "rot": 0,
        "s": 0.8,
        "y": 0
      },
      {
        "kit": "floor_lamp",
        "x": -2.9,
        "z": -3.2,
        "rot": 0,
        "s": 1,
        "y": 0,
        "glow": true
      },
      {
        "kit": "plant_big",
        "x": 2.6,
        "z": -3,
        "rot": 0,
        "s": 1,
        "y": 0
      },
      {
        "kit": "fp_scale",
        "x": -1.4,
        "z": -4.4,
        "rot": 0,
        "s": 1,
        "y": 0,
        "role": "scale"
      },
      {
        "kit": "fp_eyechart",
        "x": -3.26,
        "z": -5.4,
        "rot": 1.5707963267948966,
        "s": 1,
        "y": 1.9,
        "hang": true,
        "block": false,
        "role": "chart"
      },
      {
        "kit": "fp_medcabinet",
        "x": 4.2,
        "z": -8,
        "rot": 0,
        "s": 0.9,
        "y": 0,
        "role": "pharmacy"
      },
      {
        "kit": "fp_medcabinet",
        "x": 6,
        "z": -8,
        "rot": 0,
        "s": 0.9,
        "y": 0,
        "role": "pharmacy"
      },
      {
        "kit": "fp_medcabinet",
        "x": 7.8,
        "z": -8,
        "rot": 0,
        "s": 0.9,
        "y": 0,
        "role": "pharmacy"
      },
      {
        "kit": "counter",
        "x": 8.3,
        "z": -4.6,
        "rot": 0,
        "s": 0.65,
        "y": 0,
        "role": "pharmacy"
      },
      {
        "kit": "fridge",
        "x": 3.7,
        "z": -4.5,
        "rot": 1.5707963267948966,
        "s": 1,
        "y": 0
      },
      {
        "kit": "fp_waitbench",
        "x": -7.6,
        "z": 1,
        "rot": 0,
        "s": 0.9,
        "y": 0
      },
      {
        "kit": "fp_waitbench",
        "x": -4.4,
        "z": 1,
        "rot": 0,
        "s": 0.9,
        "y": 0
      },
      {
        "kit": "fp_waitbench",
        "x": -7.6,
        "z": 4.2,
        "rot": 0,
        "s": 0.9,
        "y": 0
      },
      {
        "kit": "fp_waitbench",
        "x": -4.4,
        "z": 4.2,
        "rot": 0,
        "s": 0.9,
        "y": 0
      },
      {
        "kit": "coffee_table",
        "x": -6,
        "z": 2.6,
        "rot": 0,
        "s": 0.9,
        "y": 0,
        "role": "mags"
      },
      {
        "kit": "books",
        "x": -6,
        "z": 2.6,
        "rot": 0,
        "s": 1,
        "y": 0.6,
        "block": false,
        "role": "mags"
      },
      {
        "kit": "plant_big",
        "x": -9,
        "z": 7.4,
        "rot": 0,
        "s": 1,
        "y": 0
      },
      {
        "kit": "plant_big",
        "x": -2.9,
        "z": 7.4,
        "rot": 0,
        "s": 1,
        "y": 0
      },
      {
        "kit": "plant_big",
        "x": 3.4,
        "z": 7.4,
        "rot": 0,
        "s": 1,
        "y": 0
      },
      {
        "kit": "welcome_mat",
        "x": 0,
        "z": 7.7,
        "rot": 0,
        "s": 1,
        "y": 0.012,
        "block": false
      },
      {
        "kit": "picture",
        "x": -9.66,
        "z": 3,
        "rot": 1.5707963267948966,
        "s": 1,
        "y": 2.2,
        "hang": true,
        "block": false
      },
      {
        "kit": "fp_clock",
        "x": -9.66,
        "z": 5.8,
        "rot": 1.5707963267948966,
        "s": 1,
        "y": 2.4,
        "hang": true,
        "block": false
      },
      {
        "kit": "counter",
        "x": 7.4,
        "z": 1.6,
        "rot": 0,
        "s": 0.65,
        "y": 0,
        "role": "reception"
      },
      {
        "kit": "fp_register",
        "x": 7.4,
        "z": 1.6,
        "rot": 0,
        "s": 0.9,
        "y": 0.93,
        "block": false
      },
      {
        "kit": "plant_big",
        "x": 9.2,
        "z": 5.4,
        "rot": 0,
        "s": 1,
        "y": 0
      }
    ]
  },
  "police": {
    "rooms": [
      {
        "id": "cell1",
        "name": "Cell 1",
        "rect": {
          "x0": -9.8,
          "x1": -5.4,
          "z0": -8.4,
          "z1": -2
        },
        "pattern": "tiles"
      },
      {
        "id": "cell2",
        "name": "Cell 2",
        "rect": {
          "x0": -5.4,
          "x1": -1,
          "z0": -8.4,
          "z1": -2
        },
        "pattern": "tiles"
      },
      {
        "id": "evid",
        "name": "Evidence room",
        "rect": {
          "x0": -1,
          "x1": 3.4,
          "z0": -8.4,
          "z1": -2
        },
        "pattern": "tiles"
      },
      {
        "id": "office",
        "name": "Office",
        "rect": {
          "x0": 3.4,
          "x1": 9.8,
          "z0": -8.4,
          "z1": -2
        },
        "pattern": "planks"
      },
      {
        "id": "lobby",
        "name": "Front desk",
        "rect": {
          "x0": -9.8,
          "x1": 9.8,
          "z0": -2,
          "z1": 8.4
        },
        "pattern": "tiles"
      }
    ],
    "walls": [
      {
        "axis": "x",
        "at": -8.4,
        "from": -9.91,
        "to": 9.91,
        "height": "full",
        "gaps": []
      },
      {
        "axis": "x",
        "at": 8.4,
        "from": -9.91,
        "to": 9.91,
        "height": "low",
        "gaps": [
          [
            -1.05,
            1.05
          ]
        ]
      },
      {
        "axis": "z",
        "at": -9.8,
        "from": -8.4,
        "to": 8.4,
        "height": "full",
        "gaps": []
      },
      {
        "axis": "z",
        "at": 9.8,
        "from": -8.4,
        "to": 8.4,
        "height": "full",
        "gaps": []
      },
      {
        "axis": "x",
        "at": -2,
        "from": -9.8,
        "to": 9.8,
        "height": "low",
        "gaps": [
          [
            0.2,
            2
          ],
          [
            5.2,
            7
          ]
        ]
      },
      {
        "axis": "z",
        "at": -5.4,
        "from": -8.4,
        "to": -2,
        "height": "full",
        "gaps": []
      },
      {
        "axis": "z",
        "at": -1,
        "from": -8.4,
        "to": -2,
        "height": "full",
        "gaps": []
      },
      {
        "axis": "z",
        "at": 3.4,
        "from": -8.4,
        "to": -2,
        "height": "full",
        "gaps": []
      }
    ],
    "palette": {
      "walls": {
        "cell1": "#b8c8ee",
        "cell2": "#b8c8ee",
        "evid": "#d0d6e0",
        "office": "#ffe0b0",
        "lobby": "#cfe0ff"
      },
      "floors": {
        "cell1": [
          "#e6ebf5",
          "#9fb2d6"
        ],
        "cell2": [
          "#e6ebf5",
          "#9fb2d6"
        ],
        "evid": [
          "#eef0f5",
          "#aeb8cc"
        ],
        "office": [
          "#d9a066",
          "#c99158"
        ],
        "lobby": [
          "#f3f6ff",
          "#9fb2d6"
        ]
      },
      "trim": "#2f4c86"
    },
    "pieces": [
      {
        "kit": "window",
        "x": -7,
        "z": -8.26,
        "rot": 0,
        "s": 1,
        "y": 2,
        "hang": true,
        "glow": true,
        "block": false
      },
      {
        "kit": "window",
        "x": 0.6,
        "z": -8.26,
        "rot": 0,
        "s": 1,
        "y": 2,
        "hang": true,
        "glow": true,
        "block": false
      },
      {
        "kit": "window",
        "x": 6.6,
        "z": -8.26,
        "rot": 0,
        "s": 1,
        "y": 2,
        "hang": true,
        "glow": true,
        "block": false
      },
      {
        "kit": "window",
        "x": 9.66,
        "z": 5,
        "rot": -1.5707963267948966,
        "s": 1,
        "y": 2,
        "hang": true,
        "glow": true,
        "block": false
      },
      {
        "kit": "window",
        "x": -9.66,
        "z": 5,
        "rot": 1.5707963267948966,
        "s": 1,
        "y": 2,
        "hang": true,
        "glow": true,
        "block": false
      },
      {
        "kit": "fp_cellbars",
        "x": -8.7,
        "z": -2,
        "rot": 0,
        "s": 0.75,
        "y": 0,
        "role": "cells"
      },
      {
        "kit": "fp_cellbars",
        "x": -6.5,
        "z": -2,
        "rot": 0,
        "s": 0.75,
        "y": 0,
        "role": "cells"
      },
      {
        "kit": "fp_cellbars",
        "x": -4.3,
        "z": -2,
        "rot": 0,
        "s": 0.75,
        "y": 0,
        "role": "cells"
      },
      {
        "kit": "fp_cellbars",
        "x": -2.1,
        "z": -2,
        "rot": 0,
        "s": 0.75,
        "y": 0,
        "role": "cells"
      },
      {
        "kit": "fp_cellbed",
        "x": -8.9,
        "z": -6.8,
        "rot": 0,
        "s": 1,
        "y": 0,
        "role": "cells"
      },
      {
        "kit": "sink",
        "x": -6.6,
        "z": -7.8,
        "rot": 0,
        "s": 1,
        "y": 0,
        "role": "cells"
      },
      {
        "kit": "stool",
        "x": -7.4,
        "z": -4.4,
        "rot": 0,
        "s": 1,
        "y": 0
      },
      {
        "kit": "fp_cellbed",
        "x": -4.4,
        "z": -6.8,
        "rot": 0,
        "s": 1,
        "y": 0,
        "role": "cells"
      },
      {
        "kit": "sink",
        "x": -2.2,
        "z": -7.8,
        "rot": 0,
        "s": 1,
        "y": 0,
        "role": "cells"
      },
      {
        "kit": "fp_evidenceshelf",
        "x": 0.1,
        "z": -8,
        "rot": 0,
        "s": 0.9,
        "y": 0,
        "role": "evidence"
      },
      {
        "kit": "fp_evidenceshelf",
        "x": 2.2,
        "z": -8,
        "rot": 0,
        "s": 0.9,
        "y": 0,
        "role": "evidence"
      },
      {
        "kit": "fp_boxes",
        "x": 0.2,
        "z": -5.2,
        "rot": 0,
        "s": 0.8,
        "y": 0,
        "role": "evidence"
      },
      {
        "kit": "fp_crate",
        "x": 2.6,
        "z": -5,
        "rot": 0,
        "s": 1,
        "y": 0,
        "role": "evidence"
      },
      {
        "kit": "desk",
        "x": 5.2,
        "z": -5.6,
        "rot": 0,
        "s": 0.9,
        "y": 0,
        "role": "desks"
      },
      {
        "kit": "chair",
        "x": 5.2,
        "z": -7,
        "rot": 0,
        "s": 1,
        "y": 0
      },
      {
        "kit": "desk",
        "x": 8,
        "z": -5.6,
        "rot": 0,
        "s": 0.9,
        "y": 0,
        "role": "desks"
      },
      {
        "kit": "chair",
        "x": 8,
        "z": -7,
        "rot": 0,
        "s": 1,
        "y": 0
      },
      {
        "kit": "fp_noticeboard",
        "x": 6.7,
        "z": -8.3,
        "rot": 0,
        "s": 0.9,
        "y": 1.9,
        "hang": true,
        "block": false,
        "role": "notice"
      },
      {
        "kit": "fp_filecabinet",
        "x": 4.2,
        "z": -8,
        "rot": 0,
        "s": 1,
        "y": 0
      },
      {
        "kit": "fp_filecabinet",
        "x": 9.2,
        "z": -8,
        "rot": 0,
        "s": 1,
        "y": 0
      },
      {
        "kit": "plant_small",
        "x": 4,
        "z": -3,
        "rot": 0,
        "s": 1,
        "y": 0
      },
      {
        "kit": "counter",
        "x": -5.5,
        "z": 1.4,
        "rot": 0,
        "s": 0.75,
        "y": 0,
        "role": "desk"
      },
      {
        "kit": "radio",
        "x": -4.8,
        "z": 1.4,
        "rot": 0,
        "s": 1,
        "y": 1.08,
        "block": false
      },
      {
        "kit": "fp_bell",
        "x": -6.3,
        "z": 1.5,
        "rot": 0,
        "s": 1,
        "y": 1.08,
        "block": false,
        "role": "bell"
      },
      {
        "kit": "fp_basket",
        "x": -8.6,
        "z": 4.6,
        "rot": 0,
        "s": 1,
        "y": 0,
        "role": "found"
      },
      {
        "kit": "fp_waitbench",
        "x": 5.8,
        "z": 3.6,
        "rot": 0,
        "s": 0.9,
        "y": 0
      },
      {
        "kit": "fp_waitbench",
        "x": 8.2,
        "z": 3.6,
        "rot": 0,
        "s": 0.9,
        "y": 0
      },
      {
        "kit": "plant_big",
        "x": -9.2,
        "z": 7.4,
        "rot": 0,
        "s": 1,
        "y": 0
      },
      {
        "kit": "plant_big",
        "x": 9,
        "z": 7.4,
        "rot": 0,
        "s": 1,
        "y": 0
      },
      {
        "kit": "plant_big",
        "x": 3,
        "z": 7.4,
        "rot": 0,
        "s": 1,
        "y": 0
      },
      {
        "kit": "welcome_mat",
        "x": 0,
        "z": 7.7,
        "rot": 0,
        "s": 1,
        "y": 0.012,
        "block": false
      },
      {
        "kit": "picture",
        "x": -9.66,
        "z": 4,
        "rot": 1.5707963267948966,
        "s": 1,
        "y": 2.2,
        "hang": true,
        "block": false
      },
      {
        "kit": "fp_clock",
        "x": 9.66,
        "z": 3,
        "rot": -1.5707963267948966,
        "s": 1,
        "y": 2.4,
        "hang": true,
        "block": false
      }
    ]
  },
  "company": {
    "rooms": [
      {
        "id": "boss",
        "name": "Boss office",
        "rect": {
          "x0": -9.8,
          "x1": -4.4,
          "z0": -8.4,
          "z1": -2
        },
        "pattern": "planks"
      },
      {
        "id": "meet",
        "name": "Meeting room",
        "rect": {
          "x0": -4.4,
          "x1": 2.6,
          "z0": -8.4,
          "z1": -2
        },
        "pattern": "planks"
      },
      {
        "id": "brk",
        "name": "Break room",
        "rect": {
          "x0": 2.6,
          "x1": 9.8,
          "z0": -8.4,
          "z1": -2
        },
        "pattern": "planks"
      },
      {
        "id": "open",
        "name": "Open office",
        "rect": {
          "x0": -9.8,
          "x1": 9.8,
          "z0": -2,
          "z1": 8.4
        },
        "pattern": "tiles"
      }
    ],
    "walls": [
      {
        "axis": "x",
        "at": -8.4,
        "from": -9.91,
        "to": 9.91,
        "height": "full",
        "gaps": []
      },
      {
        "axis": "x",
        "at": 8.4,
        "from": -9.91,
        "to": 9.91,
        "height": "low",
        "gaps": [
          [
            -1.05,
            1.05
          ]
        ]
      },
      {
        "axis": "z",
        "at": -9.8,
        "from": -8.4,
        "to": 8.4,
        "height": "full",
        "gaps": []
      },
      {
        "axis": "z",
        "at": 9.8,
        "from": -8.4,
        "to": 8.4,
        "height": "full",
        "gaps": []
      },
      {
        "axis": "x",
        "at": -2,
        "from": -9.8,
        "to": 9.8,
        "height": "low",
        "gaps": [
          [
            -8,
            -6.2
          ],
          [
            -2,
            -0.4
          ],
          [
            5,
            6.8
          ]
        ]
      },
      {
        "axis": "z",
        "at": -4.4,
        "from": -8.4,
        "to": -2,
        "height": "full",
        "gaps": []
      },
      {
        "axis": "z",
        "at": 2.6,
        "from": -8.4,
        "to": -2,
        "height": "full",
        "gaps": []
      }
    ],
    "palette": {
      "walls": {
        "boss": "#e1d3ff",
        "meet": "#d5ecff",
        "brk": "#ffe3c0",
        "open": "#fff6e0"
      },
      "floors": {
        "boss": [
          "#b9794a",
          "#ad6e40"
        ],
        "meet": [
          "#c79a6b",
          "#b88a5c"
        ],
        "brk": [
          "#fff3dc",
          "#ffb48a"
        ],
        "open": [
          "#eef3ff",
          "#c5d3f2"
        ]
      },
      "trim": "#ff8a2a"
    },
    "pieces": [
      {
        "kit": "window",
        "x": -7,
        "z": -8.26,
        "rot": 0,
        "s": 1,
        "y": 2,
        "hang": true,
        "glow": true,
        "block": false
      },
      {
        "kit": "window",
        "x": -1,
        "z": -8.26,
        "rot": 0,
        "s": 1,
        "y": 2,
        "hang": true,
        "glow": true,
        "block": false
      },
      {
        "kit": "window",
        "x": 6.2,
        "z": -8.26,
        "rot": 0,
        "s": 1,
        "y": 2,
        "hang": true,
        "glow": true,
        "block": false
      },
      {
        "kit": "window",
        "x": 9.66,
        "z": 5.2,
        "rot": -1.5707963267948966,
        "s": 1,
        "y": 2,
        "hang": true,
        "glow": true,
        "block": false
      },
      {
        "kit": "window",
        "x": -9.66,
        "z": 5.2,
        "rot": 1.5707963267948966,
        "s": 1,
        "y": 2,
        "hang": true,
        "glow": true,
        "block": false
      },
      {
        "kit": "bookshelf",
        "x": -8.8,
        "z": -7.9,
        "rot": 0,
        "s": 1,
        "y": 0,
        "role": "boss"
      },
      {
        "kit": "desk",
        "x": -6.4,
        "z": -5.4,
        "rot": 0,
        "s": 0.9,
        "y": 0,
        "role": "boss"
      },
      {
        "kit": "chair",
        "x": -6.4,
        "z": -6.6,
        "rot": 0,
        "s": 1,
        "y": 0
      },
      {
        "kit": "plant_big",
        "x": -5.1,
        "z": -3.1,
        "rot": 0,
        "s": 1,
        "y": 0
      },
      {
        "kit": "trophy",
        "x": -9,
        "z": -3.4,
        "rot": 0,
        "s": 1.2,
        "y": 0
      },
      {
        "kit": "fp_meetingtable",
        "x": -0.9,
        "z": -5.8,
        "rot": 0,
        "s": 0.9,
        "y": 0,
        "role": "meeting"
      },
      {
        "kit": "chair",
        "x": -2.2,
        "z": -4.55,
        "rot": 3.141592653589793,
        "s": 1,
        "y": 0
      },
      {
        "kit": "chair",
        "x": -0.9,
        "z": -4.55,
        "rot": 3.141592653589793,
        "s": 1,
        "y": 0
      },
      {
        "kit": "chair",
        "x": 0.4,
        "z": -4.55,
        "rot": 3.141592653589793,
        "s": 1,
        "y": 0
      },
      {
        "kit": "chair",
        "x": -2.2,
        "z": -7,
        "rot": 0,
        "s": 1,
        "y": 0
      },
      {
        "kit": "chair",
        "x": -0.9,
        "z": -7,
        "rot": 0,
        "s": 1,
        "y": 0
      },
      {
        "kit": "chair",
        "x": 0.4,
        "z": -7,
        "rot": 0,
        "s": 1,
        "y": 0
      },
      {
        "kit": "fp_blackboard",
        "x": -0.9,
        "z": -8.3,
        "rot": 0,
        "s": 0.6,
        "y": 2.1,
        "hang": true,
        "block": false,
        "role": "white"
      },
      {
        "kit": "plant_big",
        "x": 2.1,
        "z": -3.1,
        "rot": 0,
        "s": 1,
        "y": 0
      },
      {
        "kit": "floor_lamp",
        "x": -3.9,
        "z": -3,
        "rot": 0,
        "s": 1,
        "y": 0,
        "glow": true
      },
      {
        "kit": "counter",
        "x": 4.4,
        "z": -7.9,
        "rot": 0,
        "s": 0.65,
        "y": 0,
        "role": "coffee"
      },
      {
        "kit": "fp_coffee",
        "x": 4.8,
        "z": -7.9,
        "rot": 0,
        "s": 1.1,
        "y": 0.93,
        "block": false,
        "role": "coffee"
      },
      {
        "kit": "fridge",
        "x": 6.3,
        "z": -7.9,
        "rot": 0,
        "s": 1,
        "y": 0,
        "role": "break"
      },
      {
        "kit": "fp_watercooler",
        "x": 7.9,
        "z": -7.9,
        "rot": 0,
        "s": 1,
        "y": 0,
        "role": "cooler"
      },
      {
        "kit": "fp_printer",
        "x": 0,
        "z": 0.8,
        "rot": 0,
        "s": 1,
        "y": 0,
        "role": "printer"
      },
      {
        "kit": "fp_suggestbox",
        "x": -2.2,
        "z": 7.2,
        "rot": 0,
        "s": 1,
        "y": 0,
        "role": "box"
      },
      {
        "kit": "fp_noticeboard",
        "x": 9.66,
        "z": 4.6,
        "rot": -1.5707963267948966,
        "s": 0.8,
        "y": 1.9,
        "hang": true,
        "block": false,
        "role": "news"
      },
      {
        "kit": "sofa",
        "x": 9,
        "z": -5,
        "rot": -1.5707963267948966,
        "s": 1,
        "y": 0,
        "role": "break"
      },
      {
        "kit": "round_table",
        "x": 6,
        "z": -4.6,
        "rot": 0,
        "s": 0.9,
        "y": 0
      },
      {
        "kit": "stool",
        "x": 5,
        "z": -4.6,
        "rot": 0,
        "s": 1,
        "y": 0
      },
      {
        "kit": "stool",
        "x": 7,
        "z": -4.6,
        "rot": 0,
        "s": 1,
        "y": 0
      },
      {
        "kit": "fp_officedesk",
        "x": -6.9,
        "z": 1.2,
        "rot": 0,
        "s": 0.9,
        "y": 0,
        "role": "desks"
      },
      {
        "kit": "fp_officedesk",
        "x": -4.6,
        "z": 1.2,
        "rot": 0,
        "s": 0.9,
        "y": 0,
        "role": "desks"
      },
      {
        "kit": "fp_officedesk",
        "x": 4.6,
        "z": 1.2,
        "rot": 0,
        "s": 0.9,
        "y": 0,
        "role": "desks"
      },
      {
        "kit": "fp_officedesk",
        "x": 6.9,
        "z": 1.2,
        "rot": 0,
        "s": 0.9,
        "y": 0,
        "role": "desks"
      },
      {
        "kit": "fp_officedesk",
        "x": -6.9,
        "z": 4.4,
        "rot": 0,
        "s": 0.9,
        "y": 0,
        "role": "desks"
      },
      {
        "kit": "fp_officedesk",
        "x": -4.6,
        "z": 4.4,
        "rot": 0,
        "s": 0.9,
        "y": 0,
        "role": "desks"
      },
      {
        "kit": "fp_officedesk",
        "x": 4.6,
        "z": 4.4,
        "rot": 0,
        "s": 0.9,
        "y": 0,
        "role": "desks"
      },
      {
        "kit": "fp_officedesk",
        "x": 6.9,
        "z": 4.4,
        "rot": 0,
        "s": 0.9,
        "y": 0,
        "role": "shift"
      },
      {
        "kit": "chair",
        "x": -6.9,
        "z": 0.15,
        "rot": 0,
        "s": 1,
        "y": 0
      },
      {
        "kit": "chair",
        "x": -4.6,
        "z": 0.15,
        "rot": 0,
        "s": 1,
        "y": 0
      },
      {
        "kit": "chair",
        "x": 4.6,
        "z": 0.15,
        "rot": 0,
        "s": 1,
        "y": 0
      },
      {
        "kit": "chair",
        "x": 6.9,
        "z": 0.15,
        "rot": 0,
        "s": 1,
        "y": 0
      },
      {
        "kit": "chair",
        "x": -6.9,
        "z": 3.35,
        "rot": 0,
        "s": 1,
        "y": 0
      },
      {
        "kit": "chair",
        "x": -4.6,
        "z": 3.35,
        "rot": 0,
        "s": 1,
        "y": 0
      },
      {
        "kit": "chair",
        "x": 4.6,
        "z": 3.35,
        "rot": 0,
        "s": 1,
        "y": 0
      },
      {
        "kit": "chair",
        "x": 6.9,
        "z": 3.35,
        "rot": 0,
        "s": 1,
        "y": 0
      },
      {
        "kit": "fp_hiringboard",
        "x": -9.66,
        "z": 2.6,
        "rot": 1.5707963267948966,
        "s": 0.9,
        "y": 1.9,
        "hang": true,
        "block": false,
        "role": "board"
      },
      {
        "kit": "plant_big",
        "x": -9,
        "z": 7.4,
        "rot": 0,
        "s": 1,
        "y": 0
      },
      {
        "kit": "plant_big",
        "x": 9,
        "z": 7.4,
        "rot": 0,
        "s": 1,
        "y": 0
      },
      {
        "kit": "plant_big",
        "x": 3,
        "z": 7.4,
        "rot": 0,
        "s": 1,
        "y": 0,
        "role": "plant"
      },
      {
        "kit": "welcome_mat",
        "x": 0,
        "z": 7.7,
        "rot": 0,
        "s": 1,
        "y": 0.012,
        "block": false
      },
      {
        "kit": "fp_clock",
        "x": 9.66,
        "z": 1.6,
        "rot": -1.5707963267948966,
        "s": 1,
        "y": 2.4,
        "hang": true,
        "block": false
      }
    ]
  },
  "school": {
    "rooms": [
      {
        "id": "class1",
        "name": "Classroom",
        "rect": {
          "x0": -9.8,
          "x1": -2.2,
          "z0": -8.4,
          "z1": -2
        },
        "pattern": "planks"
      },
      {
        "id": "class2",
        "name": "Art room",
        "rect": {
          "x0": -2.2,
          "x1": 5.4,
          "z0": -8.4,
          "z1": -2
        },
        "pattern": "planks"
      },
      {
        "id": "library",
        "name": "Library corner",
        "rect": {
          "x0": 5.4,
          "x1": 9.8,
          "z0": -8.4,
          "z1": -2
        },
        "pattern": "planks"
      },
      {
        "id": "hall",
        "name": "Entrance hall",
        "rect": {
          "x0": -9.8,
          "x1": 4.2,
          "z0": -2,
          "z1": 8.4
        },
        "pattern": "tiles"
      },
      {
        "id": "yard",
        "name": "Schoolyard",
        "rect": {
          "x0": 4.2,
          "x1": 9.8,
          "z0": -2,
          "z1": 8.4
        },
        "pattern": "tiles"
      }
    ],
    "walls": [
      {
        "axis": "x",
        "at": -8.4,
        "from": -9.91,
        "to": 9.91,
        "height": "full",
        "gaps": []
      },
      {
        "axis": "x",
        "at": 8.4,
        "from": -9.91,
        "to": 9.91,
        "height": "low",
        "gaps": [
          [
            -1.05,
            1.05
          ]
        ]
      },
      {
        "axis": "z",
        "at": -9.8,
        "from": -8.4,
        "to": 8.4,
        "height": "full",
        "gaps": []
      },
      {
        "axis": "z",
        "at": 9.8,
        "from": -8.4,
        "to": 8.4,
        "height": "full",
        "gaps": []
      },
      {
        "axis": "x",
        "at": -2,
        "from": -9.8,
        "to": 9.8,
        "height": "low",
        "gaps": [
          [
            -4,
            -2.4
          ],
          [
            0.6,
            2.2
          ],
          [
            6.6,
            8.2
          ]
        ]
      },
      {
        "axis": "z",
        "at": -2.2,
        "from": -8.4,
        "to": -2,
        "height": "full",
        "gaps": []
      },
      {
        "axis": "z",
        "at": 5.4,
        "from": -8.4,
        "to": -2,
        "height": "full",
        "gaps": []
      },
      {
        "axis": "z",
        "at": 4.2,
        "from": -2,
        "to": 8.4,
        "height": "full",
        "gaps": [
          [
            3.4,
            5
          ]
        ]
      }
    ],
    "palette": {
      "walls": {
        "class1": "#ffe9a8",
        "class2": "#cfe6ff",
        "library": "#e5d4ff",
        "hall": "#ffd9c0",
        "yard": "#c9f0c0"
      },
      "floors": {
        "class1": [
          "#d99c5e",
          "#c98b50"
        ],
        "class2": [
          "#e0a467",
          "#d39457"
        ],
        "library": [
          "#b98650",
          "#a97844"
        ],
        "hall": [
          "#fff3dc",
          "#f0b9a0"
        ],
        "yard": [
          "#9be07a",
          "#7fd062"
        ]
      },
      "trim": "#a8683f"
    },
    "pieces": [
      {
        "kit": "window",
        "x": -8.4,
        "z": -8.26,
        "rot": 0,
        "s": 1,
        "y": 2,
        "hang": true,
        "glow": true,
        "block": false
      },
      {
        "kit": "window",
        "x": -3.9,
        "z": -8.26,
        "rot": 0,
        "s": 1,
        "y": 2,
        "hang": true,
        "glow": true,
        "block": false
      },
      {
        "kit": "window",
        "x": 2.2,
        "z": -8.26,
        "rot": 0,
        "s": 1,
        "y": 2,
        "hang": true,
        "glow": true,
        "block": false
      },
      {
        "kit": "window",
        "x": 9.66,
        "z": 6,
        "rot": -1.5707963267948966,
        "s": 1,
        "y": 2,
        "hang": true,
        "glow": true,
        "block": false
      },
      {
        "kit": "fp_blackboard",
        "x": -6,
        "z": -8.3,
        "rot": 0,
        "s": 0.9,
        "y": 1.95,
        "hang": true,
        "block": false,
        "role": "board"
      },
      {
        "kit": "desk",
        "x": -3.5,
        "z": -7,
        "rot": 0,
        "s": 0.9,
        "y": 0,
        "role": "teacher"
      },
      {
        "kit": "fp_schooldesk",
        "x": -8.8,
        "z": -5.4,
        "rot": 3.141592653589793,
        "s": 0.9,
        "y": 0,
        "role": "desks"
      },
      {
        "kit": "fp_schooldesk",
        "x": -6.9,
        "z": -5.4,
        "rot": 3.141592653589793,
        "s": 0.9,
        "y": 0,
        "role": "desks"
      },
      {
        "kit": "fp_schooldesk",
        "x": -5,
        "z": -5.4,
        "rot": 3.141592653589793,
        "s": 0.9,
        "y": 0,
        "role": "desks"
      },
      {
        "kit": "fp_schooldesk",
        "x": -8.8,
        "z": -3.7,
        "rot": 3.141592653589793,
        "s": 0.9,
        "y": 0,
        "role": "desks"
      },
      {
        "kit": "fp_schooldesk",
        "x": -6.9,
        "z": -3.7,
        "rot": 3.141592653589793,
        "s": 0.9,
        "y": 0,
        "role": "desks"
      },
      {
        "kit": "fp_schooldesk",
        "x": -5,
        "z": -3.7,
        "rot": 3.141592653589793,
        "s": 0.9,
        "y": 0,
        "role": "desks"
      },
      {
        "kit": "plant_big",
        "x": -9.2,
        "z": -3,
        "rot": 1.5707963267948966,
        "s": 1,
        "y": 0
      },
      {
        "kit": "fp_blackboard",
        "x": 1.6,
        "z": -8.3,
        "rot": 0,
        "s": 0.9,
        "y": 1.95,
        "hang": true,
        "block": false,
        "role": "board2"
      },
      {
        "kit": "easel",
        "x": 4.4,
        "z": -7.2,
        "rot": 0,
        "s": 1,
        "y": 0,
        "role": "easel"
      },
      {
        "kit": "globe",
        "x": -0.6,
        "z": -7.4,
        "rot": 0,
        "s": 1,
        "y": 0,
        "role": "globe"
      },
      {
        "kit": "fp_schooldesk",
        "x": -0.2,
        "z": -5,
        "rot": 3.141592653589793,
        "s": 0.9,
        "y": 0,
        "role": "desks2"
      },
      {
        "kit": "fp_schooldesk",
        "x": 1.8,
        "z": -5,
        "rot": 3.141592653589793,
        "s": 0.9,
        "y": 0,
        "role": "desks2"
      },
      {
        "kit": "fp_schooldesk",
        "x": 3.8,
        "z": -5,
        "rot": 3.141592653589793,
        "s": 0.9,
        "y": 0,
        "role": "desks2"
      },
      {
        "kit": "bookshelf",
        "x": 6.5,
        "z": -8,
        "rot": 0,
        "s": 1,
        "y": 0,
        "role": "books"
      },
      {
        "kit": "bookshelf",
        "x": 8.5,
        "z": -8,
        "rot": 0,
        "s": 1,
        "y": 0,
        "role": "books"
      },
      {
        "kit": "rug_round",
        "x": 7.6,
        "z": -5.2,
        "rot": 0,
        "s": 0.75,
        "y": 0.012,
        "block": false
      },
      {
        "kit": "armchair",
        "x": 9,
        "z": -4.6,
        "rot": -1.5707963267948966,
        "s": 1,
        "y": 0,
        "role": "books"
      },
      {
        "kit": "floor_lamp",
        "x": 9.3,
        "z": -2.9,
        "rot": 0,
        "s": 1,
        "y": 0,
        "glow": true
      },
      {
        "kit": "wardrobe",
        "x": -9.2,
        "z": 0.8,
        "rot": 1.5707963267948966,
        "s": 0.9,
        "y": 0,
        "role": "lockers"
      },
      {
        "kit": "wardrobe",
        "x": -9.2,
        "z": 2.5,
        "rot": 1.5707963267948966,
        "s": 0.9,
        "y": 0,
        "role": "lockers"
      },
      {
        "kit": "wardrobe",
        "x": -9.2,
        "z": 4.2,
        "rot": 1.5707963267948966,
        "s": 0.9,
        "y": 0,
        "role": "lockers"
      },
      {
        "kit": "fp_waitbench",
        "x": -4.4,
        "z": 0.6,
        "rot": 0,
        "s": 0.9,
        "y": 0
      },
      {
        "kit": "fp_waitbench",
        "x": -4.4,
        "z": 6.4,
        "rot": 3.141592653589793,
        "s": 0.9,
        "y": 0
      },
      {
        "kit": "round_table",
        "x": -5.6,
        "z": 3.2,
        "rot": 0,
        "s": 1,
        "y": 0,
        "role": "trophy"
      },
      {
        "kit": "trophy",
        "x": -5.6,
        "z": 3.2,
        "rot": 0,
        "s": 1.2,
        "y": 1.12,
        "block": false,
        "role": "trophy"
      },
      {
        "kit": "picture",
        "x": 4.06,
        "z": 1,
        "rot": -1.5707963267948966,
        "s": 1,
        "y": 2.1,
        "hang": true,
        "block": false
      },
      {
        "kit": "fp_clock",
        "x": -9.66,
        "z": 5.5,
        "rot": 1.5707963267948966,
        "s": 1,
        "y": 2.4,
        "hang": true,
        "block": false
      },
      {
        "kit": "plant_big",
        "x": -2.6,
        "z": 7.4,
        "rot": 0,
        "s": 1,
        "y": 0
      },
      {
        "kit": "plant_big",
        "x": 3.1,
        "z": 7.4,
        "rot": 0,
        "s": 1,
        "y": 0
      },
      {
        "kit": "welcome_mat",
        "x": 0,
        "z": 7.7,
        "rot": 0,
        "s": 1,
        "y": 0.012,
        "block": false
      },
      {
        "kit": "round_table",
        "x": 2.6,
        "z": 1,
        "rot": 0,
        "s": 0.7,
        "y": 0,
        "role": "pet"
      },
      {
        "kit": "fp_petcage",
        "x": 2.6,
        "z": 1,
        "rot": 0,
        "s": 1,
        "y": 0.98,
        "block": false,
        "role": "pet"
      },
      {
        "kit": "fp_bell",
        "x": -5,
        "z": 3,
        "rot": 0,
        "s": 1,
        "y": 1.12,
        "block": false
      },
      {
        "kit": "fp_seesaw",
        "x": 7,
        "z": 1.8,
        "rot": 0,
        "s": 1,
        "y": 0,
        "role": "yard"
      },
      {
        "kit": "fp_sandbox",
        "x": 8.2,
        "z": 5.8,
        "rot": 0,
        "s": 1,
        "y": 0,
        "role": "yard"
      },
      {
        "kit": "plant_big",
        "x": 9.2,
        "z": -0.4,
        "rot": 0,
        "s": 1,
        "y": 0
      },
      {
        "kit": "plant_big",
        "x": 5,
        "z": 7.5,
        "rot": 0,
        "s": 1,
        "y": 0
      },
      {
        "kit": "round_table",
        "x": 6,
        "z": 5.4,
        "rot": 0,
        "s": 0.9,
        "y": 0
      }
    ]
  },
  "barn": {
    "rooms": [
      {
        "id": "stable",
        "name": "Stable",
        "rect": {
          "x0": -9.8,
          "x1": -1,
          "z0": -8.4,
          "z1": -2
        },
        "pattern": "planks"
      },
      {
        "id": "tools",
        "name": "Feed and tools",
        "rect": {
          "x0": -1,
          "x1": 4.2,
          "z0": -8.4,
          "z1": -2
        },
        "pattern": "planks"
      },
      {
        "id": "beds",
        "name": "Family beds",
        "rect": {
          "x0": 4.2,
          "x1": 9.8,
          "z0": -8.4,
          "z1": -2
        },
        "pattern": "planks"
      },
      {
        "id": "floor",
        "name": "Barn floor",
        "rect": {
          "x0": -9.8,
          "x1": 3,
          "z0": -2,
          "z1": 8.4
        },
        "pattern": "planks"
      },
      {
        "id": "living",
        "name": "Kitchen corner",
        "rect": {
          "x0": 3,
          "x1": 9.8,
          "z0": -2,
          "z1": 8.4
        },
        "pattern": "planks"
      }
    ],
    "walls": [
      {
        "axis": "x",
        "at": -8.4,
        "from": -9.91,
        "to": 9.91,
        "height": "full",
        "gaps": []
      },
      {
        "axis": "x",
        "at": 8.4,
        "from": -9.91,
        "to": 9.91,
        "height": "low",
        "gaps": [
          [
            -1.05,
            1.05
          ]
        ]
      },
      {
        "axis": "z",
        "at": -9.8,
        "from": -8.4,
        "to": 8.4,
        "height": "full",
        "gaps": []
      },
      {
        "axis": "z",
        "at": 9.8,
        "from": -8.4,
        "to": 8.4,
        "height": "full",
        "gaps": []
      },
      {
        "axis": "x",
        "at": -2,
        "from": -9.8,
        "to": 9.8,
        "height": "low",
        "gaps": [
          [
            -6.6,
            -5
          ],
          [
            0.4,
            2
          ],
          [
            6.4,
            8
          ]
        ]
      },
      {
        "axis": "z",
        "at": -1,
        "from": -8.4,
        "to": -2,
        "height": "full",
        "gaps": []
      },
      {
        "axis": "z",
        "at": 4.2,
        "from": -8.4,
        "to": -2,
        "height": "full",
        "gaps": []
      },
      {
        "axis": "z",
        "at": 3,
        "from": -2,
        "to": 8.4,
        "height": "low",
        "gaps": [
          [
            2,
            5
          ]
        ]
      }
    ],
    "palette": {
      "walls": {
        "stable": "#f0d9a8",
        "tools": "#e8d0a0",
        "beds": "#ffe0c2",
        "floor": "#f6e3b8",
        "living": "#ffe9c4"
      },
      "floors": {
        "stable": [
          "#d9b36a",
          "#c9a35a"
        ],
        "tools": [
          "#b98650",
          "#a97844"
        ],
        "beds": [
          "#e0a467",
          "#d39457"
        ],
        "floor": [
          "#d7a86e",
          "#c99a5f"
        ],
        "living": [
          "#fff3dc",
          "#9fd38a"
        ]
      },
      "trim": "#4f9a3a"
    },
    "pieces": [
      {
        "kit": "window",
        "x": -6,
        "z": -8.26,
        "rot": 0,
        "s": 1,
        "y": 2,
        "hang": true,
        "glow": true,
        "block": false
      },
      {
        "kit": "window",
        "x": 1.6,
        "z": -8.26,
        "rot": 0,
        "s": 1,
        "y": 2,
        "hang": true,
        "glow": true,
        "block": false
      },
      {
        "kit": "window",
        "x": 7,
        "z": -8.26,
        "rot": 0,
        "s": 1,
        "y": 2,
        "hang": true,
        "glow": true,
        "block": false
      },
      {
        "kit": "window",
        "x": 9.66,
        "z": 4.5,
        "rot": -1.5707963267948966,
        "s": 1,
        "y": 2,
        "hang": true,
        "glow": true,
        "block": false
      },
      {
        "kit": "window",
        "x": -9.66,
        "z": 4.5,
        "rot": 1.5707963267948966,
        "s": 1,
        "y": 2,
        "hang": true,
        "glow": true,
        "block": false
      },
      {
        "kit": "fp_stall",
        "x": -7.6,
        "z": -6.8,
        "rot": 0,
        "s": 0.95,
        "y": 0,
        "role": "stall"
      },
      {
        "kit": "fp_stall",
        "x": -4.6,
        "z": -6.8,
        "rot": 0,
        "s": 0.95,
        "y": 0,
        "role": "stall"
      },
      {
        "kit": "fp_hay",
        "x": -2.1,
        "z": -7.2,
        "rot": 0,
        "s": 0.8,
        "y": 0,
        "role": "hay"
      },
      {
        "kit": "fp_pail",
        "x": -6.2,
        "z": -3.9,
        "rot": 0,
        "s": 1,
        "y": 0,
        "block": false,
        "role": "stall"
      },
      {
        "kit": "fp_toolrack",
        "x": 1.6,
        "z": -8.3,
        "rot": 0,
        "s": 0.9,
        "y": 1.8,
        "hang": true,
        "block": false,
        "role": "tools"
      },
      {
        "kit": "workbench",
        "x": 2.4,
        "z": -6.3,
        "rot": 0,
        "s": 0.85,
        "y": 0,
        "role": "tools"
      },
      {
        "kit": "fp_sacks",
        "x": -0.1,
        "z": -7.4,
        "rot": 0,
        "s": 0.9,
        "y": 0,
        "role": "feed"
      },
      {
        "kit": "fp_sacks",
        "x": 1,
        "z": -4.6,
        "rot": 0.3,
        "s": 0.8,
        "y": 0,
        "role": "feed"
      },
      {
        "kit": "bed",
        "x": 5.2,
        "z": -7,
        "rot": 0,
        "s": 0.95,
        "y": 0,
        "role": "bed"
      },
      {
        "kit": "bed",
        "x": 7,
        "z": -7,
        "rot": 0,
        "s": 0.95,
        "y": 0,
        "role": "bed"
      },
      {
        "kit": "bed",
        "x": 8.8,
        "z": -7,
        "rot": 0,
        "s": 0.95,
        "y": 0,
        "role": "bed"
      },
      {
        "kit": "plant_small",
        "x": 4.7,
        "z": -3,
        "rot": 0,
        "s": 1,
        "y": 0
      },
      {
        "kit": "fp_hay",
        "x": -8.4,
        "z": 2,
        "rot": 0,
        "s": 1,
        "y": 0,
        "role": "hay"
      },
      {
        "kit": "fp_hay",
        "x": -6.6,
        "z": 2.4,
        "rot": 0.3,
        "s": 0.8,
        "y": 0,
        "role": "hay"
      },
      {
        "kit": "fp_trough",
        "x": -4.2,
        "z": 3.4,
        "rot": 0,
        "s": 1,
        "y": 0,
        "role": "feed"
      },
      {
        "kit": "fp_crate",
        "x": -8.6,
        "z": 6,
        "rot": 0,
        "s": 1,
        "y": 0
      },
      {
        "kit": "fp_pail",
        "x": -3,
        "z": 5.2,
        "rot": 0,
        "s": 1,
        "y": 0,
        "block": false
      },
      {
        "kit": "plant_big",
        "x": -2,
        "z": 7.4,
        "rot": 0,
        "s": 1,
        "y": 0
      },
      {
        "kit": "welcome_mat",
        "x": 0,
        "z": 7.7,
        "rot": 0,
        "s": 1,
        "y": 0.012,
        "block": false
      },
      {
        "kit": "dining_table",
        "x": 6.4,
        "z": 2,
        "rot": 0,
        "s": 0.9,
        "y": 0,
        "role": "table"
      },
      {
        "kit": "chair",
        "x": 5.2,
        "z": 3.6,
        "rot": 3.141592653589793,
        "s": 1,
        "y": 0
      },
      {
        "kit": "chair",
        "x": 7.6,
        "z": 3.6,
        "rot": 3.141592653589793,
        "s": 1,
        "y": 0
      },
      {
        "kit": "stove",
        "x": 9.1,
        "z": -0.6,
        "rot": -1.5707963267948966,
        "s": 1,
        "y": 0,
        "role": "table"
      },
      {
        "kit": "kettle",
        "x": 9.1,
        "z": -0.6,
        "rot": 0,
        "s": 1,
        "y": 1.3,
        "block": false
      },
      {
        "kit": "fridge",
        "x": 9.2,
        "z": 1.2,
        "rot": -1.5707963267948966,
        "s": 1,
        "y": 0
      },
      {
        "kit": "sofa",
        "x": 6.2,
        "z": 6.4,
        "rot": 3.141592653589793,
        "s": 0.9,
        "y": 0
      },
      {
        "kit": "rug_round",
        "x": 6.4,
        "z": 3.4,
        "rot": 0,
        "s": 0.8,
        "y": 0.012,
        "block": false
      },
      {
        "kit": "plant_big",
        "x": 9.2,
        "z": 7.4,
        "rot": 0,
        "s": 1,
        "y": 0
      }
    ]
  },
  "bakery": {
    "rooms": [
      {
        "id": "bake",
        "name": "Bakehouse",
        "rect": {
          "x0": -9.8,
          "x1": -1.4,
          "z0": -8.4,
          "z1": -2
        },
        "pattern": "planks"
      },
      {
        "id": "pantry",
        "name": "Pantry",
        "rect": {
          "x0": -1.4,
          "x1": 3.6,
          "z0": -8.4,
          "z1": -2
        },
        "pattern": "planks"
      },
      {
        "id": "family",
        "name": "Family corner",
        "rect": {
          "x0": 3.6,
          "x1": 9.8,
          "z0": -8.4,
          "z1": -2
        },
        "pattern": "planks"
      },
      {
        "id": "shop",
        "name": "Shop",
        "rect": {
          "x0": -9.8,
          "x1": 9.8,
          "z0": -2,
          "z1": 8.4
        },
        "pattern": "tiles"
      }
    ],
    "walls": [
      {
        "axis": "x",
        "at": -8.4,
        "from": -9.91,
        "to": 9.91,
        "height": "full",
        "gaps": []
      },
      {
        "axis": "x",
        "at": 8.4,
        "from": -9.91,
        "to": 9.91,
        "height": "low",
        "gaps": [
          [
            -1.05,
            1.05
          ]
        ]
      },
      {
        "axis": "z",
        "at": -9.8,
        "from": -8.4,
        "to": 8.4,
        "height": "full",
        "gaps": []
      },
      {
        "axis": "z",
        "at": 9.8,
        "from": -8.4,
        "to": 8.4,
        "height": "full",
        "gaps": []
      },
      {
        "axis": "x",
        "at": -2,
        "from": -9.8,
        "to": 9.8,
        "height": "low",
        "gaps": [
          [
            -6,
            -4.4
          ],
          [
            0.2,
            1.8
          ],
          [
            5.6,
            7.2
          ]
        ]
      },
      {
        "axis": "z",
        "at": -1.4,
        "from": -8.4,
        "to": -2,
        "height": "full",
        "gaps": []
      },
      {
        "axis": "z",
        "at": 3.6,
        "from": -8.4,
        "to": -2,
        "height": "full",
        "gaps": []
      }
    ],
    "palette": {
      "walls": {
        "bake": "#ffd9a8",
        "pantry": "#fff0c8",
        "family": "#ffd1de",
        "shop": "#ffe9c4"
      },
      "floors": {
        "bake": [
          "#c98a55",
          "#b97a48"
        ],
        "pantry": [
          "#d7a86e",
          "#c99a5f"
        ],
        "family": [
          "#e0a467",
          "#d39457"
        ],
        "shop": [
          "#fff3dc",
          "#ffb48a"
        ]
      },
      "trim": "#d9631a"
    },
    "pieces": [
      {
        "kit": "window",
        "x": -5,
        "z": -8.26,
        "rot": 0,
        "s": 1,
        "y": 2,
        "hang": true,
        "glow": true,
        "block": false
      },
      {
        "kit": "window",
        "x": 1,
        "z": -8.26,
        "rot": 0,
        "s": 1,
        "y": 2,
        "hang": true,
        "glow": true,
        "block": false
      },
      {
        "kit": "window",
        "x": 6.4,
        "z": -8.26,
        "rot": 0,
        "s": 1,
        "y": 2,
        "hang": true,
        "glow": true,
        "block": false
      },
      {
        "kit": "window",
        "x": 9.66,
        "z": 4.5,
        "rot": -1.5707963267948966,
        "s": 1,
        "y": 2,
        "hang": true,
        "glow": true,
        "block": false
      },
      {
        "kit": "window",
        "x": -9.66,
        "z": 4.5,
        "rot": 1.5707963267948966,
        "s": 1,
        "y": 2,
        "hang": true,
        "glow": true,
        "block": false
      },
      {
        "kit": "fp_oven",
        "x": -7.3,
        "z": -7.2,
        "rot": 0,
        "s": 0.7,
        "y": 0,
        "role": "oven"
      },
      {
        "kit": "workbench",
        "x": -3.6,
        "z": -6.2,
        "rot": 0,
        "s": 0.9,
        "y": 0,
        "role": "oven"
      },
      {
        "kit": "fp_trays",
        "x": -4.6,
        "z": -7.8,
        "rot": 0,
        "s": 0.9,
        "y": 0
      },
      {
        "kit": "fp_sacks",
        "x": -9,
        "z": -4,
        "rot": 0,
        "s": 0.9,
        "y": 0
      },
      {
        "kit": "kettle",
        "x": -3.6,
        "z": -6.2,
        "rot": 0,
        "s": 1,
        "y": 1.1,
        "block": false
      },
      {
        "kit": "plant_small",
        "x": -2.2,
        "z": -3,
        "rot": 0,
        "s": 1,
        "y": 0
      },
      {
        "kit": "fp_sacks",
        "x": -0.2,
        "z": -7.6,
        "rot": 0,
        "s": 0.9,
        "y": 0,
        "role": "pantry"
      },
      {
        "kit": "fp_sacks",
        "x": 1.4,
        "z": -7.6,
        "rot": 0.2,
        "s": 0.9,
        "y": 0,
        "role": "pantry"
      },
      {
        "kit": "fp_crate",
        "x": 2.8,
        "z": -7.7,
        "rot": 0,
        "s": 1,
        "y": 0,
        "role": "pantry"
      },
      {
        "kit": "fp_crate",
        "x": 2.8,
        "z": -6.6,
        "rot": 0,
        "s": 1,
        "y": 0,
        "role": "pantry"
      },
      {
        "kit": "fridge",
        "x": 3,
        "z": -4.6,
        "rot": -1.5707963267948966,
        "s": 1,
        "y": 0
      },
      {
        "kit": "fp_boxes",
        "x": 0,
        "z": -4.2,
        "rot": 0,
        "s": 0.7,
        "y": 0,
        "role": "pantry"
      },
      {
        "kit": "bed",
        "x": 8.6,
        "z": -7,
        "rot": 0,
        "s": 1,
        "y": 0,
        "role": "bed"
      },
      {
        "kit": "nightstand",
        "x": 7.2,
        "z": -7.9,
        "rot": 0,
        "s": 1,
        "y": 0
      },
      {
        "kit": "lamp_small",
        "x": 7.2,
        "z": -7.9,
        "rot": 0,
        "s": 1,
        "y": 0.62,
        "glow": true,
        "block": false
      },
      {
        "kit": "sofa",
        "x": 5.2,
        "z": -4.2,
        "rot": 0,
        "s": 0.9,
        "y": 0
      },
      {
        "kit": "round_table",
        "x": 7.8,
        "z": -4.4,
        "rot": 0,
        "s": 0.9,
        "y": 0
      },
      {
        "kit": "plant_big",
        "x": 9.2,
        "z": -3,
        "rot": 0,
        "s": 1,
        "y": 0
      },
      {
        "kit": "picture",
        "x": 6,
        "z": -8.3,
        "rot": 0,
        "s": 1,
        "y": 2.2,
        "hang": true,
        "block": false
      },
      {
        "kit": "fp_breadshelf",
        "x": -8.6,
        "z": 0.6,
        "rot": 0,
        "s": 0.9,
        "y": 0,
        "role": "bread"
      },
      {
        "kit": "fp_breadshelf",
        "x": -6.3,
        "z": 0.6,
        "rot": 0,
        "s": 0.9,
        "y": 0,
        "role": "bread"
      },
      {
        "kit": "fp_breadshelf",
        "x": -4,
        "z": 0.6,
        "rot": 0,
        "s": 0.9,
        "y": 0,
        "role": "bread"
      },
      {
        "kit": "fp_cakecase",
        "x": 6.4,
        "z": 1.8,
        "rot": 0,
        "s": 0.9,
        "y": 0,
        "role": "counter"
      },
      {
        "kit": "fp_register",
        "x": 7.4,
        "z": 1.8,
        "rot": 0,
        "s": 0.9,
        "y": 1.1,
        "block": false
      },
      {
        "kit": "fp_breadbasket",
        "x": 5.6,
        "z": 1.8,
        "rot": 0,
        "s": 1.2,
        "y": 1.1,
        "block": false
      },
      {
        "kit": "round_table",
        "x": -6,
        "z": 4.4,
        "rot": 0,
        "s": 0.9,
        "y": 0
      },
      {
        "kit": "fp_breadbasket",
        "x": -6,
        "z": 4.4,
        "rot": 0,
        "s": 1.2,
        "y": 1,
        "block": false
      },
      {
        "kit": "stool",
        "x": -7,
        "z": 4.4,
        "rot": 0,
        "s": 1,
        "y": 0
      },
      {
        "kit": "stool",
        "x": -5,
        "z": 4.4,
        "rot": 0,
        "s": 1,
        "y": 0
      },
      {
        "kit": "plant_big",
        "x": -9,
        "z": 7.4,
        "rot": 0,
        "s": 1,
        "y": 0
      },
      {
        "kit": "plant_big",
        "x": 3,
        "z": 7.4,
        "rot": 0,
        "s": 1,
        "y": 0
      },
      {
        "kit": "plant_big",
        "x": 9,
        "z": 7.4,
        "rot": 0,
        "s": 1,
        "y": 0
      },
      {
        "kit": "welcome_mat",
        "x": 0,
        "z": 7.7,
        "rot": 0,
        "s": 1,
        "y": 0.012,
        "block": false
      }
    ]
  },
  "supermarket": {
    "rooms": [
      {
        "id": "cold",
        "name": "Cold section",
        "rect": {
          "x0": -9.8,
          "x1": -3,
          "z0": -8.4,
          "z1": -2
        },
        "pattern": "tiles"
      },
      {
        "id": "fresh",
        "name": "Fresh produce",
        "rect": {
          "x0": -3,
          "x1": 3,
          "z0": -8.4,
          "z1": -2
        },
        "pattern": "tiles"
      },
      {
        "id": "stock",
        "name": "Back room",
        "rect": {
          "x0": 3,
          "x1": 9.8,
          "z0": -8.4,
          "z1": -2
        },
        "pattern": "planks"
      },
      {
        "id": "aisles",
        "name": "Shop floor",
        "rect": {
          "x0": -9.8,
          "x1": 3,
          "z0": -2,
          "z1": 8.4
        },
        "pattern": "tiles"
      },
      {
        "id": "checkout",
        "name": "Checkout",
        "rect": {
          "x0": 3,
          "x1": 9.8,
          "z0": -2,
          "z1": 8.4
        },
        "pattern": "tiles"
      }
    ],
    "walls": [
      {
        "axis": "x",
        "at": -8.4,
        "from": -9.91,
        "to": 9.91,
        "height": "full",
        "gaps": []
      },
      {
        "axis": "x",
        "at": 8.4,
        "from": -9.91,
        "to": 9.91,
        "height": "low",
        "gaps": [
          [
            -1.05,
            1.05
          ]
        ]
      },
      {
        "axis": "z",
        "at": -9.8,
        "from": -8.4,
        "to": 8.4,
        "height": "full",
        "gaps": []
      },
      {
        "axis": "z",
        "at": 9.8,
        "from": -8.4,
        "to": 8.4,
        "height": "full",
        "gaps": []
      },
      {
        "axis": "x",
        "at": -2,
        "from": -9.8,
        "to": 9.8,
        "height": "low",
        "gaps": [
          [
            -8.6,
            -3.4
          ],
          [
            -2.4,
            2.4
          ],
          [
            3.8,
            5.4
          ]
        ]
      },
      {
        "axis": "z",
        "at": -3,
        "from": -8.4,
        "to": -2,
        "height": "full",
        "gaps": []
      },
      {
        "axis": "z",
        "at": 3,
        "from": -8.4,
        "to": -2,
        "height": "full",
        "gaps": []
      }
    ],
    "palette": {
      "walls": {
        "cold": "#bfe9ff",
        "fresh": "#d6f5c4",
        "stock": "#ffe4b8",
        "aisles": "#fff0d2",
        "checkout": "#ffe0d6"
      },
      "floors": {
        "cold": [
          "#f2fbff",
          "#9fd8f0"
        ],
        "fresh": [
          "#fffdf0",
          "#bfe58f"
        ],
        "stock": [
          "#c98a55",
          "#b97a48"
        ],
        "aisles": [
          "#ffffff",
          "#ffc4bb"
        ],
        "checkout": [
          "#fff6e4",
          "#ff9d8f"
        ]
      },
      "trim": "#c22f2a"
    },
    "pieces": [
      {
        "kit": "window",
        "x": -6.5,
        "z": -8.26,
        "rot": 0,
        "s": 1,
        "y": 2,
        "hang": true,
        "glow": true,
        "block": false
      },
      {
        "kit": "window",
        "x": 0,
        "z": -8.26,
        "rot": 0,
        "s": 1,
        "y": 2,
        "hang": true,
        "glow": true,
        "block": false
      },
      {
        "kit": "window",
        "x": 6.5,
        "z": -8.26,
        "rot": 0,
        "s": 1,
        "y": 2,
        "hang": true,
        "glow": true,
        "block": false
      },
      {
        "kit": "window",
        "x": 9.66,
        "z": 3.2,
        "rot": -1.5707963267948966,
        "s": 1,
        "y": 2,
        "hang": true,
        "glow": true,
        "block": false
      },
      {
        "kit": "window",
        "x": -9.66,
        "z": 3.2,
        "rot": 1.5707963267948966,
        "s": 1,
        "y": 2,
        "hang": true,
        "glow": true,
        "block": false
      },
      {
        "kit": "fp_chiller",
        "x": -8.5,
        "z": -7.5,
        "rot": 0,
        "s": 0.85,
        "y": 0,
        "role": "chillers"
      },
      {
        "kit": "fp_chiller",
        "x": -6.3,
        "z": -7.5,
        "rot": 0,
        "s": 0.85,
        "y": 0,
        "role": "chillers"
      },
      {
        "kit": "fp_chiller",
        "x": -4.2,
        "z": -7.5,
        "rot": 0,
        "s": 0.85,
        "y": 0,
        "role": "chillers"
      },
      {
        "kit": "fridge",
        "x": -9.3,
        "z": -5,
        "rot": 1.5707963267948966,
        "s": 1,
        "y": 0,
        "role": "chillers"
      },
      {
        "kit": "fridge",
        "x": -9.3,
        "z": -3.6,
        "rot": 1.5707963267948966,
        "s": 1,
        "y": 0,
        "role": "chillers"
      },
      {
        "kit": "fp_bin",
        "x": -2.1,
        "z": -7.1,
        "rot": 0,
        "s": 0.85,
        "y": 0,
        "role": "bins"
      },
      {
        "kit": "fp_bin",
        "x": -0.7,
        "z": -7.1,
        "rot": 0,
        "s": 0.85,
        "y": 0,
        "role": "bins"
      },
      {
        "kit": "fp_bin",
        "x": 0.7,
        "z": -7.1,
        "rot": 0,
        "s": 0.85,
        "y": 0,
        "role": "bins"
      },
      {
        "kit": "fp_bin",
        "x": 2.1,
        "z": -7.1,
        "rot": 0,
        "s": 0.85,
        "y": 0,
        "role": "bins"
      },
      {
        "kit": "fp_bin",
        "x": -1.4,
        "z": -4.9,
        "rot": 0,
        "s": 0.85,
        "y": 0,
        "role": "bins"
      },
      {
        "kit": "fp_bin",
        "x": 0,
        "z": -4.9,
        "rot": 0,
        "s": 0.85,
        "y": 0,
        "role": "bins"
      },
      {
        "kit": "fp_bin",
        "x": 1.4,
        "z": -4.9,
        "rot": 0,
        "s": 0.85,
        "y": 0,
        "role": "bins"
      },
      {
        "kit": "plant_big",
        "x": -2.5,
        "z": -3,
        "rot": 0,
        "s": 1,
        "y": 0
      },
      {
        "kit": "plant_big",
        "x": 2.5,
        "z": -3,
        "rot": 0,
        "s": 1,
        "y": 0
      },
      {
        "kit": "fp_crate",
        "x": 4,
        "z": -7.9,
        "rot": 0,
        "s": 1,
        "y": 0,
        "role": "stock"
      },
      {
        "kit": "fp_crate",
        "x": 5,
        "z": -7.9,
        "rot": 0,
        "s": 1,
        "y": 0,
        "role": "stock"
      },
      {
        "kit": "fp_crate",
        "x": 6,
        "z": -7.9,
        "rot": 0,
        "s": 1,
        "y": 0,
        "role": "stock"
      },
      {
        "kit": "fp_crate",
        "x": 4.5,
        "z": -7.9,
        "rot": 0,
        "s": 1,
        "y": 0.66,
        "role": "stock",
        "block": false
      },
      {
        "kit": "fp_crate",
        "x": 5.5,
        "z": -7.9,
        "rot": 0,
        "s": 1,
        "y": 0.66,
        "role": "stock",
        "block": false
      },
      {
        "kit": "fp_boxes",
        "x": 8.8,
        "z": -7.6,
        "rot": 0,
        "s": 0.8,
        "y": 0,
        "role": "stock"
      },
      {
        "kit": "fp_boxes",
        "x": 8.8,
        "z": -5.8,
        "rot": 3.141592653589793,
        "s": 0.8,
        "y": 0,
        "role": "stock"
      },
      {
        "kit": "fp_crate",
        "x": 9.2,
        "z": -4,
        "rot": 1.5707963267948966,
        "s": 1,
        "y": 0,
        "role": "stock"
      },
      {
        "kit": "fp_shelf",
        "x": -8.6,
        "z": 0.5,
        "rot": 0,
        "s": 0.8,
        "y": 0,
        "role": "shelf1"
      },
      {
        "kit": "fp_shelf",
        "x": -6.6,
        "z": 0.5,
        "rot": 0,
        "s": 0.8,
        "y": 0,
        "role": "shelves"
      },
      {
        "kit": "fp_shelf",
        "x": -4.6,
        "z": 0.5,
        "rot": 0,
        "s": 0.8,
        "y": 0,
        "role": "shelves"
      },
      {
        "kit": "fp_shelf",
        "x": -8.6,
        "z": 3.2,
        "rot": 0,
        "s": 0.8,
        "y": 0,
        "role": "shelves"
      },
      {
        "kit": "fp_shelf",
        "x": -6.6,
        "z": 3.2,
        "rot": 0,
        "s": 0.8,
        "y": 0,
        "role": "shelf2"
      },
      {
        "kit": "fp_shelf",
        "x": -4.6,
        "z": 3.2,
        "rot": 0,
        "s": 0.8,
        "y": 0,
        "role": "shelf3"
      },
      {
        "kit": "fp_shelf",
        "x": -8.6,
        "z": 5.9,
        "rot": 0,
        "s": 0.8,
        "y": 0,
        "role": "shelves"
      },
      {
        "kit": "fp_shelf",
        "x": -6.6,
        "z": 5.9,
        "rot": 0,
        "s": 0.8,
        "y": 0,
        "role": "shelves"
      },
      {
        "kit": "fp_cart",
        "x": -3,
        "z": 6.9,
        "rot": 0.2,
        "s": 1,
        "y": 0,
        "role": "trolley"
      },
      {
        "kit": "fp_cart",
        "x": -2.3,
        "z": 6.9,
        "rot": -0.15,
        "s": 1,
        "y": 0,
        "role": "trolley"
      },
      {
        "kit": "stool",
        "x": 7.3,
        "z": -3.5,
        "rot": 0,
        "s": 1,
        "y": 0
      },
      {
        "kit": "round_table",
        "x": 1.6,
        "z": 2.4,
        "rot": 0,
        "s": 0.7,
        "y": 0,
        "role": "sample"
      },
      {
        "kit": "fp_sampletray",
        "x": 1.6,
        "z": 2.4,
        "rot": 0,
        "s": 1,
        "y": 0.98,
        "block": false,
        "role": "sample"
      },
      {
        "kit": "fp_basket",
        "x": 3.5,
        "z": 5.6,
        "rot": 0,
        "s": 1,
        "y": 0,
        "role": "lost"
      },
      {
        "kit": "fp_noticeboard",
        "x": 9.66,
        "z": 5.6,
        "rot": -1.5707963267948966,
        "s": 0.7,
        "y": 1.9,
        "hang": true,
        "block": false,
        "role": "news"
      },
      {
        "kit": "plant_big",
        "x": -9.2,
        "z": 7.4,
        "rot": 0,
        "s": 1,
        "y": 0
      },
      {
        "kit": "plant_big",
        "x": 3.4,
        "z": 7.6,
        "rot": 0,
        "s": 1,
        "y": 0
      },
      {
        "kit": "welcome_mat",
        "x": 0,
        "z": 7.7,
        "rot": 0,
        "s": 1,
        "y": 0.012,
        "block": false
      },
      {
        "kit": "counter",
        "x": 5.6,
        "z": 1.8,
        "rot": 0,
        "s": 0.65,
        "y": 0,
        "role": "checkout"
      },
      {
        "kit": "counter",
        "x": 8.4,
        "z": 1.8,
        "rot": 0,
        "s": 0.65,
        "y": 0,
        "role": "checkout2"
      },
      {
        "kit": "fp_register",
        "x": 5.6,
        "z": 1.8,
        "rot": 0,
        "s": 0.9,
        "y": 0.93,
        "block": false
      },
      {
        "kit": "fp_register",
        "x": 8.4,
        "z": 1.8,
        "rot": 0,
        "s": 0.9,
        "y": 0.93,
        "block": false
      },
      {
        "kit": "plant_big",
        "x": 9.2,
        "z": 7,
        "rot": 0,
        "s": 1,
        "y": 0
      }
    ]
  }
};
