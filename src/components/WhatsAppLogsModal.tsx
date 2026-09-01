import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, CheckCircle2, RefreshCw, X, Code, ExternalLink, ShieldCheck } from 'lucide-react';
import { WhatsAppLog } from '../types/queue';
import { db, collection, getDocs, orderBy, query, limit } from '../lib/firebase';

interface WhatsAppLogsModalProps {
  onClose: () => void;
}

export const WhatsAppLogsModal: React.FC<WhatsAppLogsModalProps> = ({ onClose }) => {
  const [logs, setLogs] = useState<WhatsAppLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<WhatsAppLog | null>(null);
  const [activeTab, setActiveTab] = useState<'LOGS' | 'META_API_SPEC'>('LOGS');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'whatsapp_logs'), orderBy('timestamp', 'desc'), limit(20));
      const snap = await getDocs(q);
      const fetched: WhatsAppLog[] = [];
      snap.forEach(d => fetched.push(d.data() as WhatsAppLog));
      setLogs(fetched);
      if (fetched.length > 0 && !selectedLog) {
        setSelectedLog(fetched[0]);
      }
    } catch (err) {
      console.error('Error loading WhatsApp logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Meta WhatsApp Cloud API Hub</h3>
              <p className="text-xs text-slate-400">Official Utility Template Dispatcher & Webhook Monitor</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={fetchLogs}
              className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              title="Refresh logs"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-2 flex-shrink-0">
          <button
            onClick={() => setActiveTab('LOGS')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'LOGS'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Live Message Logs ({logs.length})
          </button>
          <button
            onClick={() => setActiveTab('META_API_SPEC')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'META_API_SPEC'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Meta Cloud API Spec & Webhooks
          </button>
        </div>

        {/* Content Area */}
        {activeTab === 'LOGS' ? (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 flex-1 overflow-hidden">
            
            {/* Left list of messages */}
            <div className="md:col-span-5 space-y-2 overflow-y-auto pr-1">
              {logs.length > 0 ? (
                logs.map((log) => (
                  <div
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      selectedLog?.id === log.id
                        ? 'bg-emerald-950/30 border-emerald-500/50 shadow'
                        : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">{log.patientName}</span>
                      <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        {String(log.status).toUpperCase()}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 font-mono">{log.phone}</p>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">{log.templateName}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-slate-500 text-xs">
                  No WhatsApp logs recorded yet. Advance tokens to see live utility messages!
                </div>
              )}
            </div>

            {/* Right message details & chat preview */}
            <div className="md:col-span-7 bg-slate-950 rounded-2xl border border-slate-800 p-4 overflow-y-auto flex flex-col justify-between">
              {selectedLog ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
                    <span className="text-slate-400">Template: <span className="text-emerald-400 font-mono font-bold">{selectedLog.templateName}</span></span>
                    <span className="text-slate-500 font-mono text-[10px]">{new Date(selectedLog.timestamp).toLocaleTimeString()}</span>
                  </div>

                  {/* WhatsApp Chat Bubble Simulation */}
                  <div className="bg-[#0b141a] p-4 rounded-2xl border border-slate-800">
                    <div className="bg-[#005c4b] text-white p-3.5 rounded-2xl rounded-tr-none text-xs max-w-sm ml-auto space-y-2 shadow-lg">
                      <p className="whitespace-pre-line leading-relaxed font-sans">
                        {selectedLog.messageBody}
                      </p>
                      <div className="flex items-center justify-end space-x-1 text-[9px] text-emerald-200">
                        <span>{new Date(selectedLog.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <CheckCircle2 className="w-3 h-3 text-cyan-300" />
                      </div>
                    </div>
                  </div>

                  {/* Meta Payload JSON */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Meta Message ID</span>
                    <p className="text-xs font-mono text-teal-300 bg-slate-900 p-2 rounded-lg border border-slate-800 truncate">
                      {selectedLog.metaMessageId || 'wamid.HBgL18290382903'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 text-slate-500 text-xs">
                  Select a message from the list to preview WhatsApp chat.
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Meta Cloud API Spec Documentation */
          <div className="bg-slate-950 rounded-2xl border border-slate-800 p-5 space-y-4 overflow-y-auto flex-1 text-xs">
            <div>
              <h4 className="font-bold text-emerald-400 text-sm">Official Meta WhatsApp Cloud API Endpoints</h4>
              <p className="text-slate-400 mt-1">
                The application implements live webhook routes and utility template payload generators compatible with Meta Graph API v20.0.
              </p>
            </div>

            <div className="space-y-3 font-mono">
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                <span className="text-purple-400 font-bold">GET</span> <span className="text-white">/api/whatsapp/webhook</span>
                <p className="text-[11px] text-slate-400 mt-1 font-sans">
                  Handles Meta webhook handshake verification with <code>hub.mode</code>, <code>hub.verify_token</code>, and returns <code>hub.challenge</code>.
                </p>
              </div>

              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                <span className="text-emerald-400 font-bold">POST</span> <span className="text-white">/api/whatsapp/webhook</span>
                <p className="text-[11px] text-slate-400 mt-1 font-sans">
                  Receives live delivery reports (sent, delivered, read) and customer replies.
                </p>
              </div>

              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                <span className="text-blue-400 font-bold">POST</span> <span className="text-white">/api/whatsapp/send-template</span>
                <p className="text-[11px] text-slate-400 mt-1 font-sans">
                  Dispatches official pre-approved WhatsApp Utility templates with dynamic parameter substitution.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="pt-2 flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
