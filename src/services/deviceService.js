import { 
  generateSampleDevices, 
  INITIAL_ACADEMIC_YEAR, 
  INITIAL_INSPECTION_ROUND,
  DEFAULT_ROOM_PINS
} from './sampleData';

import { db, isFirebaseActive } from '../firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  writeBatch 
} from 'firebase/firestore';

const DEVICES_KEY = 'anywhere_tablet_devices_v5';
const CONFIG_KEY = 'anywhere_tablet_config_v5';
const PINS_KEY = 'anywhere_tablet_room_pins_v5';
const INSPECTIONS_KEY = 'anywhere_tablet_inspections_v5';
const SYSTEM_KEY = 'anywhere_tablet_system_v5';

export const DEFAULT_REPORT_SIGNATURES = [
  { id: 'sig-1', title: 'หัวหน้าโครงการ Anywhere Anytime', name: '' },
  { id: 'sig-2', title: 'ผู้รับรองรายงาน / ผู้บริหาร', name: '' }
];

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

export async function initStoreIfEmpty() {
  if (isFirebaseActive && db) {
    try {
      // Check central Firestore system initialization status doc
      const sysDocRef = doc(db, "settings", "system");
      const sysDocSnap = await getDoc(sysDocRef);
      const sysData = sysDocSnap.exists() ? sysDocSnap.data() : null;

      // 1. Config doc
      const configDoc = await getDoc(doc(db, "settings", "config"));
      if (!configDoc.exists()) {
        const defaultConfig = {
          academic_years: ["2569"],
          current_academic_year: INITIAL_ACADEMIC_YEAR,
          current_round: INITIAL_INSPECTION_ROUND,
          admin_password: "nwsp1234",
          report_signatures: DEFAULT_REPORT_SIGNATURES
        };
        await setDoc(doc(db, "settings", "config"), defaultConfig);
        setLocalData(CONFIG_KEY, defaultConfig);
      } else {
        setLocalData(CONFIG_KEY, configDoc.data());
      }

      // 2. Pins doc
      const pinsDoc = await getDoc(doc(db, "settings", "pins"));
      if (!pinsDoc.exists()) {
        await setDoc(doc(db, "settings", "pins"), DEFAULT_ROOM_PINS);
        setLocalData(PINS_KEY, DEFAULT_ROOM_PINS);
      } else {
        setLocalData(PINS_KEY, pinsDoc.data());
      }

      // 3. Devices doc check
      if (!sysData) {
        const devSnap = await getDocs(collection(db, "devices"));
        if (devSnap.empty) {
          const samples = generateSampleDevices();
          const batch = writeBatch(db);
          samples.forEach(d => {
            batch.set(doc(db, "devices", d.id), d);
          });
          await batch.commit();
          setLocalData(DEVICES_KEY, samples);
        }
        await setDoc(sysDocRef, { initialized: true, cleared: false });
        setLocalData(SYSTEM_KEY, { initialized: true, cleared: false });
      } else if (sysData.cleared === true) {
        setLocalData(DEVICES_KEY, []);
        setLocalData(INSPECTIONS_KEY, {});
        setLocalData(SYSTEM_KEY, sysData);
      } else {
        const devSnap = await getDocs(collection(db, "devices"));
        const list = devSnap.docs.map(doc => doc.data());
        setLocalData(DEVICES_KEY, list);
        setLocalData(SYSTEM_KEY, sysData);
      }

    } catch (e) {
      console.warn("Firestore initStore error, using local fallback:", e.message);
    }
  } else {
    const sysData = getLocalData(SYSTEM_KEY, null);
    if (!sysData) {
      let devices = generateSampleDevices();
      setLocalData(DEVICES_KEY, devices);
      setLocalData(SYSTEM_KEY, { initialized: true, cleared: false });
    }
  }
}

// Initial sync call
initStoreIfEmpty();

