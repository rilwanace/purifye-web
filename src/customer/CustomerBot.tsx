import { useState, useMemo, useCallback } from 'react';
import { useAuth } from '../auth/useAuth';
import { useCustomers, useMessages, useSettings, useTemplates } from './hooks/useCustomerData';
import { enrichAll } from './utils/segmentation';
import Dashboard from './Dashboard';
import CustomerList from './CustomerList';
import MessagesTab from './MessagesTab';
import CustomerDetail from './CustomerDetail';
import MessageBuilder from './MessageBuilder';
import ImportView from './ImportView';
import SettingsView from './SettingsView';
import DrillDown from './DrillDown';

export type View = 'dash' | 'customers' | 'messages' | 'detail' | 'import' | 'settings' | 'builder' | 'drilldown';

const C = '#CF5BA0'; // accent

export default function CustomerBot() {
  useAuth();

  const { data: rawCustomers, refresh: refreshCustomers } = useCustomers();
  const { data: allMessages, refresh: refreshMessages } = useMessages();
  const { data: settings, refresh: refreshSettings } = useSettings();
  const { data: templates, refresh: refreshTemplates } = useTemplates();

  const [view, setView] = useState<View>('dash');
  const [tab, setTab] = useState<'dash' | 'customers' | 'messages'>('dash');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [builderType, setBuilderType] = useState<string>('missyou');
  const [drillData, setDrillData] = useState<{ title: string; customers: any[] } | null>(null);

  const th = settings?.thresholds;
  const customers = useMemo(() => enrichAll(rawCustomers || [], th), [rawCustomers, th]);
  const drafts = useMemo(() => (allMessages || []).filter((m: any) => m.status === 'draft'), [allMessages]);
  const draftCount = drafts.length;

  const showView = useCallback((v: View) => {
    setView(v);
    if (v === 'dash' || v === 'customers' || v === 'messages') setTab(v as any);
    window.scrollTo(0, 0);
  }, []);

  const switchTab = useCallback((t: 'dash' | 'customers' | 'messages') => {
    setTab(t);
    setView(t);
    window.scrollTo(0, 0);
  }, []);

  const openDetail = useCallback((id: string) => {
    setSelectedId(id);
    setView('detail');
    window.scrollTo(0, 0);
  }, []);

  const openBuilder = useCallback((type: string) => {
    setBuilderType(type);
    setView('builder');
    window.scrollTo(0, 0);
  }, []);

  const openDrilldown = useCallback((title: string, custs: any[]) => {
    setDrillData({ title, customers: custs });
    setView('drilldown');
    window.scrollTo(0, 0);
  }, []);

  const selectedCustomer = useMemo(() => customers.find(c => c.id === selectedId) || null, [customers, selectedId]);

  if (!rawCustomers || !allMessages || !settings || !templates) {
    return (
      <div className="max-w-[430px] mx-auto px-5 pt-10 text-center">
        <div className="text-[var(--text-muted)] font-mono text-xs">Loading customers...</div>
      </div>
    );
  }

  return (
    <div className="max-w-[430px] mx-auto">
      {/* Sticky nav */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 20px 12px', position: 'sticky', top: 0, zIndex: 100,
        background: 'var(--bg-primary)', borderBottom: '1px solid var(--border)',
      }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-.4px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 10, background: 'linear-gradient(145deg,#CF5BA0,#8A3063)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
                <circle cx="12" cy="9" r="5" fill="rgba(255,255,255,.8)"/>
                <path d="M4 26c0-4 3.6-7 8-7s8 3 8 7" stroke="rgba(255,255,255,.8)" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="22" cy="11" r="3.5" fill="rgba(255,255,255,.5)"/>
                <path d="M18 26c0-2.5 1.8-4.5 4-4.5s4 2 4 4.5" stroke="rgba(255,255,255,.5)" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <span>Customers</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => showView('import')}
            style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 44, minWidth: 34 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9c9b95" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
          </button>
          <button
            onClick={() => showView('settings')}
            style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 44, minWidth: 34 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9c9b95" strokeWidth="1.5">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Tab bar (only for main views) */}
      {(view === 'dash' || view === 'customers' || view === 'messages') && (
        <div style={{ display: 'flex', gap: 4, padding: '10px 20px', position: 'sticky', top: 57, zIndex: 99, background: 'var(--bg-primary)' }}>
          {(['dash','customers','messages'] as const).map(t => (
            <button key={t} onClick={() => switchTab(t)} style={{
              flex: 1, padding: '8px 0', textAlign: 'center', fontSize: 11, fontWeight: 600,
              fontFamily: 'var(--font-mono)', color: tab === t ? C : 'var(--text-dim)',
              borderRadius: 10, background: tab === t ? `rgba(207,91,160,.1)` : 'transparent',
              border: tab === t ? '1px solid rgba(207,91,160,.2)' : '1px solid transparent',
              minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative',
            }}>
              {t === 'dash' ? 'Dashboard' : t === 'customers' ? 'Customers' : 'Messages'}
              {t === 'messages' && draftCount > 0 && (
                <span style={{
                  position: 'absolute', top: 2, right: 8, minWidth: 14, height: 14, borderRadius: 7,
                  background: '#D85A30', color: '#fff', fontSize: 7, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px',
                }}>{draftCount}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div style={{ padding: '0 20px 24px' }}>
        {view === 'dash' && (
          <Dashboard
            customers={customers}
            messages={allMessages}
            settings={settings}
            onSwitchTab={switchTab}
            onOpenBuilder={openBuilder}
            onDrillday={openDrilldown}
            onDrillrecency={openDrilldown}
            onCustomerClick={openDetail}
          />
        )}
        {view === 'customers' && (
          <CustomerList
            customers={customers}
            settings={settings}
            onCustomerClick={openDetail}
            onImport={() => showView('import')}
          />
        )}
        {view === 'messages' && (
          <MessagesTab
            customers={customers}
            messages={allMessages}
            settings={settings}
            templates={templates}
            onRefresh={() => { refreshMessages(); refreshCustomers(); }}
            onOpenBuilder={openBuilder}
            onCustomerClick={openDetail}
          />
        )}
        {view === 'detail' && selectedCustomer && (
          <CustomerDetail
            customer={selectedCustomer}
            messages={allMessages}
            onBack={() => showView(tab)}
          />
        )}
        {view === 'builder' && (
          <MessageBuilder
            type={builderType}
            customers={customers}
            settings={settings}
            templates={templates}
            onBack={() => showView('messages')}
            onQueued={() => { refreshMessages(); showView('messages'); }}
            onRefreshTemplates={refreshTemplates}
          />
        )}
        {view === 'import' && (
          <ImportView
            onBack={() => showView(tab)}
            onDone={() => { refreshCustomers(); refreshMessages(); showView('dash'); }}
          />
        )}
        {view === 'settings' && (
          <SettingsView
            settings={settings}
            templates={templates}
            onBack={() => showView(tab)}
            onSaved={() => { refreshSettings(); refreshCustomers(); }}
            onRefreshTemplates={refreshTemplates}
          />
        )}
        {view === 'drilldown' && drillData && (
          <DrillDown
            title={drillData.title}
            customers={drillData.customers}
            onBack={() => showView('dash')}
            onCustomerClick={openDetail}
          />
        )}
      </div>
    </div>
  );
}

