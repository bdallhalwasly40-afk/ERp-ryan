import React, { useState, useEffect, useRef } from 'react';
import { Message, User } from '../types';
import { StorageService } from '../services/storage';

interface MessagesPageProps {
  user: User;
}

export const MessagesPage: React.FC<MessagesPageProps> = ({ user }) => {
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [msgInput, setMsgInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, [user.id, selectedContactId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages, selectedContactId]);

  const loadData = () => {
    const all = StorageService.getMessages();
    setAllMessages(all);
    
    const sups = StorageService.getSupervisors().filter(s => s.approved);
    const workers = StorageService.getWorkers();

    let list: any[] = [];
    if (user.role === 'worker') {
      list = [
        { id: 'manager', name: 'الإدارة العامة', role: 'manager' },
        ...sups.map(s => ({ id: s.id, name: s.name, role: 'supervisor' }))
      ];
    } else {
      list = [
        ...(user.role === 'supervisor' ? [{ id: 'manager', name: 'الإدارة العامة', role: 'manager' }] : []),
        ...sups.filter(s => s.id !== user.id).map(s => ({ id: s.id, name: s.name, role: 'supervisor' })),
        ...workers.map(w => ({ id: w.id, name: w.name, role: 'worker' }))
      ];
    }

    const processed = list.map(c => {
      const chat = all.filter(m => (m.fromId === c.id && m.toId === user.id) || (m.fromId === user.id && m.toId === c.id));
      const unread = chat.filter(m => m.toId === user.id && !m.read).length;
      return { ...c, lastMsg: chat[0], unreadCount: unread };
    }).sort((a, b) => {
        const timeA = a.lastMsg ? new Date(a.lastMsg.date).getTime() : 0;
        const timeB = b.lastMsg ? new Date(b.lastMsg.date).getTime() : 0;
        return timeB - timeA;
    });

    setContacts(processed);

    if (selectedContactId) {
        const unreadIds = all.filter(m => m.fromId === selectedContactId && m.toId === user.id && !m.read).map(m => m.id);
        unreadIds.forEach(id => StorageService.markMessageRead(id));
    }
  };

  const handleSend = () => {
    if (!msgInput.trim() || !selectedContactId) return;
    const contact = contacts.find(c => c.id === selectedContactId);
    
    const msg: Message = {
      id: Date.now().toString(),
      fromId: user.id,
      fromName: user.name,
      fromRole: user.role,
      toId: selectedContactId,
      toName: contact?.name || 'Unknown',
      content: msgInput,
      date: new Date().toISOString(),
      read: false,
      type: 'general'
    };

    StorageService.sendMessage(msg);
    setMsgInput('');
    loadData();
  };

  const selectedContact = contacts.find(c => c.id === selectedContactId);
  const currentChat = allMessages.filter(m => 
    (m.fromId === selectedContactId && m.toId === user.id) || 
    (m.fromId === user.id && m.toId === selectedContactId)
  ).reverse();

  const filteredContacts = contacts.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="h-[calc(100vh-140px)] flex glass-panel rounded-3xl overflow-hidden shadow-2xl border-white/10 animate-fade-in">
      {/* Sidebar */}
      <div className={`w-full md:w-96 flex flex-col border-l border-white/10 bg-slate-900/60 ${selectedContactId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 bg-slate-950/40 border-b border-white/5">
           <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-black text-white">الدردشات</h2>
              <i className="fa-solid fa-ellipsis-vertical text-gray-500"></i>
           </div>
           <div className="relative">
              <input 
                type="text" 
                placeholder="بحث في الأسماء..." 
                className="w-full bg-slate-800/50 border border-white/5 rounded-xl py-2 px-10 text-xs text-white focus:ring-1 focus:ring-blue-500 outline-none"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              <i className="fa-solid fa-search absolute right-4 top-2.5 text-gray-500 text-xs"></i>
           </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredContacts.map(c => (
            <div 
              key={c.id} 
              onClick={() => setSelectedContactId(c.id)}
              className={`p-4 flex items-center gap-4 cursor-pointer border-b border-white/5 hover:bg-white/5 transition-all ${selectedContactId === c.id ? 'bg-blue-600/20' : ''}`}
            >
              <div className="relative flex-shrink-0">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg ${
                  c.role === 'manager' ? 'bg-gradient-to-br from-red-600 to-amber-600' : 
                  c.role === 'supervisor' ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-slate-700'
                }`}>
                  {c.name.charAt(0)}
                </div>
                {c.unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-[10px] text-white rounded-full flex items-center justify-center border-2 border-slate-900 font-black animate-bounce">
                    {c.unreadCount}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-white truncate">{c.name}</h3>
                  {c.lastMsg && <span className="text-[9px] text-gray-500">{new Date(c.lastMsg.date).toLocaleTimeString('ar-SA', {hour:'2-digit', minute:'2-digit'})}</span>}
                </div>
                <p className="text-[11px] text-gray-500 truncate mt-1">
                   {c.lastMsg?.fromId === user.id && <i className="fa-solid fa-check-double text-blue-400 ml-1"></i>}
                   {c.lastMsg?.content || 'ابدأ محادثة جديدة...'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col bg-slate-950/20 ${!selectedContactId ? 'hidden md:flex items-center justify-center' : 'flex'}`}>
        {!selectedContactId ? (
          <div className="text-center p-10 opacity-20">
            <div className="w-32 h-32 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <i className="fa-solid fa-paper-plane text-5xl"></i>
            </div>
            <h3 className="text-2xl font-black">سامي برو ويب</h3>
            <p className="mt-2">أرسل واستقبل الرسائل للمشرفين والعمال في نفس الوقت</p>
          </div>
        ) : (
          <>
            <div className="p-3 md:p-4 border-b border-white/10 flex items-center gap-4 bg-slate-900/80 backdrop-blur-md">
              <button onClick={() => setSelectedContactId(null)} className="md:hidden text-gray-400 hover:text-white"><i className="fa-solid fa-arrow-right text-lg"></i></button>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-md ${
                  selectedContact?.role === 'manager' ? 'bg-red-600' : 'bg-blue-600'
              }`}>{selectedContact?.name.charAt(0)}</div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-white leading-none">{selectedContact?.name}</h3>
                <span className="text-[9px] text-emerald-400 font-bold uppercase mt-1 block">متصل الآن</span>
              </div>
              <div className="flex gap-4 text-gray-500 text-sm">
                 <i className="fa-solid fa-video cursor-not-allowed"></i>
                 <i className="fa-solid fa-phone cursor-not-allowed"></i>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 bg-[url('https://i.pinimg.com/736x/8c/98/99/8c98994518b575bfd8d974415812b724.jpg')] bg-repeat opacity-95">
              {currentChat.map((m) => {
                const isMe = m.fromId === user.id;
                return (
                  <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] md:max-w-[70%] px-4 py-2.5 rounded-2xl shadow-xl relative animate-fade-in-up ${
                      isMe ? 'bg-blue-700 text-white rounded-tl-none' : 'bg-slate-800 text-gray-100 rounded-tr-none'
                    }`}>
                      <p className="text-[13px] leading-relaxed break-words">{m.content}</p>
                      <div className="flex items-center gap-1 justify-end mt-1 opacity-60">
                        <span className="text-[9px]">{new Date(m.date).toLocaleTimeString('ar-SA', {hour:'2-digit', minute:'2-digit'})}</span>
                        {isMe && <i className={`fa-solid fa-check-double text-[8px] ${m.read ? 'text-blue-300' : ''}`}></i>}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            <div className="p-3 md:p-5 bg-slate-900 border-t border-white/10 flex items-center gap-3">
              <button className="text-gray-500 hover:text-blue-400 text-xl"><i className="fa-solid fa-plus-circle"></i></button>
              <input 
                type="text" 
                value={msgInput}
                onChange={e => setMsgInput(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleSend()}
                placeholder="اكتب رسالة..."
                className="flex-1 bg-slate-800 border-none text-white rounded-2xl px-5 py-3 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
              />
              <button 
                onClick={handleSend}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${msgInput.trim() ? 'bg-blue-600 shadow-blue-500/30' : 'bg-slate-800 text-gray-600'}`}
                disabled={!msgInput.trim()}
              >
                <i className="fa-solid fa-paper-plane mr-1"></i>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};