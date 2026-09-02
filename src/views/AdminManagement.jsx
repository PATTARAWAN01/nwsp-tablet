import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { deviceService } from '../services/deviceService';
import { inspectionService, getCategoryLabel } from '../services/inspectionService';
import Papa from 'papaparse';
import { 
  ShieldCheck, 
  Lock, 
  Upload, 
  Plus, 
  Edit, 
  Trash2, 
  Download, 
  Key, 
  Calendar, 
  Tablet, 
  Search, 
  CheckCircle2, 
  FileSpreadsheet,
  Save,
  KeyRound,
  RotateCcw,
  History,
  UserCheck,
  AlertCircle,
  XCircle,
  RefreshCw,
  FileX,
  AlertTriangle,
  UserCheck2,
  UserPlus
} from 'lucide-react';
import { DEFAULT_ROOM_PINS } from '../services/sampleData';

export default function AdminManagement() {
  const { isAdmin, loginAdmin, logoutAdmin, config, updateGlobalSettings } = useAuth();
  
  const [passwordInput, setPasswordInput] = useState("");
  const [loginErr, setLoginErr] = useState("");

  const [adminSubTab, setAdminSubTab] = useState('devices');

  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGrade, setFilterGrade] = useState("ทั้งหมด");
  const [filterType, setFilterType] = useState("ทั้งหมด");

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    type: 'student',
    prefix: 'นาย',
    box_no: '',
    box_kb_no: '',
    serial_no: '',
    first_name: '',
    last_name: '',
    grade: 'ม.4',
    room: '1',
    academic_year: config.current_academic_year
  });

  const [csvFile, setCsvFile] = useState(null);
  const [csvParsed, setCsvParsed] = useState([]);
  const [csvTargetYear, setCsvTargetYear] = useState(config.current_academic_year);
  const [importStatus, setImportStatus] = useState(null);

  const [newYearInput, setNewYearInput] = useState("");
  const [newPassInput, setNewPassInput] = useState("");

  const [roomPins, setRoomPins] = useState({});
  const [auditLogs, setAuditLogs] = useState([]);
  const [logFilterRoom, setLogFilterRoom] = useState("ทั้งหมด");
  const [logSearchQuery, setLogSearchQuery] = useState("");

  // Inspection records management state
  const [inspectionsList, setInspectionsList] = useState({});
  const [manageSelectedRound, setManageSelectedRound] = useState(config.current_round);
  const [manageSelectedGrade, setManageSelectedGrade] = useState("ทั้งหมด");
  const [manageSelectedRoom, setManageSelectedRoom] = useState("ทั้งหมด");
  const [manageSearchQuery, setManageSearchQuery] = useState("");

  // Custom Report Signatures state
  const [reportSignatures, setReportSignatures] = useState(
    config.report_signatures || [
      { id: 'sig-1', title: 'หัวหน้าโครงการ Anywhere Anytime', name: '' },
      { id: 'sig-2', title: 'ผู้รับรองรายงาน / ผู้บริหาร', name: '' }
    ]
  );

  // Popup Modal Alert
  const [modalPopup, setModalPopup] = useState(null);

  const loadAdminData = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const list = await deviceService.getAllDevices();
      setDevices(list);

      const pins = await deviceService.getRoomPins();
      setRoomPins(pins);

      // Fetch ALL audit logs
      const logs = await inspectionService.getLogs({});
      setAuditLogs(logs);

      // Fetch inspections for management
      const ins = await inspectionService.getInspections(config.current_academic_year, manageSelectedRound);
      setInspectionsList(ins);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadAdminData();
    }
  }, [isAdmin, config.current_academic_year, config.current_round, manageSelectedRound]);

  useEffect(() => {
    if (config.report_signatures) {
      setReportSignatures(config.report_signatures);
    }
  }, [config]);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoginErr("");
    const res = await loginAdmin(passwordInput);
    if (!res.success) {
      setLoginErr(res.message);
    } else {
      setPasswordInput("");
      await loadAdminData();
    }
  };

  const handleDeviceSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await deviceService.updateDevice(editingId, formData);
        
        await inspectionService.addLog({
          academicYear: config.current_academic_year,
          round: config.current_round,
          roomKey: "Admin",
          teacherName: "ผู้ดูแลระบบ (Admin)",
          action: "แก้ไขข้อมูลอุปกรณ์",
          deviceCount: 1,
          details: `แก้ไขข้อมูล Serial No. ${formData.serial_no} (${formData.prefix || ''}${formData.first_name} ${formData.last_name})`
        });

        setModalPopup({
          type: 'success',
          title: 'อัปเดตข้อมูลสำเร็จ! 🎉',
          message: `แก้ไขข้อมูลอุปกรณ์ ${formData.serial_no} เรียบร้อยแล้ว`
        });
      } else {
        await deviceService.addDevice(formData);

        await inspectionService.addLog({
          academicYear: config.current_academic_year,
          round: config.current_round,
          roomKey: "Admin",
          teacherName: "ผู้ดูแลระบบ (Admin)",
          action: "เพิ่มอุปกรณ์ใหม่",
          deviceCount: 1,
          details: `เพิ่มอุปกรณ์ Serial No. ${formData.serial_no} ของ ${formData.prefix || ''}${formData.first_name} ${formData.last_name}`
        });

        setModalPopup({
          type: 'success',
          title: 'เพิ่มข้อมูลอุปกรณ์สำเร็จ! 🎉',
          message: `เพิ่มอุปกรณ์ ${formData.serial_no} ของ ${formData.prefix || ''} ${formData.first_name} ${formData.last_name} เรียบร้อยแล้ว`
        });
      }
      setShowFormModal(false);
      resetForm();
      await loadAdminData();
    } catch (err) {
      setModalPopup({
        type: 'error',
        title: 'ทำรายการไม่สำเร็จ!',
        message: err.message
      });
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      type: 'student',
      prefix: 'นาย',
      box_no: '',
      box_kb_no: '',
      serial_no: '',
      first_name: '',
      last_name: '',
      grade: 'ม.4',
      room: '1',
      academic_year: config.current_academic_year
    });
  };

  const handleEdit = (dev) => {
    setEditingId(dev.id);
    setFormData({
      type: dev.type || 'student',
      prefix: dev.prefix || 'นาย',
      box_no: dev.box_no || '',
      box_kb_no: dev.box_kb_no || '',
      serial_no: dev.serial_no || '',
      first_name: dev.first_name || '',
      last_name: dev.last_name || '',
      grade: dev.grade || 'ม.4',
      room: dev.room || '1',
      academic_year: dev.academic_year || config.current_academic_year
    });
    setShowFormModal(true);
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`ยืนยันการลบข้อมูลอุปกรณ์ของ ${name}?`)) {
      await deviceService.deleteDevice(id);

      await inspectionService.addLog({
        academicYear: config.current_academic_year,
        round: config.current_round,
        roomKey: "Admin",
        teacherName: "ผู้ดูแลระบบ (Admin)",
        action: "ลบอุปกรณ์",
        deviceCount: 1,
        details: `ลบข้อมูลอุปกรณ์ของ ${name}`
      });

      setModalPopup({
        type: 'success',
        title: 'ลบข้อมูลสำเร็จ!',
        message: `ลบข้อมูลของ ${name} ออกจากระบบแล้ว`
      });
      await loadAdminData();
    }
  };

  const handleDeleteInspectionRecord = async (serialNo, ownerName, roundNum) => {
    if (window.confirm(`⚠️ ยืนยันการลบผลการตรวจเช็คของ "${ownerName}" (Serial: ${serialNo}) รอบที่ ${roundNum}?\n\n(ผลการตรวจจะถูกยกเลิก และกลับเป็นสถานะยังไม่ได้ตรวจ)`)) {
      await inspectionService.deleteInspection(config.current_academic_year, roundNum, serialNo);

      await inspectionService.addLog({
        academicYear: config.current_academic_year,
        round: roundNum,
        roomKey: "Admin",
        teacherName: "ผู้ดูแลระบบ (Admin)",
        action: "ลบผลการตรวจเช็คอุปกรณ์",
        deviceCount: 1,
        details: `ลบผลการตรวจเช็ค Serial No. ${serialNo} (${ownerName}) ในรอบที่ ${roundNum}`
      });

      setModalPopup({
        type: 'success',
        title: 'ลบผลการตรวจเช็คสำเร็จ!',
        message: `ลบผลการตรวจเช็คอุปกรณ์ของ ${ownerName} (รอบที่ ${roundNum}) เรียบร้อยแล้ว`
      });
      await loadAdminData();
    }
  };

  const handleDeleteLogEntry = async (logId, actionName) => {
    if (window.confirm(`ยืนยันการลบประวัติการเข้าใช้งานรายการนี้?\n("${actionName}")`)) {
      await inspectionService.deleteLog(logId);
      setModalPopup({
        type: 'success',
        title: 'ลบประวัติสำเร็จ!',
        message: 'ลบรายการประวัติการเข้าใช้งานเรียบร้อยแล้ว'
      });
      await loadAdminData();
    }
  };

  const handleClearAllData = async () => {
    if (window.confirm("⚠️ ยืนยันการลบข้อมูลตัวอย่างทั้งหมดออกจากระบบใช่หรือไม่?\n(ระบบจะเริ่มจากฐานข้อมูลว่างเปล่า พร้อมสำหรับนำเข้าข้อมูลจริง)")) {
      await deviceService.clearAllDevices();

      await inspectionService.addLog({
        academicYear: config.current_academic_year,
        round: config.current_round,
        roomKey: "Admin",
        teacherName: "ผู้ดูแลระบบ (Admin)",
        action: "ล้างข้อมูลตัวอย่างทั้งหมด",
        deviceCount: devices.length,
        details: "ล้างข้อมูลอุปกรณ์และการตรวจเช็คทั้งหมดในระบบ"
      });

      setModalPopup({
        type: 'success',
        title: 'ล้างข้อมูลสำเร็จ!',
        message: 'ลบข้อมูลตัวอย่างทั้งหมดเรียบร้อยแล้ว ฐานข้อมูลว่างเปล่าพร้อมใช้งานจริง'
      });
      await loadAdminData();
    }
  };

  const handleCsvFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCsvFile(file);
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvParsed(results.data);
      },
      error: (err) => {
        setModalPopup({
          type: 'error',
          title: 'อ่านไฟล์ CSV ไม่สำเร็จ!',
          message: err.message
        });
      }
    });
  };

  const handleConfirmCsvImport = async () => {
    if (csvParsed.length === 0) return;
    setLoading(true);
    try {
      const res = await deviceService.importCSVDevices(csvParsed, csvTargetYear);
      setImportStatus(res);

      await inspectionService.addLog({
        academicYear: csvTargetYear,
        round: config.current_round,
        roomKey: "Admin",
        teacherName: "ผู้ดูแลระบบ (Admin)",
        action: "นำเข้าข้อมูล CSV",
        deviceCount: res.addedCount + res.updatedCount,
        details: `นำเข้าข้อมูลอุปกรณ์ใหม่ ${res.addedCount} เครื่อง, อัปเดต ${res.updatedCount} เครื่อง`
      });

      setModalPopup({
        type: 'success',
        title: 'นำเข้าข้อมูล CSV สำเร็จ! 🎉',
        message: `เพิ่มข้อมูลใหม่ ${res.addedCount} เครื่อง, อัปเดต ${res.updatedCount} เครื่อง`
      });
      await loadAdminData();
    } catch (e) {
      setModalPopup({
        type: 'error',
        title: 'การนำเข้าข้อมูลล้มเหลว!',
        message: e.message
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadSampleCSV = () => {
    const csvContent = 
`type,prefix,serial_no,first_name,last_name,grade,room,box_no,box_kb_no
student,นาย,R52T100001X,กิตติพงษ์,ใจดี,ม.4,1,BOX-STU-001,KB-STU-001
student,นางสาว,R52T100002X,ชลธิชา,มีสุข,ม.4,2,BOX-STU-002,KB-STU-002
teacher,นาย,R52T200001X,สมชาย,วิชาการ,ครู,-,BOX-TCH-001,KB-TCH-001`;
    
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'sample_tablet_import.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSignatureChange = (index, field, value) => {
    const updated = [...reportSignatures];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    setReportSignatures(updated);
  };

  const handleAddSignatureBlock = () => {
    const newBlock = {
      id: `sig-${Date.now()}`,
      title: 'ผู้รับรองรายงานเพิ่มเติม',
      name: ''
    };
    setReportSignatures([...reportSignatures, newBlock]);
  };

  const handleDeleteSignatureBlock = (index) => {
    if (reportSignatures.length <= 1) {
      setModalPopup({
        type: 'warning',
        title: 'ไม่สามารถลบได้',
        message: 'ต้องมีช่องผู้ลงชื่อท้ายรายงานอย่างน้อย 1 รายการ'
      });
      return;
    }
    const updated = reportSignatures.filter((_, idx) => idx !== index);
    setReportSignatures(updated);
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    let years = [...(config.academic_years || ["2569"])];

    if (newYearInput && !years.includes(newYearInput.trim())) {
      years.push(newYearInput.trim());
      years.sort();
    }

    await updateGlobalSettings({
      academicYearsList: years,
      adminPassword: newPassInput ? newPassInput.trim() : config.admin_password,
      reportSignatures: reportSignatures
    });

    await inspectionService.addLog({
      academicYear: config.current_academic_year,
      round: config.current_round,
      roomKey: "Admin",
      teacherName: "ผู้ดูแลระบบ (Admin)",
      action: "อัปเดตการตั้งค่าระบบ",
      deviceCount: 0,
      details: `อัปเดตตั้งค่าปีการศึกษา / รอบการตรวจที่ ${config.current_round} / ผู้ลงชื่อท้ายรายงาน ${reportSignatures.length} ท่าน`
    });

    setModalPopup({
      type: 'success',
      title: 'บันทึกการตั้งค่าสำเร็จ! 🎉',
      message: 'อัปเดตปีการศึกษา รอบการตรวจ รหัสผ่าน และตำแหน่ง/ผู้ลงชื่อท้ายรายงานเรียบร้อยแล้ว'
    });

    setNewYearInput("");
    setNewPassInput("");
  };

  const handlePinChange = async (roomKey, pinValue) => {
    const updatedPins = await deviceService.updateRoomPin(roomKey, pinValue);
    setRoomPins({ ...updatedPins });

    await inspectionService.addLog({
      academicYear: config.current_academic_year,
      round: config.current_round,
      roomKey: roomKey,
      teacherName: "ผู้ดูแลระบบ (Admin)",
      action: "เปลี่ยนรหัส PIN ประจำห้อง",
      deviceCount: 0,
      details: `อัปเดตรหัส PIN ประจำห้อง ${roomKey}`
    });
  };

  const filteredDevices = devices.filter(d => {
    if (filterType !== "ทั้งหมด" && d.type !== filterType) return false;
    if (filterGrade !== "ทั้งหมด" && d.grade !== filterGrade) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        d.serial_no.toLowerCase().includes(q) ||
        (d.prefix && d.prefix.toLowerCase().includes(q)) ||
        d.first_name.toLowerCase().includes(q) ||
        d.last_name.toLowerCase().includes(q) ||
        d.box_no.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredLogs = auditLogs.filter(l => {
    if (logFilterRoom !== "ทั้งหมด" && l.room_key !== logFilterRoom) return false;
    if (logSearchQuery) {
      const q = logSearchQuery.toLowerCase();
      return (
        (l.teacher_name && l.teacher_name.toLowerCase().includes(q)) ||
        (l.action && l.action.toLowerCase().includes(q)) ||
        (l.details && l.details.toLowerCase().includes(q)) ||
        (l.room_key && l.room_key.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Filter inspected devices for the Manage Inspections sub-tab
  const inspectedDevicesList = devices.map(dev => {
    const record = inspectionsList[dev.serial_no];
    return {
      device: dev,
      record: record || null
    };
  }).filter(item => {
    if (!item.record) return false;
    if (manageSelectedGrade !== "ทั้งหมด" && item.device.grade !== manageSelectedGrade) return false;
    if (manageSelectedRoom !== "ทั้งหมด" && String(item.device.room) !== String(manageSelectedRoom)) return false;
    if (manageSearchQuery) {
      const q = manageSearchQuery.toLowerCase();
      return (
        item.device.serial_no.toLowerCase().includes(q) ||
        (item.device.prefix && item.device.prefix.toLowerCase().includes(q)) ||
        item.device.first_name.toLowerCase().includes(q) ||
        item.device.last_name.toLowerCase().includes(q)
      );
    }
    return true;
  });

  if (!isAdmin) {
    return (
      <div className="modern-glass-card rounded-3xl p-8 border border-white/80 shadow-xl max-w-md mx-auto space-y-6 animate-fade-in my-12">
        <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto border border-amber-200 shadow-xs">
          <ShieldCheck className="w-8 h-8" />
        </div>

        <div className="text-center">
          <h3 className="text-xl font-extrabold font-prompt text-slate-900">
            เข้าสู่ระบบหลังบ้าน (Admin)
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-1">
            โรงเรียนหนองวัวซอพิทยาคม • จัดการข้อมูลและสิทธิ์
          </p>
        </div>

        <form onSubmit={handleAdminLogin} className="space-y-4">
          <div>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="password"
                placeholder="กรอกรหัสผ่าน Admin..."
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-300 rounded-2xl text-center text-lg font-mono font-bold tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-inner"
                required
              />
            </div>
          </div>

          {loginErr && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold text-center">
              {loginErr}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold rounded-2xl text-sm transition-all shadow-md shadow-amber-400/30 flex items-center justify-center space-x-2"
          >
            <ShieldCheck className="w-5 h-5" />
            <span>เข้าสู่ระบบหลังบ้าน</span>
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Admin Top Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center space-x-2 text-amber-300 text-xs font-bold mb-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>ผู้ดูแลระบบ (Admin) • ระบบหลังบ้าน</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-prompt text-white">
            จัดการข้อมูล Tablet และสิทธิ์การใช้งาน
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm mt-1 font-light">
            โรงเรียนหนองวัวซอพิทยาคม • ม.4 - ม.6 (ห้อง 1 - 4) และ ครูผู้สอน (ปี {config.current_academic_year})
          </p>
        </div>

        <button
          onClick={logoutAdmin}
          className="self-start md:self-auto px-4 py-2.5 bg-white/10 hover:bg-rose-600 text-white border border-white/20 rounded-2xl text-xs font-extrabold transition-colors shadow-xs flex items-center space-x-2"
        >
          <Lock className="w-4 h-4" />
          <span>ออกจากระบบหลังบ้าน</span>
        </button>
      </div>

      {/* Admin Sub-navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setAdminSubTab('devices')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all ${
            adminSubTab === 'devices'
              ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Tablet className="w-4 h-4" />
          <span>รายการอุปกรณ์ ({devices.length})</span>
        </button>

        <button
          onClick={() => setAdminSubTab('manage-inspections')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all ${
            adminSubTab === 'manage-inspections'
              ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileX className="w-4 h-4" />
          <span>ลบ/แก้ไขผลการตรวจเช็ค</span>
        </button>

        <button
          onClick={() => setAdminSubTab('csv')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all ${
            adminSubTab === 'csv'
              ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>นำเข้าข้อมูล (CSV)</span>
        </button>

        <button
          onClick={() => { setAdminSubTab('logs'); loadAdminData(); }}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all ${
            adminSubTab === 'logs'
              ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          <span>ประวัติการเข้าใช้งานระบบ ({auditLogs.length})</span>
        </button>

        <button
          onClick={() => setAdminSubTab('settings')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all ${
            adminSubTab === 'settings'
              ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>ตั้งค่าปีการศึกษา & ผู้ลงชื่อท้ายรายงาน</span>
        </button>

        <button
          onClick={() => setAdminSubTab('pins')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all ${
            adminSubTab === 'pins'
              ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>ตั้งค่า PIN ประจำห้องครู (13 ห้อง)</span>
        </button>
      </div>

      {/* --- SUB TAB 1: DEVICE LIST & SINGLE ADD --- */}
      {adminSubTab === 'devices' && (
        <div className="space-y-4">
          
          <div className="modern-glass p-4 rounded-3xl border border-white/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="ค้น Serial No., ชื่อ, เลข BOX..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-white border border-slate-200 text-slate-700 text-xs px-3 py-2 rounded-xl font-bold focus:outline-none"
              >
                <option value="ทั้งหมด">ประเภท: ทั้งหมด</option>
                <option value="student">นักเรียน</option>
                <option value="teacher">ครูผู้สอน</option>
              </select>

              <select
                value={filterGrade}
                onChange={(e) => setFilterGrade(e.target.value)}
                className="bg-white border border-slate-200 text-slate-700 text-xs px-3 py-2 rounded-xl font-bold focus:outline-none"
              >
                <option value="ทั้งหมด">ระดับชั้น: ทั้งหมด (ม.4-ม.6)</option>
                <option value="ม.4">ม.4</option>
                <option value="ม.5">ม.5</option>
                <option value="ม.6">ม.6</option>
                <option value="ครู">ครู</option>
              </select>
            </div>

            <div className="flex items-center space-x-2 self-start md:self-auto">
              <button
                onClick={handleClearAllData}
                className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-extrabold rounded-2xl text-xs transition-colors flex items-center space-x-1.5"
                title="ลบข้อมูลตัวอย่างทั้งหมด"
              >
                <RotateCcw className="w-4 h-4 text-rose-600" />
                <span>ลบข้อมูลตัวอย่างทั้งหมด</span>
              </button>

              <button
                onClick={() => { resetForm(); setShowFormModal(true); }}
                className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold rounded-2xl text-xs transition-all shadow-md shadow-amber-400/20 flex items-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>เพิ่มอุปกรณ์ทีละเครื่อง</span>
              </button>
            </div>

          </div>

          <div className="modern-glass rounded-3xl border border-white/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50 text-slate-800 uppercase text-xs border-b border-slate-200 font-bold">
                  <tr>
                    <th className="px-5 py-4">1. ประเภท</th>
                    <th className="px-5 py-4 text-blue-700 font-extrabold text-xs">2. Serial No.</th>
                    <th className="px-5 py-4 text-slate-900 font-extrabold text-xs">3. ชื่อ - นามสกุล</th>
                    <th className="px-5 py-4">4. ระดับชั้น / ห้อง</th>
                    <th className="px-5 py-4">5. เลข BOX</th>
                    <th className="px-5 py-4">6. เลข BOX KB</th>
                    <th className="px-5 py-4 text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white/60">
                  {filteredDevices.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-slate-500 font-medium">
                        ไม่พบข้อมูลอุปกรณ์ในระบบ (สามารถกด "นำเข้าข้อมูล (CSV)" หรือ "เพิ่มอุปกรณ์ทีละเครื่อง" ได้)
                      </td>
                    </tr>
                  ) : (
                    filteredDevices.map((dev) => (
                      <tr key={dev.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-5 py-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${
                            dev.type === 'teacher' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {dev.type === 'teacher' ? 'ครูผู้สอน' : 'นักเรียน'}
                          </span>
                        </td>

                        <td className="px-5 py-4 font-mono font-extrabold text-blue-700 text-base">
                          {dev.serial_no}
                        </td>

                        <td className="px-5 py-4 font-bold text-slate-900 font-prompt text-base">
                          {dev.prefix || ''} {dev.first_name} {dev.last_name}
                        </td>

                        <td className="px-5 py-4 text-xs font-bold text-slate-800">
                          {dev.type === 'teacher' ? 'ครูผู้สอน' : `${dev.grade}/${dev.room}`}
                        </td>

                        <td className="px-5 py-4 font-mono text-xs text-slate-700">{dev.box_no}</td>

                        <td className="px-5 py-4 font-mono text-xs text-slate-700">{dev.box_kb_no}</td>

                        <td className="px-5 py-4 text-right space-x-2">
                          <button
                            onClick={() => handleEdit(dev)}
                            className="p-2 bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 rounded-xl text-xs transition-colors"
                            title="แก้ไข"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(dev.id, `${dev.prefix || ''} ${dev.first_name} ${dev.last_name}`)}
                            className="p-2 bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-900 rounded-xl text-xs transition-colors"
                            title="ลบ"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* --- SUB TAB 2: MANAGE & DELETE INSPECTION RECORDS --- */}
      {adminSubTab === 'manage-inspections' && (
        <div className="modern-glass rounded-3xl p-6 border border-white/80 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/60">
            <div>
              <h3 className="text-lg font-bold font-prompt text-slate-900">
                ลบและแก้ไขผลการตรวจเช็คอุปกรณ์ (Manage Inspection Records)
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                ในกรณีที่ครูตรวจเช็คผิด หรือต้องการยกเลิกผลการตรวจเฉพาะเครื่อง แอดมินสามารถลบผลการตรวจออกเพื่อให้ครูตรวจใหม่ได้
              </p>
            </div>

            {/* Filter Controls for Inspection Records */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-600">รอบที่:</span>
                <select
                  value={manageSelectedRound}
                  onChange={(e) => setManageSelectedRound(Number(e.target.value))}
                  className="bg-transparent font-extrabold text-blue-900 text-xs focus:outline-none cursor-pointer"
                >
                  {[1, 2, 3, 4, 5].map(r => (
                    <option key={r} value={r}>รอบที่ {r}</option>
                  ))}
                </select>
              </div>

              <select
                value={manageSelectedGrade}
                onChange={(e) => setManageSelectedGrade(e.target.value)}
                className="bg-white border border-slate-200 text-slate-800 text-xs px-3 py-2 rounded-xl font-bold focus:outline-none cursor-pointer"
              >
                <option value="ทั้งหมด">ชั้น: ทั้งหมด</option>
                <option value="ม.4">ม.4</option>
                <option value="ม.5">ม.5</option>
                <option value="ม.6">ม.6</option>
                <option value="ครู">ครู</option>
              </select>

              <select
                value={manageSelectedRoom}
                onChange={(e) => setManageSelectedRoom(e.target.value)}
                className="bg-white border border-slate-200 text-slate-800 text-xs px-3 py-2 rounded-xl font-bold focus:outline-none cursor-pointer"
              >
                <option value="ทั้งหมด">ห้อง: ทั้งหมด</option>
                <option value="1">ห้อง 1</option>
                <option value="2">ห้อง 2</option>
                <option value="3">ห้อง 3</option>
                <option value="4">ห้อง 4</option>
              </select>

              <div className="relative w-48">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="ค้น Serial, ชื่อ..."
                  value={manageSearchQuery}
                  onChange={(e) => setManageSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {inspectedDevicesList.length === 0 ? (
            <div className="p-10 text-center text-slate-500">
              <FileX className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-60" />
              <p className="font-bold text-slate-700">ไม่พบข้อมูลรายการที่ตรวจเช็คแล้วในรอบนี้</p>
              <p className="text-xs text-slate-400">ยังไม่มีการบันทึกผลการตรวจเช็คในรอบที่เลือก หรือไม่ตรงตามเงื่อนไขค้นหา</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-900 font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3 text-blue-900">Serial No.</th>
                    <th className="p-3 text-slate-900 font-extrabold">ผู้ครอบครอง</th>
                    <th className="p-3">ชั้น / ห้อง</th>
                    <th className="p-3">สถานะผลการตรวจ</th>
                    <th className="p-3">ผู้ตรวจเช็ค & วันที่บันทึก</th>
                    <th className="p-3 text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white/60">
                  {inspectedDevicesList.map((item, idx) => {
                    const dev = item.device;
                    const rec = item.record;
                    const items = rec.items || {};

                    const damagedItems = Object.keys(items).filter(k => items[k] && items[k].status === 'damaged');
                    const isAllNormal = damagedItems.length === 0;

                    return (
                      <tr key={dev.id} className="hover:bg-amber-50/30 transition-colors">
                        <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                        <td className="p-3 font-mono font-extrabold text-blue-900 text-sm whitespace-nowrap">
                          {dev.serial_no}
                        </td>
                        <td className="p-3 font-bold text-slate-900 font-prompt text-sm whitespace-nowrap">
                          {dev.prefix || ''} {dev.first_name} {dev.last_name}
                        </td>
                        <td className="p-3 font-semibold text-slate-800 whitespace-nowrap">
                          {dev.type === 'teacher' ? 'ครูผู้สอน' : `${dev.grade}/${dev.room}`}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {isAllNormal ? (
                            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-extrabold border border-emerald-300 inline-flex items-center space-x-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>ปกติทุกรายการ</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-full font-extrabold border border-rose-300 inline-flex items-center space-x-1">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>ชำรุด {damagedItems.length} รายการ ({damagedItems.map(k => getCategoryLabel(k)).join(', ')})</span>
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-medium text-slate-600 whitespace-nowrap">
                          <div>👤 {rec.inspector || 'ครูที่ปรึกษา'}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {rec.inspected_at ? new Date(rec.inspected_at).toLocaleString('th-TH') : '-'}
                          </div>
                        </td>
                        <td className="p-3 text-right whitespace-nowrap">
                          <button
                            onClick={() => handleDeleteInspectionRecord(dev.serial_no, `${dev.prefix || ''} ${dev.first_name} ${dev.last_name}`, manageSelectedRound)}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 border border-rose-200 rounded-xl font-extrabold text-xs transition-all shadow-xs flex items-center space-x-1 ml-auto"
                            title="ลบผลการตรวจเช็ค"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>ลบผลการตรวจ</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* --- SUB TAB 3: CSV BATCH IMPORT --- */}
      {adminSubTab === 'csv' && (
        <div className="modern-glass rounded-3xl p-6 border border-white/80 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/60">
            <div>
              <h3 className="text-lg font-bold font-prompt text-slate-900">
                นำเข้าข้อมูลอุปกรณ์และผู้ครอบครองจำนวนมาก (CSV Import)
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                รองรับการนำเข้าข้อมูลนักเรียน ม.4 - ม.6 (ห้อง 1-4) และ ครูผู้สอน
              </p>
            </div>

            <button
              onClick={downloadSampleCSV}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition-colors flex items-center space-x-1.5 self-start sm:self-auto"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>ดาวน์โหลดไฟล์ตัวอย่าง CSV</span>
            </button>
          </div>

          <div className="border-2 border-dashed border-slate-300 hover:border-amber-400 rounded-3xl p-8 text-center bg-white/70 transition-colors">
            <Upload className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <p className="font-extrabold text-slate-900 text-sm">เลือกไฟล์ CSV เพื่อนำเข้าข้อมูล</p>
            <p className="text-xs text-slate-400 mt-1 mb-4">รองรับไฟล์รูปแบบ .csv เท่านั้น</p>
            
            <input
              type="file"
              accept=".csv"
              onChange={handleCsvFileChange}
              className="hidden"
              id="csv-file-input"
            />
            <label
              htmlFor="csv-file-input"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-extrabold cursor-pointer shadow-md shadow-blue-600/30 transition-all inline-flex items-center space-x-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>เลือกไฟล์จากเครื่อง...</span>
            </label>
          </div>

          {csvParsed.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">
                  ตัวอย่างข้อมูลที่พบในไฟล์ ({csvParsed.length} แถว)
                </span>

                <button
                  onClick={handleConfirmCsvImport}
                  disabled={loading}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-extrabold shadow-md shadow-emerald-600/30 flex items-center space-x-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{loading ? 'กำลังบันทึก...' : 'ยืนยันนำเข้าข้อมูลลงฐานข้อมูล'}</span>
                </button>
              </div>

              <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-2xl bg-white">
                <table className="w-full text-left text-xs font-sarabun text-slate-700">
                  <thead className="bg-slate-50 sticky top-0 font-bold text-slate-900">
                    <tr>
                      <th className="p-2.5 border-b">#</th>
                      <th className="p-2.5 border-b">1. Type</th>
                      <th className="p-2.5 border-b text-blue-700 font-extrabold">2. Serial No.</th>
                      <th className="p-2.5 border-b text-slate-900 font-extrabold">3. ชื่อ - นามสกุล</th>
                      <th className="p-2.5 border-b">4. ชั้น/ห้อง</th>
                      <th className="p-2.5 border-b">5. BOX No</th>
                      <th className="p-2.5 border-b">6. BOX KB No</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {csvParsed.slice(0, 50).map((row, idx) => (
                      <tr key={idx}>
                        <td className="p-2.5 text-slate-400">{idx + 1}</td>
                        <td className="p-2.5 font-bold">{row.type || 'student'}</td>
                        <td className="p-2.5 font-mono font-extrabold text-blue-700 text-sm">{row.serial_no}</td>
                        <td className="p-2.5 font-bold text-slate-900">{row.prefix || ''} {row.first_name} {row.last_name}</td>
                        <td className="p-2.5 font-semibold">{row.grade}/{row.room}</td>
                        <td className="p-2.5 font-mono">{row.box_no}</td>
                        <td className="p-2.5 font-mono">{row.box_kb_no}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- SUB TAB 4: AUDIT LOGS --- */}
      {adminSubTab === 'logs' && (
        <div className="modern-glass rounded-3xl p-6 border border-white/80 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/60">
            <div>
              <h3 className="text-lg font-bold font-prompt text-slate-900">
                ประวัติการเข้าใช้งานระบบ (Audit Logs & Login History)
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                ติดตามสถิติและประวัติว่าครูท่านใดเข้าตรวจเช็ค หรือ Admin ทำรายการอะไรเมื่อไหร่
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="ค้นชื่อครู, การทำรายการ..."
                  value={logSearchQuery}
                  onChange={(e) => setLogSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <select
                value={logFilterRoom}
                onChange={(e) => setLogFilterRoom(e.target.value)}
                className="bg-white border border-slate-200 text-slate-800 text-xs px-3 py-1.5 rounded-xl font-bold focus:outline-none cursor-pointer"
              >
                <option value="ทั้งหมด">ทุกห้อง/ทั้งหมด</option>
                <option value="Admin">Admin</option>
                {Object.keys(DEFAULT_ROOM_PINS || {}).map(rk => (
                  <option key={rk} value={rk}>ห้อง {rk}</option>
                ))}
              </select>

              <button
                onClick={loadAdminData}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
                title="รีเฟรชประวัติลอค"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {filteredLogs.length === 0 ? (
            <div className="p-10 text-center text-slate-500">
              <History className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-60" />
              <p className="font-bold text-slate-700">ไม่พบประวัติการเข้าใช้งานระบบ</p>
              <p className="text-xs text-slate-400">เมื่อครูหรือ Admin ปลดล็อก PIN / เข้าใช้งาน ประวัติจะถูกบันทึกที่นี่อัตโนมัติ</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-900 font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="p-3">วัน-เวลาที่ทำรายการ</th>
                    <th className="p-3 text-blue-900">ห้อง/โหมด</th>
                    <th className="p-3 text-slate-900 font-extrabold">ชื่อ-นามสกุล ผู้ทำรายการ</th>
                    <th className="p-3">การทำรายการ</th>
                    <th className="p-3">รายละเอียดเพิ่มเติม</th>
                    <th className="p-3 text-center">จำนวนชุด</th>
                    <th className="p-3 text-right">ลบประวัติ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white/60">
                  {filteredLogs.map((log) => {
                    const isAdminLog = log.room_key === 'Admin' || log.teacher_name?.includes('Admin');

                    return (
                      <tr key={log.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="p-3 font-mono text-slate-500 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString('th-TH')}
                        </td>
                        <td className="p-3 font-extrabold text-blue-900 font-prompt whitespace-nowrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${
                            isAdminLog ? 'bg-amber-100 text-amber-950 border border-amber-300' : 'bg-blue-100 text-blue-900 border border-blue-200'
                          }`}>
                            {log.room_key === 'Admin' ? 'Admin' : `ห้อง ${log.room_key}`}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-slate-900 font-prompt text-sm whitespace-nowrap">
                          <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl border ${
                            isAdminLog ? 'bg-amber-50 text-amber-900 border-amber-200' : 'bg-blue-50 text-blue-900 border-blue-200'
                          }`}>
                            <UserCheck className={`w-3.5 h-3.5 ${isAdminLog ? 'text-amber-600' : 'text-blue-600'} mr-1`} />
                            {log.teacher_name}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-slate-800 whitespace-nowrap">{log.action}</td>
                        <td className="p-3 text-slate-600 font-medium">{log.details || '-'}</td>
                        <td className="p-3 text-center font-mono font-extrabold text-slate-900 whitespace-nowrap">
                          {log.device_count > 0 ? `${log.device_count} ชุด` : '-'}
                        </td>
                        <td className="p-3 text-right whitespace-nowrap">
                          <button
                            onClick={() => handleDeleteLogEntry(log.id, log.action)}
                            className="p-1.5 bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-700 rounded-xl text-xs transition-colors"
                            title="ลบรายการประวัตินี้"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* --- SUB TAB 5: SETTINGS --- */}
      {adminSubTab === 'settings' && (
        <div className="modern-glass rounded-3xl p-6 border border-white/80 shadow-sm max-w-3xl space-y-6">
          <h3 className="text-lg font-bold font-prompt text-slate-900 pb-3 border-b border-slate-200/60">
            ตั้งค่าปีการศึกษา รอบการตรวจ รหัสผ่าน Admin และผู้ลงชื่อท้ายรายงาน
          </h3>

          <form onSubmit={handleSaveSettings} className="space-y-6 text-sm font-sarabun">
            
            {/* Global Year & Round Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ปีการศึกษาปัจจุบันในระบบ:
                </label>
                <select
                  value={config.current_academic_year}
                  onChange={(e) => updateGlobalSettings({ academicYear: e.target.value })}
                  className="w-full p-3 bg-white border border-slate-300 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {(config.academic_years || ["2569"]).map(yr => (
                    <option key={yr} value={yr}>ปีการศึกษา พ.ศ. {yr}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  เพิ่มปีการศึกษาใหม่ (เช่น 2570):
                </label>
                <input
                  type="text"
                  placeholder="กรอกปีการศึกษา พ.ศ. เช่น 2570"
                  value={newYearInput}
                  onChange={(e) => setNewYearInput(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-300 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                กำหนดรอบการตรวจปัจจุบัน (รอบ 1 - 5):
              </label>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => updateGlobalSettings({ round: r })}
                    className={`py-2.5 rounded-2xl text-xs font-extrabold transition-all border ${
                      Number(config.current_round) === r
                        ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-sm'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    รอบที่ {r}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                เปลี่ยนรหัสผ่าน Admin:
              </label>
              <input
                type="password"
                placeholder="กรอกรหัสผ่านใหม่หากต้องการเปลี่ยน..."
                value={newPassInput}
                onChange={(e) => setNewPassInput(e.target.value)}
                className="w-full p-3 bg-white border border-slate-300 rounded-2xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Custom Report Signature Customizer Section */}
            <div className="pt-4 border-t border-slate-200/80 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-extrabold font-prompt text-slate-900 flex items-center space-x-2">
                    <UserCheck2 className="w-5 h-5 text-amber-500" />
                    <span>ปรับแก้ชื่อและตำแหน่งผู้ลงชื่อท้ายรายงานผล</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    กำหนดชื่อและตำแหน่งที่จะแสดงในบล็อกลงชื่อท้ายเอกสารรายงาน PDF / การพิมพ์ (เช่น หัวหน้าโครงการ, ผู้รับรองรายงาน, ผู้อำนวยการ)
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddSignatureBlock}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>เพิ่มผู้ลงชื่อ</span>
                </button>
              </div>

              <div className="space-y-3">
                {reportSignatures.map((sig, idx) => (
                  <div key={sig.id || idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          ตำแหน่ง / บทบาท #{idx + 1}:
                        </label>
                        <input
                          type="text"
                          placeholder="เช่น หัวหน้าโครงการ / ผู้รับรองรายงาน"
                          value={sig.title || ''}
                          onChange={(e) => handleSignatureChange(idx, 'title', e.target.value)}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          ชื่อ - นามสกุล (ใส่หรือไม่ใส่ก็ได้):
                        </label>
                        <input
                          type="text"
                          placeholder="เช่น นายสมเกียรติ รักเรียน"
                          value={sig.name || ''}
                          onChange={(e) => handleSignatureChange(idx, 'name', e.target.value)}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteSignatureBlock(idx)}
                      className="p-2 bg-white hover:bg-rose-100 text-slate-400 hover:text-rose-700 border border-slate-200 rounded-xl text-xs transition-colors self-end sm:self-auto"
                      title="ลบช่องลงชื่อนี้"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-2xl text-xs sm:text-sm shadow-md shadow-blue-600/30 transition-all flex items-center space-x-2"
            >
              <Save className="w-4 h-4 text-amber-300" />
              <span>บันทึกการตั้งค่าทั้งหมด</span>
            </button>
          </form>
        </div>
      )}

      {/* --- SUB TAB 6: ROOM PINS --- */}
      {adminSubTab === 'pins' && (
        <div className="modern-glass rounded-3xl p-6 border border-white/80 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-bold font-prompt text-slate-900">
              กำหนดรหัส PIN ประจำห้องสำหรับครูที่ปรึกษา (13 ห้อง: ม.4/1 - ม.6/4 & ครู)
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              ครูที่ปรึกษาแต่ละห้องจะใช้ PIN นี้เพื่อเข้าทำการตรวจเช็คอุปกรณ์ของห้องตนเอง
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Object.keys(roomPins).map((roomKey) => (
              <div key={roomKey} className="p-4 bg-white/90 rounded-2xl border border-slate-200 space-y-2 shadow-xs">
                <span className="font-extrabold text-slate-900 text-sm block">
                  ห้อง {roomKey}
                </span>
                <div className="flex items-center space-x-2">
                  <Key className="w-4 h-4 text-amber-500" />
                  <input
                    type="text"
                    value={roomPins[roomKey]}
                    onChange={(e) => handlePinChange(roomKey, e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-extrabold text-blue-900 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- SINGLE DEVICE ADD/EDIT MODAL --- */}
      {showFormModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="modern-glass bg-white/95 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-fade-in border border-white">
            <h3 className="text-lg font-bold font-prompt text-slate-900 pb-2 border-b border-slate-100">
              {editingId ? 'แก้ไขข้อมูลอุปกรณ์' : 'เพิ่มข้อมูลอุปกรณ์ใหม่'}
            </h3>

            <form onSubmit={handleDeviceSubmit} className="space-y-4 text-xs font-sarabun">
              <div>
                <label className="block font-bold text-slate-700 mb-1">1. ประเภทผู้ถือครอง:</label>
                <div className="flex space-x-4">
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="devType"
                      checked={formData.type === 'student'}
                      onChange={() => setFormData({ ...formData, type: 'student', grade: 'ม.4', room: '1' })}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-bold">นักเรียน</span>
                  </label>
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="devType"
                      checked={formData.type === 'teacher'}
                      onChange={() => setFormData({ ...formData, type: 'teacher', grade: 'ครู', room: '-' })}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-bold">ครูผู้สอน</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-extrabold text-blue-700 mb-1">2. Serial No.:</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น R52T100001X"
                  value={formData.serial_no}
                  onChange={(e) => setFormData({ ...formData, serial_no: e.target.value })}
                  className="w-full p-3 bg-blue-50 border border-blue-200 rounded-xl font-mono font-extrabold text-blue-900 text-sm uppercase"
                />
              </div>

              {/* Title Prefix Dropdown & First / Last Name */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-900 mb-1">3.1 คำนำหน้า:</label>
                  <select
                    value={formData.prefix}
                    onChange={(e) => setFormData({ ...formData, prefix: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900"
                  >
                    <option value="นาย">นาย</option>
                    <option value="นางสาว">นางสาว</option>
                    <option value="นาง">นาง</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-900 mb-1">3.2 ชื่อ:</label>
                  <input
                    type="text"
                    required
                    placeholder="ชื่อผู้ครอบครอง"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-900 mb-1">3.3 นามสกุล:</label>
                  <input
                    type="text"
                    required
                    placeholder="นามสกุล"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900"
                  />
                </div>
              </div>

              {formData.type === 'student' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">4.1 ระดับชั้น:</label>
                    <select
                      value={formData.grade}
                      onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-800"
                    >
                      <option value="ม.4">ม.4</option>
                      <option value="ม.5">ม.5</option>
                      <option value="ม.6">ม.6</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">4.2 ห้อง:</label>
                    <select
                      value={formData.room}
                      onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-800"
                    >
                      <option value="1">ห้อง 1</option>
                      <option value="2">ห้อง 2</option>
                      <option value="3">ห้อง 3</option>
                      <option value="4">ห้อง 4</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">5. เลข BOX:</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น BOX-STU-001"
                    value={formData.box_no}
                    onChange={(e) => setFormData({ ...formData, box_no: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">6. เลข BOX KB:</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น KB-STU-001"
                    value={formData.box_kb_no}
                    onChange={(e) => setFormData({ ...formData, box_kb_no: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl font-extrabold shadow-md shadow-amber-400/30"
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP NOTIFICATION MODAL */}
      {modalPopup && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center space-y-4 border-2 border-slate-200 shadow-2xl">
            <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mx-auto border shadow-xs ${
              modalPopup.type === 'success' 
                ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
                : modalPopup.type === 'warning'
                ? 'bg-amber-100 text-amber-800 border-amber-200'
                : 'bg-rose-100 text-rose-700 border-rose-200'
            }`}>
              {modalPopup.type === 'success' && <CheckCircle2 className="w-9 h-9" />}
              {modalPopup.type === 'warning' && <AlertCircle className="w-9 h-9" />}
              {modalPopup.type === 'error' && <XCircle className="w-9 h-9" />}
            </div>

            <div>
              <h3 className="text-xl font-extrabold font-prompt text-slate-900">
                {modalPopup.title}
              </h3>
              <p className="text-xs text-slate-600 font-medium mt-2 leading-relaxed">
                {modalPopup.message}
              </p>
            </div>

            <button
              onClick={() => setModalPopup(null)}
              className={`w-full py-3 rounded-2xl font-extrabold text-sm transition-all shadow-md ${
                modalPopup.type === 'success'
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                  : modalPopup.type === 'warning'
                  ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-400/30'
                  : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
              }`}
            >
              ตกลง
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
