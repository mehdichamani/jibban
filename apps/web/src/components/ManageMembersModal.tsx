import React, { useState } from 'react';
import { X, UserPlus, Trash2, Edit2, Check, Users } from 'lucide-react';
import { GroupMemberItem } from '../lib/groupMembersStorage.js';

interface ManageMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: GroupMemberItem[];
  onSaveMembers: (newMembers: GroupMemberItem[]) => void;
}

export const ManageMembersModal: React.FC<ManageMembersModalProps> = ({
  isOpen,
  onClose,
  members,
  onSaveMembers,
}) => {
  if (!isOpen) return null;

  const [memberList, setMemberList] = useState<GroupMemberItem[]>(members);
  const [newMemberName, setNewMemberName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newMemberName.trim();
    if (!name) return;

    if (memberList.some((m) => m.name.toLowerCase() === name.toLowerCase())) {
      alert('عضوی با این نام قبلاً وجود دارد');
      return;
    }

    const newId = `mem_${Date.now()}`;
    const updated = [...memberList, { id: newId, name }];
    setMemberList(updated);
    onSaveMembers(updated);
    setNewMemberName('');
  };

  const handleRemoveMember = (id: string, name: string) => {
    if (id === 'من') {
      alert('نمی‌توانید کاربر اصلی (من) را حذف کنید.');
      return;
    }
    if (memberList.length <= 2) {
      alert('گروه دنگ باید حداقل دارای ۲ عضو باشد.');
      return;
    }
    if (confirm(`آیا از حذف "${name}" از گروه دنگ اطمینان دارید؟`)) {
      const updated = memberList.filter((m) => m.id !== id);
      setMemberList(updated);
      onSaveMembers(updated);
    }
  };

  const handleStartEdit = (m: GroupMemberItem) => {
    setEditingId(m.id);
    setEditingName(m.name);
  };

  const handleSaveEdit = (id: string) => {
    const trimmed = editingName.trim();
    if (!trimmed) return;
    const updated = memberList.map((m) => (m.id === id ? { ...m, name: trimmed } : m));
    setMemberList(updated);
    onSaveMembers(updated);
    setEditingId(null);
    setEditingName('');
  };

  return (
    <div className="modal-backdrop">
      <div className="glass-modal max-w-md w-full p-5 sm:p-6 space-y-5 animate-scale-up">
        {/* هدر */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">مدیریت اعضای گروه دنگ</h3>
              <p className="text-xs text-slate-400">افزودن، ویرایش و حذف اعضای گروه جهت تقسیم مخارج</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* فرم افزودن عضو جدید */}
        <form onSubmit={handleAddMember} className="flex gap-2">
          <input
            type="text"
            value={newMemberName}
            onChange={(e) => setNewMemberName(e.target.value)}
            placeholder="نام عضو جدید (مثلاً مریم، علی، ...)"
            className="input-field flex-1 text-xs sm:text-sm py-2 px-3"
          />
          <button
            type="submit"
            disabled={!newMemberName.trim()}
            className="btn btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 shrink-0 disabled:opacity-50"
          >
            <UserPlus className="w-4 h-4" />
            <span>افزودن</span>
          </button>
        </form>

        {/* لیست اعضا */}
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {memberList.map((m) => {
            const isEditing = editingId === m.id;
            const isMe = m.id === 'من';

            return (
              <div
                key={m.id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition"
              >
                {isEditing ? (
                  <div className="flex items-center gap-2 flex-1 ml-2">
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="input-field text-xs py-1 px-2.5 flex-1"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(m.id)}
                      className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 flex items-center justify-center transition"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="w-7 h-7 rounded-lg text-slate-400 hover:text-white flex items-center justify-center transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-200 text-xs font-bold flex items-center justify-center border border-slate-700">
                      {m.name.slice(0, 1)}
                    </div>
                    <div>
                      <span className="text-xs sm:text-sm font-semibold text-white block">
                        {m.name}
                      </span>
                      {isMe && (
                        <span className="text-[10px] text-sky-400 font-medium">حساب شما</span>
                      )}
                    </div>
                  </div>
                )}

                {!isEditing && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(m)}
                      title="ویرایش نام"
                      className="w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {!isMe && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(m.id, m.name)}
                        title="حذف عضو"
                        className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* دکمه تایید */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full btn btn-secondary text-xs py-2.5 rounded-xl"
          >
            بستن و اعمال
          </button>
        </div>
      </div>
    </div>
  );
};
