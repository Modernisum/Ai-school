// Academic data structures migrated from Backend/src/services/academic_utils.rs
// Contains Indian school structure, default spaces, materials, and helper functions

/**
 * Indian School Structure
 * Returns array of class objects with name, subjects, and optional streams
 * 0=Pre-Nursery, 1=Nursery, 2=LKG, 3=UKG, 4=Class1 ... 15=Class12
 */
export const getIndianSchoolStructure = () => {
  const structure = [
    {
      name: 'Pre-Nursery',
      subjects: ['Basic Communication', 'Motor Skills', 'Sensory Activities', 'Rhymes & Storytelling'],
      streams: null
    },
    {
      name: 'Nursery',
      subjects: ['English', 'Mathematics', 'General Awareness', 'Art & Craft'],
      streams: null
    },
    {
      name: 'LKG',
      subjects: ['English', 'Mathematics', 'General Awareness', 'Hindi / Regional Language', 'Art & Craft'],
      streams: null
    },
    {
      name: 'UKG',
      subjects: ['English', 'Mathematics', 'General Awareness', 'Hindi / Regional Language', 'Art & Craft'],
      streams: null
    }
  ];

  // Classes 1-5
  for (let i = 1; i <= 5; i++) {
    structure.push({
      name: `Class ${i}`,
      subjects: ['English', 'Hindi', 'Mathematics', 'Environmental Studies (EVS)', 'Computer', 'General Knowledge', 'Art & Craft'],
      streams: null
    });
  }

  // Classes 6-8
  for (let i = 6; i <= 8; i++) {
    structure.push({
      name: `Class ${i}`,
      subjects: ['English', 'Hindi', 'Third Language', 'Mathematics', 'Science', 'Social Science', 'Computer Science', 'General Knowledge'],
      streams: null
    });
  }

  // Classes 9-10
  for (let i = 9; i <= 10; i++) {
    structure.push({
      name: `Class ${i}`,
      subjects: ['English', 'Hindi / Second Language', 'Mathematics', 'Science', 'Social Science', 'Information Technology (IT)'],
      streams: null
    });
  }

  // Classes 11-12 with streams
  const stream_11_12 = {
    'Science (PCM)': ['English', 'Physics', 'Chemistry', 'Mathematics', 'Computer Science / Physical Education'],
    'Science (PCB)': ['English', 'Physics', 'Chemistry', 'Biology', 'Psychology / Physical Education'],
    'Commerce': ['English', 'Accountancy', 'Business Studies', 'Economics', 'Mathematics / Informatics Practices'],
    'Arts / Humanities': ['English', 'History', 'Political Science', 'Geography', 'Economics / Sociology']
  };

  structure.push({
    name: 'Class 11',
    subjects: [],
    streams: stream_11_12
  });

  structure.push({
    name: 'Class 12',
    subjects: [],
    streams: stream_11_12
  });

  return structure;
};

/**
 * Generate class names based on start and end indices
 * @param {number} startIndex - 0-based start index (0=Pre-Nursery)
 * @param {number} endIndex - 0-based end index (15=Class 12)
 * @returns {string[]} Array of class names
 */
export const generateClasses = (startIndex, endIndex) => {
  const structure = getIndianSchoolStructure();
  const classes = [];
  
  const start = Math.max(0, startIndex);
  const end = Math.min(structure.length - 1, endIndex);

  for (let i = start; i <= end; i++) {
    const cls = structure[i];
    if (cls.streams) {
      // Sort stream names for consistency
      const streamNames = Object.keys(cls.streams).sort();
      for (const streamName of streamNames) {
        classes.push(`${cls.name} ${streamName}`);
      }
    } else {
      classes.push(cls.name);
    }
  }
  
  return classes;
};

/**
 * Calculate fee based on class name
 * @param {string} className - Name of the class
 * @returns {number} Fee amount
 */
export const calculateFee = (className) => {
  if (className.includes('Pre-Nursery') || className.includes('Nursery') || 
      className.includes('UKG') || className.includes('LKG')) {
    return 500;
  } else if (className.includes('Class 11') || className.includes('Class 12')) {
    return 2000;
  } else {
    return 1000;
  }
};

/**
 * Generate sections based on student count
 * @param {number} studentCount - Total number of students
 * @returns {Array} Array of section objects
 */
export const generateSections = (studentCount) => {
  const sections = [];
  let sectionCount = Math.ceil(studentCount / 30);
  sectionCount = Math.max(1, sectionCount);
  
  for (let i = 0; i < sectionCount; i++) {
    const name = String.fromCharCode(65 + i); // A, B, C, ...
    sections.push({
      name,
      roomNumber: `Room ${100 + i}`,
      totalStudents: 0,
      capacity: 30
    });
  }
  
  return sections;
};

/**
 * Get default space types
 * @returns {string[]} Array of default space types
 */
export const getDefaultSpaces = () => {
  return ['classroom', 'kitchen', 'storeroom', 'office', 'ground', 'parking', 'canteen', 'park'];
};

/**
 * Get default materials for each space type
 * @returns {Object} Object mapping space types to materials
 */
