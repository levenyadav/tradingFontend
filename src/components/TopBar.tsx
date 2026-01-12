import { Bell, Menu, ArrowLeft } from 'lucide-react';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { useEffect, useState } from 'react';
import { Notification } from '../types';
import { brand } from '../lib/brand';
import { useAccount } from '../lib/account';

interface TopBarProps {
  title?: string;
  showNotifications?: boolean;
  onNotificationClick?: () => void;
  showMenu?: boolean;
  onMenuClick?: () => void;
  unreadCount?: number;
  titleIcon?: React.ReactNode;
  showBack?: boolean;
  onBackClick?: () => void;
}

export function TopBar({ 
  title, 
  showNotifications = true, 
  onNotificationClick,
  showMenu = false,
  onMenuClick,
  unreadCount = 0,
  titleIcon,
  showBack = false,
  onBackClick,
}: TopBarProps) {
  const { selectedAccountId, accounts, setSelectedAccountId } = useAccount();
  const active = accounts.find(a => String(a._id) === String(selectedAccountId));
  const acctText = active?.accountNumber ? String(active.accountNumber) : (selectedAccountId ? String(selectedAccountId).slice(-6) : null);
  const typeText = active?.accountType ? String(active.accountType) : 'standard';
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  useEffect(() => {
    if (!selectedAccountId && accounts && accounts.length > 0) setShowAccountDialog(true);
  }, [selectedAccountId, accounts]);
  const choose = (id: string) => { setSelectedAccountId(id); setShowAccountDialog(false); };

  return (
    <>
    <div className="sticky top-0 z-40" style={{ backgroundColor: '#ef5c2a', paddingTop: 'var(--safe-top)' }}>
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-3">
          {showBack && (
            <button 
              onClick={onBackClick}
              className="p-2 -ml-2 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Back"
            >
              <ArrowLeft className="w-6 h-6 text-white" style={{ color: '#fff' }} />
            </button>
          )}
          {showMenu && (
            <button 
              onClick={onMenuClick}
              className="p-2 -ml-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <Menu className="w-6 h-6 text-white" style={{ color: '#fff' }} />
            </button>
          )}
          {title ? (
            <div className="flex items-center gap-2">
              {titleIcon ? <span className="text-white">{titleIcon}</span> : null}
              <h1 className="text-white font-bold" style={{ color: '#fff', fontWeight: 700 }}>{title}</h1>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded-lg" />
              <span className="font-bold text-white" style={{ color: '#fff', fontWeight: 700 }}>{brand.name}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {accounts.length > 0 && (
            <Select value={selectedAccountId || ''} onValueChange={(val) => setSelectedAccountId(val)}>
              <SelectTrigger size="sm" variant="ghost" className="text-white gap-2 px-0 py-0">
                <span className="text-xs">Acc</span>
                <SelectValue placeholder={acctText || 'Select account'} />
              </SelectTrigger>
              <SelectContent className="bg-white rounded-lg shadow-lg min-w-[12rem]">
                {accounts.map((a) => (
                  <SelectItem key={a._id} value={a._id} className="py-2.5 pl-3 pr-12 text-gray-900">
                    {a.accountNumber}
                    <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${String(a.accountType).toLowerCase() === 'live' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{String(a.accountType || 'standard').toUpperCase()}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {showNotifications && (
            <button
              onClick={onNotificationClick}
              className="relative p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <Bell className="w-6 h-6 text-white" style={{ color: '#fff' }} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-600 text-white text-[10px] rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
    <Dialog open={showAccountDialog} onOpenChange={setShowAccountDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-gray-900">Please select an account</DialogTitle>
          <DialogDescription className="text-gray-700">Select an account to continue trading.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {accounts.map((a) => (
            <Button key={a._id} variant="outline" className="w-full justify-between" onClick={() => choose(a._id)}>
              <span>{a.accountNumber}</span>
              <span className={`px-2 py-0.5 rounded text-xs ${String(a.accountType).toLowerCase() === 'live' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{String(a.accountType || 'standard').toUpperCase()}</span>
            </Button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" className="text-gray-900" onClick={() => setShowAccountDialog(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
