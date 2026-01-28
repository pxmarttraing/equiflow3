
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import InventoryView from './components/InventoryView';
import MyBookingsView from './components/MyBookingsView';
import AdminView from './components/AdminView';
import ReservationModal from './components/ReservationModal';
import VerificationModal from './components/VerificationModal';
import ConfirmModal from './components/ConfirmModal';
import { MOCK_ITEMS, AUTHORIZED_USERS } from './constants';
import { EquipmentItem, ItemStatus, Reservation, ReservationStatus, User } from './types';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

const App: React.FC = () => {
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('equiflow_users');
    return saved ? JSON.parse(saved) : AUTHORIZED_USERS;
  });

  const [items, setItems] = useState<EquipmentItem[]>(() => {
    const saved = localStorage.getItem('equiflow_items');
    return saved ? JSON.parse(saved) : MOCK_ITEMS;
  });

  const [reservations, setReservations] = useState<Reservation[]>(() => {
    const saved = localStorage.getItem('equiflow_reservations');
    return saved ? JSON.parse(saved) : [];
  });

  const [categories, setCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('equiflow_categories');
    return saved ? JSON.parse(saved) : ['Laptops', 'Tablets', 'Accessories', 'Monitors', 'Audio', 'Furniture', 'Cameras'];
  });

  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('inventory');
  
  const [loginStep, setLoginStep] = useState<'select' | 'password'>('select');
  const [targetUser, setTargetUser] = useState<User | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  const [selectedItemsForBooking, setSelectedItemsForBooking] = useState<EquipmentItem[]>([]);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [activeReturnId, setActiveReturnId] = useState<string | null>(null);
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  useEffect(() => { localStorage.setItem('equiflow_users', JSON.stringify(users)); }, [users]);
  useEffect(() => { localStorage.setItem('equiflow_reservations', JSON.stringify(reservations)); }, [reservations]);
  useEffect(() => { localStorage.setItem('equiflow_items', JSON.stringify(items)); }, [items]);
  useEffect(() => { localStorage.setItem('equiflow_categories', JSON.stringify(categories)); }, [categories]);

  useEffect(() => {
    const updateStates = () => {
      const today = new Date().toLocaleDateString('en-CA');
      setReservations(prev => prev.map(res => {
        if (res.status === ReservationStatus.PENDING && today >= res.startDate && today <= res.endDate) {
          return { ...res, status: ReservationStatus.ACTIVE };
        }
        return res;
      }));

      setItems(prevItems => prevItems.map(item => {
        const activeRes = reservations.find(r => r.status === ReservationStatus.ACTIVE && r.itemIds.includes(item.id));
        if (activeRes) {
          return { ...item, status: ItemStatus.BORROWED, currentHolderName: activeRes.userName, currentHolderId: activeRes.userId };
        }
        return { ...item, status: ItemStatus.AVAILABLE, currentHolderName: undefined, currentHolderId: undefined };
      }));
    };
    const interval = setInterval(updateStates, 5000);
    return () => clearInterval(interval);
  }, [reservations]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetUser && passwordInput === (targetUser.password || '1234')) {
      setCurrentUser(targetUser);
      setIsLoggedIn(true);
      addToast(`歡迎，${targetUser.name}！`);
    } else {
      setLoginError('密碼錯誤');
    }
  };

  const handleImportFullData = (dataStr: string) => {
    try {
      const decoded = JSON.parse(decodeURIComponent(escape(atob(dataStr))));
      if (decoded.users && decoded.items && decoded.reservations && decoded.categories) {
        setUsers(decoded.users);
        setItems(decoded.items);
        setReservations(decoded.reservations);
        setCategories(decoded.categories);
        addToast('數據導入成功！正在重新載入...', 'success');
        setTimeout(() => window.location.reload(), 1000);
      } else {
        throw new Error('格式不正確');
      }
    } catch (e) {
      addToast('導入失敗：無效的代碼', 'error');
    }
  };

  if (!isLoggedIn || !currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl animate-popIn">
          <div className="text-center mb-8">
            <div className="bg-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4">全</div>
            <h1 className="text-2xl font-bold text-slate-800">備品租借系統</h1>
            <p className="text-slate-400 text-sm mt-1">營運訓練處資產管理</p>
          </div>
          {loginStep === 'select' ? (
            <div className="space-y-3">
              {users.map(u => (
                <button key={u.id} onClick={() => { setTargetUser(u); setLoginStep('password'); }} className="w-full flex items-center p-4 bg-slate-50 hover:bg-indigo-50 border rounded-2xl transition-all">
                  <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold mr-4">{u.name.charAt(0)}</div>
                  <div className="text-left"><p className="font-bold text-slate-700">{u.name}</p><p className="text-[10px] text-slate-400">{u.role === 'admin' ? '管理員' : '一般員工'}</p></div>
                </button>
              ))}
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <input type="password" placeholder="輸入密碼 (預設 1234)" className="w-full bg-slate-100 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-indigo-500" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} autoFocus required />
              {loginError && <p className="text-red-500 text-xs font-bold">{loginError}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={() => setLoginStep('select')} className="flex-1 py-4 text-slate-500 font-bold">返回</button>
                <button type="submit" className="flex-[2] py-4 bg-indigo-600 text-white font-bold rounded-2xl">登入</button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} currentUser={currentUser} onSwitchUser={() => setIsLoggedIn(false)} onChangePassword={() => addToast('請洽管理員修改')}>
      <div className="fixed top-6 right-6 z-[200] space-y-3 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto px-6 py-4 rounded-2xl shadow-2xl bg-slate-800 text-white animate-slideInRight border border-slate-700">
            {t.message}
          </div>
        ))}
      </div>

      {activeTab === 'inventory' && <InventoryView items={items} reservations={reservations} onReserve={(ids) => { setSelectedItemsForBooking(items.filter(item => ids.includes(item.id))); setIsBookingModalOpen(true); }} />}
      {activeTab === 'my-bookings' && <MyBookingsView reservations={reservations.filter(r => r.userId === currentUser.id)} items={items} onCancel={setCancelTargetId} onReturnInitiate={setActiveReturnId} onBrowse={() => setActiveTab('inventory')} />}
      
      {activeTab.startsWith('admin-') && currentUser.role === 'admin' && (
        <AdminView 
          activeTab={activeTab} items={items} categories={categories} users={users} allReservations={reservations}
          notifications={[]} onClearNotifications={() => {}}
          onAddItem={(name, cat, specs) => setItems(prev => [...prev, { id: 'it'+Date.now(), name, category: cat, status: ItemStatus.AVAILABLE, specifications: specs }])} 
          onDeleteItem={(id) => setItems(prev => prev.filter(i => i.id !== id))} 
          onUpdateItem={(id, name, specs, cat) => setItems(prev => prev.map(i => i.id === id ? { ...i, name, specifications: specs, category: cat } : i))}
          onAddCategory={(cat) => {
            if (!cat.trim()) return;
            if (categories.includes(cat.trim())) {
              addToast('分類已存在', 'info');
              return;
            }
            setCategories(prev => [...prev, cat.trim()]);
            addToast('已新增分類');
          }} 
          onDeleteCategory={(cat) => {
            setCategories(prev => prev.filter(c => c !== cat));
            addToast('已移除分類');
          }}
          onAddUser={(name, role, email) => setUsers(prev => [...prev, { id: 'u'+Date.now(), name, role, email, password: '1234' }])}
          onDeleteUser={(id) => setUsers(prev => prev.filter(u => u.id !== id))}
          onUpdateUserRole={(id, role) => setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u))}
          onUpdateUserName={(id, name, email) => {
            setUsers(prev => prev.map(u => u.id === id ? { ...u, name, email } : u));
            addToast('成員資料已更新');
          }}
          onResetUserPassword={(id) => {
            setUsers(prev => prev.map(u => u.id === id ? { ...u, password: '1234' } : u));
            addToast('密碼已重設為 1234');
          }}
          onCancelReservation={setCancelTargetId}
          onImportFullData={handleImportFullData}
        />
      )}

      <ReservationModal isOpen={isBookingModalOpen} selectedItems={selectedItemsForBooking} onClose={() => setIsBookingModalOpen(false)} onConfirm={(s, e) => {
        const newRes: Reservation = { id: 'res'+Date.now(), userId: currentUser.id, userName: currentUser.name, itemIds: selectedItemsForBooking.map(i => i.id), startDate: s, endDate: e, status: ReservationStatus.PENDING, createdAt: new Date().toISOString() };
        setReservations(prev => [...prev, newRes]);
        setIsBookingModalOpen(false);
        setActiveTab('my-bookings');
        addToast('預約已提交');
      }} checkConflicts={(ids, s, e) => {
        return reservations.some(res => res.status !== ReservationStatus.CANCELLED && res.status !== ReservationStatus.COMPLETED && res.itemIds.some(id => ids.includes(id)) && (s <= res.endDate && e >= res.startDate));
      }} />

      <VerificationModal isOpen={!!activeReturnId} onClose={() => setActiveReturnId(null)} onVerify={(v) => {
        setReservations(prev => prev.map(r => r.id === activeReturnId ? { ...r, status: ReservationStatus.COMPLETED, verifiedBy: v } : r));
        setActiveReturnId(null);
        addToast('歸還成功');
      }} />
      
      <ConfirmModal isOpen={!!cancelTargetId} title="確定取消？" message="取消後時段將會釋出。" onConfirm={() => { setReservations(prev => prev.map(r => r.id === cancelTargetId ? { ...r, status: ReservationStatus.CANCELLED } : r)); setCancelTargetId(null); }} onCancel={() => setCancelTargetId(null)} />
    </Layout>
  );
};

export default App;