export const deviceService = {
  getAllDevices: async () => {
    if (isFirebaseActive && db) {
      try {
        const sysDocSnap = await getDoc(doc(db, "settings", "system"));
        if (sysDocSnap.exists() && sysDocSnap.data().cleared === true) {
          setLocalData(DEVICES_KEY, []);
          return [];
        }
        const devSnap = await getDocs(collection(db, "devices"));
        const list = devSnap.docs.map(d => d.data());
        setLocalData(DEVICES_KEY, list);
        return list;
      } catch (e) {
        console.error("Firestore getAllDevices error:", e);
      }
    }
    return getLocalData(DEVICES_KEY, []);
  },

  getDevices: async ({ academicYear, grade, room, search } = {}) => {
    let devices = await deviceService.getAllDevices();

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
        (d.prefix && d.prefix.toLowerCase().includes(q)) ||
        (d.first_name && d.first_name.toLowerCase().includes(q)) ||
        (d.last_name && d.last_name.toLowerCase().includes(q)) ||
        (d.box_no && d.box_no.toLowerCase().includes(q)) ||
        (d.box_kb_no && d.box_kb_no.toLowerCase().includes(q))
      );
    }

    return devices;
  },

  addDevice: async (deviceData) => {
    const devices = await deviceService.getAllDevices();
    
    const exists = devices.some(d => d.serial_no.toUpperCase() === deviceData.serial_no.toUpperCase() && d.academic_year === deviceData.academic_year);
    if (exists) {
      throw new Error(`Serial No. ${deviceData.serial_no} มีอยู่ในระบบแล้วสำหรับปีการศึกษานี้`);
    }

    const newDevice = {
      id: `DEV-${Date.now()}-${Math.floor(Math.random()*1000)}`,
      prefix: deviceData.prefix || 'นาย',
      ...deviceData,
      serial_no: deviceData.serial_no.trim().toUpperCase(),
      created_at: new Date().toISOString()
    };

    if (isFirebaseActive && db) {
      await setDoc(doc(db, "devices", newDevice.id), newDevice);
      await setDoc(doc(db, "settings", "system"), { initialized: true, cleared: false });
    }

    devices.push(newDevice);
    setLocalData(DEVICES_KEY, devices);
    setLocalData(SYSTEM_KEY, { initialized: true, cleared: false });
    return newDevice;
  },

  updateDevice: async (id, deviceData) => {
    const devices = await deviceService.getAllDevices();
    const idx = devices.findIndex(d => d.id === id);
    if (idx === -1) throw new Error("ไม่พบข้อมูลอุปกรณ์ที่ต้องการแก้ไข");

    const updatedDev = {
      ...devices[idx],
      ...deviceData,
      updated_at: new Date().toISOString()
    };

    if (isFirebaseActive && db) {
      await setDoc(doc(db, "devices", id), updatedDev);
    }

    devices[idx] = updatedDev;
    setLocalData(DEVICES_KEY, devices);
    return updatedDev;
  },

  deleteDevice: async (id) => {
    if (isFirebaseActive && db) {
      await deleteDoc(doc(db, "devices", id));
    }
    let devices = getLocalData(DEVICES_KEY, []);
    devices = devices.filter(d => d.id !== id);
    setLocalData(DEVICES_KEY, devices);
    return true;
  },

  clearAllDevices: async () => {
    if (isFirebaseActive && db) {
      try {
        await setDoc(doc(db, "settings", "system"), { initialized: true, cleared: true });

        const devSnap = await getDocs(collection(db, "devices"));
        if (!devSnap.empty) {
          const batch = writeBatch(db);
          devSnap.docs.forEach(d => batch.delete(doc(db, "devices", d.id)));
          await batch.commit();
        }

        const insSnap = await getDocs(collection(db, "inspections"));
        if (!insSnap.empty) {
          const batchIns = writeBatch(db);
          insSnap.docs.forEach(i => batchIns.delete(doc(db, "inspections", i.id)));
          await batchIns.commit();
        }
      } catch (e) {
        console.error("Error clearing Firestore collections:", e);
      }
    }

    setLocalData(SYSTEM_KEY, { initialized: true, cleared: true });
    setLocalData(DEVICES_KEY, []);
    setLocalData(INSPECTIONS_KEY, {});

    return true;
  },

  importCSVDevices: async (importedList, targetAcademicYear) => {
    const devices = await deviceService.getAllDevices();
    let addedCount = 0;
    let updatedCount = 0;
    const errors = [];

    const batch = (isFirebaseActive && db) ? writeBatch(db) : null;

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
        prefix: row.prefix || row.title_prefix || 'นาย',
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
        const updated = {
          ...devices[existingIdx],
          ...deviceObj,
          updated_at: new Date().toISOString()
        };
        devices[existingIdx] = updated;
        if (batch) batch.set(doc(db, "devices", updated.id), updated);
        updatedCount++;
      } else {
        const newDev = {
          id: `DEV-${Date.now()}-${index}`,
          ...deviceObj,
          created_at: new Date().toISOString()
        };
        devices.push(newDev);
        if (batch) batch.set(doc(db, "devices", newDev.id), newDev);
        addedCount++;
      }
    });

    if (batch) {
      await batch.commit();
      await setDoc(doc(db, "settings", "system"), { initialized: true, cleared: false });
    }

    setLocalData(DEVICES_KEY, devices);
    setLocalData(SYSTEM_KEY, { initialized: true, cleared: false });
    return { addedCount, updatedCount, errors };
  },

  getConfig: async () => {
    if (isFirebaseActive && db) {
      try {
        const configDoc = await getDoc(doc(db, "settings", "config"));
        if (configDoc.exists()) {
          const data = configDoc.data();
          if (!data.report_signatures) {
            data.report_signatures = DEFAULT_REPORT_SIGNATURES;
          }
          setLocalData(CONFIG_KEY, data);
          return data;
        }
      } catch (e) {
        console.error("Firestore getConfig error:", e);
      }
    }
    const cached = getLocalData(CONFIG_KEY, {
      academic_years: ["2569"],
      current_academic_year: "2569",
      current_round: 1,
      admin_password: "nwsp1234",
      report_signatures: DEFAULT_REPORT_SIGNATURES
    });
    if (!cached.report_signatures) {
      cached.report_signatures = DEFAULT_REPORT_SIGNATURES;
    }
    return cached;
  },

  updateConfig: async (newConfig) => {
    const current = await deviceService.getConfig();
    const updated = { ...current, ...newConfig };
    
    setLocalData(CONFIG_KEY, updated);

    if (isFirebaseActive && db) {
      await setDoc(doc(db, "settings", "config"), updated);
    }
    
    return updated;
  },

  getRoomPins: async () => {
    if (isFirebaseActive && db) {
      try {
        const pinsDoc = await getDoc(doc(db, "settings", "pins"));
        if (pinsDoc.exists()) {
          const data = pinsDoc.data();
          setLocalData(PINS_KEY, data);
          return data;
        }
      } catch (e) {
        console.error("Firestore getRoomPins error:", e);
      }
    }
    return getLocalData(PINS_KEY, DEFAULT_ROOM_PINS);
  },

  updateRoomPin: async (roomKey, pin) => {
    const pins = await deviceService.getRoomPins();
    pins[roomKey] = pin;
    
    setLocalData(PINS_KEY, pins);

    if (isFirebaseActive && db) {
      await setDoc(doc(db, "settings", "pins"), pins);
    }
    
    return pins;
  },

  verifyRoomPin: async (roomKey, inputPin) => {
    const pins = await deviceService.getRoomPins();
    const validPin = pins[roomKey] || "1401";
    return String(inputPin).trim() === String(validPin).trim();
  }
};
