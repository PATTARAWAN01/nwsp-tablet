import { initStoreIfEmpty } from './deviceService';
import { db, isFirebaseActive } from '../firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  query, 
  where 
} from 'firebase/firestore';

const INSPECTIONS_KEY = 'anywhere_tablet_inspections_v3';
const LOGS_KEY = 'anywhere_tablet_access_logs_v3';

function getLocalInspections() {
  try {
    const data = localStorage.getItem(INSPECTIONS_KEY);
    return data ? JSON.parse(data) : {};
  } catch (e) {
    console.error("Error loading inspections:", e);
    return {};
  }
}

function setLocalInspections(inspections) {
  try {
    localStorage.setItem(INSPECTIONS_KEY, JSON.stringify(inspections));
  } catch (e) {
    console.error("Error saving inspections:", e);
  }
}

function getLocalLogs() {
  try {
    const data = localStorage.getItem(LOGS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Error loading access logs:", e);
    return [];
  }
}

function setLocalLogs(logs) {
  try {
    localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
  } catch (e) {
    console.error("Error saving access logs:", e);
  }
}

export const inspectionService = {
  // Add an audit log entry
  addLog: async ({ academicYear, round, roomKey, teacherName, action, deviceCount, details }) => {
    const newLog = {
      id: `LOG-${Date.now()}-${Math.floor(Math.random()*1000)}`,
      academic_year: academicYear,
      round: Number(round),
      room_key: roomKey,
      teacher_name: teacherName || "ครูผู้ตรวจเช็ค",
      action: action || "บันทึกผลการตรวจเช็ค",
      device_count: deviceCount || 0,
      details: details || "",
      timestamp: new Date().toISOString()
    };

    if (isFirebaseActive && db) {
      try {
        await setDoc(doc(db, "logs", newLog.id), newLog);
      } catch (e) {
        console.error("Firestore addLog error:", e);
      }
    }

    const logs = getLocalLogs();
    logs.unshift(newLog);
    setLocalLogs(logs);
    return newLog;
  },

  // Get all audit logs (with filters)
  getLogs: async ({ academicYear, round, roomKey } = {}) => {
    if (isFirebaseActive && db) {
      try {
        const snap = await getDocs(collection(db, "logs"));
        let logs = snap.docs.map(d => d.data());
        logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setLocalLogs(logs);

        if (academicYear) {
          logs = logs.filter(l => (l.academic_year || "2569") === academicYear);
        }
        if (round) {
          logs = logs.filter(l => Number(l.round) === Number(round));
        }
        if (roomKey && roomKey !== "ทั้งหมด") {
          logs = logs.filter(l => l.room_key === roomKey);
        }
        return logs;
      } catch (e) {
        console.error("Firestore getLogs error, fallback to local:", e);
      }
    }

    let logs = getLocalLogs();
    if (academicYear) {
      logs = logs.filter(l => (l.academic_year || "2569") === academicYear);
    }
    if (round) {
      logs = logs.filter(l => Number(l.round) === Number(round));
    }
    if (roomKey && roomKey !== "ทั้งหมด") {
      logs = logs.filter(l => l.room_key === roomKey);
    }
    return logs;
  },

  // Get unique teachers who logged into/inspected a given room
  getRoomInspectors: async (academicYear, round, roomKey) => {
    const logs = await inspectionService.getLogs({ academicYear, round, roomKey });
    const teacherSet = new Set();
    logs.forEach(l => {
      if (l.teacher_name && l.teacher_name.trim() !== '') {
        teacherSet.add(l.teacher_name.trim());
      }
    });
    return Array.from(teacherSet);
  },

  // Get all inspection records for a given year & round
  getInspections: async (academicYear, round) => {
    await initStoreIfEmpty();

    if (isFirebaseActive && db) {
      try {
        const snap = await getDocs(collection(db, "inspections"));
        const result = {};
        const allLocal = getLocalInspections();

        snap.docs.forEach(d => {
          const record = d.data();
          allLocal[d.id] = record;
          if (
            (academicYear ? record.academic_year === academicYear : true) &&
            (round ? Number(record.round) === Number(round) : true)
          ) {
            result[record.serial_no] = record;
          }
        });

        setLocalInspections(allLocal);
        return result;
      } catch (e) {
        console.error("Firestore getInspections error, fallback to local:", e);
      }
    }

    const all = getLocalInspections();
    const result = {};
    Object.keys(all).forEach(key => {
      const record = all[key];
      if (
        (academicYear ? record.academic_year === academicYear : true) &&
        (round ? Number(record.round) === Number(round) : true)
      ) {
        result[record.serial_no] = record;
      }
    });

    return result;
  },

  // Save single device inspection
  saveSingleInspection: async ({ academicYear, round, serial_no, device_id, items, inspector }) => {
    const key = `${academicYear}-R${round}-${serial_no}`;

    const record = {
      id: key,
      academic_year: academicYear,
      round: Number(round),
      serial_no,
      device_id,
      inspector: inspector || "ครูที่ปรึกษา",
      inspected_at: new Date().toISOString(),
      items: items
    };

    if (isFirebaseActive && db) {
      await setDoc(doc(db, "inspections", key), record);
    }

    const all = getLocalInspections();
    all[key] = record;
    setLocalInspections(all);
    return record;
  },

  // Batch save room inspection
  saveBatchInspection: async ({ academicYear, round, roomKey, recordsList, inspector }) => {
    const all = getLocalInspections();
    
    for (const item of recordsList) {
      const key = `${academicYear}-R${round}-${item.serial_no}`;
      const rec = {
        id: key,
        academic_year: academicYear,
        round: Number(round),
        serial_no: item.serial_no,
        device_id: item.device_id,
        inspector: inspector || "ครูที่ปรึกษา",
        inspected_at: new Date().toISOString(),
        items: item.items
      };

      all[key] = rec;
      if (isFirebaseActive && db) {
        await setDoc(doc(db, "inspections", key), rec);
      }
    }

    setLocalInspections(all);

    // Record audit log
    await inspectionService.addLog({
      academicYear,
      round,
      roomKey: roomKey || "ไม่ระบุห้อง",
      teacherName: inspector || "ครูผู้ตรวจเช็ค",
      action: "บันทึกผลการตรวจเช็คอุปกรณ์ประจำห้อง",
      deviceCount: recordsList.length,
      details: `บันทึกข้อมูลอุปกรณ์จำนวน ${recordsList.length} เครื่อง`
    });

    return true;
  },

  // Compute dashboard summary stats for a single round
  getDashboardStats: async (devicesList, academicYear, round) => {
    const inspections = await inspectionService.getInspections(academicYear, round);
    
    const totalDevices = devicesList.length;
    let checkedCount = 0;
    let normalCount = 0;
    let damagedCount = 0;

    const damagedBreakdown = {
      tablet: 0,
      spen: 0,
      keyboard: 0,
      cable_white: 0,
      cable_black: 0,
      adapter: 0
    };

    const damagedDetailsList = [];

    devicesList.forEach(dev => {
      const ins = inspections[dev.serial_no];
      if (ins) {
        checkedCount++;
        const items = ins.items || {};
        let isDeviceDamaged = false;

        const categories = ['tablet', 'spen', 'keyboard', 'cable_white', 'cable_black', 'adapter'];
        categories.forEach(cat => {
          if (items[cat] && items[cat].status === 'damaged') {
            isDeviceDamaged = true;
            damagedBreakdown[cat]++;
            damagedDetailsList.push({
              serial_no: dev.serial_no,
              box_no: dev.box_no,
              box_kb_no: dev.box_kb_no,
              owner: `${dev.prefix ? dev.prefix + ' ' : ''}${dev.first_name} ${dev.last_name}`,
              type: dev.type,
              grade_room: dev.type === 'teacher' ? 'ครู' : `${dev.grade}/${dev.room}`,
              item_name: getCategoryLabel(cat),
              note: items[cat].note || 'ชำรุด',
              inspected_at: ins.inspected_at
            });
          }
        });

        if (isDeviceDamaged) {
          damagedCount++;
        } else {
          normalCount++;
        }
      }
    });

    const uncheckedCount = totalDevices - checkedCount;
    const progressPercent = totalDevices > 0 ? Math.round((checkedCount / totalDevices) * 100) : 0;
    const normalPercent = checkedCount > 0 ? Math.round((normalCount / checkedCount) * 100) : 0;
    const damagedPercent = checkedCount > 0 ? Math.round((damagedCount / checkedCount) * 100) : 0;

    return {
      totalDevices,
      checkedCount,
      uncheckedCount,
      normalCount,
      damagedCount,
      progressPercent,
      normalPercent,
      damagedPercent,
      damagedBreakdown,
      damagedDetailsList
    };
  },

  // Compute annual summary stats across all 5 rounds
  getAnnualDashboardStats: async (devicesList, academicYear) => {
    const roundsData = [];
    const annualDamagedBreakdown = {
      tablet: 0,
      spen: 0,
      keyboard: 0,
      cable_white: 0,
      cable_black: 0,
      adapter: 0
    };
    
    let totalDevices = devicesList.length;

    for (let r = 1; r <= 5; r++) {
      const insMap = await inspectionService.getInspections(academicYear, r);
      let checkedCount = 0;
      let normalCount = 0;
      let damagedCount = 0;

      const roundDamagedBreakdown = {
        tablet: 0, spen: 0, keyboard: 0, cable_white: 0, cable_black: 0, adapter: 0
      };

      devicesList.forEach(dev => {
        const ins = insMap[dev.serial_no];
        if (ins) {
          checkedCount++;
          const items = ins.items || {};
          let isDamaged = false;
          ['tablet', 'spen', 'keyboard', 'cable_white', 'cable_black', 'adapter'].forEach(cat => {
            if (items[cat] && items[cat].status === 'damaged') {
              isDamaged = true;
              roundDamagedBreakdown[cat]++;
              annualDamagedBreakdown[cat]++;
            }
          });
          if (isDamaged) damagedCount++;
          else normalCount++;
        }
      });

      const progressPercent = totalDevices > 0 ? Math.round((checkedCount / totalDevices) * 100) : 0;

      roundsData.push({
        round: r,
        name: `รอบที่ ${r}`,
        checkedCount,
        normalCount,
        damagedCount,
        progressPercent,
        damagedBreakdown: roundDamagedBreakdown
      });
    }

    return {
      totalDevices,
      roundsData,
      annualDamagedBreakdown
    };
  }
};

export function getCategoryLabel(key) {
  const labels = {
    tablet: 'Tablet',
    spen: 'ปากกา S Pen',
    keyboard: 'คีย์บอร์ด',
    cable_white: 'สายชาร์จ Tablet (สีขาว)',
    cable_black: 'สายชาร์จคีย์บอร์ด (สีดำ)',
    adapter: 'Adapter'
  };
  return labels[key] || key;
}