export const getDefaultMaterials = () => {
  return {
    classroom: [
      {
        materialName: 'Ceiling Fan',
        quantity: 4,
        unitPrice: 2500,
        unit: 'pcs',
        description: 'High-speed ceiling fan'
      },
      {
        materialName: 'Whiteboard',
        quantity: 1,
        unitPrice: 3000,
        unit: 'pcs',
        description: 'Large magnetic whiteboard'
      },
      {
        materialName: "Teacher's Table",
        quantity: 1,
        unitPrice: 5000,
        unit: 'pcs',
        description: 'Wooden table with drawers'
      },
      {
        materialName: 'Student Desk',
        quantity: 20,
        unitPrice: 1500,
        unit: 'set',
        description: 'Individual student desk and chair set'
      },
      {
        materialName: 'Whiteboard Marker',
        quantity: 3,
        unitPrice: 50,
        unit: 'pcs',
        description: 'Non-toxic dry erase marker'
      },
      {
        materialName: 'Wall Photograph',
        quantity: 2,
        unitPrice: 200,
        unit: 'pcs',
        description: 'Educational wall frames'
      }
    ],
    laboratory: [
      {
        materialName: 'Lab Table',
        quantity: 10,
        unitPrice: 8000,
        unit: 'pcs',
        description: 'Acid-resistant lab workstation'
      },
      {
        materialName: 'Stool',
        quantity: 20,
        unitPrice: 1200,
        unit: 'pcs',
        description: 'High-seated lab stool'
      },
      {
        materialName: 'Microscope',
        quantity: 5,
        unitPrice: 15000,
        unit: 'pcs',
        description: 'Compound light microscope'
      },
      {
        materialName: 'First Aid Kit',
        quantity: 1,
        unitPrice: 2500,
        unit: 'pcs',
        description: 'Emergency medical supplies'
      },
      {
        materialName: 'Fire Extinguisher',
        quantity: 1,
        unitPrice: 3500,
        unit: 'pcs',
        description: 'CO2 fire extinguisher'
      }
    ],
    library: [
      {
        materialName: 'Bookshelf',
        quantity: 10,
        unitPrice: 12000,
        unit: 'pcs',
        description: 'Large wooden bookshelf'
      },
      {
        materialName: 'Reading Table',
        quantity: 5,
        unitPrice: 6000,
        unit: 'pcs',
        description: 'Large 6-seater reading table'
      },
      {
        materialName: 'Chair',
        quantity: 30,
        unitPrice: 1500,
        unit: 'pcs',
        description: 'Comfortable library chair'
      },
      {
        materialName: 'Computer System',
        quantity: 2,
        unitPrice: 45000,
        unit: 'set',
        description: 'Library management terminal'
      }
    ],
    kitchen: [
      {
        materialName: 'gas stove',
        quantity: 1,
        unitPrice: 3000,
        unit: 'pcs'
      },
      {
        materialName: 'sugar',
        quantity: 5,
        unitPrice: 50,
        unit: 'kg'
      },
      {
        materialName: 'milk',
        quantity: 5,
        unitPrice: 60,
        unit: 'litre'
      },
      {
        materialName: 'tea',
        quantity: 1,
        unitPrice: 500,
        unit: 'kg'
      },
      {
        materialName: 'water tank',
        quantity: 1,
        unitPrice: 800,
        unit: 'pcs'
      }
    ],
    ground: [
      {
        materialName: 'gamla',
        quantity: 10,
        unitPrice: 400,
        unit: 'pcs'
      },
      {
        materialName: 'big plant',
        quantity: 10,
        unitPrice: 2000,
        unit: 'pcs'
      }
    ],
    storeroom: [
      {
        materialName: 'chair',
        quantity: 5,
        unitPrice: 200,
        unit: 'pcs'
      },
      {
        materialName: 'generator',
        quantity: 1,
        unitPrice: 20000,
        unit: 'pcs'
      }
    ],
    office: [
      {
        materialName: 'big wheel chair',
        quantity: 1,
        unitPrice: 5000,
        unit: 'pcs'
      },
      {
        materialName: 'big table',
        quantity: 1,
        unitPrice: 10000,
        unit: 'pcs'
      },
      {
        materialName: 'fan',
        quantity: 4,
        unitPrice: 200,
        unit: 'pcs'
      },
      {
        materialName: 'guest chair',
        quantity: 6,
        unitPrice: 2000,
        unit: 'pcs'
      }
    ],
    parking: [
      {
        materialName: 'bus',
        quantity: 1,
        unitPrice: 2000000,
        unit: 'pcs'
      },
      {
        materialName: 'car',
        quantity: 1,
        unitPrice: 1000000,
        unit: 'pcs'
      }
    ]
  };
};

/**
 * Get subjects map for all classes
 * @returns {Object} Object mapping class names to subjects
 */
export const getSubjectsMap = () => {
  const structure = getIndianSchoolStructure();
  const subjectsMap = {};
  
  for (const cls of structure) {
    if (cls.streams) {
      for (const [streamName, subjects] of Object.entries(cls.streams)) {
        const name = `${cls.name} ${streamName}`;
        subjectsMap[name] = [...subjects];
      }
    } else {
      subjectsMap[cls.name] = [...cls.subjects];
    }
  }
  
  return subjectsMap;
};

/**
 * Map class name to 0-based index in Indian school structure
 * @param {string} name - Class name
 * @returns {number} 0-based index
 */
export const classNameToLevel = (name) => {
  const indexMap = {
    'Pre-Nursery': 0,
    'Nursery': 1,
    'LKG': 2,
    'UKG': 3,
  };
  
  if (indexMap[name] !== undefined) return indexMap[name];
  
  const match = name.match(/Class (\d+)/);
  if (match) return 3 + parseInt(match[1]); // Class 1 → 4, Class 12 → 15
  
  return 0;
};
