import React, { useState, useEffect } from "react";
import {
  X,
  Copy,
  Check,
  ExternalLink,
  Heart,
  QrCode,
  ShieldCheck,
  Sparkles,
  Coins,
} from "lucide-react";
import { DonationAddress, getPublicDonationAddresses } from "../lib/binanceManager";

interface DonationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DonationModal: React.FC<DonationModalProps> = ({ isOpen, onClose }) => {
  const [donations, setDonations] = useState<DonationAddress[]>([]);
  const [selectedDonation, setSelectedDonation] = useState<DonationAddress | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Escape key handler for effortless skipping
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      const addresses = getPublicDonationAddresses();
      setDonations(addresses);
      if (addresses.length > 0 && !selectedDonation) {
        setSelectedDonation(addresses[0]);
      }
    }
  }, [isOpen]);

  const handleCopy = (id: string, addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/70 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        id="public-donation-modal"
        className="relative w-full max-w-xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl shadow-xl overflow-hidden flex flex-col text-neutral-900 dark:text-neutral-100 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Header */}
        <div className="px-5 py-3.5 border-b border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-950/30">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <Heart className="w-3.5 h-3.5 fill-rose-500/20" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                Research Treasury &amp; Support
              </h2>
              <p className="text-[10px] text-neutral-400 font-mono">
                Independent Open-Access Scholarship
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-block text-[9px] font-mono text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded border border-neutral-200 dark:border-neutral-700">
              ESC
            </span>
            <button
              onClick={onClose}
              title="Close (Esc)"
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
            Direct multi-chain cryptocurrency contributions fund distributed translation nodes, arXiv synthesis, and open science computation.
          </p>

          {/* Network Selector Tabs */}
          <div className="flex flex-wrap gap-1.5">
            {donations.map((d) => {
              const isSelected = selectedDonation?.id === d.id;
              return (
                <button
                  key={d.id}
                  onClick={() => setSelectedDonation(d)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 border ${
                    isSelected
                      ? "bg-neutral-900 text-white dark:bg-white dark:text-black border-transparent shadow-xs"
                      : "bg-neutral-50 dark:bg-neutral-800/60 text-neutral-600 dark:text-neutral-400 border-neutral-200/70 dark:border-neutral-800 hover:border-neutral-300"
                  }`}
                >
                  <span>{d.symbol}</span>
                  <span className="text-[9px] font-mono opacity-70">({d.standard})</span>
                </button>
              );
            })}
          </div>

          {/* Active Address & QR Box */}
          {selectedDonation && (
            <div className="bg-neutral-50/80 dark:bg-neutral-950/40 p-4 rounded-xl border border-neutral-200/60 dark:border-neutral-800/80 space-y-3 text-center">
              <div className="w-32 h-32 mx-auto p-2 bg-white rounded-xl shadow-xs border border-neutral-200/80 flex items-center justify-center text-black">
                <div
                  dangerouslySetInnerHTML={{ __html: selectedDonation.qrSvg }}
                  className="w-full h-full"
                />
              </div>

              <div>
                <div className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                  {selectedDonation.currencyName} ({selectedDonation.symbol})
                </div>
                <div className="text-[10px] text-neutral-400 font-mono">
                  Network: <span className="text-neutral-700 dark:text-neutral-300 font-semibold">{selectedDonation.network}</span>
                </div>
              </div>

              {/* Address with 1-click copy */}
              <div className="p-2.5 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200/80 dark:border-neutral-800 flex items-center justify-between gap-2 text-left">
                <div className="font-mono text-[11px] text-neutral-800 dark:text-neutral-200 break-all select-all font-medium">
                  {selectedDonation.address}
                </div>
                <button
                  onClick={() => handleCopy(selectedDonation.id, selectedDonation.address)}
                  className="px-3 py-1.5 bg-neutral-900 hover:bg-black dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-black rounded-md text-[11px] font-bold flex items-center gap-1 shrink-0 cursor-pointer shadow-xs active:scale-95 transition-transform"
                >
                  {copiedId === selectedDonation.id ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400 dark:text-emerald-600" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between pt-1 text-[10px]">
                <a
                  href={selectedDonation.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors font-mono"
                >
                  <span>Block Explorer</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
                <button
                  onClick={onClose}
                  className="text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 underline cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

