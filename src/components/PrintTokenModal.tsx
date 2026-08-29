import React from 'react';
import { Printer, X, QrCode } from 'lucide-react';
import { Clinic, TokenItem } from '../types/queue';

interface PrintTokenModalProps {
  clinic: Clinic;
  token: TokenItem;
  onClose: () => void;
}

export const PrintTokenModal: React.FC<PrintTokenModalProps> = ({
  clinic,
  token,
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
        
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="text-xs font-bold text-slate-400">THERMAL TICKET PREVIEW</span>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Paper Slip */}
        <div className="bg-white text-slate-950 p-6 rounded-2xl font-mono text-center space-y-3 shadow-inner border border-slate-300">
          <div className="border-b-2 border-dashed border-slate-300 pb-2">
            <h4 className="font-bold text-sm uppercase tracking-tight">{clinic.name}</h4>
            <p className="text-[10px] text-slate-600 mt-0.5">{clinic.doctorName}</p>
            <p className="text-[10px] text-slate-500">{clinic.cabinNumber}</p>
          </div>

          <div className="py-2">
            <span className="text-[10px] uppercase font-bold text-slate-500">QUEUE TOKEN NUMBER</span>
            <div className="text-4xl font-black tracking-tight text-slate-950 mt-1">
              {token.tokenNumber}
            </div>
            {token.isVip && (
              <span className="text-[9px] font-bold bg-slate-900 text-white px-2 py-0.5 rounded mt-1 inline-block">
                PRIORITY OVERRIDE
              </span>
            )}
          </div>

          <div className="border-t-2 border-b-2 border-dashed border-slate-300 py-2 text-[11px] text-left space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Patient:</span>
              <span className="font-bold">{token.patientName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Date/Time:</span>
              <span>{new Date(token.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Fee Paid:</span>
              <span className="font-bold">₹{token.amountPaid} ({token.paymentMethod})</span>
            </div>
          </div>

          <div className="pt-1 flex flex-col items-center">
            <div className="w-16 h-16 bg-slate-100 p-1 border border-slate-300 rounded flex items-center justify-center">
              <QrCode className="w-full h-full text-slate-900" />
            </div>
            <span className="text-[9px] text-slate-500 mt-1">Scan for Live ETA on Phone</span>
          </div>
        </div>

        <div className="flex space-x-2 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-lg shadow-teal-500/20"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Ticket</span>
          </button>
        </div>
      </div>
    </div>
  );
};
