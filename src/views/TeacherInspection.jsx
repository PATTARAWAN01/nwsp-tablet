import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { deviceService } from '../services/deviceService';
import { inspectionService } from '../services/inspectionService';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Save, 
  Lock, 
  KeyRound, 
  Search, 
  CheckCheck, 
  LogOut, 
  ShieldCheck,
  Tablet,
  PenTool,
  Keyboard,
  Zap,
  Filter,
  Check
} from 'lucide-react';

export default function TeacherInspection() {
  const { config, teacherSession, loginTeacherRoom, logoutTeacher, isAdmin } = useAuth();
  
  const [selectedGrade, setSelectedGrade] = useState(teacherSession ? teacherSession.grade : "ม.4");
  const [selectedRoom, setSelectedRoom] = useState(teacherSession ? teacherSession.room : "1");
  const [pinInput, setPinInput] = useState("");
  const [authError, setAuthError] = useState("");

  const [loading, setLoading] = useState(false);
  const [devices, setDevices] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");

  const [formState, setFormState] = useState({});

  const roomKey = selectedGrade === 'ครู' ? 'ครู' : `${selectedGrade}/${selectedRoom}`;
  const isAuthorized = isAdmin || (teacherSession && teacherSession.roomKey === roomKey);

  const loadRoomData = async () => {
    if (!isAuthorized) return;
    setLoading(true);
    try {
      const devList = await deviceService.getDevices({
        academicYear: config.current_academic_year,
        grade: selectedGrade,
        room: selectedGrade === 'ครู' ? '-' : selectedRoom
      });
      setDevices(devList);

      const insMap = await inspectionService.getInspections(
        config.current_academic_year,
        config.current_round
      );

      const initialForm = {};
      devList.forEach(dev => {
        const existing = insMap[dev.serial_no];
        if (existing && existing.items) {
          initialForm[dev.serial_no] = JSON.parse(JSON.stringify(existing.items));
        } else {
          initialForm[dev.serial_no] = {
            tablet: { status: 'normal', note: '' },
            spen: { status: 'normal', note: '' },
            keyboard: { status: 'normal', note: '' },
            cable_white: { status: 'normal', note: '' },
            cable_black: { status: 'normal', note: '' },
            adapter: { status: 'normal', note: '' }
          };
        }
      });
      setFormState(initialForm);

    } catch (e) {
      console.error("Failed to load room data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      loadRoomData();
    }
  }, [selectedGrade, selectedRoom, config.current_academic_year, config.current_round, isAuthorized]);

  const handlePinSubmit = async (e) => {
    e.preventDefault();
    setAuthError("");
    const res = await loginTeacherRoom(selectedGrade, selectedRoom, pinInput);
    if (!res.success) {
      setAuthError(res.message);
    } else {
      setPinInput("");
    }
  };

  const handleItemStatusChange = (serialNo, itemKey, status) => {
    setFormState(prev => {
      const currentDevItems = prev[serialNo] || {
        tablet: { status: 'normal', note: '' },
        spen: { status: 'normal', note: '' },
        keyboard: { status: 'normal', note: '' },
        cable_white: { status: 'normal', note: '' },
        cable_black: { status: 'normal', note: '' },
        adapter: { status: 'normal', note: '' }
      };

      return {
        ...prev,
        [serialNo]: {
          ...currentDevItems,
          [itemKey]: {
            ...currentDevItems[itemKey],
            status: status,
            note: status === 'normal' ? '' : currentDevItems[itemKey].note
          }
        }
      };
    });
  };

  const handleItemNoteChange = (serialNo, itemKey, noteText) => {
    setFormState(prev => {
      const currentDevItems = prev[serialNo];
      return {
        ...prev,
        [serialNo]: {
          ...currentDevItems,
          [itemKey]: {
            ...currentDevItems[itemKey],
            note: noteText
          }
        }
      };
    });
  };

  const handleMarkStudentAllNormal = (serialNo) => {
    setFormState(prev => ({
      ...prev,
      [serialNo]: {
        tablet: { status: 'normal', note: '' },
        spen: { status: 'normal', note: '' },
        keyboard: { status: 'normal', note: '' },
        cable_white: { status: 'normal', note: '' },
        cable_black: { status: 'normal', note: '' },
        adapter: { status: 'normal', note: '' }
      }
    }));
  };

  const handleMarkWholeRoomNormal = () => {
    if (!window.confirm(`ยืนยันการตั้งค่าให้อุปกรณ์ทุกเครื่องใน ${roomKey} อยู่ในสถานะ "ปกติทุกรายการ"?`)) {
      return;
    }
    setFormState(prev => {
      const updated = { ...prev };
      devices.forEach(dev => {
        updated[dev.serial_no] = {
          tablet: { status: 'normal', note: '' },
          spen: { status: 'normal', note: '' },
          keyboard: { status: 'normal', note: '' },
          cable_white: { status: 'normal', note: '' },
          cable_black: { status: 'normal', note: '' },
          adapter: { status: 'normal', note: '' }
        };
      });
      return updated;
    });
  };

  const handleSaveInspections = async () => {
    setLoading(true);
    setSaveSuccessMsg("");
    try {
      const recordsToSave = devices.map(dev => ({
        serial_no: dev.serial_no,
        device_id: dev.id,
        items: formState[dev.serial_no]
      }));

      await inspectionService.saveBatchInspection({
        academicYear: config.current_academic_year,
        round: config.current_round,
        recordsList: recordsToSave,
        inspector: teacherSession ? `ครูที่ปรึกษา (${roomKey})` : "Admin"
      });

      setSaveSuccessMsg(`บันทึกผลการตรวจเช็ค ${roomKey} สำเร็จเรียบร้อย!`);
      setTimeout(() => setSaveSuccessMsg(""), 4000);
      await loadRoomData();
    } catch (e) {
      alert("เกิดข้อผิดพลาดในการบันทึก: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredDevices = devices.filter(d => 
    !searchQuery ||
    d.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.serial_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.box_no.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Header Banner - Sleek Dark Indigo */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl glow-blue flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center space-x-2 text-amber-300 text-xs font-bold mb-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>ระบบตรวจเช็คอุปกรณ์ประจำห้องเรียน</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-prompt text-white">
            ตรวจเช็คอุปกรณ์ (รอบที่ {config.current_round} / 5)
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm mt-1 font-light">
            ปีการศึกษา {config.current_academic_year} • โรงเรียนหนองวัวซอพิทยาคม
          </p>
        </div>

        {/* Room Switcher Controls */}
        <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-md p-2.5 rounded-2xl border border-white/20">
          <div className="flex flex-col">
            <span className="text-[10px] text-amber-300 font-bold uppercase">ระดับชั้น</span>
            <select
              value={selectedGrade}
              onChange={(e) => {
                setSelectedGrade(e.target.value);
                if (e.target.value === 'ครู') setSelectedRoom('-');
              }}
              className="bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ม.4">ม.4</option>
              <option value="ม.5">ม.5</option>
              <option value="ม.6">ม.6</option>
              <option value="ครู">ครูผู้สอน</option>
            </select>
          </div>

          {selectedGrade !== 'ครู' && (
            <div className="flex flex-col">
              <span className="text-[10px] text-amber-300 font-bold uppercase">ห้อง</span>
              <select
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                className="bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="1">ห้อง 1</option>
                <option value="2">ห้อง 2</option>
                <option value="3">ห้อง 3</option>
                <option value="4">ห้อง 4</option>
              </select>
            </div>
          )}

          {isAuthorized && teacherSession && (
            <button
              onClick={logoutTeacher}
              className="self-end px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center space-x-1"
              title="ออกจากห้องนี้"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ออก</span>
            </button>
          )}
        </div>
      </div>

      {/* Auth Screen (If PIN is required and not verified) */}
      {!isAuthorized ? (
        <div className="modern-glass-card rounded-3xl p-8 border border-white/80 shadow-xl max-w-md mx-auto text-center space-y-6 animate-fade-in my-8">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-700 flex items-center justify-center mx-auto border border-blue-100 shadow-xs">
            <Lock className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-xl font-extrabold font-prompt text-slate-900">
              เข้าสู่หน้าตรวจเช็ค {roomKey}
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-1">
              กรอกรหัส PIN ประจำห้องเพื่อเริ่มการตรวจเช็คอุปกรณ์
            </p>
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-4 text-left">
            <div className="grid grid-cols-2 gap-2 p-2 bg-slate-50 rounded-2xl border border-slate-200">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">ระดับชั้น:</label>
                <select
                  value={selectedGrade}
                  onChange={(e) => {
                    setSelectedGrade(e.target.value);
                    if (e.target.value === 'ครู') setSelectedRoom('-');
                  }}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                >
                  <option value="ม.4">ม.4</option>
                  <option value="ม.5">ม.5</option>
                  <option value="ม.6">ม.6</option>
                  <option value="ครู">ครูผู้สอน</option>
                </select>
              </div>

              {selectedGrade !== 'ครู' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">ห้อง:</label>
                  <select
                    value={selectedRoom}
                    onChange={(e) => setSelectedRoom(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value="1">ห้อง 1</option>
                    <option value="2">ห้อง 2</option>
                    <option value="3">ห้อง 3</option>
                    <option value="4">ห้อง 4</option>
                  </select>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">รหัส PIN ประจำห้อง:</label>
              <div className="relative">
                <KeyRound className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  placeholder="กรอกรหัส PIN..."
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white border border-slate-300 rounded-2xl text-center text-xl font-mono font-extrabold tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-inner"
                  required
                />
              </div>
            </div>

            {authError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold text-center">
                {authError}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-2xl text-sm transition-all shadow-md shadow-blue-600/30 flex items-center justify-center space-x-2"
            >
              <ShieldCheck className="w-5 h-5 text-amber-300" />
              <span>เข้าสู่หน้าตรวจเช็คห้อง {roomKey}</span>
            </button>
          </form>
        </div>
      ) : (

        /* Authorized Room Inspection Content */
        <div className="space-y-5">
          
          {/* Toast Notification */}
          {saveSuccessMsg && (
            <div className="p-4 bg-emerald-600 text-white rounded-2xl shadow-lg flex items-center justify-between font-bold text-sm animate-fade-in">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-amber-300" />
                <span>{saveSuccessMsg}</span>
              </div>
            </div>
          )}

          {/* Action Toolbar */}
          <div className="modern-glass p-4 rounded-3xl border border-white/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <span className="px-4 py-2 bg-blue-900 text-white font-extrabold font-prompt rounded-2xl text-sm shadow-xs">
                {roomKey} ({devices.length} เครื่อง)
              </span>
              
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="ค้น Serial No., ชื่อ-นามสกุล..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleMarkWholeRoomNormal}
                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-xs font-extrabold shadow-md shadow-emerald-500/20 transition-all flex items-center space-x-1.5"
              >
                <CheckCheck className="w-4 h-4" />
                <span>ปกติทุกรายการทั้งห้อง</span>
              </button>

              <button
                onClick={handleSaveInspections}
                disabled={loading}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-2xl text-xs transition-all shadow-md shadow-blue-600/30 flex items-center space-x-2"
              >
                <Save className="w-4 h-4 text-amber-300" />
                <span>{loading ? 'กำลังบันทึก...' : 'บันทึกข้อมูลการตรวจ'}</span>
              </button>
            </div>

          </div>

          {/* Student Inspection Checklist List */}
          {filteredDevices.length === 0 ? (
            <div className="modern-glass rounded-3xl p-10 text-center text-slate-500 border border-white">
              <Tablet className="w-10 h-10 text-blue-400 mx-auto mb-2 opacity-50" />
              <p className="font-bold text-slate-700">ไม่พบข้อมูลอุปกรณ์ในห้องนี้</p>
              <p className="text-xs text-slate-400">กรุณาลงทะเบียนหรือนำเข้าข้อมูล CSV ในระบบหลังบ้าน</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDevices.map((dev, index) => {
                const devItems = formState[dev.serial_no] || {
                  tablet: { status: 'normal', note: '' },
                  spen: { status: 'normal', note: '' },
                  keyboard: { status: 'normal', note: '' },
                  cable_white: { status: 'normal', note: '' },
                  cable_black: { status: 'normal', note: '' },
                  adapter: { status: 'normal', note: '' }
                };

                const isAllNormal = Object.values(devItems).every(it => it.status === 'normal');

                return (
                  <div 
                    key={dev.id}
                    className={`modern-glass-card rounded-3xl border transition-all p-5 shadow-sm ${
                      !isAllNormal ? 'border-amber-300/90 bg-amber-50/40' : 'border-white/90'
                    }`}
                  >
                    {/* Device & Owner Info Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200/60 gap-4">
                      
                      <div className="flex items-start space-x-3.5">
                        <span className="w-8 h-8 rounded-2xl bg-blue-50 text-blue-900 font-mono font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5 border border-blue-200">
                          {index + 1}
                        </span>

                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${
                              dev.type === 'teacher' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              1. {dev.type === 'teacher' ? 'ครูผู้สอน' : 'นักเรียน'}
                            </span>

                            <div className="flex items-center space-x-1.5 bg-blue-50 px-3 py-0.5 rounded-xl border border-blue-100">
                              <span className="text-[11px] text-blue-700 font-bold">2. Serial No:</span>
                              <span className="font-mono font-extrabold text-blue-800 text-base sm:text-lg tracking-wide">
                                {dev.serial_no}
                              </span>
                            </div>
                          </div>

                          <h3 className="font-extrabold text-slate-900 text-lg sm:text-xl font-prompt pt-0.5">
                            3. {dev.first_name} {dev.last_name}
                          </h3>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium">
                            <span>4. ชั้น: <strong className="text-slate-800 font-bold">{dev.type === 'teacher' ? 'ครู' : `${dev.grade}/${dev.room}`}</strong></span>
                            <span>•</span>
                            <span>5. เลข BOX: <strong className="text-slate-800 font-mono font-bold">{dev.box_no}</strong></span>
                            <span>•</span>
                            <span>6. เลข BOX KB: <strong className="text-slate-800 font-mono font-bold">{dev.box_kb_no}</strong></span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleMarkStudentAllNormal(dev.serial_no)}
                        className={`self-start md:self-center px-4 py-2 rounded-2xl text-xs font-extrabold transition-all flex items-center space-x-1.5 border ${
                          isAllNormal
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
                            : 'bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border-slate-300 shadow-xs'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>ปกติทุกรายการ</span>
                      </button>
                    </div>

                    {/* 6 Checklist Items Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                      {[
                        { key: 'tablet', label: '1. Tablet', icon: Tablet },
                        { key: 'spen', label: '2. ปากกา S Pen', icon: PenTool },
                        { key: 'keyboard', label: '3. คีย์บอร์ด', icon: Keyboard },
                        { key: 'cable_white', label: '4. สาย Tablet (ขาว)', icon: Zap },
                        { key: 'cable_black', label: '5. สาย KB (ดำ)', icon: Zap },
                        { key: 'adapter', label: '6. Adapter', icon: Zap }
                      ].map((item) => {
                        const Icon = item.icon;
                        const current = devItems[item.key] || { status: 'normal', note: '' };
                        const isDamaged = current.status === 'damaged';

                        return (
                          <div 
                            key={item.key} 
                            className={`p-3.5 rounded-2xl border text-xs transition-all ${
                              isDamaged ? 'bg-rose-100/60 border-rose-300 shadow-xs' : 'bg-white/80 border-slate-200/80'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="flex items-center space-x-2 font-bold text-slate-800">
                                <Icon className={`w-4 h-4 ${isDamaged ? 'text-rose-600' : 'text-blue-600'}`} />
                                <span>{item.label}</span>
                              </div>

                              <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
                                <button
                                  type="button"
                                  onClick={() => handleItemStatusChange(dev.serial_no, item.key, 'normal')}
                                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                    !isDamaged ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  ปกติ
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleItemStatusChange(dev.serial_no, item.key, 'damaged')}
                                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                    isDamaged ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  ชำรุด
                                </button>
                              </div>
                            </div>

                            {isDamaged && (
                              <input
                                type="text"
                                placeholder="ระบุอาการชำรุด..."
                                value={current.note || ''}
                                onChange={(e) => handleItemNoteChange(dev.serial_no, item.key, e.target.value)}
                                className="w-full mt-2 px-3 py-2 bg-white border border-rose-300 rounded-xl text-xs text-rose-900 focus:outline-none focus:ring-2 focus:ring-rose-500 placeholder-rose-400"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>

                  </div>
                );
              })}
            </div>
          )}

          {/* Sticky Bottom Save Bar */}
          <div className="sticky bottom-4 bg-slate-900/90 backdrop-blur-md p-4 rounded-3xl border border-slate-800 shadow-2xl flex items-center justify-between text-white z-30">
            <div className="text-xs sm:text-sm text-slate-200 font-bold">
              <span>บันทึกผลการตรวจ <strong>{roomKey}</strong> ประจำรอบที่ {config.current_round}</span>
            </div>
            <button
              onClick={handleSaveInspections}
              disabled={loading}
              className="px-6 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold rounded-2xl text-xs sm:text-sm transition-all shadow-lg shadow-amber-400/30 flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'กำลังบันทึก...' : 'บันทึกข้อมูลการตรวจ'}</span>
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
