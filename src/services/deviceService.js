import { 
  generateSampleDevices, 
  generateSampleInspections, 
  INITIAL_ACADEMIC_YEAR, 
  INITIAL_INSPECTION_ROUND,
  DEFAULT_ROOM_PINS
} from './sampleData';

const DEVICES_KEY = 'anywhere_tablet_devices_v3';
const CONFIG_KEY = 'anywhere_tablet_config_v3';
const PINS_KEY = 'anywhere_tablet_room_pins_v3';
const INSPECTIONS_KEY = 'anywhere_tablet_inspections_v3';

function getLocalData(key, defaultVal) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultVal;
  } catch (e) {
    console.error("Error reading localStorage:", e);
    return defaultVal;
  }
}

function setLocalData(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("Error writing localStorage:", e);
  }
}

export function initStoreIfEmpty() {
  let devices = getLocalData(DEVICES_KEY, null);
  if (!devices || devices.length === 0) {
    devices = generateSampleDevices();
    setLocalData(DEVICES_KEY, devices);
    console.log(`Initialized ${devices.length} sample devices (M.4 - M.6, 4 rooms per grade & Teachers)`);
  }

  let config = getLocalData(CONFIG_KEY, null);
  if (!config) {
    config = {
      academic_years: ["2569"],
      current_academic_year: INITIAL_ACADEMIC_YEAR,
      current_round: INITIAL_INSPECTION_ROUND,
      admin_password: "nwsp1234"
    };
    setLocalData(CONFIG_KEY, config);
  }

  let pins = getLocalData(PINS_KEY, null);
  if (!pins) {
    setLocalData(PINS_KEY, DEFAULT_ROOM_PINS);
  }

  let inspections = getLocalData(INSPECTIONS_KEY, null);
  if (!inspections) {
    inspections = generateSampleInspections(devices);
    setLocalData(INSPECTIONS_KEY, inspections);
  }

  return { devices, config, pins };
}

initStoreIfEmpty();

export const deviceService = {
  getAllDevices: async () => {
    return getLocalData(DEVICES_KEY, []);
  },

  getDevices: async ({ academicYear, grade, room, search } = {}) => {
    let devices = getLocalData(DEVICES_KEY, []);

    if (academicYear) {
      devices = devices.filter(d => (d.academic_year || "2569") === academicYear);
    }
    if (grade && grade !== "ทั้งหมด") {
      devices = devices.filter(d => d.grade === grade);
    }
    if (room && room !== "ทั้งหมด") {
      devices = devices.filter(d => String(d.room) === String(room));
    }
    if (search && search.trim() !== '') {
      const q = search.toLowerCase().trim();
      devices = devices.filter(d => 
        (d.serial_no && d.serial_no.toLowerCase().includes(q)) ||
        (d.first_name && d.first_name.toLowerCase().includes(q)) ||
        (d.last_name && d.last_name.toLowerCase().includes(q)) ||
        (d.box_no && d.box_no.toLowerCase().includes(q)) ||
        (d.box_kb_no && d.box_kb_no.toLowerCase().includes(q))
      );
    }

    return devices;
  },

  addDevice: async (deviceData) => {
    const devices = getLocalData(DEVICES_KEY, []);
    
    const exists = devices.some(d => d.serial_no.toUpperCase() === deviceData.serial_no.toUpperCase() && d.academic_year === deviceData.academic_year);
    if (exists) {
      throw new Error(`Serial No. ${deviceData.serial_no} มีอยู่ในระบบแล้วสำหรับปีการศึกษานี้`);
    }

    const newDevice = {
      id: `DEV-${Date.now()}-${Math.floor(Math.random()*1000)}`,
      ...deviceData,
      serial_no: deviceData.serial_no.trim().toUpperCase(),
      created_at: new Date().toISOString()
    };

    devices.push(newDevice);
    setLocalData(DEVICES_KEY, devices);
    return newDevice;
  },

  updateDevice: async (id, deviceData) => {
    const devices = getLocalData(DEVICES_KEY, []);
    const idx = devices.findIndex(d => d.id === id);
    if (idx === -1) throw new Error("ไม่พบข้อมูลอุปกรณ์ที่ต้องการแก้ไข");

    devices[idx] = {
      ...devices[idx],
      ...deviceData,
      updated_at: new Date().toISOString()
    };

    setLocalData(DEVICES_KEY, devices);
    return devices[idx];
  },

  deleteDevice: async (id) => {
    let devices = getLocalData(DEVICES_KEY, []);
    devices = devices.filter(d => d.id !== id);
    setLocalData(DEVICES_KEY, devices);
    return true;
  },

  clearAllDevices: async () => {
    setLocalData(DEVICES_KEY, []);
    setLocalData(INSPECTIONS_KEY, {});
    return true;
  },

  importCSVDevices: async (importedList, targetAcademicYear) => {
    const devices = getLocalData(DEVICES_KEY, []);
    let addedCount = 0;
    let updatedCount = 0;
    const errors = [];

    importedList.forEach((row, index) => {
      if (!row.serial_no || !row.first_name || !row.last_name) {
        errors.push(`แถวที่ ${index + 2}: ข้อมูลไม่ครบถ้วน (ต้องระบุ Serial No., ชื่อ, และนามสกุล)`);
        return;
      }

      const serialClean = String(row.serial_no).trim().toUpperCase();
      const existingIdx = devices.findIndex(d => 
        d.serial_no.toUpperCase() === serialClean && 
        (d.academic_year || "2569") === targetAcademicYear
      );

      const deviceObj = {
        type: row.type === 'teacher' || row.grade === 'ครู' ? 'teacher' : 'student',
        box_no: row.box_no || '-',
        box_kb_no: row.box_kb_no || '-',
        serial_no: serialClean,
        first_name: String(row.first_name).trim(),
        last_name: String(row.last_name).trim(),
        grade: row.grade || (row.type === 'teacher' ? 'ครู' : 'ม.4'),
        room: row.type === 'teacher' || row.grade === 'ครู' ? '-' : (String(row.room) || '1'),
        academic_year: targetAcademicYear,
      };

      if (existingIdx !== -1) {
        devices[existingIdx] = {
          ...devices[existingIdx],
          ...deviceObj,
          updated_at: new Date().toISOString()
        };
        updatedCount++;
      } else {
        devices.push({
          id: `DEV-${Date.now()}-${index}`,
          ...deviceObj,
          created_at: new Date().toISOString()
        });
        addedCount++;
      }
    });

    setLocalData(DEVICES_KEY, devices);
    return { addedCount, updatedCount, errors };
  },

  getConfig: async () => {
    return getLocalData(CONFIG_KEY, {
      academic_years: ["2569"],
      current_academic_year: "2569",
      current_round: 1,
      admin_password: "nwsp1234"
    });
  },

  updateConfig: async (newConfig) => {
    const current = getLocalData(CONFIG_KEY, {});
    const updated = { ...current, ...newConfig };
    setLocalData(CONFIG_KEY, updated);
    return updated;
  },

  getRoomPins: async () => {
    return getLocalData(PINS_KEY, DEFAULT_ROOM_PINS);
  },

  updateRoomPin: async (roomKey, pin) => {
    const pins = getLocalData(PINS_KEY, DEFAULT_ROOM_PINS);
    pins[roomKey] = pin;
    setLocalData(PINS_KEY, pins);
    return pins;
  },

  verifyRoomPin: async (roomKey, inputPin) => {
    const pins = getLocalData(PINS_KEY, DEFAULT_ROOM_PINS);
    const validPin = pins[roomKey] || "1401";
    return String(inputPin).trim() === String(validPin).trim();
  }
};
